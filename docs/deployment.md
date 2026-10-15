# Deploy your own DotLink

[English](deployment.md) | [简体中文](zh-CN/deployment.md) · [Home](../README.md)

DotLink is a single-owner self-hosted bridge under [PolyForm Noncommercial 1.0.0](../LICENSE). It is not a hosted service, and not every ChatGPT account has dot or custom MCP Events access. First confirm the target dot can connect to a custom MCP service and subscribe to events; a client supporting only tool calls cannot automatically receive them.

**Release status:** experimental [Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1), with source at [zzaachaary/dotlink](https://github.com/zzaachaary/dotlink). Four signed, sanitized templates cover three optional phone modules. All four passed Mac re-import; the new Charging copy has a real-phone → Bridge → dot result. Direct iPhone and independent-account import, the new notification/Focus copies' real triggers, and a fresh-account Deploy to Cloudflare run remain disclosed follow-ups. This guide is not a claim that the entire new-user path has been independently reproduced.

Use your own accounts and credentials. Deploying creates or changes Cloudflare resources and can incur platform charges. A `workers.dev` address is sufficient; buying a domain is optional. No address choice guarantees mainland-China connectivity or changes ChatGPT's platform availability.

## Main path: browser setup

### 1. Deploy the candidate without credentials

**Local candidate, not published (2026-10-12).** This revised flow is for the reviewed local candidate. The [public Deploy button](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzzaachaary%2Fdotlink) still uses the published Beta, whose form requires Secrets before `/setup` exists. Do not enter dummy credentials or use someone else's values to get past that form. The old Beta tag remains unchanged.

For an explicitly authorized isolated cloud test before publication, deploy the local candidate through the CLI path below. Use a separate Worker, OAuth KV and Durable Object namespace in your own account; confirm the selected account and resource names. Do not point this test at an existing personal service. A future public Deploy button must be tested against the exact reviewed candidate after it is available in the selected repository.

First deploy without variables or Secrets. The candidate’s `.dev.vars.example` contains comments only, so it does not declare first-deployment secret values. Supply credentials in step 4 after `/setup` is available. An isolated real Cloudflare CLI deployment and the deployed setup’s credential-generation flow passed on 2026-10-12 after a bundling defect was fixed. The official hosted Deploy button has not been tested against this unpublished candidate; CLI success does not verify its form.

The checked-in `wrangler.jsonc` contains deployment structure, `OAUTH_KV`, the `BRIDGE` SQLite Durable Object, and its initial migration. It has no private account IDs, tokens, or environment values. With required configuration absent, only `/setup` and its static assets are available; `/health`, OAuth, MCP and ingestion return `503`. This is the expected bootstrap state, not a signal to disable configuration checks. Do not alter migrations to clear data.

After deployment, open the HTTPS `workers.dev` URL shown by Cloudflare and append `/setup`. The [Cloudflare workers.dev guide](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) explains the account-specific address. If a custom domain is desired, bind it to this Worker and use one consistent origin throughout; see [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

### 2. Open the bilingual guide and confirm a fresh installation

Select English or 简体中文 at `/setup`. Use credential generation only for a genuinely new deployment with no existing registry or sealing key. The page cannot prove your deployment is unused; check your Cloudflare dashboard yourself. For an existing deployment, keep its values and use the recovery information rather than generating replacements.

The guide uses Web Crypto locally in an HTTPS browser to generate a device token, its SHA-256 registry entry for `iphone-primary`, and `BRIDGE_SEAL_KEY`. These are not configured on the server by clicking Generate. Privately back up the generated values before refreshing or leaving; they are session values, not an account recovery service.

The page does not request or receive a Cloudflare API token or GitHub Client Secret. You enter server configuration directly into Cloudflare. Never paste secrets into chat, issues, screenshots, public URLs, or source files.

### 3. Create your GitHub OAuth App

Create an **OAuth App**, not a GitHub App, in your own account following [GitHub's guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app):

| OAuth App field | Value |
| --- | --- |
| Application name | Your chosen name, for example `My DotLink` |
| Homepage URL | Your Worker's HTTPS origin |
| Authorization callback URL | The same origin plus `/callback` |

Find your numeric GitHub user ID, not your login name. The public official endpoint `https://api.github.com/users/YOUR_LOGIN` includes your `id` and requires no access token. The bridge allows that single configured owner, requests no repository access, and does not persist the upstream GitHub token.

### 4. Apply variables and Secrets in Cloudflare

In your Worker's active environment, manually configure these **plain-text variables**:

| Variable | Value |
| --- | --- |
| `PUBLIC_ORIGIN` | Your exact HTTPS origin; no path, query, or trailing slash |
| `OWNER_GITHUB_ID` | Your numeric GitHub ID as a string |
| `ENABLE_INGEST` | String `false` until the final acceptance step |

Then configure these **Secrets**:

| Secret | Source and destination |
| --- | --- |
| `GITHUB_CLIENT_ID` | Your OAuth App Client ID, entered directly into Cloudflare |
| `GITHUB_CLIENT_SECRET` | Your OAuth App Client Secret, entered directly into Cloudflare |
| `BRIDGE_SEAL_KEY` | The fresh sealing key generated locally by `/setup` |
| `DEVICE_REGISTRY` | The complete fresh JSON registry generated locally by `/setup`; contains the token digest, not raw token |

Keep the raw device token private for the phone uploader. It cannot read bridge data. The sealing key and GitHub credentials never belong in a phone shortcut. [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) documents server-side secret configuration.

Apply the dashboard’s configuration changes and check `/health`: it must return `200` with ingestion disabled. Health becomes available when the minimum origin/owner variables are valid; `200` does not verify that all four Secrets exist or are correct. A configuration-related `503` requires checking those minimum variables. Verify the Secret names in the active environment without exposing their values, then test real owner OAuth, device authentication and signed delivery separately. Health contains no device or notification bodies.

**Redeployment policy:** the public configuration uses `keep_vars:true` and deliberately omits `vars`, keeping these values dashboard-managed. Do not add example/default `vars` into that public deployment config: explicitly configured values could overwrite dashboard settings on a later deployment. Secrets and any existing `DEVICE_REGISTRY`/`BRIDGE_SEAL_KEY` must be preserved. Follow the [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/) for the installed toolchain.

### 5. Connect your dot and subscribe

In an eligible ChatGPT/Codex client, create a custom MCP connection to your origin plus `/mcp`, using OAuth. Complete bridge consent and GitHub sign-in as the configured owner. Account availability and UI can change; consult [OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events) and the current client. This project has no shared public plugin ID or preconfigured personal connection.

During isolated cloud validation, all four deployment-specific Secrets were configured and the owner’s real OAuth login completed after a consent-page fix. The initial Chrome consent failure was traced in Worker logs to `Referrer-Policy: no-referrer` producing `Origin: null`, which the Worker correctly rejected. The consent page now uses `same-origin`; `null` and cross-site origins remain rejected. Actual Chrome consent then redirected to the separate GitHub OAuth App, completed the callback, and the ChatGPT plugin showed a connected account using OAuth at the new Worker’s `/mcp`. The following checkpoint also verified direct `phone_devices` and `phone_bridge_status` calls and one active subscription. Ingestion was then enabled in the isolated service, and five new synthetic events plus one idempotent retry were accepted with five receiver acknowledgements recorded. Actual phone triggers and target-dot processing remain separate pending evidence; see the [dated validation record](validation-record.md).

The service supports Dynamic Client Registration and CIMD. If metadata discovery fails, inspect the actual compatibility error; do not disable authentication. The local candidate applies [OAuth input and per-installation route budgets](protocol.md); for `429`, wait for `Retry-After` rather than repeatedly reconnecting. The token and authorization-continuation routes use separate budgets, but anonymous requests can still exhaust their own route’s window. Successful OAuth only proves the identity connection.

In the **target personal dot**, request `phone_devices` to confirm `iphone-primary`, subscribe to `phone.event` filtered to that device and the kinds you choose, and read `phone_bridge_status` to confirm expiry. Use `notification`, `device_status` for charging, and `focus`. The receiver supplies callback and signing Secret; do not paste those into a chat or repository.

Leases default to and cannot exceed 24 hours. The client must renew; the code does not guarantee perpetual client renewal or replay subscription gaps. Real events after the original expiry point are required to verify long-term renewal.

### 6. Select phone modules and enable upload last

Choose any subset of notifications, charging, and Focus. Download the four optional files from [Beta release assets](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1) and follow the [template import guide](iphone-shortcuts.md); Focus uses both On and Off. Each file contains its own upload action, so no legacy helper shortcut is required. Enter only your endpoint, `iphone-primary`, and raw device upload token on your own phone; the Focus templates also ask for the chosen mode name. Add and check system triggers on the iPhone, keeping each automation off during setup. Explicitly exclude ChatGPT, Codex and Shortcuts from notification sources to reduce reply loops; general rate limits do not replace this exclusion. The guide retains a separate advanced manual path.

Confirm the Worker, owner, subscription, phone input bindings, and selected source scope. Then change dashboard `ENABLE_INGEST` to string `true`, apply it, and check `/health`. A switch-only change does not require reinstalling dependencies or repeating all unchanged tests.

First send harmless synthetic content, then test actual selected notification, lock-screen charging, and Focus triggers. Record phone execution, bridge `accepted:true`, callback ACK, and matching target-dot processing separately. Only the last checkpoint proves that particular event was handled by the dot. Keep private bodies and credentials out of evidence.

## Advanced: local CLI deployment and recovery

This path retains the first implementation's manual tools for developers and recovery. Commands run in your own repository checkout. Cloudflare login, KV creation, deployment, and Secret uploads contact and modify your own cloud account. Do not run them against somebody else's Worker.

### Prepare an ignored local configuration

Use Node.js 24, npm, and the existing lockfile (`@cloudflare/workers-oauth-provider` 1.2.1, Wrangler 4.149.0). No global Wrangler installation is needed:

```sh
node --version
npm ci --ignore-scripts --no-audit --no-fund
cp -n wrangler.example.jsonc wrangler.local.jsonc
export DOTLINK_CONFIG=wrangler.local.jsonc
```

`cp -n` preserves an existing local file. `wrangler.local.jsonc`, `work/`, `.env*`, and `.dev.vars*` must stay ignored. The public `wrangler.jsonc` is a secret-free deployment file; do not edit it to hold personal account values. In the ignored local copy, select your separate Worker `name` and `account_id`; keep `keep_vars:true` and leave environment variables dashboard-managed.

Use `node scripts/wrangler.mjs …` for CLI operations. It applies `DOTLINK_CONFIG` to the commands also invoked by registration/identity helpers, keeps routine CLI state and redacted logs under `work/`, and disables telemetry. It inherits your process environment for actual deployment; confirm no unintended account credentials are selected. Local directory separation does not isolate cloud permissions.

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs whoami
```

Complete the browser authorization and verify the target account. This uses standard [Wrangler account commands](https://developers.cloudflare.com/workers/wrangler/commands/general/), without changing Keychain or global tools. Confirm your actual origin; later `https://bridge.example.com` values are placeholders.

### Create resources and deploy with ingestion closed

For a fresh manual deployment that has no OAuth KV, create one:

```sh
node scripts/wrangler.mjs kv namespace create OAUTH_KV --update-config=false
```

Put the returned ID into the `OAUTH_KV` binding in **ignored** `wrangler.local.jsonc`, preserving other bindings. For an existing deployment, reuse its intended KV after checking the account; do not create a replacement to bypass a problem. See [Wrangler KV commands](https://developers.cloudflare.com/kv/reference/kv-commands/).

Keep Durable Object `BRIDGE`, class `PhoneBridge`, and SQLite migration `v1`. Review local configuration before cloud writes. Run the necessary checks once for changed code:

```sh
npm test
npm run test:runtime
npm run check
npm run deploy
# Before configuration: expect /setup 200 and /health 503.
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://bridge.example.com/setup
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://bridge.example.com/health
```

The first three are synthetic checks/bundling; the deploy command is the actual remote change. Runtime tests use local workerd and isolated callbacks; `check` is a dry run, not evidence of cloud authorization. After this first deploy, complete browser steps 2–4. Configure the dashboard variables and Secrets with `ENABLE_INGEST=false`; only then require `/health` to return `200`. A new deployment with no variables remains closed.

### Optional initial identity helper

Use the browser/dashboard path above by preference. The legacy helper uploads three Secrets from private local files and is appropriate only for a fresh deployment or recovery with the **correct original local sealing key**. It does not check whether a newly generated local key would replace an existing remote key. Never run it on an existing service without that confirmation.

```sh
mkdir -p work/private
chmod 700 work/private
cp -n examples/github-oauth.example.json work/private/github-oauth.json
chmod 600 work/private/github-oauth.json
```

Fill Client ID and Client Secret in that file using a local editor; never print it. Then, with `DOTLINK_CONFIG` still set:

```sh
node scripts/configure-identity.mjs
```

The helper creates or reuses `work/private/bridge-seal-key` and sends `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `BRIDGE_SEAL_KEY` through stdin. It does not enable ingestion. Back up private files securely; rotating the sealing key requires a separate migration plan.

### Optional first-device helper

Before a first dot subscription, and only if no registry exists:

```sh
BRIDGE_INGEST_URL='https://bridge.example.com/ingest' node scripts/register-iphone.mjs
```

Replace the URL; keep `DOTLINK_CONFIG` set. The URL must be HTTPS with exact `/ingest`, without userinfo, query, fragment, or whitespace. Validation happens before remote lookup or credential creation. Tokens never appear in command arguments.

The helper reads remote Secret names and refuses any existing `DEVICE_REGISTRY`, regardless of its contents. It creates `work/private/iphone-device.json` with mode `0600`, or validates/reuses the existing file and exact endpoint. It registers only a SHA-256 token digest and does not enable ingestion. Ambiguous prior outcomes require inspecting Secret names and file existence, not deleting the registry or token to retry. This is not a device-management console.

Finish dot and phone setup using the main path. Keep variables in the dashboard and do not mix fresh browser-generated credentials with an existing CLI-created registry.

## Updating an existing deployment

Validate the candidate on isolated resources before replacing existing service code. Keep the original Worker, `BRIDGE` namespace, OAuth KV, owner, registry and sealing key when upgrading that service. Do not generate fresh setup credentials, clear storage or change the original `v1` namespace migration to apply this patch.

The local candidate adds subscription-generation columns and backfills them transactionally on existing SQLite databases. Events are retained and pending jobs are associated with the existing subscription lifecycle. The OAuth admission budget uses a separate named object in the same binding; it does not copy phone data. Before a live upgrade, verify a supported cloud backup/recovery procedure and exercise upgrade, restart, pending delivery, renewal and cancellation against representative synthetic state. Do not assume that local migration tests prove cloud rollback is safe.

## Operation, pause, and origin changes

- Business events expire seven days after occurrence; platform backups and dot memories/conversations have separate retention.
- There is no phone outbox. Server retries cannot recover events never uploaded.
- Same device/ID/content deduplicates; changed content conflicts. Preserve the original ID on retry.
- Webhook retries are bounded. Neither upload `202` nor callback `2xx` alone proves dot processing.
- Verify no-VPN reachability on the actual phone/network. A custom domain or `/health` success is insufficient.

Pause phone automations first. Set dashboard `ENABLE_INGEST=false` and apply it to stop server receipt and further delivery. This does not delete retained data or recall delivered copies. Before resuming, recheck subscription expiry and device permissions.

Prefer one origin for `/mcp`, `/authorize`, `/callback`, `/oauth/*`, and `/ingest`, with no `AUTH_ORIGIN` override. Advanced use may bind another domain to the **same Worker** for phone `/ingest` while leaving canonical MCP and callback unchanged. Register the final upload endpoint; the helper refuses to overwrite a mismatched existing local endpoint.

`AUTH_ORIGIN` is a separate authorization origin, not the phone upload domain. Changing it alters OAuth discovery and GitHub callback, potentially requiring rediscovery/reconnection. Do not casually switch domains or disable origin validation to repair authorization.
