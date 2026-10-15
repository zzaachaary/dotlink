import { canonical, RequestError, RETENTION_MS } from './protocol.mjs';
import { summarizeAppUsage } from './app-usage.mjs';

export const KINDS = ['notification', 'device_status', 'location', 'focus', 'connection', 'app_activity', 'app_activity_batch', 'health'];
const CAPACITY = 10000;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT NOT NULL, event_id TEXT NOT NULL,
    kind TEXT NOT NULL, occurred INTEGER NOT NULL, measured INTEGER NOT NULL,
    received INTEGER NOT NULL, expires INTEGER NOT NULL, body TEXT NOT NULL,
    UNIQUE(device_id, event_id))`,
  'CREATE INDEX IF NOT EXISTS events_expiry ON events(expires)',
  'CREATE INDEX IF NOT EXISTS events_status ON events(device_id, kind, measured DESC, seq DESC)',
  'CREATE INDEX IF NOT EXISTS events_rate ON events(device_id, received)',
  `CREATE TABLE IF NOT EXISTS app_observations (
    device_id TEXT NOT NULL, id TEXT NOT NULL, app TEXT NOT NULL, transition TEXT NOT NULL,
    measured INTEGER NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(device_id, id))`,
  'CREATE INDEX IF NOT EXISTS app_observations_time ON app_observations(device_id, measured DESC)',
  'CREATE INDEX IF NOT EXISTS app_observations_expiry ON app_observations(expires)',
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, grant_id TEXT NOT NULL, filters TEXT NOT NULL,
    url TEXT NOT NULL, secrets TEXT NOT NULL, expires INTEGER NOT NULL, verified INTEGER NOT NULL,
    generation TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS outbox (
    subscription_id TEXT NOT NULL, event_seq INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    due INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', last_code INTEGER, generation TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(subscription_id, event_seq))`,
  'CREATE INDEX IF NOT EXISTS outbox_due ON outbox(status, due)',
  'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)',
  "INSERT OR IGNORE INTO meta VALUES ('subscription_revision', 0)",
];

export function matches(filters, event) {
  return (!filters.device_ids?.length || filters.device_ids.includes(event.device_id)) &&
    (!filters.kinds?.length || filters.kinds.includes(event.kind));
}

