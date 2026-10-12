import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'dotlink-build-check-'));
try {
  // Use the reviewed template, not a clone's account configuration or local secret files.
  const config = JSON.parse(readFileSync(resolve(root, 'wrangler.example.jsonc'), 'utf8'));
  config.main = resolve(root, config.main);
  const configPath = join(temporary, 'wrangler.json');
  writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/wrangler.mjs'), 'deploy', '--dry-run',
    '--config', configPath, '--outdir', join(temporary, 'build')], { cwd: root, stdio: 'inherit', timeout: 120000 });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
