import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, Response, convertV4MiniflareOptions } from 'miniflare';

let bundle;
async function runtime(t, respond) {
  bundle ??= build({ entryPoints: ['src/worker.mjs'], bundle: true, write: false, format: 'esm', platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'], mainFields: ['module', 'main'], external: ['cloudflare:*', 'node:*'] });
  let outbound = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR), workers: [{
    name: 'oauth-guard-test', modules: true, script: (await bundle).outputFiles[0].text, compatibilityDate: '2026-09-30',
    compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'], kvNamespaces: ['OAUTH_KV'],
    durableObjects: { BRIDGE: { className: 'PhoneBridge', useSQLite: true } },
    bindings: { PUBLIC_ORIGIN: 'https://bridge.example.com', OWNER_GITHUB_ID: 'test-owner', ENABLE_INGEST: 'false',
      GITHUB_CLIENT_ID: 'fixture-only', GITHUB_CLIENT_SECRET: 'fixture-only' },
    outboundService: request => {
      outbound++;
      return respond ? respond(request) : new Response('Blocked synthetic external request', { status: 502 });
    },
  }] }));
  t.after(() => mf.dispose());
  return { mf, outbound: () => outbound };
}
const post = (mf, path, body, type = 'application/x-www-form-urlencoded') => mf.dispatchFetch(`https://bridge.example.com${path}`,
  { method: 'POST', headers: { 'content-type': type }, body });

test('production OAuth rejects oversized and excessive-field forms before client lookup', { timeout: 20000 }, async t => {
  const { mf, outbound } = await runtime(t);
  for (const path of ['/oauth/token', '/oauth/token?operation=revoke', '/x/../oauth/token']) {
    const response = await post(mf, path, 'client_id=https://client.example/metadata&padding=' + 'x'.repeat(65536));
    assert.equal(response.status, 413);
  }
  const fields = new URLSearchParams(Array.from({ length: 65 }, (_, i) => ['f' + i, 'x']));
  assert.equal((await post(mf, '/oauth/token', fields.toString())).status, 400);
  assert.equal(outbound(), 0);
  assert.equal((await post(mf, '/oauth/token', 'grant_type=refresh_token')).status, 401);
  assert.equal((await (await mf.getKVNamespace('OAUTH_KV')).list()).keys.length, 0);
});

test('production registration budget is atomic and does not consume token or continuation budgets', { timeout: 20000 }, async t => {
  const { mf, outbound } = await runtime(t);
  const body = JSON.stringify({ client_name: 'Synthetic quota client', redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'],
    token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] });
  const responses = await Promise.all(Array.from({ length: 14 }, () => post(mf, '/oauth/register', body, 'application/json')));
  assert.equal(responses.filter(r => r.status === 201).length, 12);
  assert.equal(responses.filter(r => r.status === 429).length, 2);
  for (const r of responses.filter(r => r.status === 429)) {
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    assert.equal(r.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await (await mf.getKVNamespace('OAUTH_KV')).list({ prefix: 'client:' })).keys.length, 12);
  assert.equal((await post(mf, '/oauth/token', 'grant_type=refresh_token')).status, 401);
  assert.notEqual((await post(mf, '/authorize', 'handle=invalid&decision=approve')).status, 429);
  assert.notEqual((await mf.dispatchFetch('https://bridge.example.com/callback?state=invalid')).status, 429);
  assert.equal(outbound(), 0);
});

