# 合成示例

[English](README.md) | [简体中文](README.zh-CN.md) · [首页](../README.zh-CN.md)

本目录没有真实通知、设备凭据或个人位置。JSON 文件用于解释格式，不会自行发送数据。

- `notification.json`：模拟一个普通 App 通知。
- `device-status.json`：模拟充电状态，保留数字和布尔类型。
- `focus.json`：模拟名为 Work 的模式开启。
- `github-oauth.example.json`：两个空配置字段；复制到被忽略的本地私有路径后，再由本人填写。

事件 ID 和时间均为固定演示值；不要直接反复上传示例。真实新事件应使用新的 ID 和实际事件时间，设备 ID 应匹配自己的登记。失败重试则要保留同一事件的 ID、时间与内容。

这些示例不包含手机 token。真实 token 只进入本地上传器的 Authorization header，不能填入公开文件或 URL。文件格式详见 [协议参考 ](../docs/zh-CN/protocol.md)。

可导入手机模板仍待完成；本目录 JSON 示例不等同于快捷指令安装包。
