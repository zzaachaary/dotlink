# Release checklist

[English](release-checklist.md) | [简体中文](zh-CN/release-checklist.md) · [Home](../README.md)

The initial `0.1.0-beta.1` release is an experimental Beta. The current release decision uses existing personal-route evidence, targeted template/protocol comparison and the completed Charging round. Deferred checks remain unverified; they are not silently marked passed. See the [validation record](validation-record.md).

## Prepare the first prerelease

- [x] Local baseline unit and isolated runtime checks: 51 and 6 passed on 2026-10-10. The subsequent release-tool checks passed 11 targeted tests.
- [x] Four sanitized Apple Anyone exports, import questions and action references inspected; all four imported on a Mac.
- [x] Compare old notification/uploader/device/Focus native workflows with exported event contracts. POST, device Bearer authentication and event/payload fields agree; the self-contained JSON action differs from the old shared uploader.
- [x] Charging plug/unplug events matched Bridge records and the owner's dot screen in one isolated phone round.
- [ ] Export only the 81 allowlisted repository text files, sourcing documentation from its canonical location; recheck the exact final package and hashes.
- [ ] Attach only the four reviewed signed `.shortcut` files to the GitHub prerelease, plus SHA-256 checksums. These assets are separately reviewed and are not part of the text repository manifest.
- [ ] Retain LICENSE, NOTICE and bilingual configuration instructions. Never export the privately configured phone copies.
- [ ] Publish the reviewed repository and prerelease after the owner's explicit publication instruction. Keep this candidate's download/publication wording accurate when links become live.

## After publishing

- [ ] Inspect public README rendering, bilingual links, CI and actual asset downloads as a visitor.
- [ ] Check the Deploy button against the published repository with an isolated installation; document any setup corrections.
- [ ] Produce a short demonstration using synthetic content. Match claims to evidence and describe the release as a self-hosted, noncommercial, source-available Beta.
- [ ] Review the final post and media before the owner publishes or explicitly authorizes posting.

## Deferred device and reliability checks

- [ ] Direct iPhone installation from the exact signed files, including first permissions and trigger binding.
- [ ] New notification candidate and Focus On/Off phone-to-dot runs; first and repeated execution. Sleep/pop observations from existing automations do not validate the new DND candidates.
- [ ] Per-event receiver ACK inspection, precise latency, subscription expiry crossing, restart, Wi-Fi/cellular and relevant regional reachability.
- [ ] Longer observation before unattended-reliability claims. There is no persistent phone outbox or cursor replay; do not promise lossless offline recovery, instant delivery or all-app coverage.

## Canonical document check

Run `npm run check:release -- --docs-root /path/to/public-documents` when the canonical Markdown, LICENSE and NOTICE are maintained separately. The checker rejects missing, non-text or symlink documents instead of falling back to frozen copies. It reads code from the code directory and exports nothing.

A canonical-source pass does not validate a future archive. Check the final exported repository with the default release checker and compare hashes before upload. Never upload the whole notes vault or internal acceptance records.
