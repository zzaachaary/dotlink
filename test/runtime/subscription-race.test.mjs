import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, Response, convertV4MiniflareOptions } from 'miniflare';
import { hash } from '../../src/protocol.mjs';

let bundlePromise;
for (const [mode, lateStatus] of [['recreated', 204], ['recreated', 410], ['rotated', 204], ['rotated', 410], ['regranted', 204]])
test(`real alarm isolates a ${mode} subscription from a captured batch and late ${lateStatus}`, { timeout: 20000 }, async t => {
  bundlePromise ??= build({ entryPoints: ['test/runtime/fixture.mjs'], bundle: true, write: false, format: 'esm', platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'], mainFields: ['module', 'main'], external: ['cloudflare:*', 'node:*'] });
  const callback = 'https://chatgpt.com/test-only-race', token = 'T'.repeat(43), deliveries = [];
  const device = { id: 'iphone-primary', label: 'Synthetic fixture', platform: 'ios', enabled: true, token_sha256: await hash(token) };
  let releaseFirst, callbackError;
  const firstResponse = new Promise(resolve => { releaseFirst = resolve; });
  const mf = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR), workers: [{
    name: 'race-fixture', modules: true, script: (await bundlePromise).outputFiles[0].text, compatibilityDate: '2026-09-30',
    compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    durableObjects: { BRIDGE: { className: 'PhoneBridge', useSQLite: true } }, kvNamespaces: ['OAUTH_KV'],
    bindings: { PUBLIC_ORIGIN: 'https://bridge.example.com', OWNER_GITHUB_ID: 'test-owner', ENABLE_INGEST: 'true',
      BRIDGE_SEAL_KEY: Buffer.alloc(32, 7).toString('base64'), GITHUB_CLIENT_ID: 'fixture-only',
      GITHUB_CLIENT_SECRET: 'fixture-only', DEVICE_REGISTRY: JSON.stringify([device]) },
    outboundService: async request => {
      try {
        assert.equal(request.url, callback, 'All external requests must remain inside this fixture');
        const body = await request.text(), data = JSON.parse(body);
        if (data.type === 'verification') return Response.json({ challenge: data.challenge });
        deliveries.push(data.data.event_id);
        const key = Buffer.alloc(32, mode === 'rotated' && deliveries.length > 1 ? 12 : 11);
        const signed = `${request.headers.get('webhook-id')}.${request.headers.get('webhook-timestamp')}.${body}`;
        const signature = `v1,${createHmac('sha256', key).update(signed).digest('base64')}`;
        assert.ok(request.headers.get('webhook-signature').split(' ').includes(signature), 'Each delivery must use the current signing key');
        if (deliveries.length === 1) { await firstResponse; return new Response(null, { status: lateStatus }); }
        return new Response(null, { status: 204 });
      } catch (error) { callbackError = error; return new Response(null, { status: 400 }); }
    },
  }] }));
  t.after(async () => { releaseFirst(); await mf.dispose(); });
  const send = (path, body, auth = token) => mf.dispatchFetch(`https://bridge.example.com${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
  const registration = await mf.dispatchFetch('https://bridge.example.com/oauth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      client_name: 'Isolated race regression', redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'],
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }) });
  assert.equal(registration.status, 201);
  const client = await registration.json();
  const issueToken = async () => {
    const verifier = 'V'.repeat(43), authorize = new URL('https://bridge.example.com/__test/complete-authorization');
    authorize.search = new URLSearchParams({ client_id: client.client_id, response_type: 'code',
      redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', scope: 'phone:read phone:subscribe offline_access',
      state: 'fixture-race', resource: 'https://bridge.example.com/mcp',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
    const completed = await mf.dispatchFetch(authorize); assert.equal(completed.status, 200);
    const redirect = new URL((await completed.json()).redirectTo);
    const tokenResponse = await mf.dispatchFetch('https://bridge.example.com/oauth/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: client.client_id,
        code: redirect.searchParams.get('code'), code_verifier: verifier,
        redirect_uri: 'https://chatgpt.com/connector_platform_oauth_redirect', resource: 'https://bridge.example.com/mcp' }).toString() });
    assert.equal(tokenResponse.status, 200);
    return (await tokenResponse.json()).access_token;
  };
  let accessToken = await issueToken();
  const rpc = async (method, params = {}) => {
    const response = await send('/mcp', { jsonrpc: '2.0', id: crypto.randomUUID(), method, params }, accessToken);
    assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data.error, undefined, JSON.stringify(data.error));
    if (callbackError) throw callbackError;
    return data.result;
  };
  const health = async () => (await rpc('tools/call', { name: 'phone_bridge_status', arguments: {} })).structuredContent;
  const until = async condition => {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      if (callbackError) throw callbackError;
      if (await condition()) return;
      await delay(25);
    }
    assert.fail('Bounded wait expired');
  };
  const params = { name: 'phone.event', arguments: { device_ids: [device.id], kinds: ['notification'] },
    delivery: { mode: 'webhook', url: callback, secret: `whsec_${Buffer.alloc(32, 11).toString('base64')}` }, ttlMs: 60000 };
  const event = body => ({ v: 1, event_id: crypto.randomUUID(), device_id: device.id, kind: 'notification',
    occurred_at: new Date().toISOString(), payload: { app: 'Synthetic race fixture', body } });
  const original = await rpc('events/subscribe', params), first = event('old batch first'), second = event('old batch second');
  for (const response of await Promise.all([send('/ingest', first), send('/ingest', second)])) assert.equal(response.status, 202);
  await until(() => deliveries.length === 1);
  assert.equal((await health()).deliveries.find(row => row.status === 'pending').count, 2);
  if (mode === 'recreated') {
    await rpc('events/unsubscribe', { name: params.name, arguments: params.arguments, delivery: { mode: 'webhook', url: callback } });
    const recreated = await rpc('events/subscribe', params); assert.equal(recreated.id, original.id);
    assert.deepEqual((await health()).deliveries, []);
    const fresh = event('new subscription'); assert.equal((await send('/ingest', fresh)).status, 202);
    releaseFirst();
    await until(async () => (await health()).deliveries.some(row => row.status === 'accepted' && row.count === 1));
    assert.equal((await health()).subscriptions.length, 1, 'A late 410 must not delete the recreated subscription');
    assert.equal(deliveries.length, 2, 'Only one already-in-flight event and the fresh event may be sent');
    assert.ok([first.event_id, second.event_id].includes(deliveries[0]));
    assert.equal(deliveries[1], fresh.event_id, 'The remaining captured old job must never be sent');
  } else {
    if (mode === 'regranted') accessToken = await issueToken();
    const renewedParams = mode === 'rotated' ? { ...params,
      delivery: { ...params.delivery, secret: `whsec_${Buffer.alloc(32, 12).toString('base64')}` } } : params;
    const renewed = await rpc('events/subscribe', renewedParams); assert.equal(renewed.id, original.id);
    assert.equal((await health()).subscriptions.length, 1);
    releaseFirst();
    await until(async () => {
      const state = await health();
      assert.equal(state.subscriptions.length, 1, 'Renewal must not be deleted by stale delivery state');
      return state.deliveries.some(row => row.status === 'accepted' && row.count === 2);
    });
    assert.equal((await health()).subscriptions.length, 1, 'Renewal must survive old callback results and grant snapshots');
    assert.equal(deliveries.length, lateStatus === 410 ? 3 : 2);
    assert.deepEqual([...new Set(deliveries)].sort(), [first.event_id, second.event_id].sort());
    if (lateStatus === 410) assert.equal(deliveries.filter(id => id === deliveries[0]).length, 2, 'Retry the old failure with current secrets');
  }
});

test('real Durable Object SQLite upgrades legacy subscriptions without losing pending data', { timeout: 20000 }, async t => {
  const script = `
    import { DurableObject } from 'cloudflare:workers';
    import { Store } from '../../src/store.mjs';
    export class LegacyMigration extends DurableObject {
      check() {
        const sql = this.ctx.storage.sql, now = Date.now();
        sql.exec("CREATE TABLE subscriptions (id TEXT PRIMARY KEY,owner TEXT NOT NULL,grant_id TEXT NOT NULL,filters TEXT NOT NULL,url TEXT NOT NULL,secrets TEXT NOT NULL,expires INTEGER NOT NULL,verified INTEGER NOT NULL)");
        sql.exec("CREATE TABLE outbox (subscription_id TEXT NOT NULL,event_seq INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,due INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',last_code INTEGER,PRIMARY KEY(subscription_id,event_seq))");
        sql.exec("CREATE TABLE events (seq INTEGER PRIMARY KEY AUTOINCREMENT,device_id TEXT NOT NULL,event_id TEXT NOT NULL,kind TEXT NOT NULL,occurred INTEGER NOT NULL,measured INTEGER NOT NULL,received INTEGER NOT NULL,expires INTEGER NOT NULL,body TEXT NOT NULL,UNIQUE(device_id,event_id))");
        sql.exec('INSERT INTO subscriptions VALUES (?,?,?,?,?,?,?,?)','legacy','owner','grant','{}','https://chatgpt.com/test','legacy-secrets',now+60000,now);
        const body=JSON.stringify({v:1,event_id:'legacy-event',device_id:'iphone-primary',kind:'notification',occurred_at:new Date(now).toISOString(),payload:{app:'Synthetic',body:'preserved'}});
        sql.exec('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?)',1,'iphone-primary','legacy-event','notification',now,now,now,now+60000,body);
        sql.exec('INSERT INTO outbox(subscription_id,event_seq,due) VALUES(?,?,?)','legacy',1,now);
        const create=()=>new Store(sql,operation=>this.ctx.storage.transactionSync(operation));
        const first=create(), generation=first.subscription('legacy').generation;
        const second=create(), pending=second.pending(now);
        return {generation, reopenedGeneration:second.subscription('legacy').generation,
          pendingGeneration:pending[0]?.generation, pendingCount:pending.length,
          legacySecret:second.deliverySubscription(pending[0],now)?.secrets,
          body:JSON.parse(pending[0].body).payload.body};
      }
    }
    export default {async fetch(request,env){return Response.json(await env.MIGRATION.get(env.MIGRATION.idFromName('legacy')).check())}};
  `;
  const bundle = await build({ stdin: { contents: script, resolveDir: `${process.cwd()}/test/runtime`, sourcefile: 'legacy-migration-fixture.mjs' },
    bundle: true, write: false, format: 'esm', platform: 'neutral', external: ['cloudflare:*'] });
  const mf = new Miniflare(convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR), workers: [{
    name: 'migration-fixture', modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-09-30',
    durableObjects: { MIGRATION: { className: 'LegacyMigration', useSQLite: true } },
    outboundService: () => new Response('External requests disabled in tests', { status: 502 }),
  }] }));
  t.after(() => mf.dispose());
  const response = await mf.dispatchFetch('https://fixture.invalid/migrate'); assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.generation, /^[a-f0-9]{32}$/);
  assert.equal(result.reopenedGeneration, result.generation);
  assert.equal(result.pendingGeneration, result.generation);
  assert.equal(result.pendingCount, 1);
  assert.equal(result.legacySecret, 'legacy-secrets');
  assert.equal(result.body, 'preserved');
});
