# FAQ: identity, networks, renewal, and delivery

[English](faq.md) | [简体中文](zh-CN/faq.md) · [Home](../README.md)

The original FAQ was compiled on 2026-10-02; browser-first candidate notes were added on 2026-10-08 and experimental Beta status on 2026-10-12. Current installation instructions target the regular `v0.1.0` release. Implementation facts come from this repository. Platform rules may change. Local tests are not live-service reliability evidence.

## Why does an iPhone event appear in my personal dot?

The phone is not pasting text into a chat window. Shortcuts converts selected system input to JSON and uploads it with a device token. The bridge saves it and sends a signed webhook under the dot's subscription. ChatGPT receives and processes the event asynchronously for that subscribed assistant.

A provided message body can be part of the event. No notification, no supplied body, or an unconfigured source means no such content can be forwarded. SMS requires a Message or applicable notification trigger and separate acceptance; other apps' success does not establish complete SMS support. See [architecture](architecture.md).

## What is GitHub verification for?

GitHub authorization is OAuth identity verification:

1. The user signs in; the bridge obtains public user identity.
2. The bridge compares the numeric ID to the one configured owner.
3. On a match, its own OAuth flow grants the consumer access to read and subscribe to phone events.

The code requests no repository permissions, sends no notification bodies to GitHub, puts no GitHub token on the phone, and does not persist the upstream token. Device upload, bridge OAuth, and webhook signing use distinct credentials. See [security](../SECURITY.md) and [GitHub OAuth documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

The source repository shares code; GitHub OAuth proves identity. They serve different purposes. A GitHub Actions green check, when a workflow runs, proves only the checks it executed, not live phone forwarding. An alternative identity provider would still need owner binding and least privilege; removing authentication is not a setup simplification.

## Do I need a domain, Mac, or terminal?

A domain purchase is unnecessary: start with your Worker's `workers.dev` address. The browser setup uses official Cloudflare deployment, your own `/setup`, dashboard values, your GitHub OAuth App, dot connection, and the Notifications shortcut. The main flow does not require local Node.js or a terminal. Advanced development and recovery retain the CLI path in [deployment](deployment.md).

Daily forwarding does not require a Mac or iPhone Mirroring. The mirror can help author or inspect shortcuts; it does not provide the deployed collection mechanism. The current installation path offers only Notifications. Charging, Focus On and Focus Off are **Coming soon** and are not part of current setup or acceptance. The historical v0.1.0 release retained four signed files from the original Beta; that release record does not establish current support for every module. The previously observed import route used a Mac followed by same-account iCloud sync. Direct iPhone import and independent-account reproduction still require separate acceptance. Follow the [installation guide](iphone-shortcuts.md) for the Notifications template and its real trigger; it contains its own HTTP upload actions, so the old helper shortcuts are unnecessary. Dated results and their limits remain in the [validation record](validation-record.md).

## Can the phone send from mainland China without a VPN?

The two-hop design makes phone-to-bridge upload possible in principle, but the current evidence does not establish reliable operation on actual mainland networks:

```text
Phone → your bridge HTTPS endpoint
Bridge → ChatGPT event receiver
```

The first hop does not require the phone to call ChatGPT directly. Upload still depends on DNS, connectivity, and the bridge's reachability. Cloudflare, a custom domain, or an overseas server does not itself guarantee that. Initial login and authorization have separate network dependencies.

Network reachability also differs from platform service availability. The original 2026-10-02 record noted mainland China was not on ChatGPT's supported-country list; consult the [current official list](https://help.openai.com/en/articles/7947663-chatgpt-supported-countries) for current rules. DotLink does not change platform availability or terms.

Test a harmless real trigger on your own Wi-Fi and cellular network with proxy/VPN disabled, checking phone execution, persistence, callback ACK, and dot response separately. `/health`, desktop connectivity, or `202` alone is insufficient. One successful network test does not establish ongoing reliability everywhere.

## Once configured, will it forward forever?

The design is event-triggered and does not require manually forwarding each event every day. Continued operation depends on:

- A real source event, working phone automation, permission, and source selection.
- Phone access to the bridge, valid device credentials, and enabled ingestion.
- Working cloud resources and HTTPS, sufficient capacity and platform quotas.
- Valid dot authorization, timely subscription renewal, and receiver/assistant processing.

Historical successes do not establish indefinite unattended operation. Cross-day renewal, weak networks, system updates, reboot recovery, and bursts still need broader acceptance. A server retry cannot recover an event the offline phone never uploaded.

Normal use does not require daily redeployment. Complete a real test spanning at least one 24-hour lease, then small regressions after system/automation/account/origin changes. Use [troubleshooting](verification.md) to inspect recent events, expiry, and delivery state. These instructions do not install an extra scheduled monitor or renewal task.

## Does subscription renewal mean payment?

Here a subscription is a time-limited registration telling the bridge which devices and event kinds should notify the dot. It is not a membership purchase.

The implementation grants 24 hours by default and at most 24 hours, returning `refreshBefore`. The receiving client should call `events/subscribe` before that deadline to extend the same registration. This is a code lifecycle choice, not an iPhone daily restriction or ChatGPT membership expiry. The [MCP Events lifecycle](https://developers.openai.com/plugins/build/mcp-events) describes renewal; the actual connection still needs real cross-day acceptance.

If a lease expires while ingestion and the device remain enabled, uploads may still be stored but are no longer delivered under the expired subscription. Later renewal does not replay the gap; retained data can be queried. Longer leases or replay need deliberate implementation and revocation tests, not a promise of permanent subscriptions.

Cloud platform and ChatGPT costs are separate. DotLink does not promise a completely free service.

## Is this the simplest option, or is there an all-in-one alternative?

The first version partially verified one route to automatic iPhone context in the original personal dot; it does not establish a universally simplest solution.

| Route | Work it can reduce | Work that remains |
| --- | --- | --- |
| Self-hosted DotLink | Existing bridge source/protocol; no native collector app needed | Own resources, identity, phone permissions, configuration, and maintenance |
| Clean templates and setup guide | Less manual dictionary wiring and repeated parameters | Source selection, system consent, dot eligibility, and real lifecycle tests |
| Swift companion app with App Intents | Centralized credentials, sending, queue, diagnostics | System triggers, development/distribution, background lifecycle constraints |
| n8n, Make, or custom webhook workflow | HTTP receipt, storage, some orchestration | No extra iPhone notification permission; original dot still needs a compatible receiving path |
| Custom API assistant | Control over assistant logic and storage | Separate authentication, state, and event handling; not the original personal dot |

The last two are architecture options, not integrated or verified replacements. [n8n Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) and [Make Webhooks](https://help.make.com/webhooks) describe HTTP intake, not proof of personal-dot compatibility. Hosting there would add another processor of notification bodies. Calling a model API for a response does not automatically enter the original dot's context.

DotLink currently guides users through Notifications only. Next steps are independent notification installation and real-trigger checks, followed by pairing, status, and recovery improvements. Charging, Focus On and Focus Off remain Coming soon until separately verified for release. See [roadmap](roadmap.md).

## May I use the source for a commercial product, hosting, or paid service?

Original code and documentation use [PolyForm Noncommercial 1.0.0](../LICENSE), a source-available noncommercial license. Uses outside that grant require separate permission from the relevant rights holders. The original text governs; payment alone is not a complete test, and this page does not categorically prohibit every form of paid teaching, consulting, or distribution.

A rights holder can separately license material they own. Such permission does not automatically cover other contributors, dependencies, platform accounts, or services.

Once all required permissions and platform conditions are met, a delivery agreement should specify account-owned deployment, shortcut setup, selected-source acceptance, documentation, and maintenance. Customers should own their cloud resources and credentials, with pause, revocation, and migration instructions. Never share the seller's device token, GitHub identity, or dot, or route customer messages into a seller's private service.

The single-owner implementation is not a multi-customer hosting backend. Hosting requires tenant isolation, privacy notices, deletion, access control, quotas, and incident processes, plus any applicable obligations.

This record does not verify marketplace categories or listing approval, including Xianyu. Do not advertise all-phone/all-notification coverage, guaranteed mainland delivery, permanent connectivity, official ChatGPT service, or a completed one-click installer.
