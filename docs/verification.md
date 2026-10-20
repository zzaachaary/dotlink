# Verification and troubleshooting

[English](verification.md) | [简体中文](zh-CN/verification.md) · [Home](../README.md)

**Current scope: Notifications only.** On 2026-10-20 the owner reported successful Notifications setup and said Charging was not working in the current setup. Charging, Focus On and Focus Off are **Coming soon**. Dated success below belongs to historical implementations and does not establish current support. No all-source or long-term reliability result is inferred from the owner feedback.

## Keep four checkpoints separate

| Checkpoint | Proves | Does not prove |
| --- | --- | --- |
| Phone automation runs | The system triggered the action | HTTP success or dot receipt |
| `/ingest` returns 202 | The bridge accepted and persisted the event | Callback delivery or dot processing |
| Webhook returns 2xx | Receiver acknowledged the request | Individual dot processing or downstream actions |
| dot output matches the event ID | The target dot processed this event | All future events, all apps, or zero loss |

The dot may combine responses to several events. Absence of one chat bubble per event is not by itself a delivery failure; a server ACK is not proof of processing all content.

The 2026-10-12 isolated instance passed synthetic upload, MCP querying and receiver ACK checks. On 10-13, one manual iPhone Charging event matched a dot result. A new Hosted Deploy instance passed bootstrap and `/setup` on 10-15, but its owner/dot/phone chain remains unfinished. See the [dated validation record](validation-record.md) for exact boundaries.

The final 2026-10-18 source check passed 84/84 unit and 18/18 runtime tests; the full npm audit reported 0 vulnerabilities. No new phone acceptance was performed.

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

## Historical signed-template evidence and follow-ups

The four sanitized, signed templates first shipped in [Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1) and retain the same bytes in [v0.1.0](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0). The regular release adds no new phone acceptance results. Their recorded evidence is narrower than the original personal workflow's history:

| Item | Historical evidence for these template bytes |
| --- | --- |
| Four release files | Signing-container and sanitized-content checks; all four re-imported on Mac. |
| Same-account iPhone synchronization | Observed for all four; system automation triggers had to be added on the phone. |
| New Charging copy | Real connection/disconnection events reached the Bridge and appeared in the dot while the old charging automation was disabled. |
| New Notifications copy | Event fields and JSON POST/Bearer transport checked against the successful original; a real notification through this new copy remains pending. |
| New Focus On/Off copies | Mac import completed; the phone trial toggled Sleep while these copies were bound to Do Not Disturb. That trial does not validate the new pair. |
| Cold run | Focus Off's first local request timed out and a repeat passed; the initial delay remains unresolved. |
| Independent installation | Direct iPhone file import and another account remain pending. Hosted Deploy bootstrap passed on 10-15; that new instance’s complete chain did not. |

These remaining checks continue as disclosed follow-ups in v0.1.0; regular-release status does not mark them as passed. Cross-day renewal, network changes, and phone outbox behavior remain separate reliability items. A subscription deadline advancing is not proof of delivery beyond its original expiry; there is no implemented phone outbox. The [dated validation record](validation-record.md) retains the original checks and failures.

## Minimum acceptance for a new notification installation

Follow [deployment](deployment.md) once, repairing only the failed step:

1. **Deploy and configure:** open the new Worker's `/setup`; enter 3 variables and 4 Secrets; require `/health` `200` with ingestion disabled. Health checks minimum configuration, not every Secret.
2. **Configure Notifications:** import only `DotLink-Notifications`, save the complete `/ingest` URL and raw token without `Bearer`, select one allowed source, and bind App/Title/Body. Exclude ChatGPT, Codex and Shortcuts. Keep Automation off until the subscription is confirmed.
3. **Connect and subscribe:** complete owner OAuth, then copy the [Step 6 prompt](deployment.md#6-connect-your-dot-and-verify-notifications) into the target chat. Confirm the actual device, matching notification subscription and expiry. A tool connection alone is not an event subscription.
4. **Generate real new notifications:** enable ingestion and the configured automation, complete first-use permissions and trigger harmless source notifications. Match up to three distinct `data.event_id` values with automatic dot acknowledgements, including source, event time and permitted summary.
5. **Continue after the test:** stop the three-event test replies while retaining the subscription. Confirm the client's actual renewal capability; do not substitute polling or promises for MCP Events. Expand sources only after separate checks.

Editor execution without notification input is not a trigger test. Old records, manual history queries and duplicate pushes must not count as new notifications. Passing selected sources establishes only that installation's observed behavior; if an automatically received event cannot be uniquely matched, record the uncertainty rather than guessing.

## Follow-up reliability and permission checks

These determine the strength of public claims and are separate from every first installation:

- Generate and confirm a new event after the original subscription expiry; an extended deadline alone is insufficient.
- Confirm new events after Wi-Fi/cellular switching, brief offline recovery, and reboot/first unlock. There is no phone outbox, so uploads during an outage can be lost.
- On an isolated test instance, verify non-owner rejection, device disablement, Bridge-grant revocation and ingestion pause. Pausing does not delete history or recall in-flight copies.
- Observe first/repeated and locked-screen behavior. Limited samples cannot establish zero loss, exact latency, all-app support or an SLA.

## Troubleshooting

| Symptom | Check first |
| --- | --- |
| Automation cannot be enabled | Missing app selection or an empty “title contains” condition; reopen saved settings. |
| Manual run works; automatic input is absent | Real notification generation, first-use shortcut/domain permissions, automation switch, and input binding. |
| App is wrong or always identical | Read the current notification's app property; do not hard-code one source or select body text. |
| Date contains no time | ISO 8601 must contain date, time, and zone. |
| Invalid JSON types | Native numbers/Booleans and a dictionary `payload`. |
| 401/403 | Saved raw token without a duplicated Bearer prefix, whitespace or newlines; matching device ID; OAuth owner/scopes for reads, not the phone token. |
| 413/414/400 at OAuth endpoints | Request body, encoded query, or field bounds in the [protocol](protocol.md); correct the client request instead of increasing limits blindly. |
| 429 at OAuth endpoints | Read `Retry-After` and wait for that route’s budget window; repeated reconnect attempts also consume admission allowance. |
| 503 | Expected before bootstrap configuration; afterward check required configuration, `ENABLE_INGEST`, device enabled state, and the fixed OAuth guard error category if present. |
| Bridge accepts but dot is silent | Subscription expiry, delivery status, revoked permissions, asynchronous processing; page retained history if needed. |
| Missing old events after renewal | No cursor replay or automatic jobs for events received during a subscription gap. |
| Authorization page cannot open | Browser, network, origin, and OAuth callback separately; do not guess a proxy cause or disable TLS verification. |
| Consent POST fails or reports `ERR_BLOCKED_BY_CLIENT` | Inspect the actual POST Origin and Worker response. In the isolated test, `no-referrer` produced `Origin: null` and Worker `403`; the consent page’s `same-origin` policy fixed the browser flow. Keep null/cross-site Origin and cookie rejection. A separate `302` is still insufficient: verify the original client completes GitHub callback and shows the expected OAuth connection. |
| Setup suggests new credentials on an existing Worker | Stop; `/setup` is for fresh deployments, not registry replacement or key rotation. |

Synthetic source tests do not validate real routes, phone background behavior, GitHub login, or dot account eligibility.
