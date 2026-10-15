import { DurableObject } from 'cloudflare:workers';
import { getOAuthApi } from '@cloudflare/workers-oauth-provider';
import { deviceRegistry } from './access.mjs';
import { RequestError, validateEvent } from './protocol.mjs';
import { Store } from './store.mjs';
import { deliver, seal, unseal, verifyCallback } from './subscriptions.mjs';
import { providerOptions } from './oauth-options.mjs';
import { OAuthBudget } from './oauth-guard.mjs';

async function reply(operation) {
  try { return { ok: true, value: await operation() }; }
  catch (error) {
    if (error instanceof RequestError) return { ok: false, error: error.message, status: error.status, reason: error.reason };
    throw error;
  }
}
export class PhoneBridge extends DurableObject {
  #store;
  #oauthBudget;
  constructor(ctx, env) {
    super(ctx, env);
    this.#store = new Store(ctx.storage.sql, operation => ctx.storage.transactionSync(operation));
  }
  consumeOAuthBudget(route) {
    this.#oauthBudget ??= new OAuthBudget(this.ctx.storage.sql, operation => this.ctx.storage.transactionSync(operation));
    return this.#oauthBudget.consume(route);
  }
  async #schedule() {
    const existing = await this.ctx.storage.getAlarm();
    const next = this.#store.nextAlarm(Date.now());
    if (next !== null && (existing === null || existing > next)) await this.ctx.storage.setAlarm(next);
  }
  async ingest(event) {
    return reply(async () => {
      event = validateEvent(event);
      if (this.env.ENABLE_INGEST !== 'true' || !deviceRegistry(this.env).some(device => device.enabled && device.id === event.device_id))
        throw new RequestError('ingest_disabled', 503);
      // Set a durable wake-up before committing: an isolate loss must not strand an acknowledged event.
      const alarm = await this.ctx.storage.getAlarm();
      if (alarm === null || alarm > Date.now() + 1000) await this.ctx.storage.setAlarm(Date.now() + 1000);
      this.#store.cleanup(Date.now());
      const result = this.#store.ingest(event, Date.now());
      await this.#schedule();
      return result;
    });
  }
  async query(name, args) {
    const now = Date.now();
    switch (name) {
      case 'phone_status': return this.#store.state(args.device_id, args.max_age_seconds ?? 900, now);
      case 'phone_events': return this.#store.events(args, now);
      case 'phone_app_usage': return this.#store.appUsage(args.device_id, args.hours ?? 24, now);
      case 'phone_devices': return { devices: deviceRegistry(this.env).map(device => ({ id: device.id, label: device.label,
        platform: device.platform, enabled: device.enabled, last_received_at: this.#store.lastReceived(device.id, now) })) };
      case 'phone_bridge_status': return this.#store.deliveryHealth();
      default: throw new RequestError('unknown_tool');
    }
  }
  async subscribe(input) {
    return reply(async () => {
      if (input.owner !== this.env.OWNER_GITHUB_ID) throw new RequestError('forbidden', 403);
      this.#store.cleanup(Date.now());
      const revision = this.#store.revision(), old = this.#store.subscription(input.id);
      const previous = old ? await unseal(old.secrets, this.env.BRIDGE_SEAL_KEY, input.id) : null;
      const needsVerification = !old || old.verified < Date.now() - 300000 || previous.current !== input.secret;
      if (needsVerification) await verifyCallback(input);
      const secrets = { current: input.secret };
      if (previous?.current !== input.secret && previous?.current) {
        secrets.previous = previous.current; secrets.previous_until = Date.now() + 300000;
      } else if (previous?.previous_until > Date.now()) {
        secrets.previous = previous.previous; secrets.previous_until = previous.previous_until;
      }
      const sealed = await seal(secrets, this.env.BRIDGE_SEAL_KEY, input.id);
      await this.ctx.storage.setAlarm(Date.now() + 250);
      const expires = Date.now() + input.ttl;
      this.#store.subscribe({ ...input, secrets: sealed, expires, verified: needsVerification ? Date.now() : old.verified }, revision);
      await this.#schedule();
      return { id: input.id, refreshBefore: new Date(expires).toISOString(), cursor: null, truncated: false };
    });
  }
  async unsubscribe(id) { this.#store.unsubscribe(id); await this.#schedule(); }
  async #grants() {
    const oauth = getOAuthApi(providerOptions(this.env), this.env), found = new Map();
    let cursor;
    for (let page = 0; page < 3; page++) {
      const result = await oauth.listUserGrants(this.env.OWNER_GITHUB_ID, { limit: 100, cursor });
      for (const grant of result.items) found.set(grant.id, grant);
      if (!result.cursor) return found;
      cursor = result.cursor;
    }
    throw new RequestError('grant_inventory_limit', 503);
  }
  async alarm() {
    const now = Date.now();
    this.#store.cleanup(now);
    const jobs = this.#store.pending(now);
    try {
      if (!jobs.length) return;
      if (this.env.ENABLE_INGEST !== 'true') {
        for (const job of jobs) this.#store.deliveryResult(job, 403, now);
        return;
      }
      let grants;
      try { grants = await this.#grants(); }
      catch {
        for (const job of jobs) this.#store.deliveryResult(job, 0, Date.now());
        console.error(JSON.stringify({ type: 'grant_validation_unavailable' }));
        return;
      }
      for (const job of jobs) {
        // Re-read after every external await; unsubscribe/rotation can happen during a batch.
        let sub = this.#store.deliverySubscription(job, Date.now());
        if (!sub) continue;
        let grant = grants.get(sub.grant_id);
        if (!grant) {
          // A connection may renew with a new grant while an earlier webhook is in flight.
          const grantId = sub.grant_id;
          try { grants = await this.#grants(); }
          catch {
            this.#store.deliveryResult(job, 0, Date.now(), sub.secrets);
            continue;
          }
          sub = this.#store.deliverySubscription(job, Date.now());
          if (!sub || sub.grant_id !== grantId) continue;
          grant = grants.get(grantId);
          if (!grant) {
            // KV inventory absence is not conclusive revocation; fail closed and retry within the existing bound.
            this.#store.deliveryResult(job, 0, Date.now(), sub.secrets);
            continue;
          }
        }
        const resources = Array.isArray(grant?.resource) ? grant.resource : [grant?.resource];
        if (grant.userId !== this.env.OWNER_GITHUB_ID || !grant.scope.includes('phone:subscribe') ||
          !grant.scope.includes('phone:read') || !resources.includes(`${this.env.PUBLIC_ORIGIN}/mcp`) ||
          (grant.expiresAt !== undefined && grant.expiresAt * 1000 <= Date.now())) {
          this.#store.unsubscribe(sub.id, job.generation); continue;
        }
        if (!deviceRegistry(this.env).some(device => device.enabled && device.id === job.device_id)) {
          this.#store.deliveryResult(job, 403, Date.now()); continue;
        }
        let status = 0;
        const sealed = sub.secrets;
        try {
          const secrets = await unseal(sealed, this.env.BRIDGE_SEAL_KEY, sub.id);
          sub = this.#store.deliverySubscription(job, Date.now());
          if (!sub || sub.secrets !== sealed) continue;
          status = await deliver(sub, secrets, JSON.parse(job.body), job.received, (url, options) => {
            // HMAC signing also yields: check again immediately before sending a captured job.
            const current = this.#store.deliverySubscription(job, Date.now());
            if (!current || current.secrets !== sealed) throw new RequestError('subscription_changed_retry', 409);
            return fetch(url, options);
          });
        } catch (error) {
          if (error instanceof RequestError && error.message === 'subscription_changed_retry') continue;
          console.error(JSON.stringify({ type: 'webhook_transport_failure' }));
        }
        this.#store.deliveryResult(job, status, Date.now(), sealed);
      }
    } finally { await this.#schedule(); }
  }
}
