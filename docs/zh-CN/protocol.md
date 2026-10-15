# 协议与接口参考

[English](../protocol.md) | [简体中文](protocol.md) · [首页](../../README.zh-CN.md)

本页描述保持不变的 `v:1` 事件信封，以及尚未发布的本地候选中修订后的入口限制和订阅行为。已发布的 `v0.1.0-beta.1` 不包含这些本地修复。JSON 示例均为合成；日期只用于展示格式，真实发送必须使用实际事件时间和新的事件 ID。

## 上传

`POST /ingest`，`Content-Type: application/json`，`Authorization: Bearer <设备上传令牌>`。

```json
{
  "v": 1,
  "event_id": "00000000-0000-4000-8000-000000000001",
  "device_id": "iphone-primary",
  "kind": "notification",
  "occurred_at": "2026-10-02T00:00:00Z",
  "payload": {
    "app": "Example App",
    "title": "Synthetic notification",
    "body": "This is fictional test content."
  }
}
```

事件 ID 允许 UUID v4，或 `sc-<九位随机数>-<九位随机数>`；两组独立随机数范围各为 100000000–999999999。后者是第一版适配快捷指令的去重标识，不是认证凭据。同事件重试必须复用 ID 和内容；不要每次重试重建事件。

设备 ID 必须与上传令牌对应，不能在 JSON 中换个 ID 冒充其他设备。服务端保存独立的 `received_at`。

| kind | payload | 手机第一版 |
| --- | --- | --- |
| `notification` | 必填 `app`；可选字符串 `title`、`subtitle`、`body` | 使用实际 App／标题／正文；subtitle 与通知原始日期未接入 |
| `device_status` | `measured_at`；至少有 `battery_percent`（0–100）、`is_charging`、`low_power_mode` 之一 | 充电接入／断开时采集电量和充电状态 |
| `focus` | `name`、布尔 `active`、`measured_at` | 按模式分开启／关闭触发器，记录变化 |
| `location` | 纬度、经度、`measured_at`；可选 `accuracy_m` | 未启用采集 |
| `connection` | `transport` 为 wifi／bluetooth，布尔 `connected`、`measured_at`；可选 `name` | 未启用采集 |
| `app_activity` | `app`、opened／closed 的 `transition`、`source:shortcuts_app_trigger`、`measured_at` | 未启用采集 |
| `app_activity_batch` | `source`、`measured_at`、1–200 条 `observations`；每条带独立 `id/app/transition/measured_at` | 没有手机本地队列及定时上传 |
| `health` | `metric`、`value`、`unit`、`measured_at`，具体校验见 `src/protocol.mjs` | 未启用采集 |

时间为含时区的 ISO 8601。事件 `occurred_at` 必须在七天保留窗口内，允许最多五分钟未来时钟偏差；App 批次观测也校验这一窗口。其他 payload 的 `measured_at` 校验日期格式，且不能晚于事件时间五分钟，但当前不统一限制其最早时间，因此读取端必须保留真实年龄与 stale 状态。严格拒绝未知字段，不用正文字符串拼 JSON。

`202` 的 `{accepted:true, duplicate:false, received_at:...}` 表示持久化接收；相同设备、ID 和内容再次上传得到 `duplicate:true`。同 ID 不同内容返回 `409`。错误鉴权为 `401`，设备冒用为 `403`；上传关闭为 `503`。具体错误类别由服务端返回，不应重试所有错误。

## 容量与保留

- 单请求最多 64 KiB；每设备每分钟最多 120 个新事件；事件库最多 10,000 条未清理记录。
- 超过容量或速率返回 `429`。重复事件在容量检查前识别，但手机当前没有可靠补传队列。
- App 观测额外最多 50,000 条；批次原始数据按最早观测的到期时间清理。
- 业务保留为七天，依赖事件实际时间；平台备份和 dot 的副本不由该规则删除。
- 设备登记最多 32 台，全部属于一个 owner；事件订阅最多 8 条。

## OAuth 入口限制（本地候选）

应用在 OAuth provider 解析、外部客户端元数据查询及授权 state 消费前执行以下限制：

- 注册与 token 请求体最多 64 KiB，`/authorize` POST 同意表单仍最多 4 KiB。超限返回 `413`，不依赖 `Content-Length` 是否存在或准确。
- 编码后的查询字符串最多 8 KiB，超限返回 `414`。
- 查询参数及 URL 编码表单最多 64 项，重复项也计数；每个键最多 128 字符，每个值最多 8,192 字符。字段超限返回 `400`。合法重复 `resource` 参数仍可使用；这里的字段限制不描述注册 JSON 的字段。

下列预算按整个部署计算，不按 IP、账号或设备计算。窗口与 UTC 分钟和 UTC 日对齐，不是滚动窗口。

