Task: Force the app to use the user-provided openai.png for native window and tray icons, and fix the missing tray icon.
任务：强制应用使用用户提供的 openai.png 作为原生窗口和托盘图标，并修复托盘图标消失的问题。

Start time: 2026-03-16 22:58:09
开始时间：2026-03-16 22:58:09

End time: 2026-03-16 23:05:33
结束时间：2026-03-16 23:05:33

Total time: 00:07:24
总耗时：00:07:24

Modified files: public/assets/icons/openai.png; electron/main.ts; src/App.tsx; src/shell.css; records/2026-03-16-openai-png-tray-icon-fix.md; Codex.md
修改文件：public/assets/icons/openai.png；electron/main.ts；src/App.tsx；src/shell.css；records/2026-03-16-openai-png-tray-icon-fix.md；Codex.md

Summary: Copied the user-provided openai.png into a dedicated public/assets/icons folder, switched the native window and tray icon pipeline to copy and load that PNG instead of generating a runtime SVG icon, switched the visible header/windowbar brand icon to the same PNG, then restarted the dev app and confirmed the runtime icon cache was rebuilt as a non-empty openai.png file.
修改摘要：把用户提供的 openai.png 复制到专门的 public/assets/icons 目录，原生窗口和托盘图标链路改为直接复制并加载这张 PNG，而不再生成运行时 SVG 图标，同时把界面可见的头部/窗口栏图标也切到同一张 PNG，随后重启开发应用并确认运行时图标缓存已经重新生成了非空的 openai.png 文件。

Sync status: not synced
同步状态：未同步
