import test from 'node:test';
import assert from 'node:assert/strict';
import { seal, unseal, subscriptionRequest, verifyCallback, deliver } from '../src/subscriptions.mjs';
import { mcp } from '../src/mcp.mjs';
const key = Buffer.alloc(32, 3).toString('base64'), secret = `whsec_${Buffer.alloc(32, 4).toString('base64')}`;
const devices = [{ id: 'iphone-primary' }, { id: 'ipad-study' }];
const params = () => ({ name: 'phone.event', arguments: { kinds: ['location', 'device_status'], device_ids: ['ipad-study', 'iphone-primary'] },
  delivery: { mode: 'webhook', url: 'https://chatgpt.com/test-callback', secret } });
test('subscription identity is stable across filter order, renewals and unsubscriptions', async () => {
  const a = await subscriptionRequest(params(), 'owner', devices), p = params();
  p.arguments = { device_ids: ['iphone-primary', 'ipad-study'], kinds: ['device_status', 'location'] }; p.ttlMs = 5000;
  assert.equal((await subscriptionRequest(p, 'owner', devices)).id, a.id);
  assert.equal((await subscriptionRequest(p, 'owner', devices)).ttl, 5000);
  delete p.ttlMs; delete p.delivery.secret;
  assert.equal((await subscriptionRequest(p, 'owner', devices, true)).id, a.id);
  p.arguments.device_ids = ['unknown-phone']; await assert.rejects(subscriptionRequest(p, 'owner', devices, true), /invalid_filter/);
});
test('MCP request metadata is accepted without changing subscription identity or stored data', async () => {
  const original = await subscriptionRequest(params(), 'owner', devices);
  const request = { ...params(), _meta: { progressToken: 'synthetic-progress', 'example/client': { version: 1 } } };
  assert.deepEqual(await subscriptionRequest(request, 'owner', devices), original);
  delete request.delivery.secret;
  request._meta = { progressToken: 42 };
  assert.deepEqual(await subscriptionRequest(request, 'owner', devices, true), { id: original.id });
  for (const invalid of [null, [], 'text', 12]) {
    await assert.rejects(subscriptionRequest({ ...params(), _meta: invalid }, 'owner', devices), /invalid_fields/);
  }
  await assert.rejects(subscriptionRequest({ ...params(), unexpected: true }, 'owner', devices), /invalid_fields/);
});
test('stored signing keys are encrypted and bound to their subscription identity', async () => {
  const data = { current: secret }, encrypted = await seal(data, key, 'sub_one');
  assert.equal(encrypted.includes(secret), false);
  assert.deepEqual(await unseal(encrypted, key, 'sub_one'), data);
  await assert.rejects(unseal(encrypted, key, 'sub_two'));
  await assert.rejects(seal(data, '', 'sub_one'), /not_configured/);
});
test('callback must echo signed challenge; redirects or wrong challenges do not activate it', async () => {
  const sub = await subscriptionRequest(params(), 'owner', devices);
  await verifyCallback(sub, async (url, init) => {
    assert.equal(init.redirect, 'manual'); assert.equal(init.headers['X-MCP-Subscription-Id'], sub.id);
    assert.ok(init.headers['webhook-signature'].startsWith('v1,'));
    return Response.json({ challenge: JSON.parse(init.body).challenge });
  });
  await assert.rejects(verifyCallback(sub, async () => Response.json({ challenge: 'wrong' })), /verification_failed/);
  await assert.rejects(verifyCallback(sub, async () => new Response(null, { status: 302 })), /verification_failed/);
});
test('device-specific delivery IDs remain stable across retries and support key rotation', async () => {
  const sub = await subscriptionRequest(params(), 'owner', devices), now = Date.now();
  const event = { v: 1, event_id: crypto.randomUUID(), device_id: 'iphone-primary', kind: 'location',
    occurred_at: new Date(now).toISOString(), payload: { latitude: 0, longitude: 0, measured_at: new Date(now).toISOString() } };
  const requests = [], send = async (url, init) => {
    assert.equal(init.redirect, 'manual'); requests.push(init); return new Response(null, { status: 204 });
  };
  const keys = { current: secret, previous: `whsec_${Buffer.alloc(32, 5).toString('base64')}`, previous_until: now + 5000 };
  await deliver(sub, keys, event, now, send, now); await deliver(sub, keys, event, now, send, now + 1000);
  assert.equal(requests[0].body, requests[1].body);
  assert.notEqual(requests[0].headers['webhook-signature'], requests[1].headers['webhook-signature']);
  assert.equal(requests[0].headers['webhook-signature'].split(' ').length, 2);
  await deliver(sub, keys, { ...event, device_id: 'ipad-study' }, now, send, now);
  assert.notEqual(requests[0].headers['webhook-id'], requests[2].headers['webhook-id']);
});
test('MCP read and subscribe paths enforce owner and scope; invalid read arguments cannot reach storage', async () => {
  let calls = 0;
  const env = { OWNER_GITHUB_ID: 'owner', DEVICE_REGISTRY: '[]', BRIDGE: { getByName() { return { query() { calls++; return {}; } }; } } };
  const request = (method, params = {}) => new Request('https://example.com/mcp', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const ctx = { auth: { userId: 'owner', scope: ['phone:read'] }, props: { owner: 'owner' } };
  assert.ok((await (await mcp(request('tools/list'), env, ctx)).json()).result.tools.some(t => t.name === 'phone_status'));
  assert.ok((await (await mcp(request('events/list'), env, ctx)).json()).error);
  assert.ok((await (await mcp(request('tools/call', { name: 'phone_status', arguments: { device_id: 'unknown' } }), env, ctx)).json()).error);
  assert.equal(calls, 0);
  await assert.rejects(mcp(request('tools/list'), env, { ...ctx, props: { owner: 'other' } }), /forbidden/);
});
