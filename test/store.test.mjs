import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/store.mjs';
import { RETENTION_MS, validateEvent } from '../src/protocol.mjs';

const now = Date.parse('2026-09-30T12:00:00Z');
const iso = time => new Date(time).toISOString();
// Cloudflare's exec runs immediately, unlike a deferred adapter; use the same behavior here.
function store(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  return new Store({ exec(sql, ...params) { const rows = db.prepare(sql).all(...params); return { toArray: () => rows }; } }, operation => {
    db.exec('BEGIN'); try { const result = operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  });
}
function event(kind, payload, time = now, device_id = 'iphone-primary', event_id = crypto.randomUUID()) {
  return validateEvent({ v: 1, event_id, device_id, kind, occurred_at: iso(time), payload: { ...payload,
    ...(kind === 'notification' ? {} : { measured_at: iso(time) }) } }, now);
}
function subscribe(s, overrides = {}) {
  s.subscribe({ id: 'sub_test', owner: 'owner', grant_id: 'grant', filters: '{}', url: 'https://chatgpt.com/test',
    secrets: 'encrypted-fixture', expires: now + 3600000, verified: now, ...overrides }, s.revision());
}
test('battery zero, false values and independent partial measurements remain present', t => {
  const s = store(t);
  s.ingest(event('device_status', { battery_percent: 0, is_charging: false, low_power_mode: false }), now);
  s.ingest(event('device_status', { is_charging: true }, now + 1000), now + 1000);
  const data = s.state('iphone-primary', 900, now + 1000).measurements;
  assert.equal(data.battery_percent.value, 0); assert.equal(data.is_charging.value, true);
  assert.equal(data.low_power_mode.value, false);
  assert.equal(data.battery_percent.measured_at, iso(now));
  assert.equal(data.is_charging.measured_at, iso(now + 1000));
});
test('late location cannot replace newer measurement; missing location stays absent', t => {
  const s = store(t);
  assert.deepEqual(s.state('iphone-primary', 900, now).measurements, {});
  s.ingest(event('location', { latitude: 0, longitude: 0, accuracy_m: 10 }), now);
  s.ingest(event('location', { latitude: 20, longitude: 30 }, now - 60000), now + 60000);
  const position = s.state('iphone-primary', 900, now + 901000).measurements.location;
  assert.deepEqual(position.value, { latitude: 0, longitude: 0, accuracy_m: 10 });
  assert.equal(position.stale, true); assert.equal(position.age_seconds, 901);
  assert.equal(position.received_at, iso(now));
});
test('latest context changes stay independent, device-scoped and explicit about stale observations', t => {
  const s = store(t); subscribe(s, { filters: JSON.stringify({ device_ids: ['iphone-primary'], kinds: ['focus', 'connection', 'app_activity'] }) });
  s.ingest(event('focus', { name: 'Work', active: false }), now);
  s.ingest(event('connection', { transport: 'wifi', connected: true, name: 'Home' }), now);
  s.ingest(event('connection', { transport: 'wifi', connected: false }, now - 60000), now + 1000);
  s.ingest(event('connection', { transport: 'bluetooth', connected: false, name: 'Headphones' }), now);
  s.ingest(event('focus', { name: 'Other device', active: true }, now + 1000, 'ipad-study'), now + 1000);
  s.ingest(event('app_activity', { app: 'WeChat', transition: 'closed', source: 'shortcuts_app_trigger' }), now);
  const changes = s.state('iphone-primary', 900, now + 901000).measurements;
  assert.equal(changes.focus_event.value.active, false);
  assert.equal(changes.wifi_event.value.connected, true);
  assert.equal(changes.bluetooth_event.value.connected, false);
  assert.equal(changes.focus_event.stale, true);
  assert.equal(changes.screen_time, undefined);
  assert.equal(s.events({ device_id: 'iphone-primary', kind: 'app_activity' }, now).events.length, 1);
  assert.equal(s.pending(now + 1000).length, 5);
});
test('dedupe is device-specific and a conflicting retry is rejected atomically', t => {
  const s = store(t), input = event('device_status', { battery_percent: 35 }, now, 'iphone-primary', 'sc-123456789-987654321'); subscribe(s);
  assert.equal(s.ingest(input, now).duplicate, false);
  assert.equal(s.ingest(input, now + 1).duplicate, true);
  assert.throws(() => s.ingest({ ...input, payload: { ...input.payload, battery_percent: 99 } }, now), /conflict/);
  s.ingest({ ...input, device_id: 'ipad-study' }, now);
  assert.equal(s.events({}, now).events.length, 2); assert.equal(s.pending(now).length, 2);
});
test('retention clears raw data and delivery jobs together; reads exclude expired events', t => {
  const s = store(t); subscribe(s, { expires: now + RETENTION_MS + 1000 });
  s.ingest(event('location', { latitude: 0, longitude: 0 }), now);
  assert.equal(s.events({}, now + RETENTION_MS).events.length, 0);
  s.cleanup(now + RETENTION_MS);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 0);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 0);
});
test('device/kind filters cover notifications, battery, location and future collectors', t => {
  const s = store(t); subscribe(s, { filters: JSON.stringify({ device_ids: ['iphone-primary'], kinds: ['location'] }) });
  s.ingest(event('notification', { app: 'WeChat', body: 'synthetic' }), now);
  s.ingest(event('location', { latitude: 0, longitude: 0 }), now);
  s.ingest(event('location', { latitude: 0, longitude: 0 }, now, 'ipad-study'), now);
  assert.equal(s.pending(now).length, 1);
  assert.equal(JSON.parse(s.pending(now)[0].body).kind, 'location');
});
test('unsubscribe invalidates verification in flight and removes pending delivery', t => {
  const s = store(t), revision = s.revision();
  s.unsubscribe('sub_test');
  assert.throws(() => s.subscribe({ id: 'sub_test' }, revision), /changed_retry/);
  subscribe(s); s.ingest(event('device_status', { battery_percent: 15 }), now);
  s.unsubscribe('sub_test'); assert.equal(s.pending(now).length, 0);
});
test('retry bound, permanent rejection, accepted acknowledgements and lease expiry', t => {
  for (const status of [204, 410, 413, 500]) {
    const s = store(t); subscribe(s); s.ingest(event('device_status', { battery_percent: 15 }), now);
    const job = s.pending(now)[0]; s.deliveryResult(job, status, now);
    const rows = s.rows('SELECT status,attempts,due FROM outbox');
    if (status === 410) { assert.equal(rows.length, 0); assert.equal(s.subscription('sub_test'), undefined); }
    else assert.equal(rows[0].status, status === 204 ? 'accepted' : status === 500 ? 'pending' : 'failed');
    if (status === 500) {
      assert.ok(rows[0].due >= now + 2000);
      s.deliveryResult({ ...job, attempts: 7 }, status, now); assert.equal(s.rows('SELECT status FROM outbox')[0].status, 'failed');
    }
    assert.equal(s.pending(now + 3600000).length, 0);
  }
});
test('receipt-order pagination has no duplicate or skipped event', t => {
  const s = store(t);
  for (let i = 0; i < 5; i++) s.ingest(event('device_status', { battery_percent: i }), now + i);
  const a = s.events({ limit: 2 }, now + 10), b = s.events({ limit: 2, before_seq: a.next_before_seq }, now + 10), c = s.events({ limit: 2, before_seq: b.next_before_seq }, now + 10);
  assert.deepEqual([...a.events, ...b.events, ...c.events].map(e => e.payload.battery_percent), [4, 3, 2, 1, 0]);
  assert.equal(c.next_before_seq, null);
});

