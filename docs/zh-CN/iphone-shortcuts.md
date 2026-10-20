# iPhone Notifications：安装说明

[English](../iphone-shortcuts.md) | [简体中文](iphone-shortcuts.md) · [首页](../../README.zh-CN.md)

**当前只安装 Notifications 通知。** Charging、Focus On 和 Focus Off 均为**即将推出**。旧 Release 附件作为历史产物保留，不属于本次安装路径。

用户于 2026-10-20 反馈通知设置成功。这是用户反馈，不是所有来源、导入路径或长期投递的独立验收。历史 iOS 27 测试不等于最低支持系统版本；只有自己的 iPhone 实际提供所需 Notification 触发器和字段时，才使用本模块。

先完成[部署指南](deployment.md)的云端配置。手机模板可以先填写保存，再连接 dot，但在第六步确认订阅前，Automation 与服务上传均保持关闭。模板自带事件封装和 HTTP 上传，无需创建旧的 `DOT Bridge Uploader` 或 `DOT Event Sender`。

## 下载与配置

下载 [DotLink-Notifications.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut)。[SHA256SUMS](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/SHA256SUMS) 同时保留本文件和历史附件的校验值；当前只安装 Notifications。不要使用别人填写私人凭据后再次导出的副本。

1. 在 iPhone Safari 下载文件，从“文件”打开并导入。历史已观察到的替代路径是 Mac 导入后同账号 iCloud 同步；这不证明手机直接导入或独立账号可移植性已通过。
2. 填写完整 `https://自己的地址/ingest` 和原始设备 token，不加 `Bearer`，不带首尾空格或换行；模板会添加认证前缀。保留设备 ID `iphone-primary`，不要填写 GitHub 或 Cloudflare 管理凭据。
3. 保存退出编辑器，再重新打开确认地址和 token 已保存；检查 `https://` 的冒号及 `/ingest` 后缀。配置期间 **Automation 保持关闭**。
4. 若缺少触发器，从编辑器 Search → Automation 补加 Notification。只选择**一个本人允许转发的 App**，把 App、Title、Body 绑定到该触发器实际提供的属性。不要把来源固定为第一个 App、留下空标题筛选条件或把正文当作 App。
5. 排除 ChatGPT、Codex 和快捷指令，避免回执再次上传形成循环。不能可靠排除时，保留单 App 白名单。新触发器可能默认启用，应立即展开并在配置期间关闭 Automation。
6. 回到[部署第六步](deployment.md#6-连接-dot验证通知送达)，完成 OAuth，使用可复制提示词确认通知订阅。之后才开启服务上传和已配置的 Notification 自动化。
7. 完成首次系统权限，从选定 App 产生无私人内容的新通知，必要时使用另一台设备触发；核对来源、时间、允许字段和原始 `event_id` 与 dot 回执一致。按提示词确认三条不同的新事件后保留持续订阅。逐个来源验证后再扩大范围。

所需触发器不存在时停止本模块；模板不能补充操作系统能力。本版不提供 iCloud 分享链接，也不保证触发器导入后自动保留。没有真实通知输入的编辑器手动运行不能验收通知触发。

## 手机发送什么

模板把系统提供的通知放入 `v:1` 事件，包含新的 `event_id`、`device_id:iphone-primary`、`kind:notification`、当前 ISO 8601 `occurred_at` 和字典型 `payload`。payload 的 App 必填；Title、Body 只使用 iOS 实际提供的字段。使用 JSON POST 与设备 Bearer 凭据上传，完整约定见[协议](protocol.md)。

隐藏通知预览时可能只有通用文本。模板不读取 App 数据库、历史聊天或隐藏正文；没有通知就没有可转发输入。SMS/iMessage、附件、聚合通知和未来新 App 均不作全面覆盖保证。选择来源只代表同意这些来源。

token 不得进入 URL、截图、聊天、Issue 或共享导出；收到个性化快捷指令的人可能冒充手机上传。通知内容是不可信数据，不代表本人授权执行操作或发送消息。

## 验证与排查

- 确认真实来源事件触发自动化；只配置编辑器不算通过。
- 确认新的 Bridge 事件与匹配的 dot 自动回执。`202`、webhook `2xx` 的含义更窄；主动查询历史不能证明自动唤醒。
- 重试前优先检查已保存 URL/token、输入绑定、来源选择和首次权限。`401/403` 关乎凭据／身份，`503` 关乎配置／上传，`429` 为速率／容量限制。重试同一事件应保留原 ID 和内容。
- 上传成功但 dot 沉默时，用 `phone_bridge_status` 查看期限和投递状态；它不暴露订阅过滤参数，也不能证明属于哪个 dot，须结合客户端记录确认匹配。
- 跨过原订阅到期点后确认一条真正的新事件，才能证明续期运行。没有手机持久 outbox 或 cursor replay，离线上传可能丢失。

详细检查见[验证与排查](verification.md)。[验证记录](validation-record.md)保留 Charging／Focus 历史结果和失败，不代表它们当前受支持。
