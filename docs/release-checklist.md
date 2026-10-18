# Release checklist

[English](release-checklist.md) | [简体中文](zh-CN/release-checklist.md) · [Home](../README.md)

DotLink maintains its source and installation guide as one first edition. The historical `v0.1.0-beta.1` tag and assets remain; a new version label does not replace acceptance. Existing evidence and unfinished checks are kept separate below. A public repository does not establish stable phone behavior. See the [validation record](validation-record.md).

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
- [ ] Complete owner OAuth, dot subscription and selected phone modules on the same new installation.
- [x] On 2026-10-18, the final 88-file allowlist check passed; both source exports matched all 88 files, all 35 canonical document/license texts matched, and the five original Release asset hashes matched.
- [ ] Confirm the final commit in the [current main workflow](https://github.com/zzaachaary/dotlink/actions/workflows/check.yml?query=branch%3Amain). Historical CI counts above do not describe this result.

## Manual phone acceptance

- [ ] Follow [deployment](deployment.md) once: deploy → seven settings → MCP subscription → manual Charging.
- [ ] After manual Charging passes, test one locked-screen charger connection/disconnection.
- [ ] Exercise selected Focus On/Off for the same mode and one notification source; record first/repeated behavior. Old Sleep/pop results do not validate new DND-bound templates.
- [ ] Before making reliability claims, verify new events across the original lease deadline, network/reboot recovery, permission revocation and continued observation. There is no phone outbox or cursor replay; do not promise lossless offline recovery, instant delivery or all-app support.

Describe demonstrations and social posts using actual passed scope; the owner publishes them separately. They are not installation evidence.

## Canonical document check

Run `npm run check:release -- --docs-root /path/to/public-documents` when the canonical Markdown, LICENSE and NOTICE are maintained separately. The checker rejects missing, non-text or symlink documents instead of falling back to frozen copies. It reads code from the code directory and exports nothing.

A canonical-source pass does not validate a future archive. Check the final exported repository with the default release checker and compare hashes before upload. Never upload the whole notes vault or internal acceptance records.
