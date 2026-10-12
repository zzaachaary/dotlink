import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { deviceRegistry } from '../src/access.mjs';
import { ingestUrl, validateLocalCredential } from './enrollment-config.mjs';

// Initial enrollment only: never overwrite an existing remote device registry.
try {
  const endpoint = ingestUrl(process.env.BRIDGE_INGEST_URL);
  const root = resolve(import.meta.dirname, '..');
  const wrangler = resolve(root, 'scripts/wrangler.mjs');
  const listing = spawnSync(process.execPath, [wrangler, 'secret', 'list'], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  if (listing.error || listing.status !== 0) throw new Error('secret_inventory_failed');
  const names = JSON.parse(listing.stdout);
  if (!Array.isArray(names) || names.some(item => item.name === 'DEVICE_REGISTRY'))
    throw new Error('existing_registry_requires_review');
  const directory = resolve(root, 'work/private');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = resolve(directory, 'iphone-device.json');
  if (!existsSync(file)) writeFileSync(file, JSON.stringify({ device_id: 'iphone-primary',
    token: randomBytes(32).toString('base64url'), endpoint }), { flag: 'wx', mode: 0o600 });
  chmodSync(file, 0o600);
  const credential = validateLocalCredential(JSON.parse(readFileSync(file, 'utf8')), endpoint);
  const registry = [{ id: credential.device_id, label: 'Primary iPhone', platform: 'ios', enabled: true,
    token_sha256: createHash('sha256').update(credential.token).digest('hex') }];
  const value = JSON.stringify(registry);
  deviceRegistry({ DEVICE_REGISTRY: value });
  const result = spawnSync(process.execPath, [wrangler, 'secret', 'put', 'DEVICE_REGISTRY'], {
    cwd: root, input: value, stdio: ['pipe', 'inherit', 'inherit'], timeout: 60000,
  });
  if (result.error || result.status !== 0) throw new Error('registration_upload_failed');
  console.log('iphone-primary registered. The upload credential remains in work/private/iphone-device.json; ingestion is unchanged.');
} catch (error) {
  const known = ['bridge_ingest_url_missing_or_invalid', 'secret_inventory_failed', 'existing_registry_requires_review', 'invalid_local_credential', 'registration_upload_failed'];
  console.error(known.includes(error.message) ? error.message : 'Device enrollment failed; no credential values were printed.');
  process.exitCode = 1;
}
