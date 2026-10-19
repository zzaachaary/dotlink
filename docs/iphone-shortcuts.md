# iPhone Shortcuts: installation and optional modules

[English](iphone-shortcuts.md) | [简体中文](zh-CN/iphone-shortcuts.md) · [Home](../README.md)

DotLink provides three independent choices: **notifications**, **charging**, and **Focus**. Select any subset. Each requires its own system permissions, source selection, and real-trigger acceptance; enabling one must not imply consent to the others.

The four signed `.shortcut` files and checksums are available in the [v0.1.0 release](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0). Their signed bytes are unchanged from `v0.1.0-beta.1`, whose historical tag and assets remain available. This release adds no new phone acceptance results. All four were re-imported on Mac and synced to the same-account iPhone. Charging has a real automatic-trigger round and a later manual phone-to-dot upload. Direct iPhone file import and real triggers for the new Notifications and Focus On/Off copies remain pending. Focus Off initially timed out on Mac loopback and later succeeded; its cause is unresolved and proves neither inevitable iPhone failure nor reliable cold starts. See the [dated record](validation-record.md).

Historical supported phone evidence is limited to iOS 27 and the sources listed in [verification](verification.md). Action names, trigger availability, language, region, and device state may differ. Proceed with a module only if its required system interface exists on your own phone. Server support does not prove phone collection.

First complete service, identity, device registration, and dot subscription in [deployment](deployment.md). The templates include their own event envelope and HTTP upload action: **you do not need to create `DOT Bridge Uploader`, `DOT Event Sender`, or the other legacy helpers when using these files.** They preserve the working version's event fields, JSON POST, and Bearer authentication, with upload actions inlined into each module. `/setup` cannot grant iOS permissions or create unavailable triggers.

## Download and configure templates

| File | Module | Import answers |
| --- | --- | --- |
| [DotLink-Notifications.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut) | Notifications | Your HTTPS `/ingest` URL and device upload token |
| [DotLink-Charging.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Charging.shortcut) | Charging | The same URL and token |
| [DotLink-Focus-On.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Focus-On.shortcut) | Focus starts | The same URL/token and your chosen Focus name |
| [DotLink-Focus-Off.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Focus-Off.shortcut) | Focus ends | The same URL/token and exactly the same Focus name |

[SHA256SUMS](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/SHA256SUMS) lists the four release-file hashes. Use these specific release assets, not an exported copy already personalized with somebody's credentials.

1. Open the asset page in Safari on iPhone and **download only Charging first**. Open the `.shortcut` from Files and import it. Direct phone import still requires your check; the observed historical route was Mac import followed by same-account iCloud sync.
2. Enter the complete `https://your-host/ingest` URL and **raw device token**, without `Bearer`, surrounding spaces or newlines. The template already adds the authentication prefix. Keep `iphone-primary` consistent with the server registration. Never enter GitHub or Cloudflare management credentials.
3. Save and leave the editor, then reopen to confirm the URL/token persisted before running. Check the colon in `https://` and the `/ingest` suffix. Visible text during editing does not prove it was saved. Keep **Automation off** while configuring.
4. Complete the subscription and enable server ingestion as described in [deployment](deployment.md). Run Charging manually once and allow access to your own Bridge. Confirm the new Bridge record and matching dot result. Then add and enable Charger `Connects or Disconnects`, and test one locked-screen connection/disconnection. A manual run verifies upload, not an automatic trigger.
5. If wanted, import Focus On and Off next, with the same URL, raw token and identical mode name. Bind the same system mode’s on/off triggers; toggling Sleep cannot validate a Do Not Disturb binding. Toggle the actual mode and confirm true/false results.
6. Add Notifications last if wanted, starting with one permitted source. If its trigger is missing, add Notification from the editor’s Search → **Automation** menu and rebind App/Title/Body to that trigger. **Exclude ChatGPT, Codex and Shortcuts**, and leave no empty title filter. Generate harmless notification content from another device and confirm its source and permitted fields before expanding sources.

If the required trigger is absent, stop that module; a template cannot add OS capabilities. Diagnose only the failed step using [troubleshooting](verification.md), distinguishing URL/token, first-use permissions, network, automation and delivery.

If your system cannot open the file directly, Mac import and same-account iCloud synchronization is the tested import fallback, with phone trigger configuration still required. No iCloud share links or automatic trigger preservation are promised.

| Template | Phone trigger | Configuration |
| --- | --- | --- |
| Notifications | Notification | Start with one explicitly authorized source app; leave no empty title filter. |
| Charging | Charger | Select `Connects or Disconnects`. |
| Focus On | Your chosen Focus mode | Select `Is Turned On`. |
| Focus Off | The same Focus mode | Select `Is Turned Off`. |

