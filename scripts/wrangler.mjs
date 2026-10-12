import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { wranglerArguments, wranglerEnvironment } from './wrangler-config.mjs';
const root = resolve(import.meta.dirname, '..');
const args = wranglerArguments(process.argv.slice(2), root, process.env.DOTLINK_CONFIG);
const dryRun = args.includes('--dry-run');
const state = dryRun ? mkdtempSync(join(tmpdir(), 'dotlink-wrangler-check-')) : resolve(root, 'work');
try {
  for (const directory of ['cf-config', 'cf-logs']) mkdirSync(resolve(state, directory), { recursive: true, mode: 0o700 });
  const env = wranglerEnvironment(process.env, state, dryRun);
  if (dryRun) {
    if (args.some(value => value === '--env-file' || value.startsWith('--env-file=')))
      throw new Error('dry_run_does_not_accept_secret_environment_files');
    const emptyEnv = resolve(state, 'empty.env');
    writeFileSync(emptyEnv, '', { mode: 0o600 });
    // Wrangler loads cwd/.env even with a temporary config unless --env-file is explicit.
    args.push('--env-file', emptyEnv);
  }
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/wrangler/bin/wrangler.js'), ...args], {
    cwd: root, stdio: 'inherit', env, ...(dryRun ? { timeout: 90000 } : {}),
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (dryRun) rmSync(state, { recursive: true, force: true });
}
