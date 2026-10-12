# 部署自己的 DotLink

[English](../deployment.md) | [简体中文](deployment.md) · [首页](../../README.zh-CN.md)

DotLink 是采用 [PolyForm Noncommercial 1.0.0](../../LICENSE) 的单所有者、自行部署 Bridge，不是托管服务。并非每个 ChatGPT 账号都具备 dot 或自定义 MCP Events 接入资格。开始前确认目标 dot 能连接自定义 MCP 服务并订阅事件；只能调用 MCP 工具的客户端不自动具备事件接收能力。

**发布状态：实验性 [Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1)**，源码位于 [zzaachaary/dotlink](https://github.com/zzaachaary/dotlink)。四份已签名、脱敏模板覆盖三个可选手机模块；均已完成 Mac 重新导入，新的 Charging 副本已有真机 → Bridge → dot 的对应结果。iPhone 直接导入、独立账号导入、新通知／Focus 副本的真实触发及全新账号 Deploy to Cloudflare 仍是已披露的后续验证项；这份指南不表示完整新用户流程已独立复现。

全程使用自己的账号和凭据。部署会创建或修改 Cloudflare 资源，可能产生平台费用。默认 `workers.dev` 地址即可使用，无需购买域名；任何地址选择都不保证大陆网络可达，也不改变 ChatGPT 的平台服务范围。

## 主路径：浏览器设置

### 1. 部署独立 Worker

打开 [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fzzaachaary%2Fdotlink)，用自己的账号完成 Cloudflare 官方流程。独立账号部署路径仍是 Beta 验证项。选择独立 Worker，不要覆盖已有其他项目。确认前核对账号和将创建的资源。

仓库中的 `wrangler.jsonc` 只包含公开部署结构、`OAUTH_KV`、`BRIDGE` SQLite Durable Object 及初始 migration，不包含私人账号 ID、token 或环境变量值。缺少配置时默认拒绝上传。不要用修改 migration 的方式清理数据。

部署后打开 Cloudflare 显示的 HTTPS `workers.dev` 地址，在末尾加 `/setup`。[workers.dev 文档](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)说明账号专属地址规则。如需自定义域名，先绑定至这个 Worker，再统一使用同一 Origin；见 [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

### 2. 打开双语向导，确认是全新部署

在 `/setup` 选择 English 或简体中文。只有**远程不存在既有设备 registry 和封装密钥的全新部署**才生成凭据。页面不能证明部署从未使用，必须由本人在 Cloudflare 控制台确认。已有部署保留原值，使用恢复说明，不要生成替代值。

向导通过 HTTPS 浏览器本地 Web Crypto 生成设备 token、`iphone-primary` 的 SHA-256 摘要登记，以及 `BRIDGE_SEAL_KEY`。点击生成不会将这些值配置到服务器。刷新或离开前先私密备份；页面会话不是账号凭据恢复服务。

向导不请求或接收 Cloudflare API Token 或 GitHub Client Secret。本人直接在 Cloudflare 填写服务器配置，不要把秘密粘贴到聊天、Issue、截图、公开 URL 或源码文件。

### 3. 创建自己的 GitHub OAuth App

依照 [GitHub 官方指南](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)，创建 **OAuth App**，不是 GitHub App：

| 字段 | 值 |
| --- | --- |
| Application name | 自行命名，例如 `My DotLink` |
| Homepage URL | 自己 Worker 的 HTTPS Origin |
| Authorization callback URL | 同一 Origin 加 `/callback` |

确认自己的 GitHub **数字 ID**，不是用户名。官方公开接口 `https://api.github.com/users/YOUR_LOGIN` 中的 `id` 无需访问令牌即可读取。Bridge 只允许这一个已配置 owner，不申请仓库权限，也不持久保存上游 GitHub token。

### 4. 在 Cloudflare 填写变量与 Secrets

在目标 Worker 的实际使用环境中，手动配置三个**普通文本变量**：

| 变量 | 值 |
| --- | --- |
| `PUBLIC_ORIGIN` | 准确的 HTTPS Origin，不带路径、查询参数或末尾 `/` |
| `OWNER_GITHUB_ID` | 本人的 GitHub 数字 ID，按字符串保存 |
| `ENABLE_INGEST` | 先设为字符串 `false`，最终验收时才开启 |

再配置四个 **Secrets**：

| Secret | 来源与去向 |
| --- | --- |
| `GITHUB_CLIENT_ID` | 本人 OAuth App 的 Client ID，直接填入 Cloudflare |
| `GITHUB_CLIENT_SECRET` | 本人 OAuth App 的 Client Secret，直接填入 Cloudflare |
| `BRIDGE_SEAL_KEY` | `/setup` 本地生成的全新封装密钥 |
| `DEVICE_REGISTRY` | `/setup` 本地生成的完整 JSON 登记；包含 token 摘要，不包含原始 token |

原始设备 token 仅供手机上传器使用，不能读取数据。封装密钥和 GitHub 凭据不应进入快捷指令。[Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)说明云端 Secret 配置。

应用控制台更改后检查 `/health`，确认上传仍关闭。健康检查不返回设备或通知正文，也不能证明 OAuth、回调或手机投递成功。

**重复部署规则：**公开配置设置 `keep_vars:true`，并刻意不写 `vars`，让这三个变量保持由控制台管理。不要向公开部署配置补入旧的示例或默认 `vars`；显式配置值可能在下次部署覆盖控制台设置。保留既有 Secrets、`DEVICE_REGISTRY` 和 `BRIDGE_SEAL_KEY`。配置行为以当前工具链和 [Wrangler 配置文档](https://developers.cloudflare.com/workers/wrangler/configuration/)为准。

### 5. 连接自己的 dot 并订阅

在具备资格的 ChatGPT/Codex 客户端中创建自定义 MCP 连接，服务器 URL 为自己的 Origin 加 `/mcp`，选择 OAuth。完成 Bridge 同意页和 GitHub 登录，并使用配置中的所有者身份。账号资格和 UI 可能变化，以 [OpenAI MCP Events](https://developers.openai.com/plugins/build/mcp-events)与当前客户端为准。项目没有共用公共插件 ID，也不包含别人的现成连接。

服务支持 Dynamic Client Registration 与 CIMD。元数据发现失败时检查具体兼容性错误，不要关闭认证。OAuth 成功只证明身份链路接通。

在**目标个人 dot** 中要求读取 `phone_devices`，确认 `iphone-primary`，订阅 `phone.event`，过滤该设备和本人选择的 kinds，再读取 `phone_bridge_status` 确认到期时间。通知为 `notification`，充电为 `device_status`，专注为 `focus`。回调地址和签名 Secret 由接收客户端生成，不需要本人填入聊天或仓库。

订阅默认及最长 24 小时，需要客户端续期；代码不保证客户端永久刷新，也不自动回放断档事件。必须跨过原到期点，再验证真实新事件，才能形成长期续期证据。

### 6. 选择手机模块，最后开启上传

通知、充电、Focus 三项可独立选择任意组合。从 [Beta Release 附件](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1)下载所需文件，按[模板导入说明](iphone-shortcuts.md)配置；Focus 需要 On／Off 两份。每份已内置上传动作，无需旧辅助快捷指令。本人手机只填写 endpoint、`iphone-primary` 和原始设备上传 token；Focus 模板还需填写所选模式名称。在 iPhone 补加并核对系统触发器，设置期间保持自动化关闭。指南另行保留高级手工路径。

核对 Worker、owner、订阅、手机输入绑定及来源范围后，在控制台将 `ENABLE_INGEST` 改为字符串 `true`，应用更改并检查 `/health`。仅切换开关无需重装依赖或重复全部未变化测试。

先发无私人内容的合成事件，再测试实际选择的通知、锁屏充电和 Focus 触发。分别记录手机运行、Bridge `accepted:true`、回调 ACK、匹配事件 ID 的目标 dot 实际处理。只有最后一步证明该次事件被 dot 处理；验收材料不要包含私人正文和凭据。

## 高级：本地 CLI 部署与恢复

此路径保留第一版手工工具，供开发和恢复使用。命令在本人的项目副本运行。Cloudflare 登录、创建 KV、部署、上传 Secret 会访问并修改自己的云账号，不要针对别人的 Worker 执行。

### 准备被忽略的本地配置

使用 Node.js 24、npm 与现有锁文件（`@cloudflare/workers-oauth-provider` 1.2.1、Wrangler 4.144.0），无需全局安装 Wrangler：

```sh
node --version
npm ci --ignore-scripts --no-audit --no-fund
cp -n wrangler.example.jsonc wrangler.local.jsonc
export DOTLINK_CONFIG=wrangler.local.jsonc
```

`cp -n` 保留已有文件。`wrangler.local.jsonc`、`work/`、`.env*`、`.dev.vars*` 必须被 Git 忽略。公开 `wrangler.jsonc` 是无秘密的默认部署文件，不要在里面填写私人账号信息。在被忽略的本地副本中选择独立 Worker 的 `name`、`account_id`，保留 `keep_vars:true`，环境变量继续由控制台管理。

所有 CLI 操作使用 `node scripts/wrangler.mjs …`。包装器也会为设备登记和身份脚本内部调用应用 `DOTLINK_CONFIG`；常规配置和脱敏日志保留在 `work/`，遥测关闭。真实部署仍继承当前进程环境，需确认没有意外选择其他账号凭据。本地目录隔离不是云权限隔离。

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs whoami
```

完成浏览器授权，核对目标账号。这里使用标准 [Wrangler 账号命令](https://developers.cloudflare.com/workers/wrangler/commands/general/)，不修改 Keychain 或全局工具。确认实际 Origin；下文 `https://bridge.example.com` 均为占位符。

### 创建资源，在上传关闭时部署

全新手工部署尚无 OAuth KV 时创建：

```sh
node scripts/wrangler.mjs kv namespace create OAUTH_KV --update-config=false
```

把返回 ID 写入**被忽略的** `wrangler.local.jsonc` 的 `OAUTH_KV` 绑定，并保留其他绑定。已有部署核对账号后使用原定 KV，不要为了绕过问题新建替代资源。参阅 [Wrangler KV 命令](https://developers.cloudflare.com/kv/reference/kv-commands/)。

保留 Durable Object `BRIDGE`、类 `PhoneBridge`、SQLite migration `v1`。远程写入前审阅本地配置。代码有变化时运行一次必要检查：

```sh
npm test
npm run test:runtime
npm run check
npm run deploy
curl --fail --silent --show-error https://bridge.example.com/health
```

前三项为合成检查和打包；`deploy` 才会修改云端。runtime 使用本地 workerd 和隔离回调，`check` 只作 dry run，不能证明线上授权可用。按前文在控制台配置变量，保持 `ENABLE_INGEST=false`。全新服务缺少变量时也默认关闭上传。

### 可选：初次身份配置脚本

优先使用前文浏览器／控制台流程。旧脚本会从本地私有文件上传三个 Secrets，仅用于全新部署，或确认保留了**原有正确封装密钥**的恢复。它不会检查新生成的本地 key 是否将覆盖远程旧 key；没有确认前不要在既有服务上执行。

```sh
mkdir -p work/private
chmod 700 work/private
cp -n examples/github-oauth.example.json work/private/github-oauth.json
chmod 600 work/private/github-oauth.json
```

用本地编辑器填写 Client ID 和 Client Secret，不要打印文件内容。保持 `DOTLINK_CONFIG` 已设置，再运行：

```sh
node scripts/configure-identity.mjs
```

脚本生成或复用 `work/private/bridge-seal-key`，通过 stdin 发送 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`BRIDGE_SEAL_KEY`，不启用上传。私密备份相关文件；密钥轮换需要另外的迁移安排。

### 可选：首次设备登记脚本

在首次 dot 订阅前，且没有任何既有 registry 时使用：

```sh
BRIDGE_INGEST_URL='https://bridge.example.com/ingest' node scripts/register-iphone.mjs
```

替换 URL，并保留 `DOTLINK_CONFIG`。URL 必须为 HTTPS、准确 `/ingest`，不得包含用户名密码、查询参数、fragment 或空白；远程查询和创建凭据前先校验 URL。token 不进入命令参数。

脚本查询远程 Secret 名称，只要已有 `DEVICE_REGISTRY` 就拒绝，无论其中内容为何。没有本地文件时，以 `0600` 创建 `work/private/iphone-device.json`；已有文件则校验、复用并要求 endpoint 完全一致。云端仅登记 token 的 SHA-256 摘要，不启用上传。上次结果不明时检查 Secret 名称和本地文件是否存在，不要删除 registry 或 token 来重试。此脚本不是设备管理后台。

按主路径完成 dot 和手机设置。变量继续由控制台管理，不要将浏览器新生成的凭据与旧 CLI registry 混用。

## 运行、暂停与域名变更

- 业务事件按发生时间保留七天；平台备份和 dot 的对话／记忆有独立保留机制。
- 手机没有 outbox；服务器重试不能补回从未上传成功的事件。
- 同设备／ID／内容会去重，内容改变会冲突；重试保留原事件 ID。
- webhook 有限重试；上传 `202` 或回调 `2xx` 都不能单独证明 dot 已处理。
- 无 VPN 可达性须在实际手机和网络验证；自定义域名或 `/health` 成功不足以证明。

暂停时先关闭手机自动化，再在控制台设置 `ENABLE_INGEST=false` 并应用，停止服务器接收和后续投递。这不会删除保留数据或撤回已发送副本。恢复前重查订阅期限和设备权限。

优先让 `/mcp`、`/authorize`、`/callback`、`/oauth/*`、`/ingest` 同源，不设置 `AUTH_ORIGIN`。高级场景可将另一域名绑定到**同一 Worker**供手机 `/ingest` 使用，而保持 canonical MCP 和 callback 不变。登记时使用最终上传 endpoint；脚本拒绝自动改写与已有本地 endpoint 不一致的值。

`AUTH_ORIGIN` 是独立授权 Origin，不是手机上传域名。改变它会影响 OAuth 发现和 GitHub callback，可能需要重新发现／连接。不要随意切换域名或关闭 Origin 校验来修复授权错误。
