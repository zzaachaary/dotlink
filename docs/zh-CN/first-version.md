# 第一版实现与复现边界

[English](../first-version.md) | [简体中文](first-version.md) · [首页](../../README.zh-CN.md)

**本页是历史实现记录。当前安装只支持 Notifications 通知；Charging、Focus On 和 Focus Off 均为即将推出，旧结果和附件不代表当前支持。安装请按[通知部署指南](deployment.md)。**

资料整理日期：2026-10-02。历史实机验证截至 2026-10-01；本页不是一次新的端到端测试报告。本文中的 `https://example.com`、`demo-phone`、`Example App` 和 `Work` 都是合成示例，不能直接作为生产配置。

项目现名为 DotLink；本页保留原始历史记录与验证日期。新的浏览器设置主线见[部署指南](deployment.md)，不改变下文历史证据。

第一版以纯快捷指令采集、Cloudflare Worker 接入、SQLite Durable Object 存储，以及 OAuth 保护的 MCP 工具和 MCP Events 投递组成。目标是先验证一条可解释、可撤销的个人事件链，再改进安装和故障恢复体验。

## 已实现与已验证

| 功能 | 源码／协议 | 历史实机证据 |
| --- | --- | --- |
| 选定 App 新通知 | 上传、存储、查询和订阅 | 多个消息、邮件来源及未接来电通知已进入目标 dot；没有逐一验收全部已选 App |
| 电量和充电状态 | 支持测量时间与逐字段最新值 | 锁屏连接／断开充电器的实际状态已自动到达；不代表每次电量百分比变化都采集 |
| Focus 开／关 | 支持名称、布尔状态、测量时间 | 多个模式的真实开启、关闭和切换已通过；只有上报，没有远程控制 |
| `subtitle`、通知原始时间 | 服务端可表示副标题；事件有时间字段 | 手机尚未接入副标题及通知原始日期；当前通知时间取自动化执行时刻 |
| 位置、连接、App 活动、健康 | 校验、存储及相关查询已存在 | 未完成对应手机采集；健康未启用 |
| App 活动批量上传 | 接受批次、去重、估算配对时长 | 手机本地记录、定时批传尚未实现；不是 Screen Time 数据导出 |
| 订阅续期、服务端重试 | 相同订阅更新到期时间；outbox 有界重试 | 实际订阅和投递已通过；跨日续期、长期恢复尚未验收 |
| 一键导入包（截至 2026-10-01 的历史状态） | 当时尚无可交付的快捷指令文件 | 后续 [Beta Release](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1)已提供四份签名文件；其余安装／触发验收单独记录 |

历史记录包含部分单元／SQLite 和 workerd 检查，但测试文件随后有更新，因此不把旧测试计数当作当前版本的复测成绩。当前版本应运行本页末尾命令，并记录实际输出。

## 历史服务端接入顺序

1. 使用自己的 Cloudflare 资源、HTTPS Origin、GitHub OAuth App 和 owner 身份部署。生产地址可形如 `https://example.com`，OAuth callback 为所配置授权 Origin 下的 `/callback`。
2. 将 GitHub OAuth 凭据、订阅密钥封装用的随机密钥和设备登记放入 Worker Secrets。设备登记只保存设备上传令牌摘要；手机保存独立原始令牌。
3. 通过 OAuth 把 `/mcp` 连接到具备相应事件能力的消费者，并在目标 dot 中订阅 `phone.event`。普通聊天页面 URL 不是上传端点；并非所有 MCP 客户端都会自动支持这一事件扩展。
4. 先用合成内容验证订阅、challenge、上传和回执，再启用真实手机采集。手机发送 `POST /ingest`，使用 Bearer 设备令牌和 `application/json`。

`PUBLIC_ORIGIN` 标识 canonical MCP Origin；可选 `AUTH_ORIGIN` 用于单独的授权 Origin。改变这些值可能需要消费者重新发现或连接。`ENABLE_INGEST` 只有精确值 `true` 才启用上传和投递。部署和设备登记脚本涉及远程写入，应在自己的配置完成后主动执行。

## 历史快捷指令结构

第一版把公共上传、事件封装和各类触发器分开，避免每个自动化重复填写 HTTP 细节。以下名称用于说明职责，不要求使用相同名称。

### 1. 公共上传器

接收字典输入；无输入时停止。用“获取 URL 内容”向 `https://example.com/ingest` 发出 POST，将字典作为 JSON 请求体，添加设备 Bearer 令牌。首次访问域名、调用其他快捷指令及锁屏运行的系统授权，需要设备本人完成。

不要把原始令牌放进公开分享的模板、截图或示例 URL。一个人的凭据不能复制给其他人。设备 `enabled:false` 会阻止后续上传和尚未投递的该设备事件，但无法撤回此前已交付的副本。

