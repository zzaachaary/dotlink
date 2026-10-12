# Validation record

[English](validation-record.md) | [简体中文](zh-CN/validation-record.md) · [Home](../README.md)

## 2026-10-02 — original local source draft

These are historical local results. Historical phone acceptance is in [verification](verification.md). The 2026-10-06 license-only change below did not rerun compilation or integration checks.

Environment: Node.js 24.16.0, Wrangler 4.144.0, existing local dependencies matching this lockfile; no dependency reinstall.

| Check | Observed result | Boundary |
| --- | --- | --- |
| `npm test` | 35 passed, 0 failed | Synthetic unit/SQLite data, including added upload-URL validation. |
| `npm run test:runtime` | 5 passed, 0 failed | Local workerd, isolated OAuth and webhook; no real dot. |
| Wrangler `deploy --dry-run --config wrangler.example.jsonc` | Bundle succeeded; no deployment | Existing pinned CLI, blank isolated config/log directories; no Secret or registration scripts executed. |
| `node --check` | 23 `.mjs` modules passed | Syntax only; no configuration or registration execution. |
| Example protocol validation | 3 JSON examples passed | Fixed synthetic times, no server requests. |
| Publication scope, identifier patterns, docs | 46 text files; no known personal identifier matches or broken local links | Upload disabled in example config; no runtime caches, credentials, screenshots, or binary exports. |

The first runtime attempt failed to bind loopback under the sandbox with `EPERM`. The original tests passed when local execution was permitted; assertions were not changed, tests were not skipped, and authentication was not disabled. Deliberate invalid-credential, audience, and challenge errors were rejection-path checks.

Bundling used example configuration with `ENABLE_INGEST:false`; resource IDs were placeholders. Bundle success does not prove deployability. This record claims no fresh `npm ci`, real GitHub login, new-account Cloudflare deployment, second-phone import, mainland network without a proxy, or cross-day renewal.

No publication, performance, battery, or production SLA conclusion followed. Redaction review covered a whitelist, known original identifiers, common secret patterns, and manual inspection. It cannot exclude every unknown sensitive value or replace a full security audit. New screenshots, exports, or logs need a new review.

## 2026-10-06 — license change

The project moved to [PolyForm Noncommercial 1.0.0](../LICENSE), preserving the original copyright in [NOTICE](../NOTICE). Root package and lockfile license metadata changed; dependency licenses did not. Runtime code, tests, deployment configuration, and example events were unchanged. Checks covered official license bytes, metadata, wording, links, and publication scope.

Observed result: LICENSE matched the official PolyForm repository's `1.0.0` tag byte for byte. Both package files changed only their root license field; third-party lock entries and the license table were unchanged. Hashes for 30 runtime/test/config/example files matched their prior values. The directory contained 47 public text files including NOTICE; local-link and existing redaction checks passed. No commit, publication, or deployment occurred.

## 2026-10-08 — DotLink `0.1.0-beta.1` local validation

