import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Read only the project's dedicated secret file. Never print credentials or place them in argv.
try {
  const root = resolve(import.meta.dirname, '..'), file = resolve(root, 'work/private/github-oauth.json');
  const values = JSON.parse(readFileSync(file, 'utf8'));
  for (const key of ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']) {
    if (typeof values[key] !== 'string' || values[key].length < 10 || values[key].length > 256 || /\s/.test(values[key]))
      throw new Error('identity_credentials_missing_or_invalid');
  }
  chmodSync(file, 0o600);
  const keyFile = resolve(root, 'work/private/bridge-seal-key');
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('base64'), { flag: 'wx', mode: 0o600 });
  const sealKey = readFileSync(keyFile, 'utf8');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(sealKey)) throw new Error('invalid_existing_storage_key');
  const secretData = { GITHUB_CLIENT_ID: values.GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET: values.GITHUB_CLIENT_SECRET, BRIDGE_SEAL_KEY: sealKey };
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/wrangler.mjs'), 'secret', 'bulk'], {
    cwd: root, input: JSON.stringify(secretData), stdio: ['pipe', 'inherit', 'inherit'], timeout: 60000,
  });
  if (result.error || result.status !== 0) throw new Error('secret_upload_failed');
  console.log('Identity and signing-storage secrets configured. Phone ingestion is unchanged.');
} catch {
  console.error('Identity configuration failed. Check the dedicated private file and the preceding redacted Wrangler result; no secret values were printed.');
  process.exitCode = 1;
}
