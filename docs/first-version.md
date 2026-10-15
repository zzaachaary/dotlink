# First implementation and reproduction limits

[English](first-version.md) | [简体中文](zh-CN/first-version.md) · [Home](../README.md)

Compiled on 2026-10-02; historical phone evidence runs through 2026-10-01. This is not a new end-to-end test report. `https://example.com`, `demo-phone`, `Example App`, and `Work` are synthetic examples, not production settings. The project is now named DotLink; the original record and copyright notice are retained.

The first version combined Shortcuts collection, Cloudflare Worker ingress, SQLite Durable Object storage, OAuth-protected MCP tools, and MCP Events delivery. It first established an understandable, revocable personal event path, before improving installation and recovery.

## Implemented and verified

| Feature | Code/protocol | Historical phone evidence |
| --- | --- | --- |
| Selected app notifications | Upload, storage, queries, subscription | Several messaging/mail sources and missed-call notifications reached the target dot; not every selected app was tested. |
| Battery/charging | Measurement times and latest value per field | Real lock-screen charger connection/disconnection arrived automatically; not continuous percentage sampling. |
| Focus on/off | Name, Boolean state, measurement time | Real toggles and transitions across several modes passed; reporting only, no remote control. |
| Subtitle/original notification time | Server represents subtitle and an occurrence field | Phone did not collect subtitle or original notification date; notification time was automation execution time. |
| Location, connection, app activity, health | Validation, storage, and relevant queries | Corresponding phone collection incomplete; health disabled. |
| App-activity batches | Batch receipt, deduplication, estimated paired duration | Phone local logging/scheduled batching not implemented; not a Screen Time export. |
| Renewal/server retries | Same subscription can update expiry; bounded outbox retries | Actual subscription/delivery passed; cross-day renewal and long-term recovery not accepted. |
| One-step import package (historical, through 2026-10-01) | No deliverable shortcut files at that date | Four signed files were later published in the [Beta release](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1); their remaining installation/trigger checks are recorded separately. |

Historical unit/SQLite and workerd checks preceded later test changes. Do not treat their counts as current. Run the relevant checks for a changed version and record actual output.

## Minimum server setup sequence

1. Deploy on your own Cloudflare resources with an HTTPS origin, GitHub OAuth App, and owner identity. An example origin is `https://example.com`; callback is `/callback` under the configured authorization origin.
2. Put GitHub OAuth credentials, the random subscription-key sealing key, and device registry in Worker Secrets. Store only upload-token digests in the registry; the phone keeps its independent raw token.
3. Connect `/mcp` through OAuth in a consumer with event support, then subscribe to `phone.event` in the target dot. A chat URL is not an upload endpoint, and MCP tool support alone does not prove Events support.
4. Test subscription, challenge, upload, and response using synthetic content before enabling real collection. The phone posts JSON to `/ingest` with its Bearer device token.

`PUBLIC_ORIGIN` identifies the canonical MCP origin. Optional `AUTH_ORIGIN` selects a separate authorization origin; changes may require rediscovery or reconnection. Only the exact `ENABLE_INGEST` value `true` enables ingestion and delivery. Deployment and registration scripts perform remote writes and must be deliberately run against your own configuration.

The new browser-first candidate uses `/setup` and dashboard configuration; the [deployment guide](deployment.md) retains the original CLI procedure for advanced use and recovery. This addition does not rewrite the historical evidence above.

## Reproducing the Shortcuts structure

The first version separated HTTP upload, event wrapping, and source triggers, reducing repeated HTTP setup. Names below describe roles rather than required shortcut names.

### Shared uploader

Accept a dictionary; stop if input is absent. Use Get Contents of URL to POST it as JSON to your `/ingest`, with the device Bearer token. The phone's owner completes first-use domain, shortcut-calling, and lock-screen permissions.

Never put raw tokens in shared templates, screenshots, or example URLs. Do not copy one owner's credentials to another. Device `enabled:false` blocks later uploads and unfinished deliveries, but cannot recall earlier copies.

### Shared event wrapper

Add these envelope fields and call the uploader:

