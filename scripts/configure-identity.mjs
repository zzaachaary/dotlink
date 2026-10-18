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
  const wrangler = resolve(root, 'scripts/wrangler.mjs');
  const listing = spawnSync(process.execPath, [wrangler, 'secret', 'list', '--format', 'json'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 128 * 1024,
  });
  if (listing.error || listing.status !== 0) throw new Error('secret_inventory_failed');
  let inventory;
  try { inventory = JSON.parse(listing.stdout); } catch { throw new Error('invalid_secret_inventory'); }
  if (!Array.isArray(inventory) || inventory.some(item => !item || typeof item !== 'object' || Array.isArray(item) ||
      typeof item.name !== 'string' || !item.name.trim() || item.type !== 'secret_text') ||
      new Set(inventory.map(item => item.name)).size !== inventory.length) throw new Error('invalid_secret_inventory');
  const existingSeal = inventory.some(item => item.name === 'BRIDGE_SEAL_KEY');
  const secretData = { GITHUB_CLIENT_ID: values.GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET: values.GITHUB_CLIENT_SECRET };
  // A missing local backup must never rotate an existing Worker's subscription-encryption key.
  if (!existingSeal) {
    const keyFile = resolve(root, 'work/private/bridge-seal-key');
    if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('base64'), { flag: 'wx', mode: 0o600 });
    const sealKey = readFileSync(keyFile, 'utf8');
    if (!/^[A-Za-z0-9+/]{43}=$/.test(sealKey)) throw new Error('invalid_existing_storage_key');
    secretData.BRIDGE_SEAL_KEY = sealKey;
  }
  chmodSync(file, 0o600);
  const result = spawnSync(process.execPath, [wrangler, 'secret', 'bulk'], {
    cwd: root, input: JSON.stringify(secretData), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000, maxBuffer: 128 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error('secret_upload_failed');
  console.log(existingSeal ? 'Identity configured; the existing signing-storage secret was preserved. Phone ingestion is unchanged.'
    : 'Identity and signing-storage secrets configured. Phone ingestion is unchanged.');
} catch (error) {
  const known = ['identity_credentials_missing_or_invalid', 'secret_inventory_failed', 'invalid_secret_inventory', 'invalid_existing_storage_key', 'secret_upload_failed'];
  console.error(known.includes(error.message) ? error.message : 'Identity configuration failed. Check the dedicated private file and selected Worker; no secret values or command diagnostics were printed.');
  process.exitCode = 1;
}
