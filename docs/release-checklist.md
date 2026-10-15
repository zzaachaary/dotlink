# Release checklist

[English](release-checklist.md) | [简体中文](zh-CN/release-checklist.md) · [Home](../README.md)

The initial `0.1.0-beta.1` experimental Beta was published on 2026-10-12 at commit `7f1ab182c485714ff62091f8b4b8cd1539be46b6`. The record below distinguishes completed Beta publication from the unpublished local fixes and the remaining stable-release gates. Existing personal-route evidence and the Charging round do not clear those gates. See the [validation record](validation-record.md).

## Completed first prerelease record (2026-10-12)

- [x] Local baseline unit and isolated runtime checks: 51 and 6 passed on 2026-10-10. The subsequent release-tool checks passed 11 targeted tests.
- [x] Four sanitized Apple Anyone exports, import questions and action references inspected; all four imported on a Mac.
- [x] Compare old notification/uploader/device/Focus native workflows with exported event contracts. POST, device Bearer authentication and event/payload fields agree; the self-contained JSON action differs from the old shared uploader.
- [x] Charging plug/unplug events matched Bridge records and the owner's dot screen in one isolated phone round.
- [x] Exported the 81 allowlisted repository text files from reviewed code and canonical documentation; exact package and hashes checked.
- [x] Attached the four reviewed signed `.shortcut` files and SHA-256 checksums. These separately reviewed assets are outside the text repository manifest.
- [x] Retained LICENSE, NOTICE and bilingual instructions; privately configured phone copies were excluded.
- [x] Published the reviewed repository and prerelease after the owner’s explicit instruction. Public links and Beta wording were updated; the original tag is retained.

## Publication checks and local candidate gates

- [x] Checked public repository and Release pages; both remote README source files matched canonical documents. Anonymous asset downloads matched bytes/hashes, and GitHub CI passed 54 unit tests, 6 runtime tests, release checks and dry-run bundling at the Beta commit.
- [x] Re-inspected the Cloudflare form during the 2026-10-12 review: repository retrieval succeeded on retry; four required Secrets prevented the documented deploy-first order. No Worker was deployed in that review.
- [x] Completed the unpublished candidate’s local regression: 66/66 unit tests, 13/13 runtime tests, full dependency audit 0, and dry-run bundling. This includes bootstrap, subscription races/old SQLite migration, OAuth admission and the production-entry synthetic OAuth lifecycle. See the [dated record](validation-record.md).
- [ ] Deploy the candidate to isolated cloud resources; verify initial setup, dashboard configuration, owner/non-owner authorization, subscription, delivery and revocation. Check redeployment preserves variables and Secrets.
- [ ] Test the public Deploy button against the exact candidate repository/ref once available. The current public button still points to the old Beta and cannot validate local fixes.
- [x] Reviewed the local rendered setup UI in both languages at 1440×1000 and 390×844, including the final subscription-before-enable wording; 0 page errors and 0 external requests.
- [ ] Exercise the installation links and complete the real external account flows on the deployed candidate; local UI/link checks do not establish account availability.
- [ ] Produce a short demonstration using synthetic content. Match claims to evidence and describe the release as a self-hosted, noncommercial, source-available Beta.
- [ ] Review the final post and media before the owner publishes or explicitly authorizes posting.

## Device and reliability gates before a stable release

- [ ] Direct iPhone installation from the exact signed files, including first permissions and trigger binding.
- [ ] New notification candidate and Focus On/Off phone-to-dot runs; first and repeated execution. Sleep/pop observations from existing automations do not validate the new DND candidates.
- [ ] Per-event receiver ACK inspection, precise latency, subscription expiry crossing, restart, Wi-Fi/cellular and relevant regional reachability.
- [ ] Longer observation before unattended-reliability claims. There is no persistent phone outbox or cursor replay; do not promise lossless offline recovery, instant delivery or all-app coverage.

## Canonical document check

Run `npm run check:release -- --docs-root /path/to/public-documents` when the canonical Markdown, LICENSE and NOTICE are maintained separately. The checker rejects missing, non-text or symlink documents instead of falling back to frozen copies. It reads code from the code directory and exports nothing.

A canonical-source pass does not validate a future archive. Check the final exported repository with the default release checker and compare hashes before upload. Never upload the whole notes vault or internal acceptance records.