The local candidate remains unpublished. The [planned GitHub repository](https://github.com/zzaachaary/dotlink) is not yet public. These are current local results; the 2026-10-02 and 2026-10-06 records above remain historical. English and Simplified Chinese documentation describe browser setup, local Web Crypto generation, and independently optional notification, charging, and Focus modules.

| Check | Observed result | Exact boundary |
| --- | --- | --- |
| Final `npm test` | 51 passed, 0 failed | Final local unit-test run; synthetic data, not phone acceptance. |
| Full `npm run test:runtime` | 6 passed, 0 failed | Ran before the small OAuth consent-page CSP fix; the full runtime suite was not repeated after that fix. |
| Targeted OAuth runtime recheck after the CSP fix | 3 passed, 0 failed | Rechecked the affected OAuth paths; does not replace the preceding suite with a new full-suite result. |
| Real Chrome `/setup` checks | Passed at desktop 1440 × 1000 and mobile viewport 390 × 844 | English/Chinese, generation, reveal/hide, clipboard-failure fallback, refresh, and session-state reuse checked. No credential uploads or persistent browser storage were observed during these tested interactions. A mobile Chrome viewport is not real-iPhone testing. |
| Real Chrome OAuth Cancel checks | 2/2 passed; 0 CSP errors | Both language variants, after the CSP fix; verifies cancellation behavior, not a real GitHub login or dot connection. |
| One Wrangler deployment dry run | Passed; bundle 318.32 KiB, gzip 76.82 KiB | Ran before the CSP fix and was not repeated afterward. This is a local bundle result, not deployment or a final post-fix bundle measurement. |

The focused post-fix checks avoid claiming that unchanged full suites or bundling were rerun. Local browser isolation observations do not prove every browser or deployment secure. Final publication-scope review must still cover any later file or artifact additions.

| Remaining acceptance item | Current status |
| --- | --- |
| Secret-free templates for the three modules | Still in progress; the dated checkpoints below record newer working-copy status. Notification, charging and the Focus On/Off pair are not release-accepted or import-verified, and no usable download artifact is claimed. |
| Basic real-phone triggers and matching dot processing | Pending for this candidate; historical phone results remain separate. |
| Public repository and official deployment button | Repository unpublished; button is a preview. Verify the real button flow after public beta publication. |
| Independent-account/second-phone import | Pending; local creation or first-device use is insufficient. |
| Real cross-day subscription renewal | Pending, including events after the original expiry point. |
| Wi-Fi/cellular changes, actual mainland network without proxy, reboot and weak-network recovery | Pending; no regional reachability guarantee. |
| Persistent phone outbox and replay | Not implemented; do not describe them as verified recovery features. |

Public beta remains gated on local checks and basic real-phone verification. Further acceptance is documented independently; these local results establish no SLA or production-readiness claim.

## 2026-10-09 — native shortcut checkpoint

On 2026-10-08, isolated native Mac test copies sent two synthetic notification requests and one request using Mac battery actions to a temporary loopback receiver. All three passed the existing event validator, JSON content-type check and placeholder Authorization check. Notification text containing quotes, a newline, a backslash, Chinese and emoji was preserved. Battery level was a JSON number and charging state a JSON boolean. These checks did not contact the deployed Bridge or dot, and did not exercise iPhone automation.

The first notification run took roughly 47 seconds from the event timestamp to local receipt; a repeat took less than one second. The charging run took roughly 44 seconds. The cause of the slow initial runs is unresolved. Event timestamps have only second precision, so these observations are not precise network-latency measurements or a reliability claim.

On 2026-10-09, iPhone Mirroring showed the synced notification and charging working copies. The notification copy retained its notification property variables and both import questions; Chinese URL guidance was visible on the phone. Its trigger was missing after duplication on the Mac, so the native Notification automation trigger was added on the iPhone, with the source App left unconfigured. The original phone master remained intact. This is an editor inspection, not a real notification-trigger result.

The charging copy was configured on the iPhone with `Connects or Disconnects`, and its automation switch was verified off. A separate Focus working copy was duplicated on the iPhone, given a `Do Not Disturb / Is Turned On or Off` trigger, and explicitly disabled. Its inherited charging payload is not a completed Focus implementation and must not be run as one. The editor's Get Current Focus help describes the currently active mode and an empty result when no mode is active; this alone does not establish which mode just turned off. Trigger input and correct on/off binding still need verification.

Focus payload authoring, exported/signed artifacts, independent import, real notification/charging/Focus execution, and matching dot processing remain pending. No new compilation or full integration suite was run for this native-editor checkpoint.

## 2026-10-10 — Focus template pair; runtime check incomplete

The Focus starter was changed into separate On and Off working copies in Apple's editors. The inherited battery actions were removed; `kind` is `focus`, and `payload` contains a configurable text `name`, explicit Boolean `active`, and formatted `measured_at`. On uses `true`, Off uses `false`. Both provide bilingual import questions for the upload URL, shared device token and matching Focus name. The Off copy was duplicated on the iPhone and retained all three questions, which were also visible in the phone's Import Questions page.

On the iPhone, the two triggers were set to `Do Not Disturb / Is Turned On` and `Do Not Disturb / Is Turned Off`. Both showed `Automation is turned off`; the temporary input probe was also disabled. Mac edits to the existing working copies preserved these phone triggers. These are saved-editor checks, not actual Focus transitions or import acceptance. The three optional modules now use a notification template, a charging template, and a companion Focus On/Off pair.

| Native runtime check | Observed result | Boundary |
| --- | --- | --- |
| Focus On duplicate with loopback URL and placeholder token | Passed existing event validation, exact payload, JSON content type and placeholder Authorization; 221 bytes | Approximately 125 seconds from the second-resolution event timestamp to receipt. This is a slow local run, not a low-latency result. |
| Focus Off duplicate, first attempt | No completed request within the receiver's 180-second limit | Receiver exited and the shortcut was stopped. No successful Off serialization result. |
| Focus Off diagnostic repeat | Receiver reachability confirmed by a GET returning 404 before execution; again no completed request within 180 seconds | Shortcut remained at Get Contents of URL without a visible permission/error prompt. Receiver exited and the shortcut was stopped. |

The reason for the delay and timeouts is unresolved. No authentication or system protection was weakened. Tests used synthetic Focus labels and placeholder credentials on loopback only; they did not switch the phone's Focus, contact the deployed Bridge, acknowledge a callback or prove dot processing. The failed attempts remain part of the evidence and must not be replaced by the successful On result.

Template export/signing, independent import and basic real-phone acceptance remain pending. No repository publication or deployment occurred. No full build or integration suite was repeated for native authoring and documentation updates.

## 2026-10-10 — signed candidates and Mac re-import checks

This later checkpoint advances the preceding record without discarding its failures. The owner authorized Apple's Anyone validation for the four sanitized templates. Exports remain internal and outside the public text manifest.

| Check | Observed result | Boundary |
| --- | --- | --- |
| Fresh `npm test` and full `npm run test:runtime` | 51/51 and 6/6 passed | Current candidate, isolated data; not real GitHub login, phone or dot. No dependency changes or repeated bundle. |
| Four native Anyone exports | Signing-container verification with embedded keys passed; internal certificate-chain signatures were consistent | No independent Apple trust-anchor audit. Native import provides separate platform evidence. |
| Import-question audit and repair | Notifications had no questions in its first export; Charging had two stale action indexes. Both repaired in Apple's editor and re-exported | Final counts 2/2/3/3; question parameter/action targets checked, no unresolved action-output references. |
| Four signed files re-imported through Mac Shortcuts | Native setup dialogs appeared; saved URL/token and Focus-name action values were checked | Placeholder configuration only. Mac URL table edits had to be committed and reopened to verify persistence. Focus Off URL was corrected in the editor after its initial setup edit failed to persist. |
| Focus Off original local test copy | Two valid requests, 222 bytes each; event timestamp to local receipt approximately 21.540 seconds and 0.163 seconds | No request logic change explains the earlier failures; root cause remains unresolved. |
| Focus Off signed-file re-import | First attempt: zero TCP/HTTP requests within 60 seconds; second: valid 222-byte request, approximately 0.528 seconds from event timestamp | First attempt later showed a connection error after the receiver ended. A repeat pass does not establish reliable first-use behavior. |

The bounded diagnostic receiver listened only on loopback and stored timing/status metadata, not request bodies or Authorization values. An initial sandbox listener failure was recorded separately; permitted local execution was then used. All listeners exited. Event timestamps have second precision, so subsecond differences are not precise latency measurements.

Re-imported Notifications was visible on the iPhone with App/Title/Body variables but no automation trigger. The native Notification trigger was added to this new test copy; App remained unconfigured and Automation was switched off. This confirms a required phone setup step, not actual trigger execution. The exported files do not establish automatic trigger preservation.

All four Mac-imported copies subsequently appeared on the same-account iPhone. The other three also had no triggers. Charger was set to `Connects or Disconnects`, Focus On to `Do Not Disturb / Is Turned On`, and Focus Off to `Do Not Disturb / Is Turned Off`. All four new automations were explicitly disabled; the Focus and charger screens showed `Automation is turned off`. No real upload credential was entered by the agent. This verifies synced-editor setup only, not direct `.shortcut` import on iPhone, first-use permissions, real triggers or dot processing.

Basic current-template phone-to-dot acceptance, independent deployment, real renewal and launch promotion remain pending. See the [release checklist](release-checklist.md). No repository, deployment, release tag or social post was created.

## 2026-10-10 — Charging round and experimental Beta decision

The privately configured re-imported Charging copy completed a phone round while the original charging automation was disabled. Four battery/charging records matched the owner's dot screen by time and values. This is observed iPhone → Bridge → dot behavior for that round, not a cold-start/latency guarantee; the screen did not expose event IDs and per-event receiver ACK was not independently inspected. Original automations were restored and all four acceptance copies disabled after the round.

The owner confirmed the Focus action was Sleep, whereas the new pair targets Do Not Disturb. Existing Sleep/pop messages therefore do not validate the new pair. The controlled new notification test was not run. Further device tests were deferred by the owner to prepare the experimental Beta.

A targeted read-only comparison checked the original Notification Bridge, shared uploader, Device Status, Focus On/Off and senders against the four signed exports. The event envelope, module payload keys, POST endpoint contract and device Bearer authentication agree. Old workflows call shared helpers and the uploader posts Shortcut Input in File mode with application/json; the public workflows inline native JSON fields. They are not byte-identical workflows. The public notification export explicitly maps native App/Title/Body properties; exact property details of the old named event variable were not exposed by the Mac UI. Earlier synthetic native notification requests validated JSON and escaping, but do not replace the deferred real-phone notification test.

The four signed-file hashes remain unchanged; no production runtime/dependencies were changed for this comparison. All four targeted static protocol checks passed. The final release-tool tests passed 11/11; the earlier complete baseline was 51/51 plus runtime 6/6. These are different test runs, not an assertion that a new combined full suite ran.

The initial release is now prepared as an experimental Beta with the above limitations. Direct iPhone file installation, remaining candidate triggers, isolated public Deploy and long-run reliability remain follow-up work. Repository text and separately reviewed Release assets must still be packaged and published; no repository, release or social post has been created.

## 2026-10-12 — First experimental Beta packaging

The owner authorized publishing the repository and four sanitized templates as `v0.1.0-beta.1`. No additional device tests were requested for this release. The exact four signed-file hashes and checksums were rechecked; an independent read-only review found no new source-publication or template-secret blocker. All 81 allowlisted text files are assembled from reviewed code and canonical documents; personalized phone copies, internal records and credentials are excluded.

Current installation pages now link to the release assets and distinguish self-contained templates from the historical shared-helper tutorial. The manual wrapper's payload instruction explicitly selects the input payload sub-dictionary. These documentation changes do not change runtime behavior or the signed templates. The earlier 51-unit / 6-runtime baseline and subsequent 11 targeted release-tool tests remain dated evidence; the public CI run records the checks for the published commit.
