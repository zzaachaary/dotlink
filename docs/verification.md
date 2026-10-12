# Verification and troubleshooting

[English](verification.md) | [简体中文](zh-CN/verification.md) · [Home](../README.md)

## Keep four checkpoints separate

| Checkpoint | Proves | Does not prove |
| --- | --- | --- |
| Phone automation runs | The system triggered the action | HTTP success or dot receipt |
| `/ingest` returns 202 | The bridge accepted and persisted the event | Callback delivery or dot processing |
| Webhook returns 2xx | Receiver acknowledged the request | Individual dot processing or downstream actions |
| dot output matches the event ID | The target dot processed this event | All future events, all apps, or zero loss |

The dot may combine responses to several events. Absence of one chat bubble per event is not by itself a delivery failure; a server ACK is not proof of processing all content.

## Historical first-version acceptance

These results come from personal-device development records through 2026-10-01. Preparing public source did not retest the phone. Public material retains conclusions, not private screenshots, event IDs, contacts, bodies, or precise personal timelines.

- One synthetic event traversed the cloud bridge, woke the original personal dot, and received a matching response.
- Manual iPhone upload succeeded; later some real WeChat, Douyin, phone, and QQ Mail notifications automatically reached the original dot.
- WeChat provided both generic notices and actual titles/bodies in different cases. Hidden text cannot be recovered from a generic notice.
- Another mail source had confirmed bridge delivery but no separately recorded dot response; it is not counted as complete processing acceptance.
- Lock-screen charger connection and disconnection uploaded battery level and true/false charging state, both with dot responses.
- Three selected Focus modes passed all six on/off directions using real toggles and dot responses.
- Dozens of apps were selected for a shared notification workflow, but not every source was tested; no automatic inclusion of future apps was demonstrated.

Actual local check results are dated in the [validation record](validation-record.md). Old test counts are not current results.

## Experimental Beta evidence and follow-ups

[Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1) provides four sanitized, signed templates. Their new-copy evidence is narrower than the original personal workflow's history:

| Item | Evidence for this Beta |
| --- | --- |
| Four release files | Signing-container and sanitized-content checks; all four re-imported on Mac. |
| Same-account iPhone synchronization | Observed for all four; system automation triggers had to be added on the phone. |
| New Charging copy | Real connection/disconnection events reached the Bridge and appeared in the dot while the old charging automation was disabled. |
| New Notifications copy | Event fields and JSON POST/Bearer transport checked against the successful original; a real notification through this new copy remains pending. |
| New Focus On/Off copies | Mac import completed; the phone trial toggled Sleep while these copies were bound to Do Not Disturb. That trial does not validate the new pair. |
| Cold run | Focus Off's first local request timed out and a repeat passed; the initial delay remains unresolved. |
| Independent installation | Direct iPhone file import, another account, and a fresh-account public Deploy to Cloudflare run remain pending. |

These remaining checks are disclosed follow-ups for an experimental Beta, not completed results. Cross-day renewal, network changes, and phone outbox behavior remain separate reliability items. A subscription deadline advancing is not proof of delivery beyond its original expiry; there is no implemented phone outbox. The [dated validation record](validation-record.md) retains the original checks and failures.

## Minimum acceptance for a new installation

1. Check `/health`, rejection of unauthorized `/mcp`, and ingestion still disabled. Confirm the Worker and GitHub owner belong to you.
2. Complete OAuth in the target personal dot, subscribe to `phone.event`, and read `phone_bridge_status` for a valid deadline.
3. Send a harmless synthetic event and verify upload, signed callback, and the target dot's response. A manual chat message to the dot is not an event-push test.
4. Enable one selected notification automation. Receive a real test notification and compare event ID, source, and permitted fields; include lock-screen and background states.
5. Test charger connection/disconnection and every selected Focus mode in both directions. A manual shortcut run is diagnostic, not proof of the system trigger.
6. Separately exercise Wi-Fi/cellular changes, the actual network with proxy/VPN disabled, brief offline periods, first unlock after reboot, notification bursts, and summaries. Record missed uploads honestly; no phone outbox exists.
7. Confirm `refreshBefore` advances before expiry and verify a real new event after the original expiry point. A short-TTL local test cannot prove real-platform cross-day renewal.
8. Exclude ChatGPT/Codex and Shortcuts sources and observe for forwarding loops. Disconnect and verify delivery stops to check revocation.

Use synthetic markers to distinguish event occurrence, phone execution, bridge receipt, and dot processing times. A fast single upload is not an end-to-end latency guarantee. Limited samples cannot establish an SLA or battery-saving claim.

## Troubleshooting

| Symptom | Check first |
| --- | --- |
| Automation cannot be enabled | Missing app selection or an empty “title contains” condition; reopen saved settings. |
| Manual run works; automatic input is absent | Real notification generation, first-use shortcut/domain permissions, automation switch, and input binding. |
| App is wrong or always identical | Read the current notification's app property; do not hard-code one source or select body text. |
| Date contains no time | ISO 8601 must contain date, time, and zone. |
| Invalid JSON types | Native numbers/Booleans and a dictionary `payload`. |
| 401/403 | Correct device token/ID; do not use a phone token to read; check OAuth owner and scopes. |
| 503 | `ENABLE_INGEST`, device enabled state, and required configuration. |
| Bridge accepts but dot is silent | Subscription expiry, delivery status, revoked permissions, asynchronous processing; page retained history if needed. |
| Missing old events after renewal | No cursor replay or automatic jobs for events received during a subscription gap. |
| Authorization page cannot open | Browser, network, origin, and OAuth callback separately; do not guess a proxy cause or disable TLS verification. |
| Setup suggests new credentials on an existing Worker | Stop; `/setup` is for fresh deployments, not registry replacement or key rotation. |

Synthetic source tests do not validate real routes, phone background behavior, GitHub login, or dot account eligibility.
