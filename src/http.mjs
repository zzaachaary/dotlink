import { authenticateDevice } from './access.mjs';
import { authorization } from './auth.mjs';
import { json, readJson, RequestError, unwrap, validateEvent } from './protocol.mjs';
export async function routes(request, env) {
  const path = new URL(request.url).pathname;
  if (path === '/health' && request.method === 'GET') return json({ service: 'personal-dot-phone-bridge', version: '0.1.0',
    ingest_enabled: env.ENABLE_INGEST === 'true' });
  if (path === '/authorize' || path === '/callback') return authorization(request, env);
  if (path === '/ingest' && request.method === 'POST') {
    if (env.ENABLE_INGEST !== 'true') throw new RequestError('ingest_disabled', 503);
    const device = await authenticateDevice(request, env);
    const event = validateEvent(await readJson(request));
    if (event.device_id !== device.id) throw new RequestError('device_identity_mismatch', 403);
    return json(unwrap(await env.BRIDGE.getByName(env.OWNER_GITHUB_ID).ingest(event)), 202);
  }
  return json({ error: 'not_found' }, 404);
}
