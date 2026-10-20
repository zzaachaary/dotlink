# Synthetic examples

[English](README.md) | [简体中文](README.zh-CN.md) · [Home](../README.md)

This directory contains no real notifications, device credentials, or personal locations. JSON files illustrate formats and do not send themselves.

- `notification.json`: a fictional ordinary app notification.
- `device-status.json`: a protocol-only example of fictional charging state, preserving numeric and Boolean types; not a current installation module.
- `focus.json`: a protocol-only example of a fictional mode named Work turning on; not a current installation module.
- `github-oauth.example.json`: two empty configuration fields; copy to an ignored private local path before entering your own values for the advanced CLI flow.

IDs and dates are fixed demonstration values. Do not repeatedly upload the examples unchanged. New real events need fresh IDs, actual occurrence times, and your registered device ID. Retries must preserve the same event's ID, time, and content.

Examples contain no phone token. A real token belongs only in the local uploader’s Authorization header, never public files or URLs. See the [protocol reference](../docs/protocol.md). The current installation path offers only the [signed Notifications shortcut](https://github.com/zzaachaary/dotlink/releases/download/v0.1.0/DotLink-Notifications.shortcut); follow the [phone import guide](../docs/iphone-shortcuts.md). Charging, Focus On and Focus Off are **Coming soon**. These JSON examples preserve supported protocol formats and are not installable shortcuts or evidence that a collector works. The historical four-file release record remains in the [validation record](../docs/validation-record.md); each new notification installation still needs actual trigger and delivery acceptance.
