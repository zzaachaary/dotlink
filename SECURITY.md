# Security and privacy

[English](SECURITY.md) | [简体中文](SECURITY.zh-CN.md) · [Home](README.md)

## Trust boundaries

DotLink accepts data from devices authorized by their owner. This release is a single-owner deployment with no tenant isolation. Registering several customers in one private bridge does not create separate accounts.

| Boundary | Protection | Limit |
| --- | --- | --- |
| Phone → bridge | HTTPS, random per-device upload token, server-side SHA-256 digest, matching device ID | Anyone holding the token can impersonate that device. Never share personalized shortcuts. |
| dot → bridge | GitHub owner identity, OAuth scopes, and resource checks | Authorization covers the owner's data space, not a separate grant per data kind. |
| Bridge → dot | Restricted HTTPS callback domains, challenge verification, HMAC signatures, no redirect following | Delivered copies cannot be recalled by the bridge. |
| Persistent storage | Capacity limits, expiry cleanup, encrypted subscription signing keys | Event bodies are JSON accessible to the service operator. |
| Notification → AI | Tool descriptions mark content as untrusted data | The receiver still needs permission controls. Instructions in notifications are not execution authorization. |

HTTPS and signatures do not provide end-to-end encryption that hides bodies from the server operator. Automatic filtering of verification codes or sensitive content is not implemented. Start with a few sources and harmless test content; the owner must decide whether bodies are uploaded.

## Browser setup

The bilingual `/setup` guide is for a fresh deployment. Device tokens and `BRIDGE_SEAL_KEY` are generated locally with browser Web Crypto. The user transfers configuration to the Cloudflare dashboard; the page must never request or receive a Cloudflare API token or GitHub Client Secret. It is not an authenticated administration or key-rotation console.

Do not replace an existing `DEVICE_REGISTRY` or `BRIDGE_SEAL_KEY` with fresh setup output. The registry may contain other devices, and changing the sealing key prevents decryption of existing subscription keys. The guide does not prove that a deployment is unused. Confirm that fact in your own dashboard before applying values. Protect generated credentials from screen capture, clipboard sharing, shortcut exports, and public reports.

## Data destinations and retention

Phone data enters the deployer's Cloudflare service, then ChatGPT through an authorized subscription. GitHub handles identity only and does not receive phone event bodies. The code does not persist the upstream GitHub access token.

Business events expire seven days after occurrence. Reads exclude expired records and cleanup removes them from the business database. Cloudflare backup/PITR and ChatGPT conversations or memories have separate retention policies; DotLink does not promise deletion of those copies. There is no reliable phone offline queue.

Health, location, and app-activity fields do not establish consent or prove collection is enabled. Before enabling such collection, separately explain source, purpose, scope, and revocation. Commercial hosting outside the [PolyForm Noncommercial 1.0.0](LICENSE) grant requires permission; software licensing does not replace privacy, cross-border, platform, or operating obligations.

## Configuration

- Exclude ChatGPT/Codex and Shortcuts notifications to avoid forwarding replies back into the bridge. Complete loop prevention is not implemented.
- Use your own Cloudflare, GitHub, and ChatGPT accounts. Complete system permissions and identity checks yourself.
- Give the phone only its `/ingest` upload credential, never a GitHub Client Secret or Cloudflare management token.
- Keep owner, scope, PKCE, and callback checks. Do not enable test entry points, arbitrary callbacks, or disabled TLS checks to fix connection errors.
- Log fixed error categories and necessary metadata, not Authorization headers, callback keys, entire requests, or notification bodies.
- For CLI recovery, use `scripts/wrangler.mjs`; it keeps configuration and logs under ignored `work/` paths. Browser setup uses the Cloudflare dashboard directly.
- Dashboard-managed variables must survive redeployment. Follow the deployment guide's `keep_vars` policy instead of adding stale values to the deployment configuration.

## Pause and revoke

Disable phone automations to stop future collection. Set `ENABLE_INGEST=false` in the deployment's active configuration to stop receiving and sending new events. For the dashboard-managed flow, apply the change in Cloudflare; for the CLI flow, deploy the edited local configuration. This does not recall delivered data.

A registry entry with `enabled:false` revokes that device's uploads and unfinished deliveries. The initial registration script refuses to replace an existing remote registry. Carefully preserve other devices when editing an existing registry; do not delete the whole registry to revoke one phone.

Disconnect the bridge in ChatGPT and verify subscriptions stop. Delivery rechecks the bridge's OAuth grant; storage consistency may delay propagation. Revoking upstream GitHub authorization alone is not an immediate stop switch for an existing bridge grant.

`BRIDGE_SEAL_KEY` decrypts existing subscription signing keys. Rotation requires a migration plan. This release has no one-click key rotation, deletion of all platform backups, or recall of dot memory.

## Publication and reporting

Never publish real device tokens, GitHub Client Secrets, OAuth code/state, Cloudflare credentials, signing keys, actual local configuration, personal resource IDs or domains, contacts, event bodies, or private screenshots.

Repeated-character tokens, test signing keys, and `example.com` addresses in tests are isolated fixtures. `test/runtime/fixture.mjs` includes a test authorization shortcut and must remain local to integration tests. Deploy `src/worker.mjs`.

For ordinary issues, provide a minimal reproduction, fixed error code, and manually redacted configuration. Do not put exploit details or credentials in public issues. Prefer GitHub private vulnerability reporting once enabled in the public repository; until then, request a private contact without disclosing sensitive material publicly.

Local secret checks and tests are not a comprehensive security audit. No independent full security audit or production SLA is claimed.
