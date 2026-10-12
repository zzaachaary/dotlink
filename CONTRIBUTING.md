# Contributing

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) · [Home](README.md)

Improvements to reliability, setup, documentation, and clearly scoped collectors are welcome. Read the [architecture](docs/architecture.md), [security policy](SECURITY.md), and [roadmap](docs/roadmap.md) first. The experimental [Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1) has known installation and device-verification follow-ups. Use [issues](https://github.com/zzaachaary/dotlink/issues) for reproducible reports and [pull requests](https://github.com/zzaachaary/dotlink/pulls) for focused changes; keep reports free of personal events and credentials.

## Local development

Use Node.js 24 and the existing npm lockfile. Installing dependencies contacts npm:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:runtime
```

Runtime tests start temporary workerd processes and loopback listeners, then release them. If a sandbox prevents binding, report the test as unrun; a skip is not a pass. Keep tests synthetic and isolated from real phones and dots.

For local Worker debugging, prepare an ignored configuration as described in [deployment](docs/deployment.md), then run `npm run dev`, listening only on `127.0.0.1`. `npm run check` bundles with Wrangler dry-run and does not deploy. `npm run deploy` changes cloud resources and must be explicitly invoked by the deployer.

## Change requirements

Keep notification bodies as data. Never promote instructions from a notification into system commands. Protocol extensions must update strict validation, storage, querying, and boundary tests together; do not accept arbitrary JSON by default. Preserve zero, false, missing fields, ordering, duplicates, and true measurement times. Receive time must not substitute for occurrence time.

Reproduce behavior changes with the smallest synthetic case, then run relevant checks. Broaden checks only when risk warrants it; do not repeatedly rebuild unchanged targets. Never put fixtures into deployment paths or weaken authentication to pass a test.

Describe the problem, resulting behavior, evidence, and unresolved limits. Report phone triggering, bridge persistence, callback ACK, and dot processing separately. Server protocol support is not proof that phone collection is enabled.

Keep English and Simplified Chinese pages in sync. Each page has a language switch and same-language navigation. Preserve dated historical evidence; add a new validation entry instead of relabeling old counts as current. Distinguish an available experimental template from a verified installation route: label each module's actual import and real-trigger evidence, including pending checks. Do not claim a public deployment before it exists.

Review the diff and publication whitelist. Include only source, tests, public documentation, and secret-free examples, retaining third-party licenses. Do not include raw debug sessions, personal cloud configuration, recordings, real events, or credential-bearing shortcuts.

## Contribution license

Original contributions submitted and accepted into this project are provided under the same [PolyForm Noncommercial License 1.0.0](LICENSE). Submit only material you have the right to license this way, retaining third-party notices and terms.

Contributors retain copyright. Contribution is not copyright assignment or an additional commercial grant. Licensing another contributor's work outside the existing grant requires that rights holder's permission.
