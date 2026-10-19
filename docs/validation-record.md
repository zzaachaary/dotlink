# Validation record

[English](validation-record.md) | [简体中文](zh-CN/validation-record.md) · [Home](../README.md)

This is a chronological evidence log. Statements such as “unpublished” describe their dated checkpoint; use [deployment](deployment.md) for current installation instructions.

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

## 2026-10-12 — unpublished local repair candidate

The owner authorized repairs and regression testing, with no formal publication. The candidate changes first-deployment setup, subscription lifecycle isolation, OAuth admission bounds, the development dependency lockfile and bilingual guidance. The published `v0.1.0-beta.1` tag and its signed shortcut assets remain unchanged. These results describe the local candidate, not a deployment of it.

| Check | Actual result | Evidence boundary |
| --- | --- | --- |
| `npm test` | 66/66 passed | Local unit, SQLite, configuration and protocol checks; synthetic data |
| `node --test --test-concurrency=1 test/runtime/*.test.mjs` | Final complete run: 13/13 passed | Actual local workerd/SQLite; external GitHub and receiver services are synthetic |
| Production-entry OAuth flow | DCR → browser cookie/state and PKCE → synthetic GitHub → token/refresh → MCP → revoke passed within the runtime suite | Exercises the production entry, not a real GitHub login or eligible dot account |
| Subscription concurrency and migration | Late `204`/`410`, cancellation/re-creation and pre-generation SQLite migration checks passed within the runtime suite | Local interleaving/upgrade evidence; no cloud upgrade or real receiver revocation claim |
| `npm audit --json --ignore-scripts --registry=https://registry.npmjs.org` | Full dependency audit: 0 reported vulnerabilities | Official npm response for this candidate’s lockfile; not proof that all vulnerabilities are absent |
| `npm run check` | Exit 0; dry-run bundle 327.20 KiB, gzip 79.24 KiB | Bundling only; no Cloudflare deployment |
| Final Chrome UI pass | Desktop 1440×1000 and narrow viewport 390×844 passed again after the subscription-before-enable wording update; 0 external requests and 0 page errors. The first pass also found no browser-persistent storage. | Local rendered setup; narrow viewport is not iPhone Safari or actual device acceptance |

The first runtime run was 12/13: an existing test delayed reading a `dispatchFetch` response body. The test was corrected to read JSON promptly while retaining the original timestamp assertion, then the complete 13-test suite passed. This was a test response-lifetime issue; it was not hidden by skipping a test or relaxing the timestamp check.

The lockfile now pins Wrangler 4.149.0, Miniflare 5.20261006.1-alpha, workerd 1.20261006.1, sharp 0.35.5 and esbuild 0.28.2; the production OAuth provider stays at 1.2.1. The Beta’s three high entries from the earlier sharp advisory are absent in this candidate’s full audit. The published Beta still has its old lockfile and historical disclosure. Miniflare remains the alpha version selected by Wrangler’s dependency tree, not an independently replaced package.

After the first browser pass, the setup copy was clarified to require subscription completion before enabling upload. The final Chrome retest passed at both viewport sizes with 0 page errors and 0 external requests. The final code also passed a fresh complete 66/66 unit run, 13/13 runtime run (8.05 seconds) and the dry-run bundle reported above. Historical shortcut cold-run failures and deferred phone checks remain unchanged.

No commit, push, cloud deployment, new tag or Release was made for these repairs at this checkpoint. A fresh isolated Cloudflare installation, the exact public Deploy button flow, real owner/non-owner OAuth and revocation, direct iPhone installation, actual Notifications/Charging/Focus triggers, cross-lease renewal and network/reboot behavior still need separate evidence. Local checks do not establish stable-release readiness.

## 2026-10-12 — isolated Cloudflare CLI deployment and setup repair

A real isolated Worker, fresh OAuth KV and fresh self-bound Durable Object namespace were created without replacing the personal service. The first credential-free deployment passed 19 HTTP bootstrap checks: setup resources returned `200`, and unconfigured business GET/POST routes returned `503`. The first deployed Chrome setup then failed with `__name is not defined` and a disabled generation button. That browser failure remains part of this record; static HTTP success did not establish a working setup flow.

The failure came from deriving browser JavaScript with a function’s `.toString()` after bundling introduced a helper reference. The candidate now ships static JavaScript using `String.raw`. A new test of the actual Wrangler bundle in workerd passed 1/1, the complete unit suite passed 66/66, and an independent patch review found no additional issue. The earlier 13/13 runtime result remains its own checkpoint rather than being relabeled as a newly combined run.

