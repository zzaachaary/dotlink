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
    secrets: 'encrypted-fixture', expires: now + 3600000, verified: now, ...overrides }, s.revision(), now);
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

test('cancel and recreate isolate captured jobs and late 410 responses', t => {
  const s = store(t); subscribe(s);
  s.ingest(event('notification', { app: 'Synthetic', body: 'old' }), now);
  const oldJob = s.pending(now)[0], oldGeneration = s.subscription('sub_test').generation;
  s.unsubscribe('sub_test'); subscribe(s, { secrets: 'new-sealed-secret' });
  s.ingest(event('notification', { app: 'Synthetic', body: 'new' }), now + 1);
  assert.notEqual(s.subscription('sub_test').generation, oldGeneration);
  assert.equal(s.deliverySubscription(oldJob, now + 1), undefined);
  s.deliveryResult(oldJob, 410, now + 2);
  assert.equal(s.deliveryHealth().subscriptions.length, 1);
  assert.equal(s.pending(now + 2).length, 1);
  assert.equal(JSON.parse(s.pending(now + 2)[0].body).payload.body, 'new');
});

test('renewal and secret rotation retain generation and queued events', t => {
  const s = store(t); subscribe(s);
  s.ingest(event('notification', { app: 'Synthetic', body: 'queued' }), now);
  const job = s.pending(now)[0], generation = s.subscription('sub_test').generation;
  assert.equal(typeof generation, 'string'); assert.ok(generation.length >= 32);
  subscribe(s, { expires: now + 7200000 });
  subscribe(s, { secrets: 'rotated-sealed-secret', expires: now + 7200000 });
  assert.equal(s.subscription('sub_test').generation, generation);
  assert.equal(s.deliverySubscription(job, now + 1).secrets, 'rotated-sealed-secret');
  s.deliveryResult(job, 204, now + 2);
  assert.equal(s.rows('SELECT status FROM outbox')[0].status, 'accepted');
  assert.equal(s.deliverySubscription(job, now + 3), undefined);
});

test('late failures using pre-renewal secrets cannot permanently reject a renewed delivery or remove its subscription', t => {
  for (const status of [410, 401, 403, 0, 500]) {
    const s = store(t); subscribe(s);
    s.ingest(event('notification', { app: 'Synthetic', body: 'queued across rotation' }), now);
    const job = s.pending(now)[0], sentSecrets = s.subscription('sub_test').secrets;
    subscribe(s, { secrets: 'new-sealed-secret', expires: now + 7200000 });
    s.deliveryResult(job, status, now + 1, sentSecrets);
    assert.equal(s.subscription('sub_test')?.secrets, 'new-sealed-secret', `late ${status}`);
    const retry = s.pending(now + 5000)[0];
    assert.ok(retry, `late ${status} must remain retryable with current secrets`);
    assert.equal(retry.attempts, 1, 'The actual send must still count toward the retry bound');
    s.deliveryResult(retry, 204, now + 5000, 'new-sealed-secret');
    assert.equal(s.rows('SELECT status FROM outbox')[0].status, 'accepted');
  }
});

test('superseded-secret failures retain the eight-attempt bound without deleting the renewed subscription', t => {
  const s = store(t); subscribe(s);
  s.ingest(event('notification', { app: 'Synthetic', body: 'bounded retry across renewal' }), now);
  s.sql.exec('UPDATE outbox SET attempts=7');
  const job = s.pending(now)[0], sentSecrets = s.subscription('sub_test').secrets;
  subscribe(s, { secrets: 'new-sealed-secret', expires: now + 7200000 });
  s.deliveryResult(job, 410, now + 1, sentSecrets);
  const result = s.rows('SELECT attempts,status FROM outbox')[0];
  assert.deepEqual({ ...result }, { attempts: 8, status: 'failed' });
  assert.equal(s.subscription('sub_test').secrets, 'new-sealed-secret');
  assert.equal(s.pending(now + 600000).length, 0);
});

