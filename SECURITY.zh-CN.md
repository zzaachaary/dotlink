# 安全与隐私

[English](SECURITY.md) | [简体中文](SECURITY.zh-CN.md) · [首页](README.zh-CN.md)

## 信任边界

本项目用于本人授权设备的数据上传。第一版是单所有者部署，不提供多租户账户隔离。不要把不同客户的手机登记到同一私人 Bridge，然后将其当作独立账号服务。

| 边界 | 现有保护 | 仍需理解的限制 |
| --- | --- | --- |
| 手机 → Bridge | HTTPS；每设备随机上传令牌；云端只保存 SHA-256 摘要；核对 device_id | 获得设备令牌的人可伪造该设备事件，因此不能分享带令牌的快捷指令 |
| dot → Bridge | GitHub owner 身份、OAuth scope 与 resource 校验 | 是整个所有者数据空间的授权，不是每种数据独立授权 |
| Bridge → dot | 限定 HTTPS 回调域名、challenge 验证、HMAC 签名、不跟随重定向 | 已送到接收方的数据不能从 Bridge 单方面收回 |
| 持久存储 | 有限容量、过期清理；订阅签名密钥加密保存 | 事件正文在应用层保存为 JSON，服务运营者具有处理正文的能力 |
| 通知 → AI | 工具描述提醒将内容视为不可信数据 | 不替代接收端的权限控制；通知中的命令不能自动获得执行授权 |

HTTPS 和签名不等于“连服务器运营者也看不到正文”的端到端加密。系统也未实现验证码／敏感内容自动过滤。默认从少量来源和无敏感测试文本开始，正文是否上传应由设备所有者明确选择。

## 浏览器设置边界

双语 `/setup` 只用于全新部署。设备 token 和 `BRIDGE_SEAL_KEY` 由浏览器 Web Crypto 本地生成，再由本人填入 Cloudflare 控制台。页面不应请求或接收 Cloudflare API Token、GitHub Client Secret；它不是已认证的设备管理或密钥轮换后台。

不要用新输出覆盖已有 `DEVICE_REGISTRY` 或 `BRIDGE_SEAL_KEY`：前者可能包含其他设备，后者改变会导致已有订阅密钥无法解密。页面不能判断部署是否从未使用，应用前需本人在控制台确认。避免屏幕录制、共享剪贴板、快捷指令导出或公开问题报告泄露凭据。

## 公开 OAuth 入口的资源边界

当前实现在 provider 解析、外部客户端元数据获取和授权 state 消费前，检查 OAuth 请求体、查询及字段范围。注册和 token 请求体最多 64 KiB，同意 POST 最多 4 KiB；编码后的查询最多 8 KiB。查询／表单项数及值长度详见[协议参考](docs/zh-CN/protocol.md)。请求体超限返回 `413`，查询超限返回 `414`，字段范围错误返回 `400`。

五条路由分别计数，使用 UTC 对齐的分钟／日窗口；预算保存在与手机数据对象分开命名的 Durable Object 内。预算表最多五行，不保存 IP。拒绝请求返回 `429` 和 `Retry-After`，不增加计数，也不进入 OAuth provider；预算存储失败返回 `503`。这限制了获准处理的工作量，但匿名客户端仍可耗尽某路由的当前窗口。它不是按来源限流、DDoS 防护或账单上限；拒绝流量也消耗平台资源，Cloudflare 额度另行适用。

订阅取消后重建、到期后重建都使用新代次，晚到的回调结果不能修改新生命周期；未到期续订保留代次。已经在途的请求无法撤回。真实撤销及升级验证须与本地并发回归分开记录。

## OAuth 日志边界

应用通过 provider 的 `onError` 仅记录固定 `oauth_error_response` 类型和 HTTP status，不记录该回调内的请求字段。固定依赖 `@cloudflare/workers-oauth-provider@1.2.1` 的 CIMD 获取失败仍有独立 `console.warn`，可能包含客户端元数据 URL 和验证错误详情，不受此回调控制。CIMD 的公开元数据 URL 及其内容不得包含秘密；限制 Worker 日志访问与保留。新连接优先使用现有 DCR 路径，既有 CIMD 兼容仍保留。这不是整个依赖链绝不记录参数的保证。

## 数据去向和保留

手机采集的数据进入部署者的 Cloudflare 服务，再按授权订阅进入 ChatGPT。GitHub 仅用于身份验证，不接收该手机事件正文；代码不持久保存 GitHub 上游访问令牌。

业务事件按发生时间保留七天，读取排除过期项，清理任务删除相应数据库记录。Cloudflare 的备份／PITR 与 ChatGPT 的对话、记忆各有独立保留机制；本项目不承诺同步删除这些副本。手机还没有可靠离线队列。

