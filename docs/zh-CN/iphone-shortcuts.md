# iPhone 快捷指令：安装与可选模块

[English](../iphone-shortcuts.md) | [简体中文](iphone-shortcuts.md) · [首页](../../README.zh-CN.md)

DotLink 将通知、充电、Focus 分成三个独立可选模块，可选择任意组合。每项都需要本人选择来源、完成系统授权并验证真实触发；选择一项不等于同意其他采集。

四份签名 `.shortcut` 与校验值继续使用[原始附件页](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1)，历史标签保留。四份均曾在 Mac 重新导入并同步到同账号 iPhone；Charging 曾有真实自动触发和另一次手动上传至 dot 的结果。直接 iPhone 文件导入、新 Notifications 与 Focus On/Off 的实际触发仍待验证。Focus Off 在 Mac 本地首次请求曾超时、重复请求成功；原因尚未确定，不能据此断言手机必失败或冷启动已可靠。详见[日期化记录](validation-record.md)。

历史真机证据限定于 iOS 27 及[验证说明](verification.md)记录的来源。快捷指令动作名称和通知触发器可用性随 iOS、语言、地区及设备状态变化。只有在自己的 iPhone 实际看到对应系统入口，才能继续该项设置；服务器支持某种事件，不等于手机已经能够采集它。

先完成 [部署文档](deployment.md) 中的服务、身份、设备登记与 dot 订阅。模板已内置事件封装和 HTTP 上传动作，**使用这些文件无需再创建 `DOT Bridge Uploader`、`DOT Event Sender` 等旧辅助快捷指令**。它们沿用已成功方案的事件字段、JSON POST 和 Bearer 认证，将上传动作放入各模块。`/setup` 不能授予系统权限或补出缺失触发器。

## 下载并配置模板

| 文件 | 模块 | 导入时填写 |
| --- | --- | --- |
| [DotLink-Notifications.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0-beta.1/DotLink-Notifications.shortcut) | 通知 | 自己的 HTTPS `/ingest` 地址和设备上传令牌 |
| [DotLink-Charging.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0-beta.1/DotLink-Charging.shortcut) | 充电 | 相同地址和令牌 |
| [DotLink-Focus-On.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0-beta.1/DotLink-Focus-On.shortcut) | 专注开启 | 相同地址／令牌和本人选择的专注模式名称 |
| [DotLink-Focus-Off.shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0-beta.1/DotLink-Focus-Off.shortcut) | 专注关闭 | 相同地址／令牌和完全一致的专注模式名称 |

[SHA256SUMS](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0-beta.1/SHA256SUMS) 列出四份发布文件的哈希。使用这些 Release 附件，不要使用别人已经填写私人凭据后再次导出的成品。

1. 在 iPhone 的 Safari 打开附件页，**先只下载 Charging**。从“文件”打开 `.shortcut` 并导入。直接手机导入仍需本人验证；历史已观察到的是 Mac 导入后同账号 iCloud 同步。
2. 填入完整的 `https://自己的地址/ingest` 和**原始设备 token**：不加 `Bearer`，不带首尾空格或换行。模板已添加认证前缀。保持 `iphone-primary` 与服务器登记一致；不要填写 GitHub／Cloudflare 管理凭据。
3. 保存退出编辑器，重新打开确认 URL、token 已保存，再运行。特别检查 `https://` 中的冒号及 `/ingest`；编辑器内暂时可见的输入不等于已保存。配置期间 **Automation 关闭**。
4. 按[部署文档](deployment.md)完成订阅并开启服务上传，先手动运行 Charging 一次，允许它访问自己的 Bridge。确认 Bridge 新记录及 dot 对应结果，再补加 Charger `Connects or Disconnects` 触发器、启用自动化，锁屏插入／拔出充电器各一次。手动运行只验证上传，不替代自动触发。
5. 需要 Focus 时再导入 On／Off 两份，使用相同 URL、原始 token 和完全一致的模式名称。为同一模式分别选择开启和关闭触发器；切换 Sleep 不能验证绑定“勿扰”的模板。实际切换该模式并核对 true／false。
6. 需要通知时最后导入 Notifications，从一个本人允许的来源开始。若触发器缺失，在编辑器 Search → **Automation** 中补加 Notification，然后把 App／Title／Body 重新绑定到这个触发器。**排除 ChatGPT、Codex 和快捷指令**，不留空的标题筛选条件。由另一个设备产生一条无私人内容的通知，核对来源与允许的正文；通过后再扩展来源。