test('a successful in-flight acknowledgement remains accepted across renewal', t => {
  const s = store(t); subscribe(s);
  s.ingest(event('notification', { app: 'Synthetic', body: 'already received' }), now);
  const job = s.pending(now)[0], sentSecrets = s.subscription('sub_test').secrets;
  subscribe(s, { secrets: 'new-sealed-secret', expires: now + 7200000 });
  s.deliveryResult(job, 204, now + 1, sentSecrets);
  assert.equal(s.subscription('sub_test').secrets, 'new-sealed-secret');
  assert.equal(s.pending(now + 1).length, 0);
  assert.equal(s.rows('SELECT status FROM outbox')[0].status, 'accepted');
});

test('expired subscription replacement isolates old jobs even without an intervening cleanup', t => {
  const s = store(t); subscribe(s, { expires: now + 1 });
  s.ingest(event('notification', { app: 'Synthetic', body: 'old lease' }), now);
  const oldJob = s.pending(now)[0], old = s.subscription('sub_test');
  s.subscribe({ ...old, expires: now + 60000, verified: now + 2 }, s.revision(), now + 2);
  assert.notEqual(s.subscription('sub_test').generation, old.generation);
  assert.equal(s.deliverySubscription(oldJob, now + 2), undefined);
  s.ingest(event('notification', { app: 'Synthetic', body: 'new lease' }), now + 2);
  s.deliveryResult(oldJob, 410, now + 3);
  assert.equal(s.pending(now + 3).length, 1);
  assert.equal(s.deliveryHealth().subscriptions.length, 1);
});

test('legacy SQLite migration preserves queued data and is idempotent across constructors', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  db.exec(`CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, grant_id TEXT NOT NULL, filters TEXT NOT NULL,
    url TEXT NOT NULL, secrets TEXT NOT NULL, expires INTEGER NOT NULL, verified INTEGER NOT NULL);
    CREATE TABLE outbox (
    subscription_id TEXT NOT NULL, event_seq INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    due INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', last_code INTEGER,
    PRIMARY KEY(subscription_id, event_seq));
    CREATE TABLE events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL, event_id TEXT NOT NULL,
    kind TEXT NOT NULL, occurred INTEGER NOT NULL, measured INTEGER NOT NULL,
    received INTEGER NOT NULL, expires INTEGER NOT NULL, body TEXT NOT NULL,
    UNIQUE(device_id,event_id));`);
  db.prepare('INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?)').run('legacy', 'owner', 'grant', '{}',
    'https://chatgpt.com/test', 'legacy-secret', now + 60000, now);
  db.prepare('INSERT INTO outbox(subscription_id,event_seq,due) VALUES(?,?,?)').run('legacy', 7, now);
  const input = event('notification', { app: 'Synthetic', body: 'preserved legacy event' });
  db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)').run(7, input.device_id, input.event_id, input.kind,
    now, now, now, now + RETENTION_MS, JSON.stringify(input));
  const sql = { exec(query, ...params) { const rows = db.prepare(query).all(...params); return { toArray: () => rows }; } };
  const transaction = operation => {
    db.exec('BEGIN'); try { const result = operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const s = new Store(sql, transaction), generation = s.subscription('legacy').generation;
  assert.equal(typeof generation, 'string'); assert.ok(generation.length >= 32);
  assert.equal(s.rows('SELECT * FROM outbox')[0].generation, generation);
  assert.equal(s.pending(now).length, 1);
  assert.equal(s.deliverySubscription(s.pending(now)[0], now).secrets, 'legacy-secret');
  const before = { subscription: s.subscription('legacy'), outbox: s.rows('SELECT * FROM outbox') };
  const reopened = new Store(sql, transaction);
  assert.deepEqual({ subscription: reopened.subscription('legacy'), outbox: reopened.rows('SELECT * FROM outbox') }, before);
  assert.equal(reopened.rows('PRAGMA table_info(subscriptions)').filter(row => row.name === 'generation').length, 1);
  assert.equal(reopened.rows('PRAGMA table_info(outbox)').filter(row => row.name === 'generation').length, 1);
  assert.deepEqual(reopened.events({}, now).events[0], { ...input, received_at: iso(now) });
  // A rollback can write old-format rows into the additive schema; a later upgrade must repair those too.
  db.prepare('INSERT INTO subscriptions(id,owner,grant_id,filters,url,secrets,expires,verified) VALUES(?,?,?,?,?,?,?,?)')
    .run('after-rollback', 'owner', 'grant', '{}', 'https://chatgpt.com/test', 'rollback-secret', now + 60000, now);
  for (const [seq, id] of [[8, 'legacy'], [9, 'after-rollback']]) {
    db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?)').run(seq, input.device_id, `old-format-${seq}`, input.kind,
      now, now, now, now + RETENTION_MS, JSON.stringify({ ...input, event_id: `old-format-${seq}` }));
    db.prepare('INSERT INTO outbox(subscription_id,event_seq,due) VALUES(?,?,?)').run(id, seq, now);
  }
  const upgradedAgain = new Store(sql, transaction);
  assert.equal(upgradedAgain.pending(now).length, 3);
  assert.equal(upgradedAgain.subscription('legacy').generation, generation);
  assert.ok(upgradedAgain.subscription('after-rollback').generation.length >= 32);
});

