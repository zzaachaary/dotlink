# DotLink

[English](README.md) | [简体中文](README.zh-CN.md)

通过 iPhone 系统快捷指令和自己部署的 Cloudflare Bridge，将选定 App 的新通知交给自己的 ChatGPT dot。

**DotLink v0.1.0：Notifications 通知。** 当前安装流程只提供 Notifications。Charging、Focus On 和 Focus Off 均为**即将推出**；旧 Release 附件作为历史产物保留，不属于当前支持的安装选项。用户于 2026-10-20 反馈通知设置成功；这不代表所有 App 或长期可靠性均已验收。详见[验证记录](docs/zh-CN/validation-record.md)。本项目以源码公开方式采用 PolyForm Noncommercial 1.0.0 非商业许可，需要自己的账号和手工手机配置。

DotLink 面向一个所有者及其登记设备。历史手机测试使用 iOS 27，只覆盖选定来源。项目与 Apple、Cloudflare、GitHub、OpenAI 没有官方隶属或背书关系。

## 下载模板

| 模块 | 状态 |
| --- | --- |
| Notifications 通知 | [下载 DotLink-Notifications.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut) |
| Charging 充电 | 即将推出 |
| Focus On / Focus Off | 即将推出 |

[SHA-256 校验文件](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/SHA256SUMS) · [通知导入说明](docs/zh-CN/iphone-shortcuts.md)。校验文件仍包含历史附件，不代表这些附件属于当前安装选项。填写自己的地址／令牌并绑定一个允许的通知来源后，再开启 Automation。

## 能力与边界

| 能力 | 当前证据与限制 |
| --- | --- |
| 选定 App 通知 | 历史测试中，部分微信、抖音、电话和邮件通知进入了原个人 dot；只传 iOS 实际提供的字段。 |
| Charging 充电 | 即将推出；历史测试不代表当前支持。 |
| Focus On / Focus Off | 即将推出；历史测试不代表当前支持。 |
| 查询与推送 | OAuth 保护的 MCP 工具、事件订阅、签名回调及云端有限重试。 |
| 离线与恢复 | 没有手机持久 outbox，上传失败可能漏事件；不支持游标重放；真实跨日续期仍待验证。 |
| 覆盖范围 | 不保证全部 App、未来新 App 自动加入、历史聊天读取，或完整 SMS／iMessage／附件采集。 |

历史真机结果截至 2026-10-01，整理于 2026-10-02，不是当前源码及四份模板的完整复测结果。详见[验证说明](docs/zh-CN/verification.md)和[验证记录](docs/zh-CN/validation-record.md)。

## 用自己的账号安装

需要实际提供所需 Notification 快捷指令触发器的 iPhone、自己的 Cloudflare 和 GitHub 账号，以及可以连接自定义 MCP 服务并订阅 MCP Events 的 ChatGPT dot 账号。普通模型 API 或只能调用 MCP 工具的客户端不等同于这项能力。

按下面的顺序完成一次安装；每步成功后再继续，出错只检查当前步骤：

