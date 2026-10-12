import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateDevice, deviceRegistry, requireOwner } from '../src/access.mjs';
import { hash } from '../src/protocol.mjs';

const first = 'A'.repeat(43), second = 'B'.repeat(43);
const devices = async () => ({ DEVICE_REGISTRY: JSON.stringify([
  { id: 'iphone-primary', label: 'iPhone', platform: 'ios', enabled: true, token_sha256: await hash(first) },
  { id: 'android-secondary', label: 'Android', platform: 'android', enabled: true, token_sha256: await hash(second) },
]) });
const request = token => new Request('https://example.com/ingest', { headers: { Authorization: `Bearer ${token}` } });

test('each device credential resolves exactly its own identity', async () => {
  const env = await devices();
  assert.equal((await authenticateDevice(request(first), env)).id, 'iphone-primary');
  assert.equal((await authenticateDevice(request(second), env)).id, 'android-secondary');
  await assert.rejects(authenticateDevice(request('C'.repeat(43)), env), /unauthorized/);
  const entries = JSON.parse(env.DEVICE_REGISTRY); entries[0].enabled = false; env.DEVICE_REGISTRY = JSON.stringify(entries);
  await assert.rejects(authenticateDevice(request(first), env), /unauthorized/);
  assert.equal((await authenticateDevice(request(second), env)).id, 'android-secondary');
});
test('duplicate device IDs fail closed rather than selecting the first credential', async () => {
  const env = await devices(), entries = JSON.parse(env.DEVICE_REGISTRY); entries[1].id = entries[0].id;
  assert.throws(() => deviceRegistry({ DEVICE_REGISTRY: JSON.stringify(entries) }), /configuration_invalid/);
});
test('duplicate credentials and unrecognized registration fields fail closed', async () => {
  const env = await devices(), entries = JSON.parse(env.DEVICE_REGISTRY);
  entries[1].token_sha256 = entries[0].token_sha256;
  assert.throws(() => deviceRegistry({ DEVICE_REGISTRY: JSON.stringify(entries) }), /configuration_invalid/);
  const invalid = JSON.parse(env.DEVICE_REGISTRY); invalid[0].token = 'should-never-be-returned';
  assert.throws(() => deviceRegistry({ DEVICE_REGISTRY: JSON.stringify(invalid) }), /configuration_invalid/);
});
test('dot OAuth access requires both the configured owner and current token scope', () => {
  const env = { OWNER_GITHUB_ID: '123' };
  assert.throws(() => requireOwner({ auth: { userId: 'other', scope: ['phone:read'] }, props: { owner: 'other' } }, env), /forbidden/);
  assert.throws(() => requireOwner({ auth: { userId: '123', scope: [] }, props: { owner: '123' } }, env), /insufficient_scope/);
  assert.doesNotThrow(() => requireOwner({ auth: { userId: '123', scope: ['phone:read'] }, props: { owner: '123' } }, env));
});
