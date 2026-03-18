Task: Add clickable large QR preview for the auth-gate support QR and investigate/fix the local license host startup failure.
任务：为授权界面的客服二维码增加可点击的大图预览，并排查修复本地主机启动失败问题。

Start time: 2026-03-18 11:08:05
开始时间：2026-03-18 11:08:05

End time: 2026-03-18 11:31:56
结束时间：2026-03-18 11:31:56

Total elapsed: 00:23:51
总耗时：00:23:51

Modified files: src/App.tsx; src/shell.css; src/main.tsx; electron/main.ts; scripts/restart-dev.ps1; package.json; records/2026-03-18-auth-gate-qr-preview-and-host-start-fix.md; Codex.md
修改文件：src/App.tsx；src/shell.css；src/main.tsx；electron/main.ts；scripts/restart-dev.ps1；package.json；records/2026-03-18-auth-gate-qr-preview-and-host-start-fix.md；Codex.md

Summary: Added clickable QR cards on the auth-gate support panel and a large preview dialog for the configured customer-service QR. Stabilized the local host dev/start chain by introducing a dedicated host launch mode, reusing the existing Vite renderer when port 5173 is already occupied, propagating license-host mode through a stable script path, and explicitly titling the host window as Auth API Switcher License Host. Verified both `npm run dev:host` and `start-license-host.bat` can launch separate host windows, and confirmed host-mode electron processes with the `license-host-mode` argument are present.
修改摘要：为授权页支持区二维码增加了可点击卡片和大图预览弹窗；同时通过专用主机启动模式、在 5173 已占用时复用现有 Vite 前端、用稳定脚本链路传递主机参数，并把主机窗口标题明确设为 Auth API Switcher License Host，稳定了本地主机开发/启动链路。已实测 `npm run dev:host` 与 `start-license-host.bat` 都能拉起独立主机窗口，并确认存在带 `license-host-mode` 参数的主机 electron 进程。

Sync status: Not synced to any external runtime directory or remote repository.
同步状态：未同步到任何外部运行目录，也未推送到远程仓库。
