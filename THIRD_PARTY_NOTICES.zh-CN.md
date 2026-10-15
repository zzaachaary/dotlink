# 第三方依赖与资料

[English](THIRD_PARTY_NOTICES.md) | [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [首页](README.zh-CN.md)

项目原创代码与文档采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。该许可不改变依赖的许可，不能把整个依赖树描述成“全部 MIT”。本源码目录不分发 `node_modules`、运行时二进制或第三方项目源码副本。

以下根据当前 `package-lock.json` 及已安装包的 `package.json` 许可证元数据整理。它是依赖清单，不是逐包法律审查或漏洞审计；重新分发依赖、打包二进制或修改第三方代码时，应阅读对应版本的完整 LICENSE／NOTICE 并履行义务。

| 组件 | 锁定版本 | 用途 | 元数据中的许可证 |
| --- | --- | --- | --- |
| `@cloudflare/workers-oauth-provider` | 1.2.1 | 唯一直接生产依赖，Bridge OAuth | MIT |
| `wrangler` | 4.149.0 | 开发、打包与部署 | MIT OR Apache-2.0 |
| `miniflare` | 5.20261006.1-alpha | Wrangler 的传递开发依赖，本地 Worker 测试 | MIT |
| `workerd` | 1.20261006.1 | 本地 Worker 运行时 | Apache-2.0 |
| `esbuild` | 0.28.2 | 开发打包与测试 | MIT |
| `sharp` | 0.35.5 | 工具链传递开发依赖 | Apache-2.0 |
| 平台对应的 `@img/sharp-libvips-*` | 1.3.4 | 可选平台二进制依赖 | LGPL-3.0-or-later |

`miniflare` 的 alpha 版本由固定 Wrangler 工具链带入；本项目没有据此承诺工具链所有部分均为稳定发行。平台可选包由 npm 根据实际平台决定安装，完整解析与完整性摘要以锁文件为准。

2026-10-12，尚未发布的本地候选执行全量 `npm audit --json --ignore-scripts --registry=https://registry.npmjs.org`，报告 0 项漏洞。锁定工具链升级后使用 sharp 0.35.5，已发布 Beta 的旧 Wrangler／Miniflare／sharp 依赖树中三项 high 审计条目在本候选中不再出现。原 `v0.1.0-beta.1` 标签仍包含旧锁文件及当时披露；审计结果只对应此次检查，不是全面安全保证。详见[验证记录](docs/zh-CN/validation-record.md)。

主要第三方项目：[Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)、[Cloudflare workers-sdk](https://github.com/cloudflare/workers-sdk)、[workerd](https://github.com/cloudflare/workerd)、[esbuild](https://github.com/evanw/esbuild)、[sharp](https://github.com/lovell/sharp)、[libvips](https://github.com/libvips/libvips)。

文档引用 Apple、OpenAI 和 Cloudflare 的公开技术资料，用于说明接口及约束；没有复制其图标、产品截图、商标素材或整篇文章。项目名称中的平台称谓只用于说明兼容目标，不表示官方认证或关联。

DotLink 名称不改变原 [NOTICE](NOTICE) 中的必要版权声明。
