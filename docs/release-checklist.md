# Release checklist

[English](release-checklist.md) | [简体中文](zh-CN/release-checklist.md) · [Home](../README.md)

This checklist covers the current Notifications-only installation path for v0.1.0. Charging, Focus On and Focus Off are **Coming soon** and are excluded from current setup and acceptance. The historical `v0.1.0-beta.1` tag and four-file release record remain; v0.1.0 reused the original signed template bytes. Release status does not replace acceptance. Existing dated evidence, current owner feedback and unfinished checks are kept separate below. See the [validation record](validation-record.md).

## Completed first prerelease record (2026-10-12)

- [x] Local baseline unit and isolated runtime checks: 51 and 6 passed on 2026-10-10. The subsequent release-tool checks passed 11 targeted tests.
- [x] Four sanitized Apple Anyone exports, import questions and action references inspected; all four imported on a Mac.
- [x] Compare old notification/uploader/device/Focus native workflows with exported event contracts. POST, device Bearer authentication and event/payload fields agree; the self-contained JSON action differs from the old shared uploader.
- [x] Charging plug/unplug events matched Bridge records and the owner's dot screen in one isolated phone round.
- [x] Exported the 81 allowlisted repository text files from reviewed code and canonical documentation; exact package and hashes checked.
- [x] Attached the four reviewed signed `.shortcut` files and SHA-256 checksums. These separately reviewed assets are outside the text repository manifest.
- [x] Retained LICENSE, NOTICE and bilingual instructions; privately configured phone copies were excluded.
- [x] Published the reviewed repository and prerelease after the owner’s explicit instruction. Public links and Beta wording were updated; the original tag is retained.

## Existing deployment and source evidence

- [x] Public repository, Release, anonymous assets and Beta CI checked on 2026-10-12. The required-Secrets deployment-order defect found then was subsequently repaired.
- [x] Independent CLI deployment, actual setup, owner OAuth, MCP subscription and synthetic receipt/query/ACK passed on 2026-10-12, preserving the original personal Bridge.
- [x] One manual iPhone Charging upload and matching dot result passed on 2026-10-13. This did not clear automatic-trigger or first/repeated reliability checks.
- [x] Hosted Deploy from the same first-edition source lineage created fresh resources and passed actual setup generation, configuration and health on 2026-10-15. Its GitHub CI passed 73 unit and 17 runtime tests. These are dated results, not checks of later edits.
- [ ] Record owner OAuth, a notification-only dot subscription and an actual notification on the same new installation; do not combine separate instances into one acceptance result.
- [x] On 2026-10-18, the final 88-file allowlist check passed; both source exports matched all 88 files, all 35 canonical document/license texts matched, and the five original Release asset hashes matched.
- [ ] Confirm the final commit in the [current main workflow](https://github.com/zzaachaary/dotlink/actions/workflows/check.yml?query=branch%3Amain). Historical CI counts above do not describe this result.

## Current feedback and notification acceptance

On 2026-10-20, the owner reported successful notification setup and that Charging did not work in the latest setup. Keep this report separate from the earlier dated Charging results; it does not establish a measured success rate or independently reproduced installation.

- [ ] Follow [deployment](deployment.md) once: deploy → seven settings → dot connection → notification-only subscription → Notifications input binding and a real selected-source notification.
- [ ] Confirm `iphone-primary` is enabled and subscribe to `phone.event` with arguments `{"device_ids":["iphone-primary"],"kinds":["notification"]}`; record the actual subscription expiry and any client renewal limitations.
- [ ] Compare new automatic notifications with matching dot acknowledgements; record source, time, available event ID, first/repeated behavior and locked-screen behavior. A manual run without notification input or a history query does not prove automatic delivery. Three successful acknowledgements are a bounded test, not a success-rate guarantee; keep the subscription after the test if ongoing forwarding is requested.
- [ ] Before making reliability claims, verify new events across the original lease deadline, network/reboot recovery, permission revocation and continued observation. There is no phone outbox or cursor replay; do not promise 100% delivery, lossless offline recovery, instant delivery or all-app support.

Charging, Focus On and Focus Off remain Coming soon. Their historical records are retained above and in the validation record; no current installation or enablement step is provided for them.

Describe demonstrations and social posts using actual passed scope; the owner publishes them separately. They are not installation evidence.

## Canonical document check

Run `npm run check:release -- --docs-root /path/to/public-documents` when the canonical Markdown, LICENSE and NOTICE are maintained separately. The checker rejects missing, non-text or symlink documents instead of falling back to frozen copies. It reads code from the code directory and exports nothing.

A canonical-source pass does not validate a future archive. Check the final exported repository with the default release checker and compare hashes before upload. Never upload the whole notes vault or internal acceptance records.