test('OAuth query bounds and canonical origin checks cover provider route matching', { timeout: 20000 }, async t => {
  const { mf, outbound } = await runtime(t);
  assert.equal((await mf.dispatchFetch('https://bridge.example.com/authorize?state=' + 'x'.repeat(8192))).status, 414);
  for (const origin of ['http://bridge.example.com', 'https://bridge.example.com:8443', 'https://other.example.com']) {
    const r = await mf.dispatchFetch(`${origin}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'x=1' });
    assert.equal(r.status, 403);
  }
  for (const path of ['/oauth/token/', '/oauth/%74oken', '/OAUTH/token', '/oauth//token']) {
    assert.equal((await post(mf, path, 'x=1')).status, 404);
  }
  assert.equal((await mf.dispatchFetch('https://bridge.example.com/oauth/token', { method: 'OPTIONS' })).status, 204);
  assert.equal(outbound(), 0);
});

test('production OAuth completes browser-bound authorization, refresh and revocation', { timeout: 20000 }, async t => {
  const origin = 'https://bridge.example.com', redirectUri = 'https://chatgpt.com/connector_platform_oauth_redirect';
  let githubChallenge, outboundError;
  const { mf, outbound } = await runtime(t, async request => {
    try {
      if (request.url === 'https://github.com/login/oauth/access_token') {
        assert.equal(request.method, 'POST');
        const form = new URLSearchParams(await request.text());
        assert.equal(form.get('client_id'), 'fixture-only');
        assert.equal(form.get('client_secret'), 'fixture-only');
        assert.equal(form.get('code'), 'fixture-github-code');
        assert.equal(form.get('redirect_uri'), `${origin}/callback`);
        assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'), githubChallenge);
        return Response.json({ access_token: 'fixture-github-token' });
      }
      assert.equal(request.url, 'https://api.github.com/user', 'No request may escape the GitHub fixture');
      assert.equal(request.headers.get('authorization'), 'Bearer fixture-github-token');
      return Response.json({ id: 'test-owner' });
    } catch (error) {
      outboundError = error;
      return new Response(null, { status: 400 });
    }
  });
  const registration = await post(mf, '/oauth/register', JSON.stringify({
    client_name: 'Synthetic full browser flow', redirect_uris: [redirectUri], token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
  }), 'application/json');
  assert.equal(registration.status, 201);
  const client = await registration.json(), verifier = 'P'.repeat(43), cookies = new Map();
  const browserFetch = async (url, init = {}) => {
    const response = await mf.dispatchFetch(url, { ...init, redirect: 'manual', headers: { ...init.headers,
      cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } });
    for (const cookie of response.headers.getSetCookie()) {
      const entry = cookie.split(';', 1)[0], separator = entry.indexOf('=');
      cookies.set(entry.slice(0, separator), entry.slice(separator + 1));
    }
    return response;
  };
  const authorize = new URL(`${origin}/authorize`);
  authorize.search = new URLSearchParams({ client_id: client.client_id, response_type: 'code', redirect_uri: redirectUri,
    scope: 'phone:read phone:subscribe offline_access', state: 'fixture-browser-state', resource: `${origin}/mcp`,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  const consent = await browserFetch(authorize);
  assert.equal(consent.status, 200);
  const handle = (await consent.text()).match(/name="handle" value="([^"]+)"/)?.[1];
  assert.equal(typeof handle, 'string');
  assert.ok(cookies.size > 0, 'Consent must establish the real browser-binding cookie');
  const approved = await browserFetch(authorize, { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin },
    body: new URLSearchParams({ handle, decision: 'approve' }).toString() });
  assert.equal(approved.status, 302);
  const github = new URL(approved.headers.get('location'));
  assert.equal(github.origin, 'https://github.com');
  assert.equal(github.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(github.searchParams.get('redirect_uri'), `${origin}/callback`);
  assert.ok(github.searchParams.get('state'));
  githubChallenge = github.searchParams.get('code_challenge');
  const callback = new URL(github.searchParams.get('redirect_uri'));
  callback.search = new URLSearchParams({ code: 'fixture-github-code', state: github.searchParams.get('state') }).toString();
  const completed = await browserFetch(callback);
  if (outboundError) throw outboundError;
  assert.equal(completed.status, 302);
  assert.equal(outbound(), 2);
  const redirect = new URL(completed.headers.get('location'));
  assert.equal(`${redirect.origin}${redirect.pathname}`, redirectUri);
  assert.equal(redirect.searchParams.get('state'), 'fixture-browser-state');
  assert.equal(redirect.searchParams.get('iss'), origin);
  const exchanged = await post(mf, '/oauth/token', new URLSearchParams({ grant_type: 'authorization_code',
    client_id: client.client_id, code: redirect.searchParams.get('code'), code_verifier: verifier,
    redirect_uri: redirectUri, resource: `${origin}/mcp` }).toString());
  assert.equal(exchanged.status, 200);
  const tokens = await exchanged.json();
  assert.equal(tokens.resource, `${origin}/mcp`);
  assert.equal(typeof tokens.refresh_token, 'string');
  const read = accessToken => mf.dispatchFetch(`${origin}/mcp`, { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'guard-browser-flow', method: 'tools/list' }) });
  const initialRead = await read(tokens.access_token);
  assert.equal(initialRead.status, 200);
  assert.ok((await initialRead.json()).result.tools.some(tool => tool.name === 'phone_devices'));
  const refreshed = await post(mf, '/oauth/token', new URLSearchParams({ grant_type: 'refresh_token',
    client_id: client.client_id, refresh_token: tokens.refresh_token, resource: `${origin}/mcp` }).toString());
  assert.equal(refreshed.status, 200);
  const renewed = await refreshed.json();
  assert.equal(renewed.resource, `${origin}/mcp`);
  assert.equal(typeof renewed.refresh_token, 'string');
  const renewedRead = await read(renewed.access_token);
  assert.equal(renewedRead.status, 200);
  assert.ok((await renewedRead.json()).result.tools.some(tool => tool.name === 'phone_devices'));
  const revoked = await post(mf, '/oauth/token', new URLSearchParams({ client_id: client.client_id,
    token: renewed.refresh_token, token_type_hint: 'refresh_token' }).toString());
  assert.equal(revoked.status, 200);
  assert.equal((await read(renewed.access_token)).status, 401);
  assert.equal(outbound(), 2, 'Token exchange, refresh, MCP and revocation must not contact external services');
});
