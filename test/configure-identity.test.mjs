import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Run the real CLI in an isolated project; replace only its external Wrangler boundary.
// This fixture never loads the real project's private files or contacts Cloudflare.
function fixture(t, { inventory = '[]', listStatus = 0, localKey, bulkStatus = 0, leak = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dotlink-identity-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'work/private'), { recursive: true, mode: 0o700 });
  copyFileSync(new URL('../scripts/configure-identity.mjs', import.meta.url), join(root, 'scripts/configure-identity.mjs'));
  writeFileSync(join(root, 'work/private/github-oauth.json'), JSON.stringify({
    GITHUB_CLIENT_ID: 'fixture-only', GITHUB_CLIENT_SECRET: 'fixture-only',
  }), { mode: 0o600 });
  const keyFile = join(root, 'work/private/bridge-seal-key');
  if (localKey !== undefined) writeFileSync(keyFile, localKey, { mode: 0o600 });
  writeFileSync(join(root, 'scenario.json'), JSON.stringify({ inventory, listStatus, bulkStatus, leak }));
  writeFileSync(join(root, 'scripts/wrangler.mjs'), `
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), scenario = JSON.parse(readFileSync('scenario.json', 'utf8'));
appendFileSync('calls.jsonl', JSON.stringify(args) + '\\n');
if (args[0] !== 'secret') process.exit(90);
if (args[1] === 'list') {
  if (args.length !== 4 || args[2] !== '--format' || args[3] !== 'json') process.exit(91);
  process.stdout.write(scenario.inventory);
  if (scenario.leak) process.stderr.write('fixture-diagnostic-must-not-escape');
  process.exit(scenario.listStatus);
}
if (args[1] === 'bulk' && args.length === 2) {
  const input = readFileSync(0, 'utf8');
  writeFileSync('uploaded.json', input, { mode: 0o600 });
  if (scenario.leak) process.stderr.write('fixture-diagnostic-must-not-escape');
  process.exit(scenario.bulkStatus);
}
process.exit(92);
`);
  const result = spawnSync(process.execPath, [join(root, 'scripts/configure-identity.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 128 * 1024, env: { PATH: process.env.PATH },
  });
  assert.equal(result.error, undefined);
  const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
  return { ...result, root, keyFile, read,
    uploaded: existsSync(join(root, 'uploaded.json')),
    calls: existsSync(join(root, 'calls.jsonl')) ? readFileSync(join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [],
  };
}

test('identity updates preserve an existing remote seal key when no local backup exists', t => {
  const result = fixture(t, { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"secret_text"}]' });
  assert.equal(result.status, 0);
  assert.deepEqual(Object.keys(result.read('uploaded.json')).sort(), ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']);
  assert.equal(existsSync(result.keyFile), false, 'Reconnecting must not create a replacement seal key');
  assert.deepEqual(result.calls, [['secret', 'list', '--format', 'json'], ['secret', 'bulk']]);
});

test('a remote seal key takes precedence over a stale or invalid local backup', t => {
  const result = fixture(t, { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"secret_text"}]', localKey: 'not-a-valid-key' });
  assert.equal(result.status, 0);
  assert.deepEqual(Object.keys(result.read('uploaded.json')).sort(), ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']);
  assert.equal(readFileSync(result.keyFile, 'utf8'), 'not-a-valid-key');
});

test('fresh identity setup creates one private seal key when the remote inventory is empty', t => {
  const result = fixture(t);
  assert.equal(result.status, 0);
  const stored = readFileSync(result.keyFile, 'utf8');
  assert.match(stored, /^[A-Za-z0-9+/]{43}=$/);
  assert.equal(result.read('uploaded.json').BRIDGE_SEAL_KEY, stored);
  assert.equal(statSync(result.keyFile).mode & 0o777, 0o600);
  assert.deepEqual(result.calls, [['secret', 'list', '--format', 'json'], ['secret', 'bulk']]);
});

test('fresh identity setup reuses its existing local seal key without rotation', t => {
  const localKey = Buffer.alloc(32, 7).toString('base64');
  const result = fixture(t, { inventory: '[{"name":"GITHUB_CLIENT_ID","type":"secret_text"}]', localKey });
  assert.equal(result.status, 0);
  assert.equal(result.read('uploaded.json').BRIDGE_SEAL_KEY, localKey);
  assert.equal(readFileSync(result.keyFile, 'utf8'), localKey);
});

test('failed or malformed secret inventories stop before key generation or upload', t => {
  const scenarios = [
    { inventory: '[]', listStatus: 1, leak: true },
    { inventory: '' }, { inventory: '[' }, { inventory: '{}'}, { inventory: '[null]' },
    { inventory: '[{}]' }, { inventory: '[{"name":"","type":"secret_text"}]' },
    { inventory: '[{"name":"BRIDGE_SEAL_KEY"}]' },
    { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"plain_text"}]' },
    { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"secret_text"},{}]' },
    { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"secret_text"},{"name":"BRIDGE_SEAL_KEY","type":"secret_text"}]' },
    { inventory: '[]\ntrailing non-JSON output' },
    { inventory: ' '.repeat(128 * 1024 + 1) },
  ];
  for (const scenario of scenarios) {
    const result = fixture(t, scenario);
    assert.equal(result.status, 1);
    assert.equal(result.uploaded, false, 'Uncertain remote state must not permit secret writes');
    assert.equal(existsSync(result.keyFile), false);
    assert.equal(result.stderr.includes('fixture-diagnostic-must-not-escape'), false);
  }
});

test('invalid local seal keys stop fresh setup before upload', t => {
  const result = fixture(t, { localKey: 'not-a-valid-key' });
  assert.equal(result.status, 1);
  assert.equal(result.uploaded, false);
  assert.equal(readFileSync(result.keyFile, 'utf8'), 'not-a-valid-key');
});

test('bulk failures report failure without exposing subprocess diagnostics', t => {
  const result = fixture(t, { inventory: '[{"name":"BRIDGE_SEAL_KEY","type":"secret_text"}]', bulkStatus: 1, leak: true });
  assert.equal(result.status, 1);
  assert.equal(result.stderr.includes('fixture-diagnostic-must-not-escape'), false);
  assert.equal(existsSync(result.keyFile), false);
});
