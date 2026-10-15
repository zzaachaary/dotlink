# Third-party dependencies and references

[English](THIRD_PARTY_NOTICES.md) | [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [Home](README.md)

Original DotLink code and documentation use the [PolyForm Noncommercial License 1.0.0](LICENSE). This does not change dependency licenses; the dependency tree must not be described as “all MIT.” This source directory does not distribute `node_modules`, runtime binaries, or copies of third-party project source.

The table reflects `package-lock.json` and installed package license metadata. It is an inventory, not a package-by-package legal review or vulnerability audit. Before redistributing dependencies or binaries, or modifying third-party code, read the complete LICENSE/NOTICE for the exact version and meet its obligations.

| Component | Locked version | Purpose | License metadata |
| --- | --- | --- | --- |
| `@cloudflare/workers-oauth-provider` | 1.2.1 | Only direct production dependency; bridge OAuth | MIT |
| `wrangler` | 4.149.0 | Development, bundling, and deployment | MIT OR Apache-2.0 |
| `miniflare` | 5.20261006.1-alpha | Transitive Wrangler development dependency; local Worker tests | MIT |
| `workerd` | 1.20261006.1 | Local Worker runtime | Apache-2.0 |
| `esbuild` | 0.28.2 | Development bundling and tests | MIT |
| `sharp` | 0.35.5 | Transitive development tool dependency | Apache-2.0 |
| Platform-specific `@img/sharp-libvips-*` | 1.3.4 | Optional platform binary dependency | LGPL-3.0-or-later |

The pinned Wrangler toolchain brings in the alpha Miniflare version; DotLink does not claim every part of the toolchain is a stable release. npm selects optional packages for the current platform. Full resolution and integrity hashes are recorded in the lockfile.

The unpublished local candidate’s full `npm audit --json --ignore-scripts --registry=https://registry.npmjs.org` on 2026-10-12 reported 0 vulnerabilities. Upgrading the locked toolchain brings sharp 0.35.5 and removes the three high audit entries present in the published Beta’s older Wrangler/Miniflare/sharp tree. The original `v0.1.0-beta.1` tag still contains its old lockfile and advisory disclosure. An audit result is time-specific and is not a comprehensive security guarantee. See the [validation record](docs/validation-record.md).

Upstream projects: [Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider), [Cloudflare workers-sdk](https://github.com/cloudflare/workers-sdk), [workerd](https://github.com/cloudflare/workerd), [esbuild](https://github.com/evanw/esbuild), [sharp](https://github.com/lovell/sharp), and [libvips](https://github.com/libvips/libvips).

Documentation references public Apple, OpenAI, and Cloudflare technical material to explain interfaces and constraints. It does not reproduce their icons, product screenshots, trademark artwork, or entire articles. Platform names describe compatibility targets and imply no certification or affiliation. The original [NOTICE](NOTICE) remains unchanged by the DotLink name.