### 2. 公共事件封装器

为输入增加以下信封字段，再调用公共上传器：

| 字段 | 含义 |
| --- | --- |
| `v` | 当前为数字 `1` |
| `event_id` | 新事件使用 UUID v4，或 `sc-` 加两段独立九位随机数；ID 用于去重，不是安全凭据 |
| `device_id` | 与令牌绑定的设备别名，例如 `demo-phone` |
| `kind` | 事件种类，例如 `notification`、`device_status`、`focus` |
| `occurred_at` | 包含时区的 ISO 8601 时间 |
| `payload` | 对应事件的数据字典 |

字典需要保留字符串、数字和布尔类型，不能把整个 payload 做成 JSON 字符串，也不要直接拼接消息正文。同一事件重试必须保留原 ID、时间和内容；重新生成 ID 会成为另一个事件。

### 3. 通知触发器

在 iOS 27 快捷指令中添加通知自动化，选择本人希望转发的 App。把输入变量类型设为通知，从同一个输入取 App、标题和正文属性。合成 payload 形如：

```json
{
  "app": "Example App",
  "title": "Example title",
  "body": "Synthetic notification for testing."
}
```

将真实来源动态写入 `app`，不要固定成某个聊天软件。没有筛选需求时不要留下空的“标题包含”条件：这种配置在历史实机中曾阻止自动化启用。保存后重新打开检查开关和条件，再从另一设备产生一条真实通知。

运行通知可以按系统提供的选项关闭；首次授权仍需要完成。先排除会产生回执的 ChatGPT、Codex 和快捷指令自身通知，可以降低循环风险，但第一版尚未实现完整防循环逻辑。不能把空 App 列表当作“全部”，也没有证据证明未来安装的 App 会自动加入。[Apple 通知触发器](https://support.apple.com/en-ke/guide/shortcuts/apd932ff833f/ios)

### 充电与专注：即将推出

原个人实现曾记录充电变化和选定 Focus 模式切换；日期化结果保留在[验证说明](verification.md)和[验证记录](validation-record.md)，不代表当前支持。当前公开安装流程不安装或测试 Charging、Focus On 或 Focus Off。

## 第一版的具体约束

| 项目 | 当前实现 |
| --- | --- |
| 单事件大小 | 最多 64 KiB |
| 接收时间范围 | 最近七天，最多允许五分钟未来时钟偏差 |
| 接入速率与容量 | 每设备每分钟最多 120 个新事件；全库最多 10,000 个尚未清理事件 |
| 重复与冲突 | 相同 ID、相同内容返回 `duplicate:true`；内容不同返回 `409` |
| 查询 | `phone_events` 每页最多 25 条；`phone_status` 默认超过 15 分钟标记 `stale` |
| 订阅 | 最多 8 条；默认及最长 24 小时；到期停止投递 |
| 投递 | 每次 alarm 最多处理 5 条任务；临时失败最多 8 次尝试，带退避和抖动 |
| 永久失败 | 不跟随重定向；`410` 取消订阅，`413` 不重试 |
| 历史恢复 | 当前无协议 replay；七天内已保存数据可用读取工具分页获取 |

可用读取工具为 `phone_devices`、`phone_status`、`phone_events`、`phone_bridge_status`、`phone_app_usage`。后者根据已经上传的 App 开／关观测估算，缺失或歧义需要保留，不能伪造完整使用时长。

24 小时租约是本实现的选择。官方 MCP Events 有续期和可选 replay 机制，当前代码只实现更新订阅到期时间，未实现非空 cursor 恢复；不要将实现缺口表述成协议不支持。[OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events)

## 验证方式

使用锁文件中的依赖；基线为 Node 24。先按[部署指南](deployment.md)准备被忽略的本地 `wrangler.local.jsonc` 并设置 `DOTLINK_CONFIG`，供最后的打包命令读取。以下检查使用合成数据，不需要向真实 dot 发送通知：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:runtime
npm run check
```

`npm run check` 是 Wrangler dry-run 打包，不是部署。`test:runtime` 使用 workerd，可能受到本机进程或网络沙箱权限限制；它不替代手机实测。

当前验收针对本人选定来源的真实通知，分别核对触发、Bridge 持久化、webhook ACK 和匹配的 dot 自动回执。先使用[部署第六步](deployment.md#6-连接-dot验证通知送达)的三条新通知测试；断网恢复、重启、订阅过期、重复事件、突发消息和权限撤销需另行验证，才能扩大可靠性结论。

手机本地 outbox、自动补传、原始通知日期、未来 App 自动覆盖和长期无提示运行仍未具备完整证据。改进顺序见[后续路线](roadmap.md)。