After redeployment, the actual cloud setup initialized and generated fresh credentials successfully in Chrome. Generated values remained hidden by default and were backed up only to an ignored local file with mode `0600`; no credential values appear in public evidence. The redeployed Worker reported startup 4 ms and source size 325.32 KiB / gzip 79.50 KiB. These deployment metrics are not an end-to-end event-latency measurement.

The isolated Worker received only the minimum `PUBLIC_ORIGIN`, `OWNER_GITHUB_ID` and `ENABLE_INGEST=false` variables at this stage. The real cloud Phase B harness passed 37/37 checks, including exact metadata, unauthorized MCP `401`, disabled ingestion `503`, origin rejection `403`, absent test backdoor `404`, token method `405`, oversized bodies/queries `413`/`414`, oversized fields `400`, aliases `404`, and 12 successful DCR registrations followed by a 13th request rejected with `429` and `Retry-After`. These were bounded synthetic requests, not an exhaustion or load test.

The owner approved creation of a new GitHub OAuth App and completed GitHub’s confirmation. New deployment-specific Secrets were still being configured at this earlier checkpoint; the following entry records completion of their configuration, while real OAuth remains unverified. Health `200` requires only the minimum origin/owner variables and is not a Secret-completeness check.

This validates the actual CLI bootstrap path and the repaired deployed setup generation. The official Deploy button still targets the published Beta and remains unverified for this unpublished candidate. Real owner/non-owner OAuth, dot connection and signed event processing, direct iPhone installation and real triggers, revocation and cross-24-hour renewal remain separate unverified gates. No formal release or Beta-tag change occurred.

## 2026-10-12 — Secrets configured; real client OAuth blocked

All four required deployment-specific values are now configured as Cloudflare Secrets. The GitHub Client Secret was transferred directly from the GitHub UI through the active browser session into Cloudflare and was not written to a local file. No secret values are included in this record. Ingestion remains disabled with `ENABLE_INGEST=false`.

The latest actual full local checks passed 66/66 unit tests, 14/14 runtime tests and the 87-file release checker. These are new complete results; the earlier 13-test runtime run and the later 1-test bundle regression above remain their own historical runs.

A new separate ChatGPT test plugin was created. The owner explicitly approved reading all data uploaded to this new Worker and creating event subscriptions. That approval and plugin creation did not complete OAuth: two automated Chrome consent POST attempts ended in `ERR_BLOCKED_BY_CLIENT`. At that checkpoint the cause was unresolved, and no specific extension or proxy was blamed. The following entry records the later Worker-log diagnosis and actual browser fix.

A separate bounded server-side five-request check observed: DCR `201`, consent page `200`, missing-cookie rejection `400`, valid consent `302` to GitHub, and the expected `302` on synthetic cancellation. This verifies those server branches, not actual GitHub sign-in, callback completion, token exchange or a connected plugin. The browser error is preserved as an unresolved integration result, not cleared by the server-side `302`.

There is still no verified real subscription, phone event or signed callback → dot processing loop on this isolated service. Real client OAuth, owner/non-owner behavior, iPhone installation and triggers, delivery/revocation and cross-24-hour renewal remain pending. No formal release or existing Beta-tag change has occurred.

## 2026-10-12 — consent Origin defect fixed; real owner OAuth completed

The second real cloud defect was diagnosed with before-fix Worker tail evidence. The consent page’s `Referrer-Policy: no-referrer` caused Chrome’s form POST to send `Origin: null`; the Worker’s existing front-door Origin check returned `403`. The earlier browser `ERR_BLOCKED_BY_CLIENT` observation is retained, but the diagnosis is based on that actual request and server response, not a guess about browser extensions.

The minimal change in `src/auth.mjs` sets the consent page’s policy to `same-origin`. It does not admit null or cross-site origins and does not weaken cookie/state, PKCE or owner checks. Targeted RED/GREEN verification covered 4 unit tests and 3 runtime tests; the subsequent full runtime suite passed 14/14. These are the runs actually performed after this fix, not a claim that every earlier command was repeated.