// Seed bounded fixtures in SQLite so capacity checks exercise Store without thousands of uploads.
function seedBoundaryEvents(s, count, device_id, received, expires, admitted = false) {
  const occurred = expires - RETENTION_MS;
  const input = event('notification', { app: 'Synthetic', body: 'capacity fixture' }, occurred, device_id);
  s.sql.exec(`WITH RECURSIVE fixture(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM fixture WHERE n < ?)
    INSERT INTO events(device_id,event_id,kind,occurred,measured,received,expires,body)
    SELECT ?, printf('00000000-0000-4000-8000-%012d', n), 'notification', ?, ?, ?, ?,
      json_set(?, '$.event_id', printf('00000000-0000-4000-8000-%012d', n)) FROM fixture`,
  count, device_id, occurred, occurred, received, expires, JSON.stringify(input));
  if (admitted) s.sql.exec(`WITH RECURSIVE fixture(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM fixture WHERE n < ?)
    INSERT INTO ingest_receipts(device_id,received) SELECT ?, ? FROM fixture`, count, device_id, received);
}
function boundaryState(s) {
  return {
    counts: s.rows(`SELECT (SELECT COUNT(*) FROM events) AS events,
      (SELECT COUNT(*) FROM app_observations) AS observations,
      (SELECT COUNT(*) FROM outbox) AS outbox,
      (SELECT COUNT(*) FROM ingest_receipts) AS receipts`)[0],
    sequence: s.rows('SELECT * FROM sqlite_sequence ORDER BY name'),
    subscriptions: s.rows('SELECT * FROM subscriptions ORDER BY id'),
    outbox: s.rows('SELECT * FROM outbox ORDER BY subscription_id, event_seq'),
    revision: s.revision(),
  };
}
function capacityError(code) {
  return error => error.message === code && error.status === 429;
}
function boundaryBatch(observations) {
  return event('app_activity_batch', { source: 'shortcuts_app_trigger', observations });
}
function boundaryObservation() {
  return { id: crypto.randomUUID(), app: 'Synthetic', transition: 'opened', measured_at: iso(now) };
}

test('device rate permits event 120, rejects 121 atomically and recovers after the rolling minute', t => {
  const s = store(t); subscribe(s);
  seedBoundaryEvents(s, 119, 'iphone-primary', now, now + RETENTION_MS, true);
  const last = event('notification', { app: 'Synthetic', body: 'event 120' });
  assert.equal(s.ingest(last, now).duplicate, false);
  assert.equal(s.rows("SELECT COUNT(*) AS n FROM events WHERE device_id = 'iphone-primary'")[0].n, 120);
  const full = boundaryState(s);
  assert.equal(s.ingest(last, now + 1).duplicate, true);
  assert.deepEqual(boundaryState(s), full);
  const blocked = boundaryBatch([boundaryObservation()]);
  assert.throws(() => s.ingest(blocked, now + 1), capacityError('device_rate_limit'));
  assert.deepEqual(boundaryState(s), full);
  // A timestamp on the inclusive lower boundary still belongs to the window.
  assert.throws(() => s.ingest(blocked, now + 60000), capacityError('device_rate_limit'));
  assert.deepEqual(boundaryState(s), full);
  assert.equal(s.ingest(event('notification', { app: 'Synthetic' }, now, 'ipad-study'), now + 1).duplicate, false);
  assert.equal(s.ingest(blocked, now + 60001).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 1);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 3);
});