test('hourly batches pair across uploads, deduplicate observations and emit one job per batch', t => {
  const s = store(t); subscribe(s, { filters: JSON.stringify({ kinds: ['app_activity_batch'] }) });
  const opened = { id: crypto.randomUUID(), app: 'WeChat', transition: 'opened', measured_at: iso(now - 3600000) };
  const closed = { id: crypto.randomUUID(), app: 'WeChat', transition: 'closed', measured_at: iso(now - 1800000) };
  const batch = observations => event('app_activity_batch', { source: 'shortcuts_app_trigger', observations });
  const a = batch([opened]), b = batch([opened, closed]);
  s.ingest(a, now); s.ingest(b, now + 1); s.ingest(b, now + 2);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 2);
  assert.equal(s.pending(now + 2).length, 2);
  assert.equal(s.appUsage('iphone-primary', 24, now).apps[0].estimated_seconds, 1800);
  assert.deepEqual(s.appUsage('ipad-study', 24, now).apps, []);
  const conflicting = batch([{ ...closed, id: crypto.randomUUID() }, { ...opened, app: 'Other' }]);
  assert.throws(() => s.ingest(conflicting, now), /observation_id_conflict/);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 2);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 2);
  assert.equal(s.appUsage('iphone-primary', 24, now + RETENTION_MS).apps.length, 0);
  s.cleanup(now + RETENTION_MS);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 0);
});
