# 合成示例

[English](README.md) | [简体中文](README.zh-CN.md) · [首页](../README.zh-CN.md)

本目录没有真实通知、设备凭据或个人位置。JSON 文件用于解释格式，不会自行发送数据。

- `notification.json`：模拟一个普通 App 通知。
- `device-status.json`：仅用于解释协议的模拟充电状态，保留数字和布尔类型，不是当前安装模块。
- `focus.json`：仅用于解释协议的模拟 Work 模式开启，不是当前安装模块。
- `github-oauth.example.json`：两个空配置字段；复制到被忽略的本地私有路径后，再由本人填写。

事件 ID 和时间均为固定演示值；不要直接反复上传示例。真实新事件应使用新的 ID 和实际事件时间，设备 ID 应匹配自己的登记。失败重试则要保留同一事件的 ID、时间与内容。

这些示例不包含手机 token。真实 token 只进入本地上传器的 Authorization header，不能填入公开文件或 URL。文件格式详见 [协议参考 ](../docs/zh-CN/protocol.md)。

当前安装路径仅提供[签名的 Notifications 通知快捷指令](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut)，步骤见[手机导入说明](../docs/zh-CN/iphone-shortcuts.md)。Charging、Focus On 和 Focus Off 均为**即将推出**。本目录 JSON 示例保留协议支持的格式，不是快捷指令安装包，也不能证明对应采集器可用。四份文件的历史发布记录保留在[验证记录](../docs/zh-CN/validation-record.md)；每次新通知安装仍需实际触发和投递验收。