| Field | Meaning |
| --- | --- |
| `v` | Number `1` |
| `event_id` | New UUID v4, or `sc-` followed by two independent nine-digit random numbers; deduplication ID, not a credential |
| `device_id` | Token-bound alias, such as `demo-phone` |
| `kind` | Such as `notification`, `device_status`, or `focus` |
| `occurred_at` | ISO 8601 with time zone |
| `payload` | Dictionary for the event kind |

Preserve strings, numbers, and Booleans. Do not stringify the entire payload or concatenate raw message bodies into JSON. Retry the original ID, time, and content; a new ID creates another event.

### Notification trigger

In iOS 27 Shortcuts, add a notification automation and select apps whose content you consent to forward. Set input type to notification and take app, title, and body from that same input. A synthetic payload is:

```json
{
  "app": "Example App",
  "title": "Example title",
  "body": "Synthetic notification for testing."
}
```

Read the actual app dynamically. Do not leave an empty “title contains” condition when no filter is needed; this prevented enabling the automation in historical testing. Reopen saved conditions and switches, then cause a real notification from another device.

Use system-provided automatic execution options and complete first-use permissions. Exclude ChatGPT/Codex and Shortcuts notifications to reduce reply loops; complete loop prevention was not implemented. An empty app list does not mean all apps, and future app inclusion is unverified. [Apple notification triggers](https://support.apple.com/en-ke/guide/shortcuts/apd932ff833f/ios).

### Charging and Focus

At charger connection/disconnection, read battery and charging state into `device_status`, recording the real `payload.measured_at`. The server maintains each field's newest observation separately, without inventing defaults for uncollected fields.

Use separate Focus on/off triggers. Each passes its explicit mode name, such as `Work`, and native Boolean `active:true` or `active:false`; the shared sender adds `measured_at`. This avoids guessing the prior name after a mode has turned off. Both directions require real toggle tests. [Apple setting triggers](https://support.apple.com/en-ke/guide/shortcuts/apde31e9638b/ios).

## Concrete implementation limits

| Item | Implementation |
| --- | --- |
| Single event size | At most 64 KiB |
| Receipt window | Previous seven days, at most five minutes future skew |
| Rate/capacity | At most 120 new events/device/minute; 10,000 uncleared event records |
| Duplicate/conflict | Same ID/content gives `duplicate:true`; changed content gives `409` |
| Queries | Up to 25 `phone_events` per page; `phone_status` marks stale after 15 minutes by default |
| Subscriptions | At most 8; default/maximum 24 hours; expiry stops delivery |
| Delivery | At most 5 jobs/alarm; at most 8 attempts for transient failures, with backoff and jitter |
| Permanent errors | No redirect following; `410` cancels subscription; `413` is not retried |
| History recovery | No protocol replay; retained seven-day history can be paged with query tools |

Read tools are `phone_devices`, `phone_status`, `phone_events`, `phone_bridge_status`, and `phone_app_usage`. App usage is estimated from uploaded open/close observations and must retain missing or ambiguous evidence.

The 24-hour lease is an implementation choice. [MCP Events](https://developers.openai.com/plugins/build/mcp-events) offers renewal and optional replay; this code refreshes expiry but does not restore from nonempty cursors.

## Verification

Use Node.js 24 and locked dependencies. Prepare an ignored local `wrangler.local.jsonc` and set `DOTLINK_CONFIG` through the [advanced deployment guide](deployment.md) before the final bundle command. These checks use synthetic content:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:runtime
npm run check
```

`npm run check` is a Wrangler dry-run bundle, not deployment. Runtime tests use workerd and may encounter process/network sandbox restrictions. Neither replaces phone testing.

End-to-end acceptance needs a real notification from a selected app, lock-screen charger connection/disconnection, and Focus on/off. Record triggering, persistence, webhook ACK, and the target dot's response separately. Offline/recovery, reboot, expiry, duplicates, bursts, and revocation need further checks before broader reliability claims.

Phone outbox, automatic replay, original notification dates, automatic future-app coverage, and long-term unattended operation remain unimplemented or incompletely evidenced. See the [roadmap](roadmap.md).