Immediately expand a newly added trigger and switch **Automation off** during setup; the native editor may enable it by default. Do not enable an unconfigured shortcut or reuse a loopback test URL. Complete first-use permissions and the acceptance checks below before relying on that module.

Labels and availability may differ by system. The current evidence does not establish that every module or installation route works on another phone.

## Advanced manual path: build the legacy helpers

The numbered sections below retain the original modular implementation for inspection, customization, and recovery. They are an alternative to the downloaded templates, not extra setup steps for them. Suggested `DOT …` names are local shortcut names, not additional apps. JSON examples describe data; they are not installable shortcuts.

### 1. Prepare three values

For a fresh browser setup, use the values privately generated/displayed by your own Worker's `/setup`. For the advanced CLI path, inspect `work/private/iphone-device.json` in a local editor. Enter only these on your own iPhone:

- `endpoint`: your HTTPS `/ingest` URL.
- `device_id`: `iphone-primary` for the first registration.
- `token`: the upload-only device credential.

Never put the token in a URL, query, notification title, screenshot, or chat. Cloudflare management credentials, GitHub Client Secret, and `BRIDGE_SEAL_KEY` do not belong on the phone. Sharing a personalized shortcut can allow its recipient to impersonate your phone; do not publish it or its shared link.

### 2. `DOT Bridge Uploader`: HTTP only

Create a shortcut taking one complete event **dictionary** as input. Add Get Contents of URL:

| Setting | Value |
| --- | --- |
| URL | Your `endpoint` |
| Method | `POST` |
| `Authorization` header | `Bearer ` followed by the phone token, including the space |
| `Content-Type` header | `application/json` |
| Request body | JSON fields bound to the input dictionary |

Top-level keys are `v`, `event_id`, `device_id`, `kind`, `occurred_at`, and `payload`. Keep `payload` a dictionary and `v` the number `1`. Do not convert the dictionary to descriptive text or concatenate notification bodies into JSON. If the UI accepts a JSON dictionary directly, bind the complete input; otherwise bind each value while preserving types.

Return the parsed response. Only Boolean `accepted:true` means bridge acceptance; `duplicate:true` means the same event was received before. Permission prompts, network failures, and errors are not success. Do not display credential-bearing debug output in routine automations.

### 3. `DOT Event Sender`: shared envelope

Input is a dictionary containing text `kind` and dictionary `payload`:

1. Read the current date and format ISO 8601 including time and zone, such as `2026-10-02T08:15:30+08:00`. Use actual current time, not this example.
2. Generate two independent random integers, each from `100000000` to `999999999`, and join as `sc-first-second`. This is a deduplication ID, not an authentication secret.
3. Build the event dictionary below.
4. Run `DOT Bridge Uploader`, explicitly passing the complete dictionary, then return its result.

| Key | Type/source |
| --- | --- |
| `v` | Number `1` |
| `event_id` | Generated text ID |
| `device_id` | Text `iphone-primary` |
| `kind` | Input text `kind` |
| `occurred_at` | Formatted current timestamp |
| `payload` | The dictionary stored under input key `payload`, not the entire `{kind, payload}` input wrapper |

A retry must resend the already-created dictionary, retaining ID, time, and content. It must not rerun event generation. A reliable offline phone queue or automatic replay is not provided.

Complete first-use permissions for calling another shortcut and accessing your domain. Reopen saved input fields to verify variable bindings. An action visible in the editor is not evidence of a working saved system trigger.

### 4. Manual synthetic test

Have the owner enable `ENABLE_INGEST` only after configuration and confirm the target dot's subscription is valid. Create a temporary test dictionary:

```json
{
  "kind": "notification",
  "payload": {
    "app": "Bridge Test",
    "title": "Synthetic test",
    "body": "A non-private test event"
  }
}
```

Pass it to `DOT Event Sender`, completing first-use permissions. Check `accepted:true` on the phone and a matching event ID processed by the dot without sending it another chat prompt. This proves that transmission case, not a real notification trigger.

### 5. Optional notification automation

Use this section only if your iPhone's Shortcuts automation UI actually offers the required Notification trigger. The server cannot add a system permission or unavailable cross-app trigger.

Create `DOT Notification Bridge`, accepting **the current triggered notification object**. Extract the actual app source and available title/subtitle/body properties:

```json
{
  "kind": "notification",
  "payload": {
    "app": "Actual notification source",
    "title": "Actual title",
    "subtitle": "Actual subtitle",
    "body": "Actual body or the system-provided generic notice"
  }
}
```

