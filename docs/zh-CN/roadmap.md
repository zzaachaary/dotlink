# 后续简化与可靠性路线

[English](../roadmap.md) | [简体中文](roadmap.md) · [首页](../../README.zh-CN.md)

原始资料整理日期：2026-10-02；浏览器优先候选版说明补充于 2026-10-08，实验性 Beta 状态更新于 2026-10-12。下文区分已提供内容与后续设计方向；截至 2026-10-01 的历史实机验证见[第一版实现](first-version.md)。

优先保留已经打通的事件协议和系统触发方式，把用户需要反复填写、诊断和恢复的部分逐步收拢。开发完整 App 之前，先验证导入模板和配对流程能解决多少实际配置成本。

当前 Bridge、通用 webhook 编排、自建 API 助手和伴侣 App 的比较，以及服务交付边界，见[常见问题](faq.md)。

## 当前正式版 v0.1.0：自己的账号，浏览器优先

目标主线为官方 Deploy to Cloudflare → 自己 Worker 的双语 `/setup` → 本人手动填写控制台变量／Secrets、GitHub OAuth App → 自己的 dot 连接 → 独立可选通知、充电、Focus 模块。

向导通过 Web Crypto 在浏览器本地生成凭据，不接收 Cloudflare API Token 或 GitHub Client Secret，仅适用于全新部署。控制台变量应在重复部署后保留；不能静默覆盖 registry 或封装密钥。默认 `workers.dev` 无需购买域名，但不保证任何地区可达。

[正式版 `v0.1.0`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0)包含 Bridge、双语浏览器指南，以及 Notifications、Charging、Focus On、Focus Off 四份脱敏签名文件。模板沿用原 Beta 字节，本次发布没有新增真机验收结果。四份均已通过 Mac 重新导入与同账号 iPhone 同步，手机触发器仍须补加；新的 Charging 副本已有真机 → Bridge → dot 的对应结果。新通知／Focus 副本的真实触发、iPhone 直接导入及独立账号导入仍待完成。2026-10-15 Hosted Deploy 初装已通过；该新安装的 owner／dot／手机全链路仍待验收。跨日续期、网络变化和恢复能力另行验证，见[验证记录](validation-record.md)。

## 阶段一：可分享的复现包

目标体验是“导入 → 配置自己的连接 → 选择来源 → 本人授权 → 真实事件验收”。

- Beta 首次提供、v0.1.0 继续保留：四份脱敏签名文件、带版本的 Release 下载、校验值，以及填写本人连接设置的导入问题。
- 后续验证其他导入路径与独立配置手机上的实际通知／Focus 输入绑定，保留已成功的事件字段和内联上传动作。
- 将通知、充电和 Focus 分成可选择的模块，默认只开启用户明确选择的范围。
- 保留各模块的合成测试和真实系统事件测试步骤；错误页面只显示阶段与错误类别，不回显令牌或通知正文。

