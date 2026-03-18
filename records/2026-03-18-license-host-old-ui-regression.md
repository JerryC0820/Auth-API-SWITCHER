Task: Diagnose and fix why the local license host launches into the old main UI instead of the dedicated host interface.
任务：排查并修复本地授权主机为什么会启动成旧主界面，而不是独立的主机界面。

Start time: 2026-03-18 12:28:30
开始时间：2026-03-18 12:28:30

End time: 2026-03-18 12:53:09
结束时间：2026-03-18 12:53:09

Total time: 00:24:39
总耗时：00:24:39

Modified files: electron/main.ts, scripts/restart-dev.ps1, records/2026-03-18-license-host-old-ui-regression.md, Codex.md
修改文件：electron/main.ts、scripts/restart-dev.ps1、records/2026-03-18-license-host-old-ui-regression.md、Codex.md

Summary: Traced the old host UI back to stale legacy build outputs under release and dist, then hardened the dev host startup chain so it only reuses port 5173 when the owner is the current project's Vite process, and updated the Electron dev renderer loading path so development windows no longer silently fall back to stale dist output when the live dev server is missing.
修改摘要：已把旧主机界面溯源到 release 与 dist 下的陈旧构建产物，并加固开发态主机启动链：只有当 5173 端口的占用者确认为当前项目的 Vite 进程时才允许复用；同时更新 Electron 的开发态前端加载路径，让开发窗口在缺少实时 dev server 时不再悄悄回退到陈旧的 dist 产物。

Sync status: Functional files only; no release folder deletion, runtime overwrite, or repository push performed.
同步状态：仅修改功能文件；未删除 release 目录，未执行运行目录覆盖，也未执行仓库推送。