| 路由 | 每分钟 | 每 UTC 日 |
| --- | --- | --- |
| `POST /oauth/register` | 12 | 60 |
| `GET /authorize` | 20 | 120 |
| `POST /authorize` | 30 | 120 |
| `GET /callback` | 30 | 120 |
| `POST /oauth/token` | 60 | 1,000 |

预算存放在现有 `BRIDGE` 命名空间内单独命名的 Durable Object，与保存手机数据的对象分开；预算表最多五条路由记录，不保存 IP 地址。超限返回 `429` 及以秒计的 `Retry-After`，拒绝请求不会增加预算计数、调用 OAuth provider、获取客户端元数据或消费授权 state。预算对象不可用时返回 `503`，不会绕过检查。

注册、首次授权、同意、callback 和 token 各自计数，某路由不能直接占用另一条路由的额度。匿名请求仍可耗尽所在路由的当前窗口，暂时阻止合法请求。这是应用层有界准入，不是 DDoS 防护、免费套餐容量保证或账单上限；拒绝请求仍消耗 Worker 和 Durable Object 资源。遵守 `Retry-After`，不要关闭限制或连续紧密重试。

## dot 查询工具

所有 `/mcp` 读取都要求 Bridge OAuth、匹配 owner 和 `phone:read`。

| 工具 | 行为 |
| --- | --- |
| `phone_devices` | 已登记设备、启用状态、最近接收时间；不含凭据摘要 |
| `phone_status` | 每字段最新测量、年龄与 stale 标记；默认超过 900 秒标过期，不代表定时采集 |
| `phone_events` | 过滤设备／种类，最多 25 条一页，以 `next_before_seq` 继续查询 |
| `phone_bridge_status` | 订阅期限和现存投递状态计数，不证明 dot 逐条理解 |
| `phone_app_usage` | 对上传的打开／关闭观测配对，输出估算与缺失／歧义；不是系统 Screen Time |

App 时长查询范围 1–168 小时，最多使用最近 5,000 条观测、展示 200 个配对会话并给出截断信息。未闭合记录不能证明 App 仍在运行，缺失或过期位置不能假装当前坐标。

## 事件订阅和续期

事件名 `phone.event`，可按 `device_ids` 和 `kinds` 过滤。`events/subscribe` 与 `events/unsubscribe` 除读取权限外还要求 `phone:subscribe`。合法 `_meta` 请求元数据被接受，但不参与身份、过滤器或存储。

dot 提供回调和签名密钥；Bridge 验证 HTTPS 回调及 challenge 后存储。回调只允许本实现校验范围内的 OpenAI／ChatGPT 域名，不允许重定向。

本实现默认／最长 TTL 为 86400000 毫秒。刷新同一身份的订阅会更新期限与授权关联，返回 `refreshBefore`；它不是会员续费。客户端需要按协议刷新，真实跨日能力要单独验收。本实现遇到非空 cursor 返回 `replay_not_supported`，事件返回 `cursor:null`，订阅恢复不会自动补推断档历史。已上传且未过期的数据仍可分页查询。

每个订阅生命周期都有一个代次。取消或到期后重建时，即使复用相同订阅 ID，也会使用新代次。未到期订阅的续期（包括更新签名密钥）保留代次及已有待投递事件。每次发送前会确认任务仍为 pending 且匹配当前代次；晚到的响应（包括 `410`）只能影响发起发送时的代次。已经在途的 HTTP 请求无法撤回；重建不会重放已取消代次的事件。

同一代次内续期后，旧封装密钥发出的失败响应按临时失败处理，计入原有最多 8 次尝试并退避重试；旧 `410` 不会终止新配置的订阅。成功的 `2xx` 仍保留接收确认。批次处理中发现新的授权关联时会刷新授权清单，刷新后再次核对订阅；暂时查不到 grant 时停止发送并按既有次数限制重试，不据旧快照删除刚续订的订阅。

既有 SQLite 数据库采用新增列和回填的事务迁移，保留事件数据，并把已有待投递任务关联到原订阅代次。这是应用层 schema 更新，不应因此修改 `v1` Durable Object 命名空间 migration 或替换数据库。更新既有部署前需验证升级及重启行为；本地迁移检查不能证明云端备份或回滚流程已通过。

匹配事件按一条事件一个请求签名投递。网络错误、408、429 和服务端错误最多共 8 次尝试，退避加抖动；当前配置的响应为 410 时终止订阅，该配置下的 413 等永久错误不重试。回调 `2xx` 只表明接收确认。

OpenAI 当前协议说明支持续期和可实现的游标重放；本项目暂未实现重放，不能将此限制概括成整个协议的限制。参阅 [MCP Events](https://developers.openai.com/plugins/build/mcp-events)。