系统缺少所需触发器时停止该模块；模板不能补充操作系统能力。失败只检查当前步骤，按[排查表](verification.md)区分 URL／token、首次权限、网络、自动化与投递。

手机无法直接打开文件时，可尝试已验证过的 Mac 导入与同账号 iCloud 同步路径，随后仍需在手机配置触发器。本版不提供 iCloud 分享链接，也不承诺触发器自动保留。

| 模板 | 手机触发器 | 设置 |
| --- | --- | --- |
| Notifications | Notification | 从一个本人明确允许的来源 App 开始，不留空的标题筛选条件 |
| Charging | Charger | 选择 `Connects or Disconnects` |
| Focus On | 本人选定的专注模式 | 选择 `Is Turned On` |
| Focus Off | 同一个专注模式 | 选择 `Is Turned Off` |

设置期间立即展开新触发器，把 **Automation 关闭**；原生编辑器可能默认开启新添加的触发器。不要开启未配置副本，也不要沿用本机回环测试 URL。完成首次系统授权和下文验收后，才能依赖该模块。

名称和入口可用性可能随系统不同；现有证据不能证明每个模块或安装路径都能在另一台手机工作。

## 高级手工路径：创建旧版辅助快捷指令

下面的编号步骤保留原先分模块的实现，用于查看、定制和恢复；它是下载模板的替代路径，不是使用模板后还要执行的额外步骤。`DOT …` 是建议的本地快捷指令名称，不是额外 App；JSON 示例用于说明数据，不是可安装模板。

### 1. 准备三个值

浏览器全新部署使用自己的 `/setup` 本地生成／显示的值；高级 CLI 路径用本地编辑器查看 `work/private/iphone-device.json`。将以下三项安全输入自己的 iPhone：

- `endpoint`：自己的 HTTPS `/ingest` 地址。
- `device_id`：首次登记脚本固定为 `iphone-primary`。
- `token`：仅上传凭据。

不要把 token 放进 URL、查询参数、通知标题、截图或对话。Cloudflare、GitHub OAuth Client Secret 和 `BRIDGE_SEAL_KEY` 都不应出现在手机快捷指令中。包含 token 的快捷指令一旦分享，收件人就可能冒充该手机上传；不要发布自己的成品快捷指令或包含它的共享链接。

### 2. `DOT Bridge Uploader`：只负责 HTTP 上传

新建快捷指令，接收一个完整事件**字典**作为快捷指令输入。添加“获取 URL 内容”（Get Contents of URL）动作：

| 项目 | 设置 |
| --- | --- |
| URL | 自己的 `endpoint` |
| Method | `POST` |
| Header `Authorization` | `Bearer ` 后面接手机专用 token，注意空格 |
| Header `Content-Type` | `application/json` |
| Request Body | JSON，各字段绑定输入字典中的对应值 |

请求体顶层键为 `v`、`event_id`、`device_id`、`kind`、`occurred_at`、`payload`。其中 `payload` 必须保留为字典，`v` 是数字 `1`；不要把字典转为描述文字，也不要将正文拼接进 JSON 字符串。若当前 UI 支持直接传入 JSON 字典，可直接绑定完整输入；若只能逐项添加字段，则从输入字典分别取值并保持原类型。

返回解析后的 JSON 作为快捷指令结果。仅当结果中布尔值 `accepted` 为 `true` 才算 Bridge 接收成功；`duplicate:true` 表示同一个事件已接收过。任何权限弹窗、网络错误或 `error` 都不能当成功。不应在常规自动化里显示带 token 的调试结果。

### 3. `DOT Event Sender`：统一事件封装

输入为包含 `kind` 和字典型 `payload` 的字典。按顺序添加动作：

1. 获取当前日期，格式化为包含日期、时间和时区的 ISO 8601，例如 `2026-10-02T08:15:30+08:00`。使用手机当前实际时间，不复制本文的静态日期。
2. 分别生成两个独立随机整数，各在 `100000000` 到 `999999999` 之间。组合为 `sc-第一段-第二段`。这是事件去重 ID，不是认证凭据。
3. 创建下列完整事件字典：