test('raw event expiry cannot reset the rolling device admission budget', t => {
  const s = store(t);
  for (let i = 0; i < 120; i++) {
    const received = now + i * 2;
    const input = validateEvent({ v: 1, event_id: crypto.randomUUID(), device_id: 'iphone-primary', kind: 'notification',
      occurred_at: iso(received - RETENTION_MS + 1), payload: { app: 'Synthetic' } }, received);
    s.cleanup(received);
    assert.equal(s.ingest(input, received).accepted, true);
  }
  s.cleanup(now + 240);
  assert.equal(s.events({}, now + 240).events.length, 0);
  assert.throws(() => s.ingest(event('notification', { app: 'Synthetic' }), now + 240), capacityError('device_rate_limit'));
  assert.equal(s.nextAlarm(now + 240), now + 60001);
  s.cleanup(now + 60000);
  assert.throws(() => s.ingest(event('notification', { app: 'Synthetic' }), now + 60000), capacityError('device_rate_limit'));
  s.cleanup(now + 60001);
  assert.equal(s.ingest(event('notification', { app: 'Synthetic' }), now + 60001).accepted, true);
  s.cleanup(now + RETENTION_MS);
  assert.equal(s.nextAlarm(now + RETENTION_MS), null);
});

test('events expiring between validation and persistence cannot be acknowledged or consume admission', t => {
  const almostExpired = iso(now - RETENTION_MS + 1);
  const observation = { id: crypto.randomUUID(), app: 'Synthetic', transition: 'opened', measured_at: almostExpired };
  const inputs = [
    event('notification', { app: 'Synthetic' }, now - RETENTION_MS + 1),
    validateEvent({ ...event('app_activity', { app: 'Synthetic', transition: 'opened', source: 'shortcuts_app_trigger' }),
      payload: { app: 'Synthetic', transition: 'opened', source: 'shortcuts_app_trigger', measured_at: almostExpired } }, now),
    boundaryBatch([observation]),
  ];
  for (const input of inputs) {
    const s = store(t), before = boundaryState(s);
    assert.throws(() => s.ingest(input, now + 1), /event_outside_retention/);
    assert.deepEqual(boundaryState(s), before);
    assert.equal(s.ingest(input, now).accepted, true);
    const accepted = boundaryState(s);
    assert.throws(() => s.ingest(input, now + 1), /event_outside_retention/);
    assert.deepEqual(boundaryState(s), accepted);
  }
});

test('legacy admission migration survives raw expiry and does not refill on reactivation', t => {
  const s = store(t);
  seedBoundaryEvents(s, 60, 'iphone-primary', now, now + 1);
  // Model the old schema while retaining real event rows for the upgrade.
  s.sql.exec('DROP TABLE IF EXISTS ingest_receipts');
  s.sql.exec("DELETE FROM meta WHERE key = 'ingest_receipts_initialized'");
  const migrated = new Store(s.sql, s.transaction, now);
  const reopened = new Store(s.sql, s.transaction, now);
  reopened.cleanup(now + 1);
  for (let i = 0; i < 60; i++)
    assert.equal(reopened.ingest(event('notification', { app: 'Synthetic' }), now + 1).accepted, true);
  assert.throws(() => reopened.ingest(event('notification', { app: 'Synthetic' }), now + 1), capacityError('device_rate_limit'));
  assert.equal(migrated.events({}, now + 1).events.length, 25);
});

