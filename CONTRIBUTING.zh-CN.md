# 参与贡献

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) · [首页](README.zh-CN.md)

欢迎改进可靠性、安装体验、文档与独立平台采集端。开始前请读 [架构](docs/zh-CN/architecture.md)、[安全说明](SECURITY.zh-CN.md) 和 [路线图](docs/zh-CN/roadmap.md)。

当前为实验性 [Beta `v0.1.0-beta.1`](https://github.com/zzaachaary/dotlink/releases/tag/v0.1.0-beta.1)，安装和设备验证仍有明确的后续项。可在 [Issues](https://github.com/zzaachaary/dotlink/issues) 提交可复现报告，在 [Pull requests](https://github.com/zzaachaary/dotlink/pulls) 提交范围集中的改动；报告不应包含私人事件或凭据。

## 本地开发

使用 Node.js 24 和现有 npm 锁文件。安装依赖需访问 npm registry：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:runtime
```

`test:runtime` 会启动临时 workerd 并使用 loopback 端口；测试结束后自动释放。受限环境不能绑定端口时，应报告未运行，不要把跳过当作通过。测试仅使用合成内容，禁止改为访问真实手机或真实 dot。

需要本地 Worker 调试时，按部署指南创建被忽略的配置，运行 `npm run dev`；只监听 `127.0.0.1`。需要检查 bundle 时运行 `npm run check`，它使用 Wrangler dry-run，不进行部署。`npm run deploy` 会改变云资源，应仅由部署者显式执行。

## 改动要求

保持通知原文为数据，不能把来自通知的指令升级为系统命令。扩展协议须同时更新严格校验、存储、查询和边界测试，不默认接受任意 JSON。处理零、false、缺失字段、乱序、重复和真实测量时间，避免用接收时间冒充发生时间。

行为改动先用最小合成用例复现，再执行相关测试；只有代码风险需要时才扩大检查，不重复构建未变化目标。测试 fixture 不能进入部署路径，不能为了通过测试放宽鉴权或关闭错误处理。

提交说明应写清问题、结果、验证与尚未验证的边界。手机自动化、Bridge 持久化、回调 ACK、dot 实际处理分别报告。不要把服务端协议支持描述成手机功能已经启用。

提交前检查差异和文件清单。只提交源码、测试、公开文档与无秘密示例，保留第三方许可证。不要附上原始调试会话、个人云配置、录屏、真实事件或带令牌的快捷指令。

英文与简体中文文档同步维护，每页提供语言切换及同语言导航。保留注明日期的历史证据，新增验证记录时不要把旧数量改成新结果。区分“可下载的实验性模板”和“已验证的安装路径”，逐模块写明实际导入与真实触发证据，包括待验证项；实际公开部署不存在时，不宣称已完成部署。

## 贡献许可

向本项目提交并同意纳入的原创贡献，按项目相同的 [PolyForm Noncommercial License 1.0.0](LICENSE) 提供。只提交你有权按该许可证授权的内容，并保留第三方材料原有的许可与声明。

贡献者保留其贡献的著作权；提交贡献不构成版权转让或额外商业授权。后续如需对他人贡献作超出该许可证范围的授权，仍须取得相应权利人的许可。
