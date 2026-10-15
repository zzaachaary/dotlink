import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomInt } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, Response, convertV4MiniflareOptions } from 'miniflare';
import { hash } from '../../src/protocol.mjs';

let bundlePromise;
async function runtime(t, outboundService, { configured = true } = {}) {
  bundlePromise ??= build({ entryPoints: ['test/runtime/fixture.mjs'], bundle: true, write: false, format: 'esm', platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'], mainFields: ['module', 'main'], external: ['cloudflare:*', 'node:*'] });
  const bundle = await bundlePromise;
  const token = 'T'.repeat(43), device = { id: 'iphone-primary', label: 'Test iPhone', platform: 'ios', enabled: true, token_sha256: await hash(token) };
  const options = { host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR),
    workers: [{ name: 'bridge-test', modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-30',
    compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    durableObjects: { BRIDGE: { className: 'PhoneBridge', useSQLite: true } }, kvNamespaces: ['OAUTH_KV'],
    outboundService: outboundService ?? (() => new Response('External requests disabled in tests', { status: 502 })),
    bindings: configured ? { PUBLIC_ORIGIN: 'https://bridge.example.com', OWNER_GITHUB_ID: 'test-owner', ENABLE_INGEST: 'true',
      BRIDGE_SEAL_KEY: Buffer.alloc(32, 7).toString('base64'),
      GITHUB_CLIENT_ID: 'fixture-only', GITHUB_CLIENT_SECRET: 'fixture-only', DEVICE_REGISTRY: JSON.stringify([device]) } : {} }] };
  const mf = new Miniflare(convertV4MiniflareOptions(options));
  t.after(() => mf.dispose());
  const send = async (path, body, auth = token, origin = 'https://bridge.example.com') => mf.dispatchFetch(`${origin}${path}`, { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
  const configure = async bindings => {
    Object.assign(options.workers[0].bindings, bindings);
    await mf.setOptions(convertV4MiniflareOptions(options));
  };
  return { mf, device, send, configure };
}

test('real unconfigured Worker: setup assets are public and all application routes stay blocked', { timeout: 20000 }, async t => {
  let outboundRequests = 0;
  const { mf } = await runtime(t, () => {
    outboundRequests++;
    return new Response('External requests disabled in tests', { status: 502 });
  }, { configured: false });
  const assets = [
    ['/setup', 'text/html', /<title>DotLink/],
    ['/setup/', 'text/html', /<title>DotLink/],
    ['/setup/style.css', 'text/css', /\.shell/],
    ['/setup/app.js', 'text/javascript', /generateCredentials/],
  ];
  for (const [path, type, bodyPattern] of assets) {
    const get = await mf.dispatchFetch(`https://bridge.example.com${path}`);
    assert.equal(get.status, 200, path);
    assert.ok(get.headers.get('content-type').startsWith(type), path);
    assert.match(await get.text(), bodyPattern);
    assert.equal(get.headers.get('cache-control'), 'no-store');
    assert.equal(get.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(get.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(get.headers.get('x-frame-options'), 'DENY');
    assert.match(get.headers.get('content-security-policy'), /connect-src 'none'/);
    const head = await mf.dispatchFetch(`https://bridge.example.com${path}`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type'), get.headers.get('content-type'));
    assert.equal(await head.text(), '');
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await mf.dispatchFetch(`https://bridge.example.com${path}`, { method });
      assert.equal(response.status, 405, `${method} ${path}`);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
      assert.equal(await response.text(), '');
    }
  }
  for (const path of ['/ingest', '/mcp', '/authorize', '/callback', '/oauth/register', '/health', '/setup/assets']) {
    for (const method of ['GET', 'POST']) {
      const response = await mf.dispatchFetch(`https://bridge.example.com${path}`, { method });
      assert.equal(response.status, 503, `${method} ${path}`);
      assert.deepEqual(await response.json(), { error: 'bridge_not_configured' });
    }
  }
  assert.equal(outboundRequests, 0);
});

test('real local Worker: device auth, SQLite status/event queries and OAuth boundary', { timeout: 20000 }, async t => {
  const { mf, device, send } = await runtime(t);
  assert.equal((await mf.dispatchFetch('https://bridge.example.com/health')).status, 200);
  const now = new Date().toISOString();
  const event = { v: 1, event_id: crypto.randomUUID(), device_id: device.id, kind: 'device_status', occurred_at: now,
    payload: { battery_percent: 0, is_charging: false, measured_at: now } };
  assert.equal((await send('/ingest', event, 'wrong')).status, 401);
  assert.equal((await send('/ingest', { ...event, device_id: 'ipad-study' })).status, 403);
  const first = await send('/ingest', event); assert.equal(first.status, 202, await first.text());
  assert.equal((await (await send('/ingest', event)).json()).duplicate, true);
  assert.equal((await send('/ingest', { ...event, payload: { ...event.payload, battery_percent: 12 } })).status, 409);
  assert.equal((await send('/ingest', { ...event, event_id: crypto.randomUUID(), kind: 'location',
    payload: { latitude: 0, longitude: 0, measured_at: now } })).status, 202);
  const rpc = (name, args = {}) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  assert.equal((await send('/mcp', rpc('phone_devices'))).status, 401);
  const status = await (await send('/__test/read', rpc('phone_status', { device_id: device.id }))).json();
  assert.equal(status.result.structuredContent.measurements.battery_percent.value, 0);
  assert.equal(status.result.structuredContent.measurements.is_charging.value, false);
  assert.equal(status.result.structuredContent.measurements.location.value.latitude, 0);
  assert.equal((await (await send('/__test/read', rpc('phone_events'))).json()).result.structuredContent.events.length, 2);
  const usageBatch = { ...event, event_id: crypto.randomUUID(), kind: 'app_activity_batch', payload: {
    source: 'shortcuts_app_trigger', measured_at: now, observations: [
      { id: crypto.randomUUID(), app: 'Test App', transition: 'opened', measured_at: new Date(Date.parse(now) - 120000).toISOString() },
      { id: crypto.randomUUID(), app: 'Test App', transition: 'closed', measured_at: new Date(Date.parse(now) - 60000).toISOString() },
    ],
  } };
  assert.equal((await send('/ingest', usageBatch)).status, 202);
  const usage = await (await send('/__test/read', rpc('phone_app_usage', { device_id: device.id, hours: 1 }))).json();
  assert.equal(usage.result.structuredContent.apps[0].estimated_seconds, 60);
  assert.equal(usage.result.structuredContent.is_estimate, true);
  assert.equal((await (await send('/__test/read', rpc('phone_app_usage', { device_id: device.id, hours: 0 }))).json()).error.message, 'invalid_query');
  assert.equal((await (await send('/__test/read', rpc('phone_app_usage'))).json()).error.message, 'unknown_device');
  const metadata = await mf.dispatchFetch('https://bridge.example.com/.well-known/oauth-protected-resource/mcp');
  assert.equal(metadata.status, 200); assert.equal((await metadata.json()).resource, 'https://bridge.example.com/mcp');
  const registration = await mf.dispatchFetch('https://bridge.example.com/oauth/register', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Test ChatGPT',
      redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'], token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) });
  assert.equal(registration.status, 201);
  const client = await registration.json(), authorize = new URL('https://bridge.example.com/authorize');
  authorize.search = new URLSearchParams({ client_id: client.client_id, response_type: 'code',
    redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', scope: 'phone:read phone:subscribe offline_access',
    state: 'test-state', resource: 'https://bridge.example.com/mcp', code_challenge: 'A'.repeat(43), code_challenge_method: 'S256' }).toString();
  const consent = await mf.dispatchFetch(authorize);
  assert.equal(consent.status, 200);
  const englishConsent = await consent.text();
  assert.match(englishConsent, /<html lang="en">/);
  assert.match(englishConsent, /Allow and verify with GitHub/);
  authorize.searchParams.set('lang', 'zh-CN');
  const chineseConsent = await mf.dispatchFetch(authorize);
  assert.equal(chineseConsent.status, 200);
  const chineseBody = await chineseConsent.text();
  assert.match(chineseBody, /<html lang="zh-CN">/);
  assert.match(chineseBody, /允许并用 GitHub 验证/);
  authorize.searchParams.delete('lang');
  authorize.searchParams.set('redirect_uri', 'https://attacker.example/');
  const invalidRedirect = await mf.dispatchFetch(authorize);
  assert.equal(invalidRedirect.status, 400);
  assert.equal((await invalidRedirect.json()).reason, 'redirect_uri_invalid');
  for (const [index, reason] of ['redirect_uri_invalid', 'authorization_endpoint_invalid', 'client_metadata_unavailable', 'request_invalid',
    'client_metadata_http_403', 'client_metadata_rate_limited', 'client_metadata_timeout'].entries()) {
    const response = await mf.dispatchFetch(`https://bridge.example.com/__test/auth-error?case=${index}`);
    assert.equal(response.status, 400);
    const body = await response.text();
    assert.equal(JSON.parse(body).reason, reason);
    assert.doesNotMatch(body, /do-not-disclose|private\.example/);
  }
});

test('real local Worker: authenticated subscription, signed callback, alarm retry and subscription lifecycle', { timeout: 20000 }, async t => {
  const signingKey = Buffer.alloc(32, 11), secret = `whsec_${signingKey.toString('base64')}`;
  const callback = 'https://chatgpt.com/test-only-phone-callback';
  const verifications = [], deliveries = [];
  let callbackError, redirectVerification = false;
  const { mf, device, send } = await runtime(t, async request => {
    try {
      assert.equal(request.url, callback, 'No request may leave the isolated callback fixture');
      assert.equal(request.method, 'POST');
      const body = await request.text(), data = JSON.parse(body), headers = request.headers;
      const id = headers.get('webhook-id'), timestamp = headers.get('webhook-timestamp');
      const expected = createHmac('sha256', signingKey).update(`${id}.${timestamp}.${body}`).digest('base64');
      assert.equal(headers.get('webhook-signature'), `v1,${expected}`);
      assert.ok(Math.abs(Date.now() / 1000 - Number(timestamp)) < 10);
      assert.match(headers.get('x-mcp-subscription-id'), /^sub_[a-f0-9]{64}$/);
      if (data.type === 'verification') {
        verifications.push({ id, subscriptionId: headers.get('x-mcp-subscription-id') });
        if (redirectVerification) return Response.redirect('https://example.com/must-not-follow', 302);
        return Response.json({ challenge: data.challenge });
      }
      assert.equal(data.name, 'phone.event');
      assert.equal(data.eventId, id);
      deliveries.push({ body, id, data, signature: headers.get('webhook-signature'),
        subscriptionId: headers.get('x-mcp-subscription-id') });
      // The first alarm must persist and retry this transient receiver failure.
      return new Response(null, { status: deliveries.length === 1 ? 503 : 204 });
    } catch (error) {
      callbackError = error;
      return new Response(null, { status: 400 });
    }
  });
  const registration = await mf.dispatchFetch('https://bridge.example.com/oauth/register', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Local callback fixture',
      redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'], token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) });
  assert.equal(registration.status, 201);
  const client = await registration.json(), verifier = 'V'.repeat(43);
  const authorize = new URL('https://bridge.example.com/__test/complete-authorization');
  authorize.search = new URLSearchParams({ client_id: client.client_id, response_type: 'code',
    redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', scope: 'phone:read phone:subscribe offline_access',
    state: 'local-callback-state', resource: 'https://bridge.example.com/mcp',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  const completed = await mf.dispatchFetch(authorize);
  assert.equal(completed.status, 200);
  const redirect = new URL((await completed.json()).redirectTo);
  assert.equal(redirect.searchParams.get('state'), 'local-callback-state');
  const tokenResponse = await mf.dispatchFetch('https://bridge.example.com/oauth/token', { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id,
      code: redirect.searchParams.get('code'), code_verifier: verifier,
      redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', resource: 'https://bridge.example.com/mcp' }).toString() });
  assert.equal(tokenResponse.status, 200);
  const { access_token: accessToken } = await tokenResponse.json();
  assert.equal(typeof accessToken, 'string');
  const rpc = async (method, params = {}) => {
    const response = await send('/mcp', { jsonrpc: '2.0', id: crypto.randomUUID(), method, params }, accessToken);
    assert.equal(response.status, 200);
    const result = await response.json();
    if (callbackError) throw callbackError;
    assert.equal(result.error, undefined, JSON.stringify({ error: result.error, verifiedCallbacks: verifications.length }));
    return result.result;
  };
  assert.deepEqual((await rpc('server/discover')).capabilities.events, {});
  assert.equal((await rpc('events/list')).events[0].name, 'phone.event');
  const params = { name: 'phone.event', arguments: { device_ids: [device.id], kinds: ['notification'] },
    delivery: { mode: 'webhook', url: callback, secret }, ttlMs: 60000, _meta: { progressToken: 'runtime-subscribe' } };
  const subscription = await rpc('events/subscribe', params);
  assert.equal(verifications.length, 1);
  assert.equal(verifications[0].subscriptionId, subscription.id);
  assert.equal((await rpc('events/subscribe', params)).id, subscription.id);
  assert.equal(verifications.length, 1, 'A fresh verification should be reused for renewal');
  const health = async () => (await rpc('tools/call', { name: 'phone_bridge_status', arguments: {} })).structuredContent;
  const until = async (condition, timeout = 6000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (callbackError) throw callbackError;
      if (await condition()) return;
      await delay(100);
    }
    assert.fail('Timed out waiting for the real Durable Object alarm');
  };
  const notification = () => ({ v: 1, event_id: `sc-${randomInt(100000000, 1000000000)}-${randomInt(100000000, 1000000000)}`, device_id: device.id, kind: 'notification',
    occurred_at: new Date().toISOString(), payload: { app: 'Local fixture', body: 'Synthetic delivery test; no phone data' } });
  const event = notification(), receipt = await send('/ingest', event);
  assert.equal(receipt.status, 202);
  // Consume dispatchFetch bodies before waiting for a later alarm/runtime turn.
  const receiptBody = await receipt.json();
  await until(async () => (await health()).deliveries.some(row => row.status === 'accepted' && row.count === 1));
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].body, deliveries[1].body);
  assert.equal(deliveries[0].id, deliveries[1].id);
  assert.notEqual(deliveries[0].signature, deliveries[1].signature, 'A retry must use a fresh signing timestamp');
  assert.equal(deliveries[1].subscriptionId, subscription.id);
  assert.equal(deliveries[1].data.data.event_id, event.event_id);
  assert.equal(deliveries[1].data.data.received_at, receiptBody.received_at);
  const stop = { name: params.name, arguments: params.arguments, delivery: { mode: 'webhook', url: callback },
    _meta: { progressToken: 'runtime-unsubscribe' } };
  await rpc('events/unsubscribe', stop);
  await rpc('events/unsubscribe', stop);
  assert.equal((await health()).subscriptions.length, 0);
  assert.equal((await send('/ingest', notification())).status, 202);
  assert.deepEqual((await health()).deliveries, []);

  const shortLease = await rpc('events/subscribe', { ...params, ttlMs: 300 });
  assert.equal(shortLease.id, subscription.id);
  assert.equal(verifications.length, 2);
  await until(async () => (await health()).subscriptions.length === 0, 3000);
  assert.equal((await send('/ingest', notification())).status, 202);
  await delay(1100);
  assert.deepEqual((await health()).deliveries, []);
  assert.equal(deliveries.length, 2, 'Unsubscribed or expired leases must not receive subsequent events');
  redirectVerification = true;
  const redirected = await send('/mcp', { jsonrpc: '2.0', id: 'reject-redirect', method: 'events/subscribe', params }, accessToken);
  const rejected = await redirected.json();
  assert.equal(rejected.error.code, -32015);
  assert.equal(rejected.error.data.reason, 'challenge_failed');
  assert.equal((await health()).subscriptions.length, 0);
  assert.equal(callbackError, undefined);
});

test('real local Worker: browser-bound GitHub callback succeeds and rejects upstream redirects', { timeout: 20000 }, async t => {
  for (const separateAuthOrigin of [false, true]) await t.test(separateAuthOrigin ? 'separate auth origin with an existing DCR client' : 'same origin', async t => {
    const resourceOrigin = 'https://bridge.example.com', authOrigin = separateAuthOrigin ? 'https://auth.example.com' : resourceOrigin;
    const callbackUrl = 'https://chatgpt.com/test-only-browser-callback', signingKey = Buffer.alloc(32, 13);
    let redirectAt = null, outboundError;
    const calls = [], delivered = [];
    const { mf, device, send, configure } = await runtime(t, async request => {
      try {
        calls.push(request.url);
        if (request.url === callbackUrl) {
          const body = await request.text(), data = JSON.parse(body), headers = request.headers;
          const expected = createHmac('sha256', signingKey)
            .update(`${headers.get('webhook-id')}.${headers.get('webhook-timestamp')}.${body}`).digest('base64');
          assert.equal(headers.get('webhook-signature'), `v1,${expected}`);
          if (data.type === 'verification') return Response.json({ challenge: data.challenge });
          delivered.push(data);
          return new Response(null, { status: 204 });
        }
        if (request.url === 'https://github.com/login/oauth/access_token') {
          assert.equal(request.method, 'POST');
          const form = new URLSearchParams(await request.text());
          assert.equal(form.get('code'), 'fixture-github-code');
          assert.equal(form.get('redirect_uri'), `${authOrigin}/callback`);
          assert.ok(form.get('code_verifier').length >= 43);
          return redirectAt === 'token' ? Response.redirect('https://example.com/must-not-follow', 302)
            : Response.json({ access_token: 'fixture-github-token' });
        }
        assert.equal(request.url, 'https://api.github.com/user', 'No request may escape the GitHub fixture');
        assert.equal(request.headers.get('authorization'), 'Bearer fixture-github-token');
        return redirectAt === 'user' ? Response.redirect('https://example.com/must-not-follow', 302)
          : Response.json({ id: 'test-owner' });
      } catch (error) {
        outboundError = error;
        return new Response(null, { status: 400 });
      }
    });
    // Register before changing origins, then reload the same Worker/KV. This models
    // the existing ChatGPT connection rather than silently creating a new client.
    const registrationBody = { client_name: 'Local GitHub callback fixture',
      redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'], token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
    const register = origin => mf.dispatchFetch(`${origin}/oauth/register`, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(registrationBody) });
    const registration = await register(resourceOrigin);
    assert.equal(registration.status, 201);
    const client = await registration.json(), verifier = 'G'.repeat(43);
    if (separateAuthOrigin) await configure({ AUTH_ORIGIN: authOrigin });
    const resource = await (await mf.dispatchFetch(`${resourceOrigin}/.well-known/oauth-protected-resource/mcp`)).json();
    assert.equal(resource.resource, `${resourceOrigin}/mcp`);
    assert.deepEqual(resource.authorization_servers, [authOrigin]);
    const metadata = await (await mf.dispatchFetch(`${authOrigin}/.well-known/oauth-authorization-server`)).json();
    assert.equal(metadata.issuer, authOrigin);
    assert.equal(metadata.authorization_endpoint, `${authOrigin}/authorize`);
    assert.equal(metadata.token_endpoint, `${authOrigin}/oauth/token`);
    assert.equal(metadata.registration_endpoint, `${authOrigin}/oauth/register`);
    if (separateAuthOrigin) assert.equal((await register(authOrigin)).status, 201);
    for (const stage of [null, 'token', 'user']) {
      redirectAt = stage;
      calls.length = 0;
      const cookies = new Map();
      const browserFetch = async (url, init = {}) => {
        const response = await mf.dispatchFetch(url, { ...init, redirect: 'manual', headers: { ...init.headers,
          cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') } });
        for (const cookie of response.headers.getSetCookie()) {
          const entry = cookie.split(';', 1)[0], separator = entry.indexOf('=');
          cookies.set(entry.slice(0, separator), entry.slice(separator + 1));
        }
        return response;
      };
      const authorize = new URL(`${authOrigin}/authorize`);
      authorize.search = new URLSearchParams({ client_id: client.client_id, response_type: 'code',
        redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', scope: 'phone:read phone:subscribe offline_access',
        state: 'browser-bound-state', resource: 'https://bridge.example.com/mcp',
        code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
      const consent = await browserFetch(authorize);
      assert.equal(consent.status, 200);
      assert.equal(consent.headers.get('referrer-policy'), 'same-origin');
      const handle = (await consent.text()).match(/name="handle" value="([^"]+)"/)?.[1];
      assert.equal(typeof handle, 'string');
      const rejectedOrigin = await browserFetch(authorize, { method: 'POST', headers: {
        'content-type': 'application/x-www-form-urlencoded', origin: 'https://evil.example.com' },
        body: new URLSearchParams({ handle, decision: 'approve' }).toString() });
      assert.equal(rejectedOrigin.status, 403);
      assert.deepEqual(await rejectedOrigin.json(), { error: 'origin_not_allowed' });
      const opaqueOrigin = await browserFetch(authorize, { method: 'POST', headers: {
        'content-type': 'application/x-www-form-urlencoded', origin: 'null' },
        body: new URLSearchParams({ handle, decision: 'approve' }).toString() });
      assert.equal(opaqueOrigin.status, 403);
      assert.deepEqual(await opaqueOrigin.json(), { error: 'origin_not_allowed' });
      // Rejected requests must not consume the browser-bound handle used below.
      const approved = await browserFetch(authorize, { method: 'POST', headers: {
        'content-type': 'application/x-www-form-urlencoded', origin: authOrigin },
        body: new URLSearchParams({ handle, decision: 'approve' }).toString() });
      assert.equal(approved.status, 302);
      const github = new URL(approved.headers.get('location'));
      assert.equal(github.origin, 'https://github.com');
      assert.equal(github.searchParams.get('redirect_uri'), `${authOrigin}/callback`);
      const callback = new URL(github.searchParams.get('redirect_uri'));
      callback.search = new URLSearchParams({ code: 'fixture-github-code', state: github.searchParams.get('state') }).toString();
      const completed = await browserFetch(callback);
      if (outboundError) throw outboundError;
      if (stage) {
        assert.equal(completed.status, 502);
        assert.deepEqual(await completed.json(), { error: 'identity_provider_failed' });
        assert.equal(calls.length, stage === 'token' ? 1 : 2);
        continue;
      }
      assert.equal(completed.status, 302);
      const redirect = new URL(completed.headers.get('location'));
      assert.equal(redirect.origin, 'https://chatgpt.com');
      assert.equal(redirect.searchParams.get('state'), 'browser-bound-state');
      assert.equal(redirect.searchParams.get('iss'), authOrigin);
      const tokens = await mf.dispatchFetch(`${authOrigin}/oauth/token`, { method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code',
          client_id: client.client_id, code: redirect.searchParams.get('code'), code_verifier: verifier,
          redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', resource: 'https://bridge.example.com/mcp' }).toString() });
      assert.equal(tokens.status, 200);
      const tokenBody = await tokens.json(), token = tokenBody.access_token;
      assert.equal(tokenBody.resource, `${resourceOrigin}/mcp`);
      const read = await send('/mcp', { jsonrpc: '2.0', id: 'github-callback-check', method: 'tools/list' }, token);
      assert.equal(read.status, 200);
      assert.ok((await read.json()).result.tools.some(tool => tool.name === 'phone_devices'));
      if (separateAuthOrigin) {
        const rpc = async (method, params = {}) => {
          const result = await (await send('/mcp', { jsonrpc: '2.0', id: crypto.randomUUID(), method, params }, token)).json();
          if (outboundError) throw outboundError;
          assert.equal(result.error, undefined, JSON.stringify(result.error));
          return result.result;
        };
        await rpc('events/subscribe', { name: 'phone.event', arguments: { device_ids: [device.id] },
          delivery: { mode: 'webhook', url: callbackUrl, secret: `whsec_${signingKey.toString('base64')}` } });
        const event = { v: 1, event_id: crypto.randomUUID(), device_id: device.id, kind: 'notification',
          occurred_at: new Date().toISOString(), payload: { app: 'Origin migration fixture', body: 'Synthetic event' } };
        assert.equal((await send('/ingest', event, undefined, authOrigin)).status, 202);
        const deadline = Date.now() + 3000;
        let accepted = false;
        while (Date.now() < deadline) {
          const health = (await rpc('tools/call', { name: 'phone_bridge_status', arguments: {} })).structuredContent;
          if (health.deliveries.some(row => row.status === 'accepted')) { accepted = true; break; }
          await delay(100);
        }
        assert.equal(accepted, true, 'The grant must retain the old MCP resource through the alarm check');
        assert.equal(delivered.length, 1);
        assert.equal(delivered[0].data.event_id, event.event_id);
        const wrongOrigin = await send('/mcp', { jsonrpc: '2.0', id: 'wrong-audience', method: 'tools/list' }, token, authOrigin);
        assert.ok([401, 404].includes(wrongOrigin.status), 'The auth origin must not become a second MCP audience');
      }
    }
  });
});