test('event capacity permits event 10000, preserves retries and recovers after retention cleanup', t => {
  const s = store(t); subscribe(s);
  seedBoundaryEvents(s, 9999, 'iphone-fixture', now - 60001, now + 1);
  const last = event('notification', { app: 'Synthetic', body: 'event 10000' });
  assert.equal(s.ingest(last, now).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 10000);
  const full = boundaryState(s);
  assert.equal(s.ingest(last, now + 1).duplicate, true);
  assert.deepEqual(boundaryState(s), full);
  const blocked = boundaryBatch([boundaryObservation()]);
  assert.throws(() => s.ingest(blocked, now + 1), capacityError('storage_capacity_reached'));
  assert.deepEqual(boundaryState(s), full);
  s.cleanup(now + 1);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 1);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 1);
  assert.equal(s.ingest(blocked, now + 2).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 2);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 1);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 2);
});

test('observation capacity rolls back a partially inserted batch, allows duplicates and recovers after cleanup', t => {
  const s = store(t); subscribe(s);
  s.sql.exec(`WITH RECURSIVE fixture(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM fixture WHERE n < 49999)
    INSERT INTO app_observations(device_id,id,app,transition,measured,expires)
    SELECT 'iphone-fixture', printf('00000000-0000-4000-8000-%012d', n),
      'Synthetic', 'opened', ?, ? FROM fixture`, now - RETENTION_MS + 1, now + 1);
  const overflow = boundaryBatch([boundaryObservation(), boundaryObservation()]);
  const before = boundaryState(s);
  assert.throws(() => s.ingest(overflow, now), capacityError('observation_capacity_reached'));
  assert.deepEqual(boundaryState(s), before);
  for (const observation of overflow.payload.observations)
    assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations WHERE id = ?', observation.id)[0].n, 0);
  const lastObservation = boundaryObservation(), last = boundaryBatch([lastObservation]);
  assert.equal(s.ingest(last, now).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 50000);
  const full = boundaryState(s);
  assert.equal(s.ingest(last, now + 1).duplicate, true);
  assert.deepEqual(boundaryState(s), full);
  // A new raw batch containing an existing observation consumes no observation capacity.
  assert.equal(s.ingest(boundaryBatch([lastObservation]), now + 1).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 50000);
  const blocked = boundaryBatch([boundaryObservation()]), beforeRejection = boundaryState(s);
  assert.throws(() => s.ingest(blocked, now + 1), capacityError('observation_capacity_reached'));
  assert.deepEqual(boundaryState(s), beforeRejection);
  s.cleanup(now + 1);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 1);
  assert.equal(s.ingest(blocked, now + 2).duplicate, false);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n, 2);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM events')[0].n, 3);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 3);
});

test('subscription capacity permits eight, renews at capacity and recovers after expiry or cancellation', t => {
  const s = store(t);
  for (let i = 0; i < 7; i++) subscribe(s, { id: `sub_${i}`, ...(i === 0 ? { expires: now + 1 } : {}) });
  subscribe(s, { id: 'sub_7' });
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM subscriptions')[0].n, 8);
  s.ingest(event('notification', { app: 'Synthetic' }), now);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 8);
  const generation = s.subscription('sub_7').generation;
  subscribe(s, { id: 'sub_7', expires: now + 7200000 });
  assert.equal(s.subscription('sub_7').generation, generation);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM subscriptions')[0].n, 8);
  const full = boundaryState(s);
  assert.throws(() => subscribe(s, { id: 'sub_8' }), capacityError('subscription_limit'));
  assert.deepEqual(boundaryState(s), full);
  s.cleanup(now + 1);
  assert.equal(s.subscription('sub_0'), undefined);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 7);
  subscribe(s, { id: 'sub_8' });
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM subscriptions')[0].n, 8);
  s.unsubscribe('sub_1');
  subscribe(s, { id: 'sub_9' });
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM subscriptions')[0].n, 8);
  assert.equal(s.rows('SELECT COUNT(*) AS n FROM outbox')[0].n, 6);
});