/** SQL adapter is Cloudflare SqlStorage; synchronous transactions are supplied by its storage. */
export class Store {
  constructor(sql, transaction) {
    this.sql = sql; this.transaction = transaction;
    this.transaction(() => {
      for (const statement of SCHEMA) sql.exec(statement);
      // Preserve pre-generation SQLite data; both columns and their backfill commit together.
      for (const table of ['subscriptions', 'outbox']) {
        if (!this.rows(`PRAGMA table_info(${table})`).some(column => column.name === 'generation'))
          sql.exec(`ALTER TABLE ${table} ADD COLUMN generation TEXT NOT NULL DEFAULT ''`);
      }
      // Repair old-format writes after a rollback too, without scanning the full outbox on every activation.
      sql.exec("CREATE INDEX IF NOT EXISTS outbox_legacy_generation ON outbox(generation) WHERE generation = ''");
      sql.exec("UPDATE subscriptions SET generation = lower(hex(randomblob(16))) WHERE generation = ''");
      sql.exec(`UPDATE outbox SET generation = COALESCE((SELECT generation FROM subscriptions
        WHERE id = outbox.subscription_id), '') WHERE generation = ''`);
    });
  }
  rows(query, ...args) { return this.sql.exec(query, ...args).toArray(); }
  cleanup(now) {
    this.transaction(() => {
      this.sql.exec('DELETE FROM outbox WHERE event_seq IN (SELECT seq FROM events WHERE expires <= ?)', now);
      this.sql.exec('DELETE FROM events WHERE expires <= ?', now);
      this.sql.exec('DELETE FROM app_observations WHERE expires <= ?', now);
      this.sql.exec('DELETE FROM outbox WHERE subscription_id IN (SELECT id FROM subscriptions WHERE expires <= ?)', now);
      this.sql.exec('DELETE FROM subscriptions WHERE expires <= ?', now);
    });
  }
  ingest(event, now) {
    return this.transaction(() => {
      const body = canonical(event);
      const old = this.rows('SELECT seq, body, received FROM events WHERE device_id = ? AND event_id = ?', event.device_id, event.event_id)[0];
      if (old) {
        if (old.body !== body) throw new RequestError('event_id_conflict', 409);
        return { accepted: true, duplicate: true, received_at: new Date(old.received).toISOString() };
      }
      if (this.rows('SELECT COUNT(*) AS n FROM events')[0].n >= CAPACITY) throw new RequestError('storage_capacity_reached', 429);
      if (this.rows('SELECT COUNT(*) AS n FROM events WHERE device_id = ? AND received >= ?', event.device_id, now - 60000)[0].n >= 120)
        throw new RequestError('device_rate_limit', 429);
      const occurred = Date.parse(event.occurred_at);
      const observations = event.kind === 'app_activity_batch' ? event.payload.observations
        : event.kind === 'app_activity' ? [{ ...event.payload, id: event.event_id }] : [];
      // Expire the raw batch when its earliest member expires; normalized observations retain individual expiry.
      const oldest = Math.min(occurred, ...observations.map(item => Date.parse(item.measured_at)));
      const row = this.rows('INSERT INTO events(device_id,event_id,kind,occurred,measured,received,expires,body) VALUES(?,?,?,?,?,?,?,?) RETURNING seq',
        event.device_id, event.event_id, event.kind, occurred, Date.parse(event.payload.measured_at || event.occurred_at), now, oldest + RETENTION_MS, body)[0];
      if (observations.length) {
        let count = this.rows('SELECT COUNT(*) AS n FROM app_observations')[0].n;
        for (const observation of observations) {
          const id = observation.id.toLowerCase(), measured = Date.parse(observation.measured_at);
          const previous = this.rows('SELECT app, transition, measured FROM app_observations WHERE device_id = ? AND id = ?', event.device_id, id)[0];
          if (previous) {
            if (previous.app !== observation.app || previous.transition !== observation.transition || previous.measured !== measured)
              throw new RequestError('observation_id_conflict', 409);
            continue;
          }
          if (++count > 50000) throw new RequestError('observation_capacity_reached', 429);
          this.sql.exec('INSERT INTO app_observations(device_id,id,app,transition,measured,expires) VALUES(?,?,?,?,?,?)',
            event.device_id, id, observation.app, observation.transition, measured, measured + RETENTION_MS);
        }
      }
      for (const sub of this.rows('SELECT id, filters, generation FROM subscriptions WHERE expires > ?', now)) {
        if (matches(JSON.parse(sub.filters), event)) this.sql.exec('INSERT INTO outbox(subscription_id,event_seq,due,generation) VALUES(?,?,?,?)', sub.id, row.seq, now, sub.generation);
      }
      return { accepted: true, duplicate: false, received_at: new Date(now).toISOString() };
    });
  }
  events({ device_id, kind, before_seq, limit = 25 }, now) {
    const conditions = ['expires > ?'], args = [now];
    if (device_id) { conditions.push('device_id = ?'); args.push(device_id); }
    if (kind) { conditions.push('kind = ?'); args.push(kind); }
    if (before_seq) { conditions.push('seq < ?'); args.push(before_seq); }
    const rows = this.rows(`SELECT seq, body, received FROM events WHERE ${conditions.join(' AND ')} ORDER BY seq DESC LIMIT ?`, ...args, limit + 1);
    const more = rows.length > limit;
    return { events: rows.slice(0, limit).map(row => ({ ...JSON.parse(row.body), received_at: new Date(row.received).toISOString() })),
      next_before_seq: more ? rows[limit - 1].seq : null };
  }
  appUsage(device_id, hours, now) {
    const rows = this.rows(`SELECT id, app, transition, measured FROM app_observations
      WHERE device_id = ? AND expires > ? AND measured <= ? ORDER BY measured DESC, id DESC LIMIT 5001`, device_id, now, now);
    return { device_id, ...summarizeAppUsage(rows.slice(0, 5000), now - hours * 3600000, now),
      history_truncated: rows.length > 5000, last_received_at: this.lastReceived(device_id, now) };
  }
  state(device_id, maxAgeSeconds, now) {
    const measurements = {};
    for (const field of ['battery_percent', 'is_charging', 'low_power_mode']) {
      // field is selected from the fixed list above, never from user input.
      const row = this.rows(`SELECT body, measured, received FROM events WHERE device_id = ? AND kind = 'device_status'
        AND expires > ? AND json_type(body, '$.payload.${field}') IS NOT NULL ORDER BY measured DESC, seq DESC LIMIT 1`, device_id, now)[0];
      if (row) measurements[field] = this.measurement(JSON.parse(row.body).payload[field], row, maxAgeSeconds, now);
    }
    const row = this.rows("SELECT body, measured, received FROM events WHERE device_id = ? AND kind = 'location' AND expires > ? ORDER BY measured DESC, seq DESC LIMIT 1", device_id, now)[0];
    if (row) {
      const { measured_at, ...coordinates } = JSON.parse(row.body).payload;
      measurements.location = this.measurement(coordinates, row, maxAgeSeconds, now);
    }
    for (const [field, kind, transport] of [['focus_event', 'focus', null], ['wifi_event', 'connection', 'wifi'], ['bluetooth_event', 'connection', 'bluetooth']]) {
      const rows = this.rows(`SELECT body, measured, received FROM events WHERE device_id = ? AND kind = ? AND expires > ?
        ${transport ? "AND json_extract(body, '$.payload.transport') = ?" : ''} ORDER BY measured DESC, seq DESC LIMIT 1`,
      device_id, kind, now, ...(transport ? [transport] : []));
      if (rows[0]) {
        const { measured_at, ...change } = JSON.parse(rows[0].body).payload;
        // A connection change is not a complete inventory of currently connected Bluetooth devices.
        measurements[field] = this.measurement(change, rows[0], maxAgeSeconds, now);
      }
    }
    return { device_id, last_received_at: this.lastReceived(device_id, now), measurements };
  }
  measurement(value, row, maxAgeSeconds, now) {
    const age = Math.max(0, Math.floor((now - row.measured) / 1000));
    return { value, measured_at: new Date(row.measured).toISOString(), received_at: new Date(row.received).toISOString(),
      age_seconds: age, stale: now - row.measured > maxAgeSeconds * 1000 };
  }
  lastReceived(device_id, now) {
    const row = this.rows('SELECT MAX(received) AS received FROM events WHERE device_id = ? AND expires > ?', device_id, now)[0];
    return row.received === null ? null : new Date(row.received).toISOString();
  }
  revision() { return this.rows("SELECT value FROM meta WHERE key = 'subscription_revision'")[0].value; }
  subscription(id) { return this.rows('SELECT * FROM subscriptions WHERE id = ?', id)[0]; }
  subscribe(sub, expectedRevision, now = Date.now()) {
    this.transaction(() => {
      if (this.revision() !== expectedRevision) throw new RequestError('subscription_changed_retry', 409);
      const previous = this.subscription(sub.id), continuing = previous && previous.expires > now;
      if (!previous && this.rows('SELECT COUNT(*) AS n FROM subscriptions')[0].n >= 8)
        throw new RequestError('subscription_limit', 429);
      if (previous && !continuing) this.sql.exec('DELETE FROM outbox WHERE subscription_id = ?', sub.id);
      const generation = continuing ? previous.generation : crypto.randomUUID();
      this.sql.exec(`INSERT INTO subscriptions(id,owner,grant_id,filters,url,secrets,expires,verified,generation) VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET grant_id=excluded.grant_id, secrets=excluded.secrets, expires=excluded.expires,
          verified=excluded.verified, generation=excluded.generation`,
        sub.id, sub.owner, sub.grant_id, sub.filters, sub.url, sub.secrets, sub.expires, sub.verified, generation);
      this.sql.exec("UPDATE meta SET value = value + 1 WHERE key = 'subscription_revision'");
    });
  }
  #unsubscribe(id, generation) {
    if (generation !== undefined && this.subscription(id)?.generation !== generation) return;
    this.sql.exec('DELETE FROM outbox WHERE subscription_id = ?', id);
    this.sql.exec('DELETE FROM subscriptions WHERE id = ?', id);
    // Also invalidate an in-flight first verification, even if it has not been persisted yet.
    this.sql.exec("UPDATE meta SET value = value + 1 WHERE key = 'subscription_revision'");
  }
  unsubscribe(id, generation) {
    this.transaction(() => this.#unsubscribe(id, generation));
  }
  pending(now) {
    return this.rows(`SELECT o.*, e.body, e.device_id, e.event_id, e.occurred, e.received FROM outbox o JOIN events e ON e.seq=o.event_seq
      JOIN subscriptions s ON s.id=o.subscription_id AND s.generation=o.generation
      WHERE o.status='pending' AND o.due<=? AND e.expires>? AND s.expires>?
      ORDER BY o.due, e.seq LIMIT 5`, now, now, now);
  }
  deliverySubscription(job, now) {
    return this.rows(`SELECT s.* FROM subscriptions s JOIN outbox o ON o.subscription_id=s.id AND o.generation=s.generation
      JOIN events e ON e.seq=o.event_seq WHERE s.id=? AND s.generation=? AND o.event_seq=?
      AND o.status='pending' AND s.expires>? AND e.expires>?`,
    job.subscription_id, job.generation, job.event_seq, now, now)[0];
  }
  deliveryResult(job, status, now, sentSecrets) {
    this.transaction(() => {
      const current = this.deliverySubscription(job, now);
      if (!current) return;
      // Old-secret failures use the retry budget, but cannot permanently reject a renewed configuration.
      const superseded = sentSecrets !== undefined && current.secrets !== sentSecrets;
      const attempts = job.attempts + 1;
      const transient = superseded || status === 0 || status === 408 || status === 429 || status >= 500;
      const state = status >= 200 && status < 300 ? 'accepted' : transient && attempts < 8 ? 'pending' : 'failed';
      const jitter = crypto.getRandomValues(new Uint32Array(1))[0] % 1000;
      this.sql.exec('UPDATE outbox SET attempts=?,status=?,last_code=?,due=? WHERE subscription_id=? AND event_seq=? AND generation=?',
        attempts, state, status, now + Math.min(300000, 1000 * 2 ** attempts) + jitter, job.subscription_id, job.event_seq, job.generation);
      if (status === 410 && !superseded) this.#unsubscribe(job.subscription_id, job.generation);
    });
  }
  nextAlarm(now) {
    const due = this.rows("SELECT MIN(due) AS due FROM outbox WHERE status='pending'")[0].due;
    const expiry = this.rows('SELECT MIN(expires) AS expiry FROM events')[0].expiry;
    const lease = this.rows('SELECT MIN(expires) AS expiry FROM subscriptions')[0].expiry;
    const observationExpiry = this.rows('SELECT MIN(expires) AS expiry FROM app_observations')[0].expiry;
    const times = [due, expiry, lease, observationExpiry].filter(value => value !== null);
    return times.length ? Math.max(now + 250, Math.min(...times)) : null;
  }
  deliveryHealth() {
    return { deliveries: this.rows('SELECT status,COUNT(*) AS count FROM outbox GROUP BY status'),
      subscriptions: this.rows('SELECT id,expires FROM subscriptions').map(row => ({ id: row.id, expires_at: new Date(row.expires).toISOString() })) };
  }
}
