# Protocol and API reference

[English](protocol.md) | [简体中文](zh-CN/protocol.md) · [Home](../README.md)

This page describes the event protocol retained in candidate `0.1.0-beta.1`; the event envelope version remains `v:1`. JSON examples are synthetic; real uploads need actual occurrence times and fresh IDs for new events.

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

Times are ISO 8601 with a time zone. `occurred_at` must be within the seven-day retention window, allowing at most five minutes of future clock skew. App batch observations also follow this window. Other payload `measured_at` fields must be valid dates and at most five minutes later than occurrence; their oldest allowed date is not uniformly restricted, so consumers must preserve actual age and stale state. Unknown fields are rejected. Build dictionaries rather than concatenating bodies into JSON strings.

`202` with `{accepted:true, duplicate:false, received_at:...}` means persistent receipt; the same device/ID/content yields `duplicate:true`. Changed content under the same ID returns `409`; invalid credentials `401`; device identity mismatch `403`; disabled ingestion `503`. Use the returned error category instead of retrying every error.

## Capacity and retention

- Maximum request size: 64 KiB. Per device: 120 new events per minute. Event database: 10,000 records before cleanup.
- Capacity/rate limits return `429`. Duplicates are recognized before capacity checks, but there is no reliable phone retry queue.
- App observations have an additional 50,000-record limit; raw batches expire according to their earliest observation.
- Business retention is seven days based on occurrence, excluding platform backups and dot copies.
- Up to 32 registered devices under one owner and 8 event subscriptions.

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

Each matching event is signed and delivered in its own request. Network failures, 408, 429, and server errors receive at most 8 total attempts with backoff and jitter. A 410 ends the subscription; permanent errors such as 413 are not retried. Callback `2xx` means acknowledgement only.

The [MCP Events protocol](https://developers.openai.com/plugins/build/mcp-events) supports renewal and optional cursor replay. Lack of replay here is an implementation limit, not a protocol-wide limit.