Apple 正式支持以 iCloud 链接或文件分享快捷指令，并支持导入问题。iOS 27 的自动化已经附在 shortcut 中，官方也说明跨设备同步时自动化为关闭状态。因此不能照搬旧版“个人自动化无法分享”的结论，但跨账户导入时 App 选择、Focus 映射和触发器保留情况仍需实测。[分享快捷指令](https://support.apple.com/guide/shortcuts/share-shortcuts-apdf01f8c054/ios)、[导入问题](https://support.apple.com/guide/shortcuts/add-import-questions-to-shared-shortcuts-apdf330fd3a0/10.0/ios/27)、[自动化简介](https://support.apple.com/en-ke/guide/shortcuts/apd690170742/ios)

**更广泛的可移植性验收：**另一部使用独立账户的受支持 iPhone 能从公开模板完成接入；模板中没有原作者数据；用户本人能看到并决定数据目的地、来源范围及自动化开关。首版尚未完成这项更广泛的验收，发布不代表承诺一键安装。

## 阶段二：配对和诊断向导

当前静态 `/setup` 指南尚未实现以下管理功能。未来增加一个经过身份验证的小型管理页面，展示设备、采集范围、最近接收时间、订阅到期和投递失败原因。建议流程：

1. 用户以自己的身份登录 Bridge，创建一次性、短时有效的配对码。
2. 手机用配对码换取只属于该设备的上传凭据；长期令牌不放在公共链接或访问日志中。
3. 用户在系统界面选择通知来源并完成授权，向导逐项显示接入状态。
4. 用户可以撤销设备、轮换凭据和停用转发；每个动作说明哪些已发送副本无法撤回。

这一阶段不需要将服务改成多人共用。先维持一人一部署；若引入多租户，必须先设计租户隔离、授权、配额、密钥生命周期和删除流程，不能只删除当前 owner 检查。

## 阶段三：补齐恢复能力

| 缺口 | 建议实现 | 验收标准 |
| --- | --- | --- |
| 手机断网后丢失未上传事件 | 有容量与保留期的持久 outbox；成功接收后再确认移除 | 断网、进程退出和重启后恢复；同一事件复用 ID，失败不清空队列 |
| 订阅断档 | 续期状态诊断、到期提示，消费者按 `refreshBefore` 更新 | 跨日及服务重启后有真实收件证据 |
| 没有 replay | 稳定游标、保留边界、截断标记与幂等恢复 | 过期重订阅不会跳过待投递事件，也不产生重复动作 |
| 回执可能再次被转发 | 默认排除自身来源，配合来源标记和有界去重 | dot 的回复不会制造无限回传 |
| 数据收集过宽 | 本地来源选择、内容裁剪和可见的隐私设置 | 用户可在上传前排除不需要的内容 |
| 时间和字段不完整 | 验证通知原始日期、副标题及各来源可用字段 | 区分系统事件时间、采集时间、接收时间和处理时间 |

协议的续期和 replay 是可用的扩展点；第一版的 24 小时上限及 `cursor:null` 不必永久保留。[OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events)

### 先评估 iOS 27 Storage

新的 Shortcuts Storage 能跨运行保存值，并提供多个快捷指令共享的 global value。它适合评估公共配置和少量流程状态，可能减少重复填写。[Apple WWDC26：What’s new in Shortcuts](https://developer.apple.com/videos/play/wwdc2026/310/)

存储值会跨设备同步，不能把它直接等同于 Keychain 或可靠消息队列。采用前应验证导出泄露边界、同步范围、并发读写、容量、失败恢复和锁屏行为。未经这些检查，不把通知正文或长期凭据批量放进共享 Storage，也不宣称已有可靠离线补传。

## 阶段四：薄伴侣 App

当模板方案仍难以管理凭据和队列时，再增加 Swift 伴侣 App：

- 用 App Intents 提供一个清晰的“发送事件”动作，收拢 JSON、鉴权和 HTTP 处理。
- 用 Keychain 管理设备凭据，提供配对、注销和轮换界面。
- 在受保护的本地持久存储中保存有界队列，记录发送结果，支持失败恢复。
- 展示权限与连接诊断，让用户理解哪个阶段失败。

App Shortcuts 可随 App 安装提供动作，但不等于自动建立所有系统触发器。[Apple App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts) 通知来源选择及系统授权仍由用户完成，后台补传时机仍受 iOS 生命周期约束。

普通 `UNUserNotificationCenter` 查询的是该 App 自己的通知；安装一个 App 并授予其发送通知权限，不会赋予它读取其他 App 全部通知的权限。[Apple getDeliveredNotifications](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/getdeliverednotifications%28completionhandler%3A%29)

因此，候选结构是“系统快捷指令触发 → 伴侣 App 动作 → Bridge”，不能承诺零设置监听全机通知。当前也没有受验证的快捷指令配置可以自动覆盖未来安装的全部 App。

## 阶段五：让组件可以替换

| 接口边界 | 可替换方向 | 需要保留的约束 |
| --- | --- | --- |
| 身份验证 | 在 GitHub 之外支持适合部署者的身份提供方 | 稳定 owner 身份、PKCE、scope、资源与撤销检查 |
| 部署与存储 | 其他运行时和事务数据库 | 原子事件／outbox 写入、持久调度、配额、过期与备份说明 |
| 采集器 | 在明确需求后增加其他平台 | 复用版本化协议；每个平台独立证明权限和后台能力 |
| 消费者 | 增加其他助手的读取或事件适配器 | 独立凭据、最小权限、签名验证和真实唤醒验收 |

现有消费者回调限制是具体安全边界。增加适配器应单独设计地址校验和认证，不能为了“通用 webhook”直接允许任意目标。能手动读取 MCP 工具，不等于能后台自动发现和处理新事件。

## 不采用的捷径：配件通知接口

Accessory Notifications 确实提供全部／部分 App 的授权选择，但它面向配件，需要 AccessorySetupKit 与相关扩展；正式用户安装使用还受 EU 设备所在地和 Apple Account 地区限制。任何地区可开发测试，不等于任何地区用户可用。[Accessory Notifications](https://developer.apple.com/documentation/accessorynotifications)、[配件接收流程](https://developer.apple.com/documentation/AccessoryTransportExtension/receiving-ios-notifications-on-an-accessory)

Apple Developer Program License Agreement §3.3.7(J) 还限制这类转发数据的使用、再次散布、远程保存和解密位置。该接口不能直接视为把通知上传给云端助手的通用通道。这个限制针对配件框架，不是对当前 Shortcuts HTTP 上传路线的判断。[Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

路线优先级是可分享模板、配对诊断和恢复能力，再按实测需要增加伴侣 App。每一阶段都应通过新的独立设备复现来扩大支持范围，而不把配置完成、服务端接受或单一通知成功当成长时间可靠性的证明。
