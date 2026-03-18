# Task Diff Record

- Task: 启动脚本与重启链路修复
- Start Time: 2026-03-14 13:10:44
- End Time: 2026-03-14 13:17:36
- Total Time: 00:06:52
- Modified Files: start-app.bat; scripts/restart-dev.ps1; electron/main.ts
- Summary: 修复 start-app.bat 在 Windows cmd 下因 LF 换行和带 & 路径导致的启动异常；将 restart-dev.ps1 改为兼容 Windows PowerShell 5.1 的写法，避免重启脚本自杀；同时为主进程开发态重启补充 NoProfile、cwd 与 env，确保右上角重启按钮能稳定拉起开发环境。
- Sync Status: functional-files-updated-no-runtime-overwrite
