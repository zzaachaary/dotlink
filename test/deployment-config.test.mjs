import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkRelease } from '../scripts/check-release.mjs';
import { wranglerArguments, wranglerEnvironment } from '../scripts/wrangler-config.mjs';

const root = resolve(import.meta.dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');

test('public configuration preserves dashboard settings and stable resource identity', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  assert.deepEqual(config, JSON.parse(read('wrangler.example.jsonc')));
  assert.equal(config.name, 'dotlink');
  assert.equal(config.main, 'src/worker.mjs');
  assert.equal(config.compatibility_date, '2026-09-30');
  assert.deepEqual(config.compatibility_flags, ['nodejs_compat', 'global_fetch_strictly_public']);
  assert.equal(config.keep_vars, true);
  assert.equal(config.preview_urls, false);
  assert.equal('vars' in config, false, 'Dashboard values must not be overwritten by checked-in defaults');
  assert.equal('account_id' in config, false);
  assert.deepEqual(config.kv_namespaces, [{ binding: 'OAUTH_KV' }]);
  assert.deepEqual(config.durable_objects, { bindings: [{ name: 'BRIDGE', class_name: 'PhoneBridge' }] });
  assert.deepEqual(config.migrations, [{ tag: 'v1', new_sqlite_classes: ['PhoneBridge'] }]);
});

test('first deployment declares no required secrets before the public setup page exists', () => {
  const lines = read('.dev.vars.example').split(/\r?\n/).filter(line => line && !line.startsWith('#'));
  assert.deepEqual(lines, [], 'Cloudflare turns even empty assignments into required first-deploy inputs');
  const ignore = read('.gitignore').split(/\r?\n/);
  assert.ok(ignore.includes('!.dev.vars.example'));
  assert.ok(ignore.includes('wrangler.local.*'));
  assert.equal(ignore.includes('wrangler.jsonc'), false);
});

