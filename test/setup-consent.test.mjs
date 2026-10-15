import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Only the provider's unused base class needs a Node substitute; real Worker coverage lives in runtime tests.
const hooks = registerHooks({ resolve(specifier, context, next) {
  return specifier === 'cloudflare:workers'
    ? { url: 'data:text/javascript,export class WorkerEntrypoint {}', shortCircuit: true }
    : next(specifier, context);
} });
const { authorization } = await import('../src/auth.mjs');
hooks.deregister();

function environment() {
  const calls = [];
  return { calls, PUBLIC_ORIGIN: 'https://bridge.example', OWNER_GITHUB_ID: '123',
    GITHUB_CLIENT_ID: 'test-only', GITHUB_CLIENT_SECRET: 'test-only', OAUTH_PROVIDER: {
      async parseAuthRequest(request) { calls.push(['parse', request.url]); return { scope: ['phone:read'], redirectUri: 'https://chatgpt.com/connector_platform_oauth_redirect' }; },
      async describeConsent() { return { clientName: '<unsafe-client>', clientDomain: 'example.com', redirectHost: 'chatgpt.com' }; },
      async beginConsent() { return { handle: '\"><unsafe-handle>', headers: new Headers({ 'set-cookie': 'fixture=browser-bound; Secure; HttpOnly' }) }; },
      async denyConsent(request, handle) { calls.push(['deny', handle]); return { headers: new Headers({ Location: 'https://chatgpt.com/denied' }) }; },
    } };
}

test('consent defaults to English, safely preserves OAuth query and handles while toggling Chinese', async () => {
  const env = environment();
  const url = new URL('https://bridge.example/authorize');
  url.search = new URLSearchParams({ client_id: 'registered-client', state: 'a&b="<', code_challenge: 'proof', lang: 'invalid' });
  const response = await authorization(new Request(url), env), html = await response.text();
  assert.equal(response.headers.get('referrer-policy'), 'same-origin', 'Consent form POST must retain its same-origin Origin header');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Allow and verify with GitHub/);
  assert.match(html, /health/);
  assert.match(html, /all data available/);
  assert.doesNotMatch(html, /<unsafe-client>|<unsafe-handle>/);
  assert.match(html, /&#60;unsafe-client&#62;/);
  assert.match(html, /name="handle" value="&#34;&#62;&#60;unsafe-handle&#62;"/);
  assert.match(response.headers.get('set-cookie'), /browser-bound/);
  const link = html.match(/href="([^\"]+)"[^>]*lang="zh-CN"/)[1].replaceAll('&#38;', '&');
  const destination = new URL(link, url);
  assert.equal(destination.origin, url.origin);
  assert.equal(destination.pathname, '/authorize');
  for (const key of ['client_id', 'state', 'code_challenge']) assert.equal(destination.searchParams.get(key), url.searchParams.get(key));
  assert.equal(destination.searchParams.get('lang'), 'zh-CN');
  const chinese = await (await authorization(new Request(destination), env)).text();
  assert.match(chinese, /<html lang="zh-CN">/);
  assert.match(chinese, /允许并用 GitHub 验证/);
  assert.match(chinese, /健康/);
  assert.equal(env.calls.filter(call => call[0] === 'parse').length, 2);
});

test('language query does not bypass provider-bound consent cancellation', async () => {
  const env = environment();
  const response = await authorization(new Request('https://bridge.example/authorize?lang=zh-CN', {
    method: 'POST', body: new URLSearchParams({ handle: 'bound-handle', decision: 'deny' }),
  }), env);
  assert.equal(response.status, 302);
  assert.deepEqual(env.calls, [['deny', 'bound-handle']]);
});

test('consent permits cancellation only to the provider-validated callback origin', async () => {
  for (const [redirectUri, origin] of [
    ['https://client.example:8443/callback?state=private', 'https://client.example:8443'],
    ['http://127.0.0.1:54321/callback', 'http://127.0.0.1:54321'],
  ]) {
    const env = environment();
    env.OAUTH_PROVIDER.parseAuthRequest = async () => ({ scope: ['phone:read'], redirectUri });
    const response = await authorization(new Request('https://bridge.example/authorize?redirect_uri=https://unvalidated.example/callback'), env);
    assert.equal(response.status, 200);
    const csp = response.headers.get('content-security-policy');
    const sources = csp.split(';').find(item => item.trim().startsWith('form-action ')).trim().split(/\s+/).slice(1);
    assert.deepEqual(sources, ["'self'", 'https://github.com', origin]);
    assert.doesNotMatch(csp, /unvalidated|private|https:\s|http:\s/);
  }
});

test('consent never treats opaque origins or CSP separators as callback sources', async () => {
  for (const redirectUri of ['myapp://callback', 'https://client.example;script-src/callback']) {
    const env = environment();
    env.OAUTH_PROVIDER.parseAuthRequest = async () => ({ scope: ['phone:read'], redirectUri });
    const response = await authorization(new Request('https://bridge.example/authorize'), env);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('content-security-policy'), null);
    assert.deepEqual(await response.json(), { error: 'unsupported_redirect_uri' });
  }
});
