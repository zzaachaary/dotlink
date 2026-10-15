import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setupResponse } from '../src/setup.mjs';
import { SETUP_SCRIPT } from '../src/setup-client.mjs';
import { setupBrowser } from './helpers/setup-browser.mjs';
import { authenticateDevice, deviceRegistry } from '../src/access.mjs';
import { seal, unseal } from '../src/subscriptions.mjs';

test('setup and its exact local assets work without any Worker configuration', async () => {
  for (const path of ['/setup', '/setup/', '/setup/style.css', '/setup/app.js']) {
    const response = setupResponse(new Request(`https://fresh.example${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    const csp = response.headers.get('content-security-policy');
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /connect-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https:/);
  }
  const html = await setupResponse(new Request('https://fresh.example/setup')).text();
  assert.match(html, /<html lang="en">/);
  assert.match(html, /DotLink/);
  assert.match(html, /type="module" src="\/setup\/app.js"/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)|\son\w+=|\sstyle=/);
  for (const path of ['/setupper', '/setup/private', '/setup/app.js/extra', '/setup/%61pp.js', '/mcp', '/ingest'])
    assert.equal(setupResponse(new Request(`https://fresh.example${path}`)), null);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = setupResponse(new Request('https://fresh.example/setup', { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
  assert.equal(await setupResponse(new Request('https://fresh.example/setup', { method: 'HEAD' })).text(), '');
});

test('generated credentials use separate 32-byte draws and match real server authentication and sealing', async () => {
  const { generateCredentials } = setupBrowser(SETUP_SCRIPT, { exposeApi: true }).api;
  const calls = [];
  const cryptoApi = { subtle: crypto.subtle, getRandomValues(bytes) {
    calls.push(bytes.length); return crypto.getRandomValues(bytes);
  } };
  const credentials = await generateCredentials(cryptoApi);
  assert.deepEqual(calls, [32, 32]);
  assert.match(credentials.sealKey, /^[A-Za-z0-9+/]{43}=$/);
  assert.match(credentials.deviceToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notDeepEqual(Buffer.from(credentials.sealKey, 'base64'), Buffer.from(credentials.deviceToken, 'base64url'));
  const env = { DEVICE_REGISTRY: credentials.registry };
  assert.equal(deviceRegistry(env)[0].id, 'iphone-primary');
  const device = await authenticateDevice(new Request('https://fresh.example/ingest', {
    headers: { authorization: `Bearer ${credentials.deviceToken}` },
  }), env);
  assert.equal(device.id, 'iphone-primary');
  const value = { secret: 'synthetic-test-only' };
  assert.deepEqual(await unseal(await seal(value, credentials.sealKey, 'test'), credentials.sealKey, 'test'), value);
});

test('setup points both languages to published templates and lists every excluded notification source', async () => {
  const html = await setupResponse(new Request('https://fresh.example/setup')).text();
  assert.match(html, /https:\/\/github.com\/zzaachaary\/dotlink\/releases\/tag\/v0\.1\.0-beta\.1/);
  assert.doesNotMatch(html, /Importable templates are not available yet|暂未提供可导入模板/);
  assert.match(html, /ChatGPT, Codex and Shortcuts/);
  assert.match(html, /ChatGPT、Codex 和快捷指令/);
});

test('credential session starts empty, requires fresh-install confirmation and never silently rotates', async () => {
  const { createCredentialSession } = setupBrowser(SETUP_SCRIPT, { exposeApi: true }).api;
  let calls = 0;
  const session = createCredentialSession(async () => { calls++; return { marker: calls }; });
  assert.equal(session.current(), null);
  await assert.rejects(session.generate(false, true), /fresh_install_required/);
  await assert.rejects(session.generate(true, false), /secure_context_required/);
  assert.equal(calls, 0);
  const [first, second] = await Promise.all([session.generate(true, true), session.generate(true, true)]);
  assert.equal(first, second);
  assert.equal(session.current(), first);
  assert.equal(await session.generate(true, true), first);
  assert.equal(calls, 1);
  assert.equal(createCredentialSession().current(), null, 'a new page session has no previous credentials');
});

test('browser source keeps secrets local and generation is only wired to explicit click', async () => {
  const source = await readFile(new URL('../src/setup-client.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie|console\.|fetch\(|XMLHttpRequest|sendBeacon|createObjectURL|\.download\s*=/);
  assert.match(source, /location\.origin/);
  assert.match(source, /addEventListener\('click', async \(\) =>/);
  assert.match(source, /navigator\.clipboard/);
  assert.match(source, /\.select\(\)/);
});
