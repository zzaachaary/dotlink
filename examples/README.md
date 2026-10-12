# Synthetic examples

[English](README.md) | [简体中文](README.zh-CN.md) · [Home](../README.md)

This directory contains no real notifications, device credentials, or personal locations. JSON files illustrate formats and do not send themselves.

- `notification.json`: a fictional ordinary app notification.
- `device-status.json`: fictional charging state, preserving numeric and Boolean types.
- `focus.json`: a fictional mode named Work turning on.
- `github-oauth.example.json`: two empty configuration fields; copy to an ignored private local path before entering your own values for the advanced CLI flow.

IDs and dates are fixed demonstration values. Do not repeatedly upload the examples unchanged. New real events need fresh IDs, actual occurrence times, and your registered device ID. Retries must preserve the same event's ID, time, and content.

Examples contain no phone token. A real token belongs only in the local uploader's Authorization header, never public files or URLs. See the [protocol reference](../docs/protocol.md). Importable iPhone templates are still pending and are not represented by these JSON examples.