These strings describe fields; do not hard-code them. `app` is required and nonblank. Other fields can be omitted and must be text if present. If input contains several notifications, deliberately process them individually or reject the list; do not pretend the entire list is one body.

Send the dictionary to the common event sender. In the personal automation, explicitly pass trigger input to `DOT Notification Bridge`; an inputless Run Shortcut action is insufficient. Select the system's automatic-run option and confirm the saved automation is enabled.

Start with one app whose forwarding you authorize and a harmless real notification. For multiple apps, read `payload.app` dynamically. Avoid an accidentally empty “title contains” condition, which may make the trigger invalid.

**Exclude ChatGPT/Codex and Shortcuts notifications.** Replies can generate notifications that loop back into the bridge. General rate limiting is not complete loop prevention. If reliable exclusions are unavailable, keep a small explicit allowlist.

Hidden previews may produce only generic content. This workflow reads no app database or historical chats and cannot recover hidden text. Messages that produce no notification are not guaranteed to be collected. SMS/iMessage bodies, attachments, and grouped messages need independent tests.

There is no promise of all-app coverage or automatic inclusion of future installed apps. Keep a per-source tested list; selection alone is not acceptance.

### 6. Optional Focus on/off

The Focus module uses **two companion templates**, On and Off. Use the same upload URL, device token and Focus name in both, then choose the matching system Focus trigger on the iPhone. On must use `Is Turned On` with Boolean `true`; Off must use `Is Turned Off` with Boolean `false`. Import answers do not select or authorize the system trigger. Keep both disabled until personalized and tested. Reading the currently active Focus does not reliably identify the mode that just turned off. This pair's new-copy real-trigger acceptance remains pending; the manual alternative is below.

Create `DOT Focus Sender` accepting a dictionary with text `name` and Boolean `active`. Read actual ISO 8601 time into `measured_at`:

```json
{
  "kind": "focus",
  "payload": {
    "name": "Your selected Focus mode",
    "active": true,
    "measured_at": "Actual ISO 8601 measurement time"
  }
}
```

Call the common event sender. Off uses Boolean `false`, not string `"false"`. For each selected mode, create separate on/off system automations passing the explicit mode name and correct Boolean. Allow automatic execution and complete first-use permissions.

Actually enable and disable the mode on this iPhone and verify name, direction, and time in the dot. Cross-device synchronization from iPad/Mac, switching between modes, and lock-screen behavior need separate tests. This records change events, not duration or daily totals, and gives the dot no remote control.

### 7. Optional charging and battery

If the required battery/charging actions exist on your system, create `DOT Device Status` and populate `device_status` with actual measurements:

| Field | Type |
| --- | --- |
| `measured_at` | Actual ISO 8601 timestamp, required |
| `battery_percent` | Number from `0` to `100` |
| `is_charging` | Boolean |
| `low_power_mode` | Boolean, only if actually measured |

At least one of the latter three must exist. Omit unavailable fields instead of inventing defaults. Call the shared sender and bind charger connection/disconnection or optional battery-threshold automations. Test lock-screen connection and disconnection separately. Charger triggers do not report every percentage change.

Location, health, app-usage duration, and Wi-Fi/Bluetooth collection are outside these phone modules. Protocol fields are not implemented collectors.

## Acceptance and diagnosis

| Item | Evidence and limit |
| --- | --- |
| Manual synthetic event | Phone `accepted:true`, automatic dot processing of the same ID; this transmission only. |
| Real notification | Actual source trigger and correct permitted fields/time; record per app. |
| Focus | Real on/off on the phone; correct name and Boolean. |
| Lock screen | Actual selected events while locked; do not extrapolate foreground tests. |
| VPN disabled | Actual phone upload and dot response on that network; only that trial. |
| Renewal | Valid subscription and a new processed event beyond 24 hours. |
| Offline/reboot | Record separately; no phone outbox or guaranteed catch-up. |
| Shared-template import | Still pending; verify using an independent account and supported phone before claiming portability. |

First inspect automation state, input binding, and first-use shortcut/domain permissions. `401` suggests checking the upload token; `403 device_identity_mismatch` the device ID; `503 ingest_disabled` the switch; `409` changed content for one event ID; `429` rate/capacity. Do not weaken authentication, retry infinitely, or regenerate IDs to evade errors.

If upload is accepted but the dot is silent, use `phone_bridge_status` to distinguish missing/expired subscriptions and pending/failed/accepted deliveries. Receiver acceptance still does not prove dot processing. Authorized `phone_events` queries can recover retained uploaded data; subscription renewal does not replay it.

Share only redacted error categories and necessary times/IDs. Treat notification text as untrusted data, not authorization for the dot. After acceptance, remove only temporary test shortcuts you created, retaining needed uploaders and automations.
