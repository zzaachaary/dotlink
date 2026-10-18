# Protocol and API reference

[English](protocol.md) | [简体中文](zh-CN/protocol.md) · [Home](../README.md)

This page describes the current source’s `v:1` envelope, admission rules and subscription behavior. Updating these source instructions does not move the historical tag. JSON examples are synthetic; real uploads need actual times and fresh IDs for new events.

## Upload

`POST /ingest`, `Content-Type: application/json`, `Authorization: Bearer <device upload token>`.

```json
{
  "v": 1,
  "event_id": "00000000-0000-4000-8000-000000000001",
  "device_id": "iphone-primary",
  "kind": "notification",
  "occurred_at": "2026-10-02T00:00:00Z",
  "payload": {
    "app": "Example App",
    "title": "Synthetic notification",
    "body": "This is fictional test content."
  }
}
```

Event IDs may be UUID v4 or `sc-<nine-digit random number>-<nine-digit random number>`, with each independent number from 100000000 to 999999999. The latter accommodates the first Shortcuts implementation. IDs are deduplication identifiers, not credentials. Retries retain the original ID, timestamp, and content.

The device ID must match its upload token; changing the JSON ID cannot impersonate another registered device. The server records a separate `received_at`.

| kind | payload | First phone implementation |
| --- | --- | --- |
| `notification` | Required `app`; optional text `title`, `subtitle`, `body` | Actual app/title/body; subtitle and original notification date were not connected. |
| `device_status` | `measured_at`; at least one of `battery_percent` (0–100), `is_charging`, `low_power_mode` | Battery and charging state on charger connection/disconnection. |
| `focus` | `name`, Boolean `active`, `measured_at` | Separate on/off triggers for selected modes. |
| `location` | Latitude, longitude, `measured_at`; optional `accuracy_m` | Collection not enabled. |
| `connection` | `transport` wifi/bluetooth, Boolean `connected`, `measured_at`; optional `name` | Collection not enabled. |
| `app_activity` | `app`, `transition` opened/closed, `source:shortcuts_app_trigger`, `measured_at` | Collection not enabled. |
| `app_activity_batch` | `source`, `measured_at`, 1–200 `observations`, each with its own `id/app/transition/measured_at` | No phone local queue or scheduled upload. |
| `health` | `metric`, `value`, `unit`, `measured_at`; exact validation in `src/protocol.mjs` | Collection not enabled. |

Times use ISO 8601 with a time zone. `occurred_at` must be strictly later than receipt time minus seven days and no later than receipt time plus five minutes. Single `app_activity.measured_at` and each batch observation’s `measured_at` must also be strictly later than receipt time minus seven days, and no later than both receipt time plus five minutes and `occurred_at` plus five minutes. A value exactly seven days old is rejected. The storage transaction rechecks the earliest event/observation expiry at its current time; expiry during an intervening wait returns `event_outside_retention`, without `202` acceptance or a new-event quota charge. Other payload measurement dates are valid dates no more than five minutes after occurrence, without a uniform oldest-date bound; consumers must preserve actual age and stale state. Unknown fields are rejected. Build native dictionaries rather than concatenating JSON strings.

`202` with `{accepted:true, duplicate:false, received_at:...}` means persistent receipt; the same device/ID/content yields `duplicate:true`. Changed content under the same ID returns `409`; invalid credentials `401`; device identity mismatch `403`; disabled ingestion `503`. Use the returned error category instead of retrying every error.

## Capacity and retention

- Maximum request size: 64 KiB. Per device: 120 successfully accepted new events per rolling 60 seconds. Event database: 10,000 records before cleanup.
- Separate quota metadata stores only device ID and receipt time. Receipts exactly 60 seconds old still count; older receipts can be removed. Early business-event expiry/cleanup does not release this quota. Duplicates and failed transactions do not consume a new-event allowance. This short-lived metadata contains no event bodies.
- Capacity/rate limits return `429`. Duplicates are recognized before capacity checks, but there is no reliable phone retry queue.
- App observations have an additional 50,000-record limit; raw batches expire according to their earliest observation.
- Business retention is seven days based on occurrence, excluding platform backups and dot copies.
- Up to 32 registered devices under one owner and 8 event subscriptions.

## OAuth admission limits

The application checks these limits before OAuth provider parsing, external client-metadata lookup, or authorization-state consumption:

- Request bodies: at most 64 KiB for registration and token requests; `/authorize` POST consent remains at most 4 KiB. Larger bodies return `413`, including when `Content-Length` is absent or misleading.
- Encoded query strings: at most 8 KiB, otherwise `414`.
- Query and URL-encoded form fields: at most 64 entries, including repeated fields; each key is at most 128 characters and each value at most 8,192 characters. Invalid field bounds return `400`. Legal repeated `resource` fields remain supported. These field bounds do not describe registration JSON fields.

