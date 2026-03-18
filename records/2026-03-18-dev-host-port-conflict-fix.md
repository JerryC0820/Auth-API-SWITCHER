Task: Fix the local license-host development startup failure caused by the existing dev renderer occupying port 5173.
任务：修复由于现有开发前端已占用 5173 端口而导致的本地授权主机开发启动失败问题。

Start time: 2026-03-18 04:20:48
开始时间：2026-03-18 04:20:48

End time: 2026-03-18 04:32:02
结束时间：2026-03-18 04:32:02

Total time: 00:11:14
总耗时：00:11:14

Modified files: package.json, scripts/restart-dev.ps1, records/2026-03-18-dev-host-port-conflict-fix.md, Codex.md
修改文件：package.json、scripts/restart-dev.ps1、records/2026-03-18-dev-host-port-conflict-fix.md、Codex.md

Summary: Fixed the local license-host development startup chain so npm run dev:host no longer tries to start a second Vite on port 5173 when the renderer is already running, and so the --license-host flag is passed through a stable PowerShell script parameter instead of fragile inline command quoting.
修改摘要：已修复本地授权主机的开发启动链路，让 npm run dev:host 在前端已占用 5173 时不再重复启动第二个 Vite，同时把 --license-host 参数改为通过稳定的 PowerShell 脚本参数传递，而不是继续依赖脆弱的内联命令转义。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
