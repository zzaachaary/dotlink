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

test('setup offers only Notifications and marks Charging and Focus as coming soon in both languages', async () => {
  const html = await setupResponse(new Request('https://fresh.example/setup')).text();
  assert.match(html, /releases\/download\/v0\.1\.0\/DotLink-Notifications\.shortcut"/);
  assert.doesNotMatch(html, /data-module=|id="guide-(?:battery|focus)"|href="[^"]*DotLink-(?:Charging|Focus-On|Focus-Off)\.shortcut/);
  assert.match(html, /Coming soon/);
  assert.match(html, /即将推出/);
  assert.match(html, /Focus On &amp; Off|Focus On &#38; Off/);
  assert.match(html, /id="subscription-prompt"[^>]*data-value-en=/);
  assert.match(html, /events\/subscribe/);
  assert.match(html, /refreshBefore/);
  assert.match(html, /ChatGPT, Codex and Shortcuts/);
  assert.match(html, /ChatGPT、Codex 和快捷指令/);
});

test('subscription prompt copies the active language without generating or copying credentials', async () => {
  const browser = setupBrowser(SETUP_SCRIPT), field = browser.elements.get('subscription-prompt');
  const copy = browser.groups['[data-copy]'].find(button => button.dataset.copy === field.id);
  assert.equal(field.value, field.dataset.valueEn);
  assert.equal(copy.disabled, false);
  await copy.dispatch('click');
  assert.equal(browser.copies.at(-1), field.dataset.valueEn);
  assert.match(browser.elements.get('status').textContent, /Prompt copied/);
  await browser.groups['[data-language]'][1].dispatch('click');
  assert.equal(field.value, field.dataset.valueZh);
  await copy.dispatch('click');
  assert.equal(browser.copies.at(-1), field.dataset.valueZh);
  assert.match(browser.elements.get('status').textContent, /提示词已复制/);
  assert.equal(browser.elements.get('device-token').value, '');
  assert.equal(browser.elements.get('credentials').hidden, true);

  const denied = setupBrowser(SETUP_SCRIPT, { clipboardAvailable: false });
  await denied.groups['[data-language]'][1].dispatch('click');
  await denied.groups['[data-copy]'].find(button => button.dataset.copy === field.id).dispatch('click');
  assert.equal(denied.elements.get(field.id).selected, true);
  assert.equal(denied.elements.get(field.id).value, field.dataset.valueZh);
  assert.doesNotMatch(denied.elements.get('status').textContent, /隐藏/);
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

test('step four copies current configuration and prevents empty or invalid GitHub IDs', async () => {
  const browser = setupBrowser(SETUP_SCRIPT), field = id => browser.elements.get(id);
  const copy = id => browser.groups['[data-copy]'].find(button => button.dataset.copy === id);
  assert.equal(field('config-origin').value, 'https://fresh.example');
  assert.equal(field('config-ingest').value, 'false');
  for (const id of ['config-owner-id', 'config-client-id', 'config-seal-key', 'config-registry'])
    assert.equal(copy(id).disabled, true);
  assert.equal(browser.groups['[data-config-pending]'].every(element => !element.hidden), true);
  assert.equal(browser.groups['[data-config-ready]'].every(element => element.hidden), true);

  field('owner-github-id').value = ' 12345678 ';
  await field('owner-github-id').dispatch('input');
  field('github-client-id').value = ' Iv1.synthetic-client ';
  await field('github-client-id').dispatch('input');
  assert.equal(field('config-owner-id').value, '12345678');
  assert.equal(field('config-client-id').value, 'Iv1.synthetic-client');
  for (const id of ['config-origin', 'config-owner-id', 'config-ingest', 'config-client-id']) {
    assert.equal(copy(id).disabled, false);
    await copy(id).dispatch('click');
  }
  assert.deepEqual(browser.copies, ['https://fresh.example', '12345678', 'false', 'Iv1.synthetic-client']);

  for (const input of ['octocat', '12e3', '-12', '12.3']) {
    field('owner-github-id').value = input;
    await field('owner-github-id').dispatch('input');
    assert.equal(copy('config-owner-id').disabled, true);
    assert.equal(field('owner-github-id').getAttribute('aria-invalid'), 'true');
    assert.equal(browser.groups['[data-validation="owner-github-id"]'][0].hidden, false);
    await copy('config-owner-id').dispatch('click');
  }
  assert.equal(browser.copies.length, 4, 'an invalid value never reaches the clipboard');
  field('owner-github-id').value = ' ';
  await field('owner-github-id').dispatch('input');
  assert.equal(browser.groups['[data-validation="owner-github-id"]'][0].hidden, true);
  field('github-client-id').value = ' ';
  await field('github-client-id').dispatch('input');
  assert.equal(copy('config-client-id').disabled, true);
});

test('step four credentials copy while hidden and remain stable across language and mode changes', async () => {
  const browser = setupBrowser(SETUP_SCRIPT), field = id => browser.elements.get(id);
  const copy = id => browser.groups['[data-copy]'].find(button => button.dataset.copy === id);
  field('fresh-install').checked = true;
  await field('fresh-install').dispatch('change');
  await field('generate').dispatch('click');
  const before = ['seal-key', 'device-token', 'device-registry', 'config-seal-key', 'config-registry']
    .map(id => [id, field(id).value]);
  assert.equal(field('config-seal-key').value, field('seal-key').value);
  assert.equal(field('config-registry').value, field('device-registry').value);
  assert.equal(browser.groups['[data-config-pending]'].every(element => element.hidden), true);
  assert.equal(browser.groups['[data-config-ready]'].every(element => !element.hidden), true);
  for (const id of ['config-seal-key', 'config-registry']) {
    assert.equal(field(id).hidden, true);
    assert.equal(copy(id).disabled, false);
    await copy(id).dispatch('click');
    assert.equal(field(id).hidden, true, 'copy does not reveal the secret');
  }
  assert.deepEqual(browser.copies, [field('seal-key').value, field('device-registry').value]);

  for (const button of browser.groups['[data-reveal]']) await button.dispatch('click');
  await browser.groups['[data-language]'][1].dispatch('click');
  await browser.groups['[data-mode]'][1].dispatch('click');
  assert.equal(before.every(([id]) => field(id).hidden), true, 'existing mode masks both credential locations');
  assert.equal(browser.groups['[data-mask]'].every(mask => !mask.hidden), true);
  await browser.groups['[data-mode]'][0].dispatch('click');
  assert.deepEqual(before.map(([id]) => [id, field(id).value]), before);
  assert.equal(field('generate').disabled, true);
  assert.equal(copy('config-seal-key').getAttribute('aria-label'), '复制 config-seal-key');
  assert.equal(field('owner-github-id').getAttribute('placeholder'), '你的 GitHub 数字 ID');
  assert.equal(browser.groups['[data-aria-label-en]'][0].getAttribute('aria-label'), '设置导航');
  const freshPage = setupBrowser(SETUP_SCRIPT);
  assert.equal(freshPage.elements.get('config-seal-key').value, '');
  assert.equal(freshPage.elements.get('config-owner-id').value, '');
});

test('clipboard denial selects the configuration field at the copy button without changing its original', async () => {
  const browser = setupBrowser(SETUP_SCRIPT, { clipboardAvailable: false });
  const field = id => browser.elements.get(id);
  field('fresh-install').checked = true;
  await field('generate').dispatch('click');
  await browser.groups['[data-copy]'].find(button => button.dataset.copy === 'config-registry').dispatch('click');
  assert.equal(field('config-registry').hidden, false);
  assert.equal(field('config-registry').focused, true);
  assert.equal(field('config-registry').selected, true);
  assert.equal(browser.groups['[data-mask]'].find(mask => mask.dataset.mask === 'config-registry').hidden, true);
  assert.equal(field('device-registry').hidden, true);
  assert.equal(browser.copies.length, 0);
  assert.match(field('status').textContent, /Clipboard unavailable/);
});