The following budgets are per installation, not per IP, account or device. Windows align to UTC minutes and UTC days; they are not rolling windows.

| Route | Per minute | Per UTC day |
| --- | --- | --- |
| `POST /oauth/register` | 12 | 60 |
| `GET /authorize` | 20 | 120 |
| `POST /authorize` | 30 | 120 |
| `GET /callback` | 30 | 120 |
| `POST /oauth/token` | 60 | 1,000 |

A separate named Durable Object in the existing `BRIDGE` namespace stores at most five route-budget rows, apart from the object holding phone data. It stores no IP address. Over-budget requests return `429` with `Retry-After` in seconds; rejection does not increment the budget, call the OAuth provider, fetch client metadata, or consume authorization state. An unavailable budget object returns `503` and does not bypass the guard.

Registration, initial authorization, consent, callback and token traffic have separate budgets so one route cannot directly consume another route’s allowance. Anonymous traffic can still exhaust its route’s current window and temporarily block a legitimate request. This is bounded application admission, not DDoS protection, a guarantee of free-tier capacity, or a billing cap. Denied requests still use Worker and Durable Object resources. Respect `Retry-After`; do not disable the guard or retry in a tight loop.

## dot query tools

All `/mcp` reads require bridge OAuth, the matching owner, and `phone:read`.

| Tool | Behavior |
| --- | --- |
| `phone_devices` | Registered devices, enabled state, latest receipt; no credential digests. |
| `phone_status` | Latest observation per field, age, stale flag; default stale threshold 900 seconds, not a sampling interval. |
| `phone_events` | Device/kind filtering, up to 25 items per page, continue with `next_before_seq`. |
| `phone_bridge_status` | Subscription deadlines and current delivery counts; not proof of dot understanding. |
| `phone_app_usage` | Estimates paired uploaded open/close observations with missing/ambiguous evidence; not Screen Time. |

App usage queries cover 1–168 hours, use up to 5,000 recent observations, show up to 200 paired sessions, and report truncation. An unclosed observation does not prove an app is still running. Missing or stale location must not be presented as current coordinates.

## Event subscriptions and renewal

The event is `phone.event`, filtered by `device_ids` and `kinds`. `events/subscribe` and `events/unsubscribe` require `phone:subscribe` as well as read access. Valid `_meta` request metadata is accepted but does not affect identity, filters, or storage.

The consumer supplies callback and signing key. The bridge validates HTTPS, allowed OpenAI/ChatGPT domains, and challenge before storage. Redirects are not followed.

Default and maximum TTL are 86400000 milliseconds. Refreshing the same subscription identity updates expiry and authorization association and returns `refreshBefore`. This is a lease, not a membership payment. The client must refresh; real cross-day behavior requires separate verification. Nonempty cursors return `replay_not_supported`; events return `cursor:null`. Re-subscribing does not replay a gap; uploaded, unexpired history remains queryable.

Each subscription lifecycle has a generation. Cancelling or allowing it to expire, then creating it again, starts a new generation even when the subscription ID is reused. A renewal of an unexpired subscription, including a signing-key update, retains its generation and pending events. Before each send, the bridge confirms the job is still pending and matches the current generation; a late result, including `410`, may affect only the generation that sent it. An HTTP request already in flight cannot be recalled. Re-creation does not replay the cancelled generation’s events.

Within a continuing generation, failures sent with superseded sealed secrets are treated as transient and still count toward the existing eight-attempt bound with backoff; an old `410` cannot end the renewed subscription. A successful `2xx` acknowledgement is retained. A grant absent from the batch snapshot triggers a fresh inventory check and another subscription check. A temporarily missing grant stops delivery and uses the existing bounded retry policy instead of deleting a renewed subscription based on stale inventory.

Existing SQLite databases receive an additive, transactional generation-column/backfill migration; it retains event data and assigns existing pending jobs to their existing subscriptions. It is an application schema change, not a reason to change the `v1` Durable Object namespace migration or replace the database. Validate upgrade/restart behavior before updating an existing deployment; local migration checks do not certify cloud backup or rollback procedures.

Each matching event is signed and delivered in its own request. Network failures, 408, 429, and server errors receive at most 8 total attempts with backoff and jitter. A 410 from the current configuration ends the subscription; permanent errors such as 413 from that configuration are not retried. Callback `2xx` means acknowledgement only.

The [MCP Events protocol](https://developers.openai.com/plugins/build/mcp-events) supports renewal and optional cursor replay. Lack of replay here is an implementation limit, not a protocol-wide limit.