1. 从 [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzzaachaary%2Fdotlink) 在自己的 Cloudflare 账号创建独立 Worker，首次不填写变量和 Secrets。
2. 打开新 Worker 的 `/setup`，选择语言，创建自己的 GitHub OAuth App，生成并私密保存设备凭据和封装密钥。
3. 按[部署指南](docs/zh-CN/deployment.md)填写 **3 个变量和 4 个 Secrets**；保持 `ENABLE_INGEST=false`，确认 `/health` 返回 `200`。
4. 只导入 **DotLink-Notifications**。保存完整 HTTPS `/ingest` 地址和不含 `Bearer`、首尾空白的原始设备 token。保持 Automation 关闭，选择一个允许来源并绑定 App/Title/Body；排除 ChatGPT、Codex 和快捷指令。
5. 将目标 dot 通过 OAuth 连接到 `/mcp`，把[第六步提示词](docs/zh-CN/deployment.md#6-连接-dot验证通知送达)复制到接收聊天，建立仅包含 `iphone-primary` 和 `notification` 的 `phone.event` 订阅。
6. 确认订阅后，开启服务上传及已配置的通知自动化。从选定来源产生无私人内容的新通知，核对最多三条不同新事件的回执；三条测试回复结束后保留持续订阅。

同一首版源码来源的 Cloudflare Hosted Deploy、全新资源创建和 `/setup` 生成流程已于 2026-10-15 通过；那次新安装的 owner OAuth、dot 连接和手机触发尚未全部完成。另一个隔离实例已有真实 OAuth、订阅、合成事件和一次手机手动 Charging 成功记录；这些证据不能合并成一次完整新安装成功。

默认使用 `workers.dev` 地址，无需购买域名。该地址和自定义域名都不保证大陆网络可达，也不改变平台服务范围。Cloudflare 和 ChatGPT 使用可能产生费用；不承诺永久免费或可用性 SLA。

浏览器流程及保留的 CLI 恢复路径见[部署指南](docs/zh-CN/deployment.md)。`/setup` **仅用于全新部署**，不要用新生成的值覆盖既有 `BRIDGE_SEAL_KEY` 或 `DEVICE_REGISTRY`。

## 工作原理

```mermaid
flowchart LR
    A[选定 App 的新通知] --> C[iPhone 快捷指令]
    C -->|HTTPS + 设备上传令牌| D[Cloudflare Worker]
    D --> E[SQLite Durable Object<br/>事件与待投递队列]
    E -->|MCP Events 签名回调| F[个人 dot]
    F -->|OAuth 查询与订阅| D
```

手机负责采集本人选择的事件；Bridge 负责鉴权、校验、持久化和投递。GitHub 在连接阶段确认所有者身份，不运输通知正文。日常上传不依赖 Mac 或 iPhone 镜像常开。

上传 `202` 证明 Bridge 持久化接收；回调 `2xx` 证明接收端确认；匹配的 dot 回执证明该次事件被处理。这三个检查点需要分别确认。

## 文档

| 内容 | 指南 |
| --- | --- |
| 浏览器设置与高级部署 | [部署指南](docs/zh-CN/deployment.md) |
| 通知安装与故障排查 | [iPhone 快捷指令](docs/zh-CN/iphone-shortcuts.md) |
| 数据流与权限 | [架构](docs/zh-CN/architecture.md) |
| 第一版过程与历史边界 | [第一版实现](docs/zh-CN/first-version.md) |
| 身份、网络、续期与交付 | [常见问题](docs/zh-CN/faq.md) |
| JSON、工具、配额与过期 | [协议](docs/zh-CN/protocol.md) |
| 验收与排查 | [验证说明](docs/zh-CN/verification.md) · [验证记录](docs/zh-CN/validation-record.md) |
| 后续工作 | [路线图](docs/zh-CN/roadmap.md) |
| 隐私与贡献 | [安全](SECURITY.zh-CN.md) · [参与贡献](CONTRIBUTING.zh-CN.md) |

`src/` 为 Worker；`scripts/` 为本地配置工具；`test/` 使用合成数据；`examples/` 不含凭据。实际本地配置、`work/`、`.wrangler/`、数据库、截图、真实事件和个性化快捷指令导出都不应进入公开仓库。不要上传整个运行目录。

本地开发使用 Node.js 24 与现有 npm 锁文件。安装依赖需要访问 npm；测试不会给真实 dot 发送事件：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:runtime
```

## 许可证

原创代码与文档采用 [PolyForm Noncommercial License 1.0.0](LICENSE)，以源码公开、非商业许可方式提供。超出许可授权范围的商业用途须另行取得相应权利人许可，具体以原文为准。原[必要版权声明](NOTICE)保持不变。

依赖保留各自许可证，见[第三方说明](THIRD_PARTY_NOTICES.zh-CN.md)。项目许可不包含平台账号、个人数据、商标或第三方服务使用权。
