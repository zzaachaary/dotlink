# Setup and reliability roadmap

[English](roadmap.md) | [简体中文](zh-CN/roadmap.md) · [Home](../README.md)

The original roadmap was compiled on 2026-10-02, with browser-first candidate notes on 2026-10-08 and experimental Beta status on 2026-10-12. Historical phone evidence through 2026-10-01 remains in the [first-version record](first-version.md).

Preserve the working protocol and system triggers while reducing repeated configuration, diagnosis, and recovery work. A full companion app is not needed to first evaluate templates and a browser guide. Alternative architectures and service-delivery boundaries are in the [FAQ](faq.md).

## Current first edition: own-account browser setup

The intended path is official Deploy to Cloudflare → your Worker's bilingual `/setup` → manually entered Cloudflare variables/Secrets and GitHub OAuth App → your dot connection → independently optional notification, charging, and Focus modules.

The guide generates credentials locally through Web Crypto. It does not receive a Cloudflare API token or GitHub Client Secret and is only for fresh deployments. Dashboard-managed variables must survive redeployment; setup must not silently replace an existing registry or sealing key. Default `workers.dev` avoids requiring a domain purchase, without promising regional availability.

[Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1) includes the bridge, bilingual browser guide, and four sanitized signed files for Notifications, Charging, Focus On, and Focus Off. All four passed Mac re-import and same-account iPhone synchronization; phone triggers must be added. The new Charging copy has a real-phone → Bridge → dot result. The new notification/Focus copies' real triggers and direct iPhone/second-account import remain pending. Hosted Deploy bootstrap passed on 2026-10-15; owner/dot/phone acceptance on that new installation remains unfinished. Cross-day renewal, network variation, and recovery are separate reliability work. See the dated [validation record](validation-record.md).

## Stage 1: shareable reproduction package

Desired experience: import → configure your connection → select sources → grant system permissions → verify real events.

- Shipped in the Beta: four signed, sanitized files, versioned release downloads, checksums, and import questions for each user's connection settings.
- Verify the remaining import routes and actual notification/Focus input bindings on independently configured phones; retain the working event fields and inline upload actions.
- Keep notifications, charging, and Focus independently optional. Enable only the scope the owner chooses.
- Retain synthetic and real-trigger checks per module. Error displays show stage/category, not tokens or bodies.

