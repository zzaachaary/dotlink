import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { OAuthBudget, OAUTH_BUDGETS, guardOAuth } from '../src/oauth-guard.mjs';

function budget(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const sql = { exec(query, ...args) { const rows = db.prepare(query).all(...args); return { toArray: () => rows }; } };
  const transaction = operation => {
    db.exec('BEGIN'); try { const result = operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  return { db, sql, transaction, limiter: new OAuthBudget(sql, transaction) };
}
test('OAuth limits persist, recover at window boundaries and never grow state on denial', t => {
  const { db, sql, transaction, limiter } = budget(t), now = Date.UTC(2026, 9, 12);
  for (let minute = 0; minute < 5; minute++) {
    for (let i = 0; i < 12; i++) assert.equal(limiter.consume('registration', now + minute * 60000).allowed, true);
    assert.equal(limiter.consume('registration', now + minute * 60000).allowed, false);
  }
  const before = db.prepare('SELECT * FROM oauth_budget').all();
  const restarted = new OAuthBudget(sql, transaction);
  assert.deepEqual(restarted.consume('registration', now + 5 * 60000), { allowed: false, retryAfter: 86100 });
  for (let i = 0; i < 100; i++) restarted.consume('registration', now + 5 * 60000);
  assert.deepEqual(db.prepare('SELECT * FROM oauth_budget').all(), before);
  assert.equal(restarted.consume('registration', now + 86400000).allowed, true);
  for (const route of Object.keys(OAUTH_BUDGETS).filter(x => x !== 'registration')) assert.equal(limiter.consume(route, now).allowed, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM oauth_budget').get().n, 5);
  assert.throws(() => limiter.consume('attacker-generated-key', now), /invalid_oauth_route/);
  assert.throws(() => limiter.consume('__proto__', now), /invalid_oauth_route/);
});

function environment(decision = { allowed: true }) {
  const calls = [];
  return { calls, env: { PUBLIC_ORIGIN: 'https://bridge.example.com', OWNER_GITHUB_ID: 'test-owner',
    BRIDGE: { getByName(name) { assert.equal(name, 'oauth-budget:test-owner'); return { async consumeOAuthBudget(route) {
      calls.push(route); if (decision instanceof Error) throw decision; return decision;
    } }; } } } };
}
const request = (body, headers = {}) => new Request('https://bridge.example.com/oauth/token', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }, body,
  ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
});
test('bounded form preserves Basic authentication and repeated resource parameters exactly', async () => {
  const { env, calls } = environment();
  const raw = 'grant_type=refresh_token&resource=https%3A%2F%2Fa.example&resource=https%3A%2F%2Fb.example';
  const prepared = await guardOAuth(request(raw, { authorization: 'Basic Zml4dHVyZTpmaXh0dXJl' }), env);
  assert.equal(await prepared.text(), raw);
  assert.equal(prepared.headers.get('authorization'), 'Basic Zml4dHVyZTpmaXh0dXJl');
  assert.deepEqual(calls, ['token']);
});
test('actual streamed bytes are bounded with missing or false Content-Length before budget admission', async () => {
  for (const headers of [{}, { 'content-length': '1' }]) {
    const { env, calls } = environment(); let cancelled = false, chunks = 0;
    const stream = new ReadableStream({ pull(controller) {
      controller.enqueue(new TextEncoder().encode((++chunks === 1 ? 'x=' : '') + 'a'.repeat(40000)));
    }, cancel() { cancelled = true; } });
    await assert.rejects(guardOAuth(request(stream, headers), env), error => error.status === 413);
    assert.equal(cancelled, true); assert.deepEqual(calls, []);
  }
});
test('form field bounds accept the boundary and reject additional decoded fields without admission', async () => {
  const { env, calls } = environment();
  const raw = new URLSearchParams(Array.from({ length: 64 }, (_, i) => ['field' + i, 'v'])).toString();
  assert.equal(await (await guardOAuth(request(raw), env)).text(), raw);
  await assert.rejects(guardOAuth(request(raw + '&%66inal=x'), env), /oauth_fields_too_large/);
  await assert.rejects(guardOAuth(request('k=' + 'x'.repeat(8193)), env), /oauth_fields_too_large/);
  assert.deepEqual(calls, ['token']);
});
test('admission failures stop before provider consumption while metadata, setup and OPTIONS stay independent', async () => {
  const { env, calls } = environment({ allowed: false, retryAfter: 25 });
  for (const path of ['/authorize', '/callback']) {
    const r = await guardOAuth(new Request('https://bridge.example.com' + path), env);
    assert.equal(r.status, 429); assert.equal(r.headers.get('retry-after'), '25');
  }
  for (const path of ['/setup', '/ingest', '/mcp', '/.well-known/oauth-authorization-server']) {
    const r = new Request('https://bridge.example.com' + path); assert.equal(await guardOAuth(r, env), r);
  }
  const options = new Request('https://bridge.example.com/oauth/token', { method: 'OPTIONS' });
  assert.equal(await guardOAuth(options, env), options);
  assert.deepEqual(calls, ['authorization', 'callback']);
  assert.equal((await guardOAuth(request('x=1'), environment(new Error('unavailable')).env)).status, 503);
});
test('separate auth origin is enforced for every sensitive route without decoding new aliases', async () => {
  const { env, calls } = environment(); env.AUTH_ORIGIN = 'https://auth.example.com';
  for (const path of ['/authorize', '/callback', '/oauth/token', '/oauth/register']) {
    assert.equal((await guardOAuth(new Request('https://bridge.example.com' + path), env)).status, 403);
  }
  const r = new Request('https://auth.example.com/authorize?state=normal');
  assert.equal(await guardOAuth(r, env), r);
  assert.deepEqual(calls, ['authorization']);
});