test('Wrangler wrapper shares one private configuration across advanced commands', t => {
  const directory = mkdtempSync(join(tmpdir(), 'dotlink-wrapper-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'wrangler.jsonc'), '{}');
  writeFileSync(join(directory, 'wrangler.local.jsonc'), '{}');
  for (const args of [['deploy'], ['secret', 'bulk'], ['secret', 'put', 'DEVICE_REGISTRY']]) {
    assert.deepEqual(wranglerArguments(args, directory), [...args, '--config', join(directory, 'wrangler.jsonc')]);
    assert.deepEqual(wranglerArguments(args, directory, 'wrangler.local.jsonc'),
      [...args, '--config', join(directory, 'wrangler.local.jsonc')]);
  }
  assert.throws(() => wranglerArguments(['deploy'], directory, '../outside.jsonc'), /project_configuration_file/);
  symlinkSync(join(directory, 'wrangler.jsonc'), join(directory, 'wrangler.link.jsonc'));
  assert.throws(() => wranglerArguments(['deploy'], directory, 'wrangler.link.jsonc'), /without_symlinks/);
  const explicit = ['deploy', '--dry-run', '--config', '/temporary/wrangler.json'];
  assert.deepEqual(wranglerArguments(explicit, directory, 'missing.jsonc'), explicit);
  assert.throws(() => wranglerArguments([...explicit, '--config=duplicate.json'], directory), /multiple_wrangler_configs/);
});

test('dry-run wrapper removes authentication and isolates state while deploy preserves it', () => {
  const environment = { PATH: '/bin', CLOUDFLARE_API_TOKEN: 'fixture-only', CF_API_KEY: 'fixture-only',
    WRANGLER_CF_AUTHORIZATION_TOKEN: 'fixture-only', DOTLINK_CONFIG: 'wrangler.local.jsonc' };
  const env = wranglerEnvironment(environment, '/temporary/state', true);
  for (const name of ['CLOUDFLARE_API_TOKEN', 'CF_API_KEY', 'WRANGLER_CF_AUTHORIZATION_TOKEN', 'DOTLINK_CONFIG'])
    assert.equal(name in env, false);
  assert.equal(env.CLOUDFLARE_AUTH_USE_KEYRING, 'false');
  assert.equal(env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV, 'false');
  assert.equal(env.XDG_CONFIG_HOME, '/temporary/state/cf-config');
  assert.equal(env.PATH, '/bin');
  assert.equal(wranglerEnvironment(environment, '/project/work', false).CLOUDFLARE_API_TOKEN, 'fixture-only');
});

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'dotlink-release-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const files = ['package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md',
    'THIRD_PARTY_NOTICES.zh-CN.md', 'wrangler.jsonc', 'wrangler.example.jsonc', '.dev.vars.example'];
  for (const file of files) writeFileSync(join(directory, file), read(file));
  // Fixture notices only need their license link; full project docs have other release dependencies.
  for (const file of ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.zh-CN.md'])
    writeFileSync(join(directory, file), '@cloudflare/workers-oauth-provider [License](LICENSE)\n');
  files.push('release-files.json');
  const manifest = () => writeFileSync(join(directory, 'release-files.json'), JSON.stringify(files));
  manifest();
  return { directory, files, manifest };
}

test('release check passes an explicit manifest and never reads private directories', t => {
  const { directory } = fixture(t);
  mkdirSync(join(directory, 'work'));
  symlinkSync('/path-that-must-never-be-read', join(directory, 'work', 'private'));
  symlinkSync('/path-that-must-never-be-read', join(directory, '.env'));
  assert.deepEqual(checkRelease(directory), { checked: 10, issues: [] });
});

test('release check rejects unlisted public files, escaping paths and symlinks', t => {
  const { directory, files, manifest } = fixture(t);
  writeFileSync(join(directory, 'unexpected.txt'), 'unreviewed');
  assert.ok(checkRelease(directory).issues.some(issue => issue.includes('not in release manifest')));
  files.push('../outside.txt'); manifest();
  assert.ok(checkRelease(directory).issues.some(issue => issue.includes('safe relative')));
  files.pop(); files.push('linked.txt'); manifest();
  symlinkSync('/path-that-must-never-be-read', join(directory, 'linked.txt'));
  assert.ok(checkRelease(directory).issues.some(issue => issue.includes('symlink')));
});

test('release check detects secrets without exposing their values and checks local link targets', t => {
  const { directory, files, manifest } = fixture(t);
  files.push('README.md'); manifest();
  const credential = 'gh' + 'p_' + 'a'.repeat(36);
  writeFileSync(join(directory, 'README.md'), `[Broken](missing.md)\n${credential}\n`);
  let issues = checkRelease(directory).issues;
  assert.ok(issues.some(issue => issue.includes('possible credential')));
  assert.ok(issues.some(issue => issue.includes('link target')));
  assert.ok(issues.every(issue => !issue.includes(credential)));
  writeFileSync(join(directory, 'README.md'), 'BRIDGE_SEAL_' + 'KEY: "not-a-safe-fixture"\n');
  writeFileSync(join(directory, '.dev.vars.example'), 'GITHUB_CLIENT_' + 'SECRET="not-an-empty-placeholder"\n');
  issues = checkRelease(directory).issues;
  assert.ok(issues.some(issue => issue.includes('literal secret value')));
  assert.ok(issues.some(issue => issue.includes('comments only')));
});

test('release check rejects empty secrets that would block the bootstrap deployment', t => {
  const { directory } = fixture(t);
  writeFileSync(join(directory, '.dev.vars.example'), 'BRIDGE_SEAL_KEY=\nDEVICE_REGISTRY=\n');
  assert.ok(checkRelease(directory).issues.some(issue => issue.includes('comments only')));
});

test('release check rejects deployment defaults that overwrite the dashboard and altered license text', t => {
  const { directory } = fixture(t);
  const config = JSON.parse(read('wrangler.jsonc'));
  config.vars = { ENABLE_INGEST: 'true' };
  writeFileSync(join(directory, 'wrangler.jsonc'), JSON.stringify(config));
  writeFileSync(join(directory, 'LICENSE'), 'wrong license');
  const issues = checkRelease(directory).issues;
  assert.ok(issues.some(issue => issue.includes('unsafe template')));
  assert.ok(issues.some(issue => issue.startsWith('LICENSE:')));
});

test('release check uses canonical documents while keeping code and configuration in the project', t => {
  const source = fixture(t), documents = fixture(t);
  writeFileSync(join(documents.directory, 'wrangler.jsonc'), '{}');
  assert.deepEqual(checkRelease(source.directory, { documentRoot: documents.directory }), { checked: 10, issues: [] });
  writeFileSync(join(documents.directory, 'LICENSE'), 'changed canonical license');
  assert.deepEqual(checkRelease(source.directory), { checked: 10, issues: [] });
  assert.ok(checkRelease(source.directory, { documentRoot: documents.directory }).issues.some(issue => issue.startsWith('LICENSE:')));
});

test('canonical document validation never falls back to frozen files or accepts symlinks', t => {
  const source = fixture(t);
  const documents = mkdtempSync(join(tmpdir(), 'dotlink-canonical-test-'));
  t.after(() => rmSync(documents, { recursive: true, force: true }));
  let issues = checkRelease(source.directory, { documentRoot: documents }).issues;
  assert.ok(issues.some(issue => issue.startsWith('LICENSE: missing')));
  assert.ok(issues.some(issue => issue.startsWith('THIRD_PARTY_NOTICES.md: missing')));
  symlinkSync(join(source.directory, 'LICENSE'), join(documents, 'LICENSE'));
  issues = checkRelease(source.directory, { documentRoot: documents }).issues;
  assert.ok(issues.some(issue => issue.startsWith('LICENSE: missing, oversized, non-text, or symlinked')));
});

test('release evidence retains hashes of the validated snapshot after later source changes', t => {
  const source = fixture(t), documents = fixture(t);
  const original = readFileSync(join(documents.directory, 'LICENSE'));
  const result = checkRelease(source.directory, { documentRoot: documents.directory, includeFiles: true });
  assert.deepEqual(result.issues, []);
  writeFileSync(join(documents.directory, 'LICENSE'), 'changed after validation');
  const license = result.files.find(file => file.path === 'LICENSE');
  assert.equal(license.sha256, createHash('sha256').update(original).digest('hex'));
  assert.equal(license.bytes, original.length);
  assert.equal(license.source, 'canonical-document');
  assert.equal(result.files.length, result.checked);
  assert.ok(checkRelease(source.directory, { documentRoot: documents.directory }).issues.some(issue => issue.startsWith('LICENSE:')));
});