After the new isolated deployment, actual Chrome sent the canonical Origin, received the expected `302` to the separate GitHub OAuth App, and completed GitHub’s public-data-only authorization and the callback. ChatGPT settings then showed the expected connected account, authorization method OAuth and the isolated Worker’s `/mcp` address. This establishes successful real owner login and the client connection; it goes beyond the earlier server-only redirect check. Public evidence omits private deployment identifiers and credential values.

MCP tool/subscription acceptance, target-dot event processing, real phone triggers, non-owner verification, revocation and cross-24-hour renewal remain separate gates. Ingestion is still disabled. No formal release or Beta-tag change occurred.

## 2026-10-12 — live MCP subscription and synthetic event delivery

The new isolated plugin successfully called `phone_devices` and `phone_bridge_status` directly and reported one active subscription with an actual expiry. After confirming that subscription, `ENABLE_INGEST` was changed to `true` in the isolated Worker’s Cloudflare UI, and `/health` returned `200` with ingestion enabled. The original personal Bridge was untouched.

A private, bounded cloud-ingestion harness passed 10/10 checks:

| Check | Actual result |
| --- | --- |
| Missing device token | `401` |
| Fake device token | `401` |
| Wrong device identity | `403` |
| Invalid Boolean field | `400` |
| Five new events: notification, charging true/false, Focus on/off | Each returned `202` as a new persisted event |
| Retry of the same notification | `202`, `duplicate:true`, and the original `received_at` retained |

Direct MCP queries matched the five new events by UUID. Delivery counters reported `accepted:5`; the latest charging and Focus states were both Boolean `false`, and the duplicate did not append another event. These checks establish real cloud authentication rejection, persistence, idempotence, MCP querying and receiver acknowledgements for synthetic uploads. The local complete unit suite was also rerun and passed 66/66; the full runtime suite passed 14/14.

There was still no observed target-dot processing at this checkpoint. Receiver acceptance is not proof of dot understanding or a proactive response. No real iPhone trigger was exercised by this private harness. A separate dot-response check was in progress and is not counted as passed here; real phone installation/triggers, revocation and cross-24-hour renewal remain pending. Public records omit deployment identifiers, exact event IDs and private test markers. No formal release occurred.

## 2026-10-12 — sixth synthetic event and observed dot task behavior

A separate, non-private notification returned `202 accepted`; the isolated MCP `phone_bridge_status` then reported six accepted deliveries. The target dot reported an automatic task wake without event fields and subsequently called `phone_events`, retrieving the exact new event ID, title and `received_at`. Its confirmation-send API returned accepted; that response alone does not establish that the confirmation was visible in the destination UI.

With the owner’s permission, the task editor was inspected directly: the trigger was the isolated validation connector, the event was `phone.event`, and the task instructions matched this single-event confirmation check. The task was configured to use the same chat for every run. This confirms the configured subscription source and provides observed automatic-wake and subsequent-read behavior. The UI did not expose a per-run source identifier, so the unique association between this individual delivery and this particular task run has not been independently established. Matching an event through an explicit query does not, by itself, prove its push-to-run correlation. This is an evidence limit, not a demonstrated delivery failure.

These are synthetic cloud events, not iPhone-trigger evidence. Direct iPhone installation, first and repeated real triggers, lock-screen and network recovery behavior, revocation and cross-24-hour renewal remain separate acceptance gates. No formal release occurred, and the published Beta tag and signed attachments remain unchanged.

## 2026-10-13 to 2026-10-15 — phone evidence and Hosted Deploy

The following advances the dated 10-12 checkpoints without changing their original outcomes. It does not merge different installations into one end-to-end pass.

On 2026-10-13, one manual iPhone Charging run reached the isolated Bridge, with battery 33% and charging `false`, and the target dot later retrieved and confirmed the matching event. Intermittent phone HTTP timeouts and later automatic-trigger attempts without new events remained unresolved. A subsequent isolated token rotation invalidated the old token; the phone still needed the current raw token saved locally. Invalid-token rejection and an empty-body validation error test authentication boundaries, not a successful phone upload.

On 2026-10-15, Shortcuts successfully fetched a public HTTPS test page and the isolated Worker’s health endpoint. Mirroring text input had failed to preserve the URL scheme reliably; a correctly entered phone URL worked. The remaining phone check was to save the complete `/ingest` address and current raw token, leave the editor, and run Charging once. These network checks do not establish that a valid authenticated upload or automatic trigger passed that day. Mirroring is an editing aid, not part of daily delivery.

