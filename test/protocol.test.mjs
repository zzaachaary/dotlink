import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { callbackUrl, equal, readJson, signedHeaders, validateEvent, MAX_BYTES, RETENTION_MS } from '../src/protocol.mjs';

const now = Date.parse('2026-09-30T12:00:00Z');
const event = () => ({ v: 1, event_id: 'efb8eca8-dbb2-4a95-815c-43523fb88f28', device_id: 'iphone-primary',
  kind: 'notification', occurred_at: new Date(now).toISOString(),
  payload: { app: 'WeChat', title: 'Test sender', body: 'Quoted "text"\nhttps://example.com/测试' } });

test('notification content survives JSON encoding, including links, quotes and Unicode', () => {
  const input = event(); assert.deepEqual(validateEvent(JSON.parse(JSON.stringify(input)), now), input);
});
test('Shortcuts double-random IDs are bounded and safe for persistence and webhook headers', () => {
  for (const event_id of ['sc-100000000-100000000', 'sc-999999999-999999999'])
    assert.equal(validateEvent({ ...event(), event_id }, now).event_id, event_id);
  for (const event_id of ['sc-1-2', 'sc-000000000-100000000', 'sc-1000000000-100000000',
    'sc-100000000-100000000\n', 'sc-100000000-100000000/extra'])
    assert.throws(() => validateEvent({ ...event(), event_id }, now), /invalid_event_id/);
});
test('rejects malformed envelopes without echoing private payloads', () => {
  for (const change of [{ v: 2 }, { event_id: 'bad' }, { device_id: '../another-phone' }, { kind: 'unknown' },
    { occurred_at: '2026-09-30' }, { secret: 'private value' }, { payload: { app: 'WeChat', token: 'private value' } }]) {
    assert.throws(() => validateEvent({ ...event(), ...change }, now), error => !error.message.includes('private value'));
  }
  const input = JSON.parse(JSON.stringify(event()).replace('"v":1', '"__proto__":{"polluted":true},"v":1'));
  assert.throws(() => validateEvent(input, now)); assert.equal({}.polluted, undefined);
});
test('bounds retention, future timestamps, UTF-8 bytes and measurements', () => {
  assert.throws(() => validateEvent({ ...event(), occurred_at: new Date(now - RETENTION_MS).toISOString() }, now));
  assert.throws(() => validateEvent({ ...event(), occurred_at: new Date(now + 300001).toISOString() }, now));
  const input = event();
  for (const key of ['title', 'subtitle', 'body']) input.payload[key] = '🙂'.repeat(8000);
  assert.throws(() => validateEvent(input, now), /payload_too_large/);
  assert.throws(() => validateEvent({ ...event(), kind: 'location', payload: { latitude: 0, longitude: 0 } }, now));
  assert.throws(() => validateEvent({ ...event(), kind: 'device_status', payload: { battery_percent: 101, measured_at: event().occurred_at } }, now));
});
test('one envelope format supports independent iPhone, Android, Mac and iPad device IDs', () => {
  for (const device_id of ['iphone-primary', 'android-secondary', 'mac-studio', 'ipad-study']) {
    assert.equal(validateEvent({ ...event(), device_id }, now).device_id, device_id);
  }
});
test('iPhone context events retain false values and reject unknown types or invented usage totals', () => {
  const measured_at = event().occurred_at;
  const valid = [
    ['focus', { name: 'Work', active: false, measured_at }],
    ['connection', { transport: 'wifi', connected: false, measured_at }],
    ['connection', { transport: 'bluetooth', connected: true, name: 'Headphones', measured_at }],
    ['app_activity', { app: 'WeChat', transition: 'closed', source: 'shortcuts_app_trigger', measured_at }],
  ];
  for (const [kind, payload] of valid) assert.deepEqual(validateEvent({ ...event(), kind, payload }, now).payload, payload);
  for (const [kind, payload] of [
    ['focus', { name: '', active: true, measured_at }],
    ['focus', { name: 'Work', active: 'false', measured_at }],
    ['connection', { transport: 'cellular', connected: true, measured_at }],
    ['connection', { transport: 'wifi', connected: true, password: 'private', measured_at }],
    ['app_activity', { app: 'WeChat', transition: 'opened', source: 'system_screen_time', measured_at }],
    ['app_activity', { app: 'WeChat', transition: 'closed', source: 'shortcuts_app_trigger', duration_seconds: 9999, measured_at }],
  ]) assert.throws(() => validateEvent({ ...event(), kind, payload }, now));
});
test('calendar dates are strict and UUID case does not create a second delivery identity', () => {
  assert.throws(() => validateEvent({ ...event(), occurred_at: '2026-02-30T12:00:00Z' }, Date.parse('2026-03-02T12:00:00Z')), /invalid_timestamp/);
  assert.equal(validateEvent({ ...event(), event_id: event().event_id.toUpperCase() }, now).event_id, event().event_id);
});
test('request parsing enforces stream size even without Content-Length', async () => {
  const request = new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event()) });
  assert.deepEqual(await readJson(request), event());
  await assert.rejects(readJson(new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(MAX_BYTES + 1) })), /payload_too_large/);
  await assert.rejects(readJson(new Request('https://example.com', { method: 'POST', body: '{}' })), /json_required/);
});
test('callback validation rejects lookalikes, credentials, local hosts and HTTP', () => {
  for (const url of ['http://chatgpt.com/x', 'https://chatgpt.com.evil.test/x', 'https://evilopenai.com/',
    'https://localhost/', 'https://127.0.0.1/', 'https://[::1]/', 'https://x@chatgpt.com/', 'https://chatgpt.com:8443/', 'https://chatgpt.com/#fragment']) {
    assert.throws(() => callbackUrl(url), /invalid_callback/);
  }
  assert.equal(callbackUrl('https://chatgpt.com/probe'), 'https://chatgpt.com/probe');
});
test('Standard Webhooks signature matches independent HMAC, covers exact body', async () => {
  const bytes = Buffer.alloc(32, 7), secret = `whsec_${bytes.toString('base64')}`;
  const body = JSON.stringify({ eventId: 'probe', data: '测试' });
  const headers = await signedHeaders(secret, 'probe', body, 'sub-test', now);
  const digest = createHmac('sha256', bytes).update(`probe.${now / 1000}.${body}`).digest('base64');
  assert.equal(headers['webhook-signature'], `v1,${digest}`);
  assert.equal(headers['X-MCP-Subscription-Id'], 'sub-test');
  assert.notEqual((await signedHeaders(secret, 'probe', body + ' ', 'sub-test', now))['webhook-signature'], headers['webhook-signature']);
  await assert.rejects(signedHeaders('whsec_YQ==', 'probe', body, 'sub-test', now));
  assert.equal(equal('expected', 'expected'), true); assert.equal(equal('expected', 'expecte'), false);
});