Apple documents sharing shortcuts by iCloud link/file and adding import questions. The cited iOS 27 automation documentation describes automations attached to shortcuts and disabled after synchronization. Therefore do not repeat the older blanket claim that personal automations can never be shared. App selection, Focus mapping, and retained triggers across accounts still require real tests. [Sharing](https://support.apple.com/guide/shortcuts/share-shortcuts-apdf01f8c054/ios), [import questions](https://support.apple.com/guide/shortcuts/add-import-questions-to-shared-shortcuts-apdf330fd3a0/10.0/ios/27), [automations](https://support.apple.com/en-ke/guide/shortcuts/apd690170742/ios).

Broader portability acceptance: another supported iPhone under an independent account can connect using a secret-free template, with the owner explicitly seeing and choosing destination, sources, and automation state. The first edition has not met this broader acceptance target; its release does not promise one-click installation.

## Stage 2: pairing and diagnostics

A future authenticated management view could show devices, collection scope, last receipt, subscription expiry, and delivery failures:

1. The owner signs in and creates a short-lived, single-use pairing code.
2. The phone exchanges it for a device-specific upload credential. Long-lived tokens stay out of public links and access logs.
3. The user chooses sources and completes system consent; diagnostics show each stage.
4. Device revocation, credential rotation, and pause explain which already-delivered copies cannot be recalled.

The current static `/setup` guide does not implement that management service. Retain one person per deployment; multi-tenancy requires isolation, authorization, quotas, key lifecycles, and deletion rather than removing owner checks.

## Stage 3: recovery

| Gap | Candidate implementation | Acceptance |
| --- | --- | --- |
| Events never uploaded while offline | Persistent bounded phone outbox with retention; remove only after accepted receipt | Recover after offline periods, process exit, and reboot; same ID on retry; failure does not clear queue. |
| Subscription gaps | Renewal diagnostics, expiry warning, consumer refresh by `refreshBefore` | Real delivery across a day and service restart. |
| No replay | Stable cursors, retention bounds, truncation flags, idempotent recovery | Re-subscription neither skips eligible history nor repeats actions. |
| Reply forwarding loops | Default own-source exclusion, origin markers, bounded deduplication | dot replies do not cause infinite forwarding. |
| Excessive collection | Local source selection, content trimming, visible privacy controls | Owner can exclude content before upload. |
| Incomplete times/fields | Original notification dates, subtitles, per-source field verification | Distinguish occurrence, collection, receipt, and processing. |

Renewal and replay are protocol extension points; the current 24-hour limit and `cursor:null` need not be permanent. [MCP Events](https://developers.openai.com/plugins/build/mcp-events).

### Evaluate iOS 27 Storage first

The cited Shortcuts Storage feature preserves values across runs and supplies global values shared by shortcuts, making it a candidate for shared configuration or small workflow state. [Apple WWDC26: What’s new in Shortcuts](https://developer.apple.com/videos/play/wwdc2026/310/).

Values synchronize across devices; this is not automatically Keychain or a reliable queue. Evaluate export leakage, sync scope, concurrent writes, capacity, recovery, and lock-screen behavior before placing bodies or long-lived credentials there. No reliable offline replay is claimed from this proposal.

## Stage 4: a small companion app

If templates still make credentials and queue management difficult, a Swift companion could:

- Expose an App Intent for sending an event, centralizing JSON, authentication, and HTTP.
- Store credentials in Keychain, with pairing, revocation, and rotation UI.
- Maintain a bounded protected local queue and send/recovery state.
- Explain permissions and connection failures by stage.

App Shortcuts can provide actions on installation, but do not establish every system trigger automatically. Source selection and permissions remain the user's; iOS controls background timing. [Apple App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts).

`UNUserNotificationCenter` exposes the app's own notifications. Permission to send notifications does not grant access to every other app's notifications. [Apple getDeliveredNotifications](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/getdeliverednotifications%28completionhandler%3A%29).

The candidate structure remains system Shortcuts trigger → companion action → bridge. Do not promise zero-configuration whole-phone listening or automatic future-app coverage.

## Stage 5: replaceable components

| Boundary | Future direction | Constraints to retain |
| --- | --- | --- |
| Identity | Another provider alongside GitHub | Stable owner, PKCE, scope/resource/revocation checks |
| Runtime/storage | Other runtime and transactional database | Atomic event/outbox write, durable scheduling, quotas, expiry, backup semantics |
| Collector | Other platforms only after an explicit need | Versioned protocol; independent permission/background evidence |
| Consumer | Another assistant query/events adapter | Separate credentials, least privilege, signatures, actual wake-up acceptance |

Callback restrictions are a deliberate security boundary. New adapters need separate target validation and authentication, not an unrestricted generic webhook. Manual MCP reads do not prove automatic background discovery or processing.

## Accessory notification APIs are not a shortcut to this architecture

Accessory Notifications provides all/some-app selection but targets accessories with AccessorySetupKit and related extensions. The originally cited documentation also limits production-user availability by EU device location and Apple Account region. Development/test access elsewhere is not proof of worldwide consumer availability. [Accessory Notifications](https://developer.apple.com/documentation/accessorynotifications), [accessory receipt](https://developer.apple.com/documentation/AccessoryTransportExtension/receiving-ios-notifications-on-an-accessory).

Apple Developer Program License Agreement §3.3.7(J), as referenced in the original research, restricts use, redistribution, remote storage, and decryption of that forwarded data. Do not assume this accessory interface is a generic cloud-assistant upload path; consult current terms before evaluating it. This concern concerns the accessory framework, not a conclusion about the current Shortcuts HTTP path. [Apple agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/).

Prioritize shareable templates, clear setup, diagnostics, and recovery; add a companion only when evidence warrants it. Expand support through independent-device reproduction, not configuration success, server acceptance, or one delivered notification.