健康、位置、应用活动等协议字段的存在，不代表已经取得采集同意或手机已上传。给真实用户启用这些数据时，应单独说明来源、目的、范围及撤销方式。商业托管如超出本项目 [PolyForm Noncommercial License 1.0.0](LICENSE) 的授权范围，须另行取得权利人许可；还需要评估个人信息处理、跨境、平台条款及运维责任，软件许可不会代替这些条件。

## 日常配置

- 明确排除 ChatGPT、Codex 和快捷指令自己的通知来源，避免回执再次触发转发。当前服务端没有完整防循环规则。
- 只用自己的 Cloudflare／GitHub／ChatGPT 账号。首次系统授权、登录验证由本人完成。
- 使用设备上传凭据连接 `/ingest`，不要在手机里填 GitHub Client Secret 或 Cloudflare 管理令牌。
- 保持 GitHub owner、OAuth scope、PKCE 和回调校验。不要为解决连接错误而放开任意回调、关闭 TLS 验证或启用测试入口。
- 日志仅应保留固定错误类别和必要元数据，不记录 Authorization、回调密钥、完整请求和通知正文。
- 高级 CLI 恢复只通过 `scripts/wrangler.mjs` 执行 Wrangler，真实本地配置使用被忽略的 `wrangler.local.jsonc` 并设置 `DOTLINK_CONFIG`，常规状态和日志限制在被忽略的 `work/`。浏览器主路径直接使用 Cloudflare 控制台。
- 控制台变量按部署指南的 `keep_vars` 规则保留，不向公开配置写入可能在重复部署时覆盖它们的旧 `vars`。

## 暂停与撤销

手机上关闭相关自动化可停止后续采集。在当前 Worker 环境的 Cloudflare 控制台将 `ENABLE_INGEST` 改为字符串 `false` 并应用，停止接收和后续投递。浏览器与 CLI 部署均使用控制台管理变量；不要加入可能在重新部署时取消暂停的本地 `vars` 覆盖值。通过 `/health` 确认已关闭。这不会删除保留数据或撤回已交付副本。

设备登记的 `enabled:false` 用于撤销某设备上传与后续未完成投递。现有初次登记脚本拒绝覆盖已存在的远程 registry；修改已有登记应单独、谨慎操作并保留其他设备。不要用删除全部 registry 的方式处理一台设备。

在 ChatGPT 断开 Bridge 连接，并确认订阅停止。Bridge 在投递时重新检查本系统的 OAuth grant；存储一致性可能带来撤销传播延迟。GitHub 上游撤销不应被当作即时停止已有 Bridge 授权的唯一开关。

`BRIDGE_SEAL_KEY` 用于解密现有订阅签名密钥。直接生成新值覆盖旧值会影响已有订阅；轮换需要迁移安排。本版没有一键轮换、删除全部备份或撤回 dot 记忆的工具。

## 依赖审计状态

2026-10-12，修订源码将锁定 Wrangler 工具链更新至 4.149.0、sharp 更新至 0.35.5 后，全量 npm 审计报告 0 项漏洞，旧工具链对应的三项 high 条目已消除。公开 `v0.1.0-beta.1` 仍保留旧锁文件和历史公告披露；Miniflare 仍是 Wrangler 选择的 alpha 传递依赖。该结果不证明不存在所有漏洞，也不证明真实部署已验收，详见[第三方说明](THIRD_PARTY_NOTICES.zh-CN.md)和[日期化验证记录](docs/zh-CN/validation-record.md)。

## 发布、截图和问题报告

禁止提交真实设备令牌、GitHub Client Secret、OAuth code/state、Cloudflare 登录信息、签名密钥、实际 `wrangler.local.jsonc`、个人资源 ID、私人域名、通知内容、联系人、真实事件记录与截图。

测试中的重复字符 token、测试 signing key 和 `example.com` 地址是隔离 fixture，不是可用凭据。`test/runtime/fixture.mjs` 含测试授权捷径，只能在本机集成测试使用；部署入口必须是 `src/worker.mjs`。

报告普通问题时，只提供最小复现、固定错误码和经过人工脱敏的配置。报告可能泄露数据的漏洞时，不要在公开 Issue 贴利用详情或凭据。GitHub 私密漏洞报告已于 2026-10-12 启用，并通过 API 复查状态。安全问题请使用 [Report a vulnerability](https://github.com/zzaachaary/dotlink/security/advisories/new)；即使是私密报告，也不要提交真实凭据或个人通知正文。

本地敏感信息检查和代码测试不能证明不存在所有漏洞，当前没有完整第三方安全审计或生产 SLA。