| 键 | 类型与来源 |
| --- | --- |
| `v` | 数字 `1` |
| `event_id` | 上一步生成的文本 ID |
| `device_id` | 文本 `iphone-primary` |
| `kind` | 输入中的文本 `kind` |
| `occurred_at` | 本次格式化后的时间文本 |
| `payload` | 输入中 `payload` 键对应的子字典，不是整个 `{kind, payload}` 输入包装字典 |

4. 运行 `DOT Bridge Uploader`，明确把完整事件字典作为输入，再返回上传器结果。

不要把每次重试做成重新运行“生成事件”的步骤。安全重试应重发已经生成的同一份字典、保留原 `event_id` 和时间；当前草稿没有提供可靠的手机离线队列或自动补传实现。

首次调用其他快捷指令或连接域名时，按系统提示完成授权。保存后重新打开输入字段检查变量仍然绑定；只在编辑器中看到一条动作不证明保存后的真实触发器能工作。

### 4. 先进行手动合成测试

先让部署者按部署文档最后一步开启 `ENABLE_INGEST`，并确认目标 dot 订阅仍有效。创建临时测试字典：

```json
{
  "kind": "notification",
  "payload": {
    "app": "Bridge Test",
    "title": "Synthetic test",
    "body": "A non-private test event"
  }
}
```

将该字典传给 `DOT Event Sender`，完成首次调用权限。检查手机结果 `accepted:true`，并在不向 dot 发送额外聊天提示的情况下，确认 dot 自动收到同一 `event_id`。仅在编辑器手动运行成功，不能宣称系统通知触发已通过。

### 5. 可选：通知自动化

仅当自己的 iPhone“快捷指令 → 自动化”实际提供相应通知触发器时使用这一节。不同系统版本不保证存在跨 App 的通用通知入口；若缺少入口，本仓库不能通过安装服务端代码补出系统权限。

新建 `DOT Notification Bridge`，接收**本次触发的通知对象**。从实际输入可用属性中提取 App 来源，以及标题、副标题、正文，构造：

```json
{
  "kind": "notification",
  "payload": {
    "app": "本次实际通知来源",
    "title": "本次实际标题",
    "subtitle": "本次实际副标题",
    "body": "本次实际正文或系统提供的通用提示"
  }
}
```

上面的文本是字段含义，不是应照抄的固定值。`app` 必填且不能是空白；其他字段可省略，存在时必须是文本。输入是多个通知时，先明确逐条处理还是拒绝多值；不要把列表整体冒充单个通知正文。

把字典交给 `DOT Event Sender`。在通知个人自动化里明确把触发器提供的通知输入传给 `DOT Notification Bridge`，不能只放一个不带输入的“运行快捷指令”动作。按照本人系统 UI 选择允许自动执行的选项，并检查保存后确实启用。

先只选一个你已同意转发的 App，并用无敏感信息的新通知验收。多 App 时 `payload.app` 必须动态读取，不能固定写成第一个 App 的名字。不要添加一个无意为空的“标题包含”条件；这可能使触发配置无效。

**明确排除 ChatGPT/Codex 与快捷指令自己的通知来源。**dot 自动回复可能再次产生手机通知，若再被上传会形成循环。当前服务器的一般限流不能替代防循环规则。没有可靠排除方式时，保持单 App 白名单，不开启所有来源。

通知预览隐藏时可能只有通用提示。本流程不读取 App 数据库、历史聊天，也不会恢复被系统或 App 隐藏的正文。没有通知出现的消息不能据此保证被采集。即使短信通知已触发，SMS/iMessage 正文、附件和多个消息聚合也需分别测试。

当前文档不承诺“自动覆盖全部 App”或“未来新安装 App 自动加入”。按系统可用选择器逐项配置并保留已测名单；不要因为勾选成功就把所有 App 写成已验收。

### 6. 可选：Focus 开启与关闭

