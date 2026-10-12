import { callbackUrl, canonical, equal, EVENT_NAME, hash, readJson, record, RequestError, signedHeaders, webhookKey } from './protocol.mjs';
import { KINDS } from './store.mjs';

export function filters(value, devices) {
  record(value, ['device_ids', 'kinds']);
  const output = {};
  for (const [key, allowed] of [['device_ids', devices.map(device => device.id)], ['kinds', KINDS]]) {
    if (value[key] === undefined) continue;
    if (!Array.isArray(value[key]) || value[key].length > 32 || value[key].some(item => !allowed.includes(item)))
      throw new RequestError('invalid_filter');
    if (value[key].length) output[key] = [...new Set(value[key])].sort();
  }
  return output;
}
export async function subscriptionRequest(params, owner, devices, unsubscribe = false) {
  record(params, unsubscribe ? ['name', 'arguments', 'delivery', '_meta'] : ['name', 'arguments', 'delivery', 'cursor', 'ttlMs', '_meta']);
  // MCP metadata belongs to the request, not its subscription identity or stored filters.
  if (Object.hasOwn(params, '_meta')) record(params._meta, Object.keys(params._meta ?? {}));
  if (params.name !== EVENT_NAME) throw new RequestError('unknown_event');
  record(params.delivery, unsubscribe ? ['mode', 'url'] : ['mode', 'url', 'secret']);
  if (params.delivery.mode !== 'webhook') throw new RequestError('webhook_required');
  const args = filters(params.arguments || {}, devices), url = callbackUrl(params.delivery.url);
  const id = `sub_${await hash(canonical({ owner, name: EVENT_NAME, arguments: args, url }))}`;
  if (unsubscribe) return { id };
  if (params.cursor != null) throw new RequestError('replay_not_supported');
  webhookKey(params.delivery.secret);
  if (params.ttlMs != null && (!Number.isSafeInteger(params.ttlMs) || params.ttlMs < 1)) throw new RequestError('invalid_ttl');
  return { id, owner, filters: canonical(args), url, secret: params.delivery.secret,
    ttl: Math.min(params.ttlMs ?? 86400000, 86400000) };
}

async function sealingKey(encoded) {
  if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new RequestError('signing_storage_not_configured', 503);
  const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value, encodedKey, context) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) },
    await sealingKey(encodedKey), new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify({ iv: btoa(String.fromCharCode(...iv)), data: btoa(String.fromCharCode(...new Uint8Array(data))) });
}
export async function unseal(value, encodedKey, context) {
  const envelope = JSON.parse(value);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(envelope.iv), c => c.charCodeAt(0)),
    additionalData: new TextEncoder().encode(context) }, await sealingKey(encodedKey), Uint8Array.from(atob(envelope.data), c => c.charCodeAt(0)));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export class CallbackError extends RequestError {
  constructor(reason) { super('callback_verification_failed', 502); this.reason = reason; }
}
export async function verifyCallback(sub, fetcher = fetch) {
  const challenge = crypto.randomUUID(), body = JSON.stringify({ type: 'verification', challenge });
  try {
    const response = await fetcher(callbackUrl(sub.url), { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: await signedHeaders(sub.secret, `verify_${crypto.randomUUID()}`, body, sub.id), body });
    if (!response.ok) { await response.body?.cancel(); throw new CallbackError('challenge_failed'); }
    if (!equal((await readJson(response, 4096)).challenge, challenge)) throw new CallbackError('challenge_failed');
  } catch (error) {
    if (error instanceof CallbackError) throw error;
    throw new CallbackError(error.name === 'TimeoutError' ? 'timeout' : 'challenge_failed');
  }
}
export async function deliver(sub, secrets, event, receivedAt, fetcher = fetch, now = Date.now()) {
  const eventId = `evt_${event.device_id}_${event.event_id.toLowerCase()}`;
  const body = JSON.stringify({ eventId, name: EVENT_NAME, timestamp: event.occurred_at,
    data: { ...event, received_at: new Date(receivedAt).toISOString() }, cursor: null });
  const headers = await signedHeaders(secrets.current, eventId, body, sub.id, now);
  if (secrets.previous && secrets.previous_until > now) {
    headers['webhook-signature'] += ` ${(await signedHeaders(secrets.previous, eventId, body, sub.id, now))['webhook-signature']}`;
  }
  // Never follow Location: return 3xx to the outbox as a permanent delivery failure.
  const response = await fetcher(callbackUrl(sub.url), { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000), headers, body });
  await response.body?.cancel();
  return response.status;
}
