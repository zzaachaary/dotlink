export const MAX_BYTES = 64 * 1024;
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const EVENT_NAME = 'phone.event';
export const PROTOCOL_VERSION = '2026-07-28';
const encoder = new TextEncoder();
// iOS Shortcuts can create two independent nine-digit random integers without an extra app.
const eventIdPattern = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|sc-[1-9][0-9]{8}-[1-9][0-9]{8})(?![\s\S])/i;
const validEventId = value => typeof value === 'string' && eventIdPattern.test(value);

export class RequestError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}

export function record(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).some(key => !keys.includes(key))) throw new RequestError('invalid_fields');
  return value;
}

function text(value, max = 16000) {
  if (typeof value !== 'string' || value.length > max) throw new RequestError('invalid_text');
  return value;
}

function timestamp(value) {
  text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) throw new RequestError('invalid_timestamp');
  const local = new Date(`${value.slice(0, 19)}Z`);
  if (local.toISOString().slice(0, 19) !== value.slice(0, 19)) throw new RequestError('invalid_timestamp');
  return Date.parse(value);
}

function number(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new RequestError('invalid_number');
}

export function validateEvent(event, now = Date.now()) {
  record(event, ['v', 'event_id', 'device_id', 'kind', 'occurred_at', 'payload']);
  if (event.v !== 1 || !validEventId(event.event_id))
    throw new RequestError('invalid_event_id');
  // Identity is checked against the authenticated device registration at ingress.
  if (typeof event.device_id !== 'string' || !/^[a-z][a-z0-9_-]{2,63}$/.test(event.device_id))
    throw new RequestError('invalid_device_id');
  const occurred = timestamp(event.occurred_at);
  if (occurred > now + 300000 || occurred <= now - RETENTION_MS) throw new RequestError('event_outside_retention');
  const p = event.payload;
  switch (event.kind) {
    case 'notification':
      record(p, ['app', 'title', 'subtitle', 'body']);
      if (!text(p.app, 200).trim()) throw new RequestError('missing_app');
      for (const key of ['title', 'subtitle', 'body']) if (p[key] !== undefined) text(p[key]);
      break;
    case 'device_status':
      record(p, ['battery_percent', 'is_charging', 'low_power_mode', 'measured_at']);
      timestamp(p.measured_at);
      if (p.battery_percent !== undefined) number(p.battery_percent, 0, 100);
      for (const key of ['is_charging', 'low_power_mode'])
        if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new RequestError('invalid_boolean');
      if (!['battery_percent', 'is_charging', 'low_power_mode'].some(key => p[key] !== undefined))
        throw new RequestError('empty_status');
      break;
    case 'location':
      record(p, ['latitude', 'longitude', 'accuracy_m', 'measured_at']);
      timestamp(p.measured_at);
      number(p.latitude, -90, 90); number(p.longitude, -180, 180);
      if (p.accuracy_m !== undefined) number(p.accuracy_m, 0, 100000);
      break;
    case 'focus':
      record(p, ['name', 'active', 'measured_at']);
      timestamp(p.measured_at);
      if (!text(p.name, 160).trim()) throw new RequestError('missing_focus_name');
      if (typeof p.active !== 'boolean') throw new RequestError('invalid_boolean');
      break;
    case 'connection':
      record(p, ['transport', 'connected', 'name', 'measured_at']);
      timestamp(p.measured_at);
      if (!['wifi', 'bluetooth'].includes(p.transport)) throw new RequestError('invalid_transport');
      if (typeof p.connected !== 'boolean') throw new RequestError('invalid_boolean');
      if (p.name !== undefined && !text(p.name, 200).trim()) throw new RequestError('invalid_connection_name');
      break;
    case 'app_activity':
      record(p, ['app', 'transition', 'source', 'measured_at']);
      timestamp(p.measured_at);
      if (!text(p.app, 200).trim()) throw new RequestError('missing_app');
      if (!['opened', 'closed'].includes(p.transition) || p.source !== 'shortcuts_app_trigger')
        throw new RequestError('invalid_app_observation');
      break;
    case 'app_activity_batch': {
      record(p, ['source', 'observations', 'measured_at']);
      timestamp(p.measured_at);
      if (p.source !== 'shortcuts_app_trigger' || !Array.isArray(p.observations) ||
          p.observations.length < 1 || p.observations.length > 200) throw new RequestError('invalid_app_batch');
      const ids = new Set();
      for (const observation of p.observations) {
        record(observation, ['id', 'app', 'transition', 'measured_at']);
        if (!validEventId(observation.id))
          throw new RequestError('invalid_observation_id');
        if (ids.has(observation.id.toLowerCase())) throw new RequestError('duplicate_observation_id');
        ids.add(observation.id.toLowerCase());
        if (!text(observation.app, 200).trim() || !['opened', 'closed'].includes(observation.transition))
          throw new RequestError('invalid_app_observation');
        const measured = timestamp(observation.measured_at);
        if (measured <= now - RETENTION_MS || measured > now + 300000 || measured > occurred + 300000)
          throw new RequestError('observation_outside_retention');
      }
      break;
    }
    case 'health':
      record(p, ['metric', 'value', 'unit', 'measured_at']);
      timestamp(p.measured_at); number(p.value, 0, 1e9);
      if (!text(p.metric, 80).trim() || !text(p.unit, 40).trim()) throw new RequestError('invalid_metric');
      break;
    default: throw new RequestError('unknown_event_kind');
  }
  if (p.measured_at !== undefined && timestamp(p.measured_at) > occurred + 300000)
    throw new RequestError('measurement_after_event');
  if (encoder.encode(JSON.stringify(event)).byteLength > MAX_BYTES) throw new RequestError('payload_too_large', 413);
  return { ...event, event_id: event.event_id.toLowerCase() };
}

export async function readJson(request, limit = MAX_BYTES) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || ''))
    throw new RequestError('json_required', 415);
  const raw = await readText(request, limit);
  try { return JSON.parse(raw); }
  catch { throw new RequestError('invalid_json'); }
}

export async function readText(request, limit = MAX_BYTES) {
  if (Number(request.headers.get('content-length')) > limit) throw new RequestError('payload_too_large', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('empty_body');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new RequestError('payload_too_large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new RequestError('invalid_json'); }
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export function unwrap(result) {
  if (!result.ok) { const error = new RequestError(result.error, result.status); error.reason = result.reason; throw error; }
  return result.value;
}

export async function hash(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}

export function callbackUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new RequestError('invalid_callback'); }
  // Only the intended OpenAI receiver can receive phone events. Never accept arbitrary webhook sites.
  const approved = ['chatgpt.com', 'openai.com'].some(root => url.hostname === root || url.hostname.endsWith(`.${root}`));
  if (!approved || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash)
    throw new RequestError('invalid_callback');
  return url.href;
}

export function webhookKey(secret) {
  if (typeof secret !== 'string' || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) throw new RequestError('invalid_signing_secret');
  let bytes;
  try { bytes = Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0)); }
  catch { throw new RequestError('invalid_signing_secret'); }
  if (bytes.length < 24 || bytes.length > 64) throw new RequestError('invalid_signing_secret');
  return bytes;
}

export async function signedHeaders(secret, id, body, subscriptionId, now = Date.now()) {
  const time = String(Math.floor(now / 1000));
  const key = await crypto.subtle.importKey('raw', webhookKey(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${id}.${time}.${body}`)));
  return {
    'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': time,
    'webhook-signature': `v1,${btoa(String.fromCharCode(...signature))}`, 'X-MCP-Subscription-Id': subscriptionId,
  };
}
