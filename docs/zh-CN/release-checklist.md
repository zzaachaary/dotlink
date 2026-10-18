# 发布检查表

[English](../release-checklist.md) | [简体中文](release-checklist.md) · [首页](../../README.zh-CN.md)

DotLink 按同一首版维护源码与安装说明。历史 `v0.1.0-beta.1` 标签及附件保留，不新增版本命名来替代验收。下方分开记录已有证据和未完成项；公开仓库不等于所有手机路径已经稳定。详见[验证记录](validation-record.md)。

## 首个预发布版本完成记录（2026-10-12）

- [x] 2026-10-10 本地基线单元 51 项、隔离 runtime 6 项通过；之后发布审计工具的定向测试 11 项通过。
- [x] 四份脱敏 Apple Anyone 导出完成，安装问题及动作引用核对通过，均在 Mac 重新导入。
- [x] 原通知／上传器／设备状态／Focus 原生流程与导出协议定向对照：POST、设备 Bearer 认证、事件字段及 payload 一致；独立模板的 JSON 动作与旧共用上传器封装不同。
- [x] 一轮隔离真机测试中，充电接入／断开事件与 Bridge 记录及所有者 dot 画面匹配。
- [x] 从审阅后的代码及唯一文档原稿导出清单中的 81 个仓库文本文件，已检查最终包与逐文件哈希。
- [x] GitHub 预发布已上传四份单独审阅的签名 `.shortcut` 和 SHA-256 校验文件；它们不属于仓库文本清单。
- [x] 已保留 LICENSE、NOTICE 和双语配置说明，排除已经填写私人配置的手机副本。
- [x] 已在所有者明确授权后公开仓库与预发布版本，同步下载入口和 Beta 文案；保留原标签。

## 已有部署与源码证据

- [x] 2026-10-12 公开仓库／Release／匿名附件及 Beta CI 已检查；当时四项必填 Secrets 的部署顺序问题随后已修复。
- [x] 2026-10-12 独立 CLI 部署、真实 setup、owner OAuth、MCP 订阅与合成事件接收／查询／ACK 通过；原个人 Bridge 保留。
- [x] 2026-10-13 一次手动 iPhone Charging 上传及对应 dot 结果通过；自动触发、首次／重复可靠性未因此通过。
- [x] 2026-10-15 同一首版来源的 Hosted Deploy 创建全新资源，实际 setup 生成、配置与 health 通过；对应 GitHub CI 的 73 项单元／17 项 runtime 通过。这些是当日证据，不替代后续修改的检查。
- [ ] 在同一个新安装上完成 owner OAuth、dot 订阅和所选手机模块的全链路。
- [x] 2026-10-18 最终 88 文件白名单检查通过；两个源码导出全部 88 份一致，35 份文档／许可文本与唯一原稿一致，原始 5 个 Release 附件摘要匹配。
- [ ] 在[当前 main 工作流](https://github.com/zzaachaary/dotlink/actions/workflows/check.yml?query=branch%3Amain)确认最终提交的 CI 结果；上方历史 CI 计数不能替代它。

## 手机手动验收

- [ ] 按[部署指南](deployment.md)完整走一次：部署 → 7 项配置 → MCP 订阅 → 手动 Charging。
- [ ] Charging 手动通过后，锁屏插入／拔出各一次。
- [ ] 本人选择的 Focus 同模式 On/Off，以及通知单来源实际触发；首次／重复分别记录。旧 Sleep/pop 结果不能验证绑定 DND 的新模板。
- [ ] 需要公开可靠性承诺时，再验证跨原租约期限的新事件、恢复网络／重启、权限撤销和持续观察。无手机 outbox 或 cursor replay，不承诺离线必达、瞬时投递或全部 App。

短演示与社交帖子按实际通过范围撰写，由所有者另行发布；它们不是安装成功证据。

## 检查单独维护的文档原稿

执行 `npm run check:release -- --docs-root /path/to/public-documents`，该目录按公开相对路径包含全部 Markdown、LICENSE 和 NOTICE。缺失、非文本或符号链接将失败，不会退回冻结副本；源码仍取自代码目录，此命令不导出文件。

原稿通过不代表未来压缩包已通过。最终导出仓库仍须执行默认发布检查并比对逐文件哈希。不得上传整个笔记库或内部验收记录。
