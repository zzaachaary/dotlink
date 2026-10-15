import { json, readText, RequestError } from './protocol.mjs';

// Per installation, aligned UTC minute/day windows. Fixed keys bound persistent state.
export const OAUTH_BUDGETS = Object.freeze({
  registration: [12, 60], authorization: [20, 120], consent: [30, 120], callback: [30, 120], token: [60, 1000],
});
const MINUTE = 60000, DAY = 86400000;
export class OAuthBudget {
  constructor(sql, transaction) {
    this.sql = sql; this.transaction = transaction;
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_budget (
      route TEXT PRIMARY KEY, minute INTEGER NOT NULL, minute_count INTEGER NOT NULL,
      day INTEGER NOT NULL, day_count INTEGER NOT NULL)`);
  }
  consume(route, now = Date.now()) {
    if (!Object.hasOwn(OAUTH_BUDGETS, route)) throw new RequestError('invalid_oauth_route');
    return this.transaction(() => {
      const [minuteLimit, dayLimit] = OAUTH_BUDGETS[route];
      const minute = Math.floor(now / MINUTE), day = Math.floor(now / DAY);
      const old = this.sql.exec('SELECT * FROM oauth_budget WHERE route=?', route).toArray()[0];
      const minuteCount = old?.minute === minute ? old.minute_count : 0;
      const dayCount = old?.day === day ? old.day_count : 0;
      const wait = Math.max(minuteCount >= minuteLimit ? (minute + 1) * MINUTE - now : 0,
        dayCount >= dayLimit ? (day + 1) * DAY - now : 0);
      if (wait > 0) return { allowed: false, retryAfter: Math.ceil(wait / 1000) };
      this.sql.exec(`INSERT INTO oauth_budget VALUES(?,?,?,?,?) ON CONFLICT(route) DO UPDATE SET
        minute=excluded.minute,minute_count=excluded.minute_count,day=excluded.day,day_count=excluded.day_count`,
      route, minute, minuteCount + 1, day, dayCount + 1);
      return { allowed: true };
    });
  }
}

function validateFields(params) {
  let count = 0;
  for (const [key, value] of params) {
    if (++count > 64 || key.length > 128 || value.length > 8192) throw new RequestError('oauth_fields_too_large');
  }
}

/** Runs before provider parsing or transaction consumption; returns a bounded request or a rejection. */
export async function guardOAuth(request, env) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!['/oauth/register', '/oauth/token', '/authorize', '/callback'].includes(path)) return request;
  // Provider legacy routing compares hostname only. Enforce the canonical origin before it can match.
  if (url.origin !== (env.AUTH_ORIGIN || env.PUBLIC_ORIGIN)) return json({ error: 'oauth_origin_not_allowed' }, 403);
  if (method === 'OPTIONS') return request;
  if (new TextEncoder().encode(url.search).byteLength > 8192) throw new RequestError('oauth_query_too_large', 414);
  validateFields(url.searchParams);
  const route = path === '/oauth/register' && method === 'POST' ? 'registration'
    : path === '/oauth/token' && method === 'POST' ? 'token'
    : path === '/authorize' && method === 'GET' ? 'authorization'
    : path === '/authorize' && method === 'POST' ? 'consent'
    : path === '/callback' && method === 'GET' ? 'callback' : null;
  if (!route) return request;
  if (method === 'POST') {
    const raw = await readText(request, path === '/authorize' ? 4096 : 65536);
    if (path !== '/oauth/register') validateFields(new URLSearchParams(raw));
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    // Preserve the exact bounded body, including repeated resource parameters and Basic credentials.
    request = new Request(request, { headers, body: raw });
  }
  let decision;
  try {
    // Same namespace, separate named object: anonymous admission never schedules on the phone-data object.
    decision = await env.BRIDGE.getByName(`oauth-budget:${env.OWNER_GITHUB_ID}`).consumeOAuthBudget(route);
  } catch { return json({ error: 'temporarily_unavailable', reason: 'oauth_guard_unavailable' }, 503); }
  if (!decision.allowed) {
    const response = json({ error: 'temporarily_unavailable', reason: 'oauth_rate_limit' }, 429);
    response.headers.set('Retry-After', String(decision.retryAfter));
    return response;
  }
  return request;
}
