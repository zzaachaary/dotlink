# iPhone Notifications: installation

[English](iphone-shortcuts.md) | [简体中文](zh-CN/iphone-shortcuts.md) · [Home](../README.md)

**Current installation: Notifications only.** Charging, Focus On and Focus Off are **Coming soon**. Their old release attachments are historical artifacts and are not part of this installation path.

The owner reported successful Notifications setup on 2026-10-20. This is user feedback, not independent verification of every source, import route or long-term delivery. Historical iOS 27 tests do not define a minimum supported OS version. Use this module only when its required Notification trigger and fields exist on your own iPhone.

Complete the cloud configuration in [deployment](deployment.md) first. You may configure and save the phone template before connecting the dot, but keep Automation and server ingestion off until the Step 6 subscription is confirmed. The template contains its own event envelope and HTTP upload action; no legacy `DOT Bridge Uploader` or `DOT Event Sender` is required.

## Download and configure

Download [DotLink-Notifications.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut). [SHA256SUMS](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/SHA256SUMS) retains checksums for both this file and historical assets; use only the Notifications file for current installation. Never use somebody else's personalized export.

1. On iPhone, download the file in Safari and open it from Files to import. The historically observed fallback is Mac import and same-account iCloud sync; it does not prove direct iPhone import or independent-account portability.
2. Enter your complete `https://your-host/ingest` URL and raw device token, with no `Bearer`, spaces or newlines around it. The template adds the authentication prefix. Keep device ID `iphone-primary`. Do not use GitHub or Cloudflare management credentials.
3. Save, leave the editor and reopen to verify the URL and token persisted. Check the colon in `https://` and the `/ingest` suffix. Keep **Automation off** during setup.
4. If missing, add a Notification trigger through the editor's Search → Automation menu. Select **one source App you permit to forward** and bind App, Title and Body to that trigger's actual properties. Do not hard-code the first App, leave an empty title filter, or pass unrelated text as the App.
5. Exclude ChatGPT, Codex and Shortcuts to avoid forwarding responses back into the bridge. If exclusions cannot be reliably configured, retain a single-App allowlist. A newly added trigger may be enabled by default: expand it and turn Automation off while configuring.
6. Return to [deployment Step 6](deployment.md#6-connect-your-dot-and-verify-notifications), complete OAuth and use its copyable prompt to confirm the notification subscription. Only then enable server ingestion and the configured Notification automation.
7. Complete first-use permissions and generate a harmless new notification from the chosen App, using another device if appropriate. Match the source, time, allowed fields and original `event_id` with the dot's acknowledgement. Repeat for the prompt's three distinct new events; then keep the ongoing subscription. Expand sources only after checking each one.

If the required trigger is unavailable, stop this module; installing a template cannot add OS capabilities. The release supplies no iCloud share link or guarantee that triggers survive import. An editor run without actual notification input does not validate a notification trigger.

## What the phone sends

The template wraps the system-provided notification in a `v:1` event with a new `event_id`, `device_id:iphone-primary`, `kind:notification`, current ISO 8601 `occurred_at`, and dictionary `payload`. The payload's App is required; Title and Body contain only fields supplied by iOS. POST uses JSON and the device Bearer credential. See the [protocol](protocol.md) for the full contract.

Hidden notification previews may provide only generic text. The template does not read app databases, historical chats or hidden bodies. No notification means no input to forward. SMS/iMessage, attachments, aggregated notifications and newly installed apps have no blanket coverage guarantee. Source selection is consent to only those selected sources.

Keep the token out of URLs, screenshots, chat, issues and shared exports. A recipient of a personalized shortcut could impersonate the phone. Treat notification content as untrusted data rather than authorization to execute actions or send messages.

## Verify and troubleshoot

- Confirm a real source event ran the automation; editor configuration alone is insufficient.
- Confirm a new Bridge event and matching automatic dot acknowledgement. `202` and webhook `2xx` have narrower meanings; an explicit history query is not evidence of automatic wake-up.
- Check saved URL/token, input binding, source selection and first-use permissions before retrying. `401/403` concerns credentials/identity, `503` configuration or ingestion, and `429` rate/capacity. Preserve an existing event's ID and content when retrying that event.
- When upload succeeds but the dot is silent, inspect subscription expiry and delivery state through `phone_bridge_status`. It does not expose the subscription's filters or prove which dot owns it; use client records to establish a match.
- Confirm a genuinely new event after the original subscription deadline before claiming renewal works. There is no persistent phone outbox or cursor replay; offline uploads may be lost.

See [verification](verification.md) for detailed checks. The [validation record](validation-record.md) preserves historical Charging/Focus results and failures without making those modules currently supported.
