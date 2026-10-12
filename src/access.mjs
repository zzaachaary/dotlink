import { equal, hash, RequestError } from './protocol.mjs';

export function deviceRegistry(env) {
  let items;
  try { items = JSON.parse(env.DEVICE_REGISTRY || '[]'); }
  catch { throw new RequestError('device_configuration_invalid', 503); }
  if (!Array.isArray(items) || items.length > 32) throw new RequestError('device_configuration_invalid', 503);
  const seen = new Set(), credentials = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).some(key => !['id', 'label', 'platform', 'enabled', 'token_sha256'].includes(key)) ||
        typeof item.id !== 'string' || !/^[a-z][a-z0-9_-]{2,63}$/.test(item.id) || seen.has(item.id) ||
        typeof item.token_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.token_sha256) || credentials.has(item.token_sha256) || typeof item.enabled !== 'boolean' ||
        !['ios', 'ipados', 'macos', 'android'].includes(item.platform) ||
        typeof item.label !== 'string' || item.label.length > 100) throw new RequestError('device_configuration_invalid', 503);
    seen.add(item.id);
    credentials.add(item.token_sha256);
  }
  return items;
}

export async function authenticateDevice(request, env) {
  const header = request.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) throw new RequestError('unauthorized', 401);
  const digest = await hash(header.slice(7));
  const device = deviceRegistry(env).find(item => item.enabled && equal(item.token_sha256, digest));
  if (!device) throw new RequestError('unauthorized', 401);
  return device;
}

export function requireOwner(ctx, env, scope = 'phone:read') {
  if (!env.OWNER_GITHUB_ID || ctx.auth?.userId !== env.OWNER_GITHUB_ID || ctx.props?.owner !== env.OWNER_GITHUB_ID)
    throw new RequestError('forbidden', 403);
  if (!Array.isArray(ctx.auth.scope) || !ctx.auth.scope.includes(scope)) throw new RequestError('insufficient_scope', 403);
}