The same day, source commit `bfe943b6b4dfe866ad20734b66753de26e672215` on a validation branch passed [GitHub CI](https://github.com/zzaachaary/dotlink/actions/runs/38678371080): 73 unit tests, 17 runtime tests, the 87-file release check and dry-run bundling. This checkpoint includes continuing-subscription renewal protections against stale callback errors and stale grant inventories. It is not a result for subsequent source edits.

A Hosted Deploy attempt seeded by commit SHA initially failed at clone with exit 128. Using the validation branch as the source then succeeded: Cloudflare created an independent installation, completed its hosted build/deploy, and served a working `/setup` that generated credentials in the actual browser. The generated installation repository contained 86 of the 87 source-manifest files: 84 were byte-identical, while `package.json` and `wrangler.jsonc` differed only in three deployment-specific fields; the source GitHub workflow was absent. This establishes the hosted deployment path, not an exact repository mirror. Minimum variables, health `200` and later Secret configuration were confirmed, but owner OAuth, dot connection and phone delivery were not completed on this newly created instance.

The other isolated instance’s successful OAuth, subscription, synthetic events and manual phone event remain valid evidence for that separate environment. A refreshed subscription deadline alone does not prove delivery of a new event after the original deadline. Direct iPhone import, selected Notifications/Focus first and repeated triggers, permission revocation, recovery and sustained reliability remain pending. The historical tag and four signed attachments remain unchanged.

## 2026-10-16 — bounded OAuth quota checks

A local synthetic quota harness passed 47/47 checks of route minute/day limits and window recovery. The five installation-wide route budgets are documented in [protocol](protocol.md). These checks did not load-test Cloudflare, establish a free-tier capacity promise, or verify real non-owner login/revocation. Anonymous requests can still consume a route’s window; token refresh and revocation share the token route’s budget.

## 2026-10-18 — source review and focused repairs

The final local source check passed 84/84 unit tests and 18/18 runtime tests. Runtime checks cover the actual Wrangler-produced setup bundle, the production OAuth entry, real local Durable Object/SQLite migrations and subscription races. The full npm audit reported 0 vulnerabilities for the unchanged dependency lockfile. These are source/runtime results with isolated test services, not fresh cloud deployment or phone acceptance.

Focused repairs require single App-activity measurements to use the same seven-day window as batch observations, recheck expiry at storage time, and keep the rolling event-receipt quota independent of business-data cleanup. The identity helper now preserves an existing remote sealing key and stops on an unreadable Secret inventory. The OAuth provider error hook logs only a fixed category/status; the separate upstream CIMD warning limitation remains documented in [security](../SECURITY.md).

Current installation instructions were checked against the historical successful event contract and simplified to deploy, configure, subscribe, manual Charging, then locked-screen and optional modules. The four original signed artifacts were not modified by these source/document repairs. With iPhone Mirroring unavailable, no new phone run was performed. A complete manual installation and actual selected triggers remain pending; neither code review nor historical success guarantees a defect-free or stable release.

## 2026-10-19 — v0.1.0 tutorial and release preparation

The owner authorized v0.1.0 as a regular release. Step 4 now mirrors the current page’s configuration values with direct copy buttons; empty values and invalid numeric GitHub IDs cannot be copied. Generated credentials remain masked, stay in memory, and are not uploaded by the guide. The six-step sequence matches both deployment documents, and the simplified layout supports English and Simplified Chinese.

Current checks: `npm test` passed 87/87; `npm run check:release` passed the 88-file allowlist; `git diff --check` passed. The complete local runtime run passed 17/18: the remaining assertion expected a title without attributes, while the localized title now includes language attributes. After correcting that assertion to check both title translations, its complete runtime test file passed 6/6. Other runtime files were not redundantly rerun locally. The complete run included the successful actual Wrangler bundle test. `npm audit --omit=dev --json` reported zero production dependency advisories; this was not a fresh full development dependency audit. No dependencies changed.

Rendered local browser checks covered 1440×1000, 390×844 and 320×720, live configuration values, actual clipboard equality, masked credential copying, language switching without regeneration, refresh clearing, and the existing-deployment path. Browser checks use temporary local values and do not configure a Worker or validate iPhone Safari. The original five public release attachments were downloaded and their SHA-256 values matched the historical assets. v0.1.0 preserves the four signed shortcut bytes; no new phone acceptance result or reliability guarantee follows from the regular release label.
