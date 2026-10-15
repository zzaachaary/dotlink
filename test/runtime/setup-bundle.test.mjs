import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Miniflare, Log, LogLevel, Response, convertV4MiniflareOptions } from 'miniflare';
import { authenticateDevice } from '../../src/access.mjs';
import { setupBrowser } from '../helpers/setup-browser.mjs';

test('Wrangler bundled setup script boots and generates working credentials without Worker-only helpers', { timeout: 30000 }, async t => {
  const root = resolve(import.meta.dirname, '../..'), temporary = await mkdtemp(join(tmpdir(), 'dotlink-setup-bundle-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const config = JSON.parse(await readFile(join(root, 'wrangler.example.jsonc'), 'utf8'));
  config.main = join(root, config.main);
  const configPath = join(temporary, 'wrangler.json'), outdir = join(temporary, 'build');
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
  const build = spawnSync(process.execPath, [join(root, 'scripts/wrangler.mjs'), 'deploy', '--dry-run', '--config', configPath,
    '--outdir', outdir], { cwd: root, encoding: 'utf8', timeout: 20000 });
  if (build.error) throw build.error;
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const source = await readFile(join(outdir, 'worker.js'), 'utf8');
  const mf = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR), workers: [{
    name: 'setup-bundle', modules: true, script: source, compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags, durableObjects: { BRIDGE: { className: 'PhoneBridge', useSQLite: true } },
    kvNamespaces: ['OAUTH_KV'], outboundService: () => new Response('Unexpected outbound request', { status: 502 }),
  }] }));
  t.after(() => mf.dispose());
  const response = await mf.dispatchFetch('https://fresh.example/setup/app.js');
  assert.equal(response.status, 200);
  const browser = setupBrowser(await response.text()), field = id => browser.elements.get(id);
  assert.equal(field('generate').disabled, true);
  assert.equal(field('seal-key').value, '');
  assert.equal(field('public-origin').value, 'https://fresh.example');
  field('fresh-install').checked = true; await field('fresh-install').dispatch('change');
  assert.equal(field('generate').disabled, false);
  await field('generate').dispatch('click');
  assert.match(field('seal-key').value, /^[A-Za-z0-9+/]{43}=$/);
  assert.match(field('device-token').value, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(field('generate').disabled, true);
  const firstToken = field('device-token').value;
  const device = await authenticateDevice(new Request('https://fresh.example/ingest', {
    headers: { authorization: `Bearer ${firstToken}` },
  }), { DEVICE_REGISTRY: field('device-registry').value });
  assert.equal(device.id, 'iphone-primary');
  await browser.groups['[data-language]'][1].dispatch('click');
  assert.equal(browser.document.documentElement.lang, 'zh-CN');
  assert.equal(field('generate').textContent, '本次会话凭据已生成');
  await browser.groups['[data-copy]'][1].dispatch('click');
  assert.equal(browser.copies[0], firstToken);
  await field('generate').dispatch('click');
  assert.equal(field('device-token').value, firstToken, 'A repeated action must not rotate the session credentials');
});