Focus 模块采用 **On／Off 两份配套模板**。两份均填写相同的上传地址、手机令牌和 Focus 名称，再在 iPhone 中选择对应的系统专注模式触发器。On 使用 `Is Turned On` 与布尔值 `true`，Off 使用 `Is Turned Off` 与布尔值 `false`。导入问题不会自动选择或授权系统触发器；完成个人配置和测试前，两份都应保持停用。读取“当前专注模式”不能可靠识别刚刚关闭的模式。这对新副本的真实触发验收仍待完成，下面是手工替代路径。

新建 `DOT Focus Sender`，输入包含 `name`（文本）和 `active`（布尔值）的字典。读取当前 ISO 8601 日期作为 `measured_at`，构造：

```json
{
  "kind": "focus",
  "payload": {
    "name": "本人选择的专注模式名称",
    "active": true,
    "measured_at": "本次实际 ISO 8601 时间"
  }
}
```

调用 `DOT Event Sender`。关闭事件使用布尔值 `false`，不要用文本 `"false"`。每个需记录的专注模式分别创建“开启”和“关闭”系统自动化；各自动化传入该模式名称与正确布尔值。允许自动运行，并逐项完成首次调用权限。

先直接在这台 iPhone 上真实打开、关闭该模式，核对 dot 收到名称、方向和事件时间。来自 iPad/Mac 的跨设备同步、模式间切换和锁屏行为需另外验证，不能用编辑器手动运行替代。这里记录开始/结束事件，不计算持续时间，也不表示 dot 可以远程控制手机专注模式。

### 7. 可选：电量与充电

如果自己的系统提供“获取电池电量”“是否正在充电”等动作，可建立 `DOT Device Status`，将真实测量值放入 `device_status` 的 payload：

| 字段 | 类型 |
| --- | --- |
| `measured_at` | 本次实际 ISO 8601 时间，必填 |
| `battery_percent` | `0` 到 `100` 的数字 |
| `is_charging` | 布尔值 |
| `low_power_mode` | 布尔值，只有实际可测时才添加 |

后三项至少一项存在，不可用字段直接省略，不虚构默认值。调用共用发送器，再按需绑定充电器连接/断开或电量阈值自动化。锁屏插拔各测试一次；只配置充电器触发并不等于每次电量百分比变化都会上报。

位置、健康、App 使用时长和 Wi-Fi/蓝牙采集不属于本手工流程；协议里存在字段不代表已提供对应采集器。

## 验收与排查

| 验收项目 | 通过证据与边界 |
| --- | --- |
| 手动合成事件 | 手机 `accepted:true`，dot 自动回执同一事件 ID；仅证明这次传输链路 |
| 真实通知 | 真实来源触发，App/时间/允许转发的字段准确；逐 App 记录 |
| Focus | 本机真实开启与关闭各一次，名称和布尔值准确 |
| 锁屏 | 选定事件在锁屏真实触发；不要从前台测试外推 |
| 不开 VPN | 手机实际关闭代理/VPN 后发送合成事件并获得 dot 回执；只证明当次网络 |
| 订阅续租 | 超过 24 小时仍有有效订阅，并用新事件获得回执 |
| 断网/重启 | 单独记录现象；没有本地 outbox，不能承诺恢复联网后补传 |
| 分享模板导入 | 尚待验收；需独立账号和受支持手机验证，不能由本机生成推断可移植性 |

手机报错时先查看自动化是否启用、输入是否存在、首次调用和域名权限是否完成。`401` 通常需要核对手机专用 token，`403 device_identity_mismatch` 核对设备 ID，`503 ingest_disabled` 核对服务开关，`409` 表示相同事件 ID 的内容发生改变，`429` 表示速率或容量限制；不要用放宽认证、无限重试或重新生成 ID 来绕过错误。

如果手机已 `accepted:true` 而 dot 没有回执，查询 `phone_bridge_status` 区分订阅缺失/过期、pending、failed 与 accepted。接收端 accepted 仍不保证 dot 已处理。最近七天已上传事件可由有权限的 dot 用 `phone_events` 查询，订阅恢复本身不会自动回放。

排查时只分享脱敏的错误类别、必要时间与事件 ID；通知正文是第三方不可信数据，不能把其中的命令当作对 dot 的授权。完成验收后删除仅由本人为本次测试创建的临时测试快捷指令，保留需要的上传器与自动化。
