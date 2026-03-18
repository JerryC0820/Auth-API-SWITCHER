Task: Implement a local authorization host mode inside the current project and keep the visual style aligned with the existing dark glass macOS-like shell.
任务：在当前项目内实现本地授权主机模式，并让视觉风格保持与现有深色毛玻璃 macOS 风外壳一致。

Start time: 2026-03-18 01:59:16
开始时间：2026-03-18 01:59:16

End time: 2026-03-18 02:18:24
结束时间：2026-03-18 02:18:24

Total time: 00:19:08
总耗时：00:19:08

Modified files: package.json, scripts/restart-dev.ps1, electron/main.ts, electron/preload.ts, electron/auth/auth-service.ts, electron/auth/device-identity.ts, electron/auth/license-code.ts, electron/auth/license-host-service.ts, shared/ipc.ts, shared/types.ts, src/App.tsx, src/components/LicenseHostView.tsx, src/shell.css, records/2026-03-18-local-license-host-mode.md, Codex.md
修改文件：package.json、scripts/restart-dev.ps1、electron/main.ts、electron/preload.ts、electron/auth/auth-service.ts、electron/auth/device-identity.ts、electron/auth/license-code.ts、electron/auth/license-host-service.ts、shared/ipc.ts、shared/types.ts、src/App.tsx、src/components/LicenseHostView.tsx、src/shell.css、records/2026-03-18-local-license-host-mode.md、Codex.md

Summary: Added a local license-host flow inside the current Electron + React project, including a host key/signing service, signed activation-code verification in AuthService, IPC/preload contracts for host state and code issuing, a new glass-style license-host renderer view, a main-app action to open the local host window, and a --license-host dev/runtime entry. The host UI follows the same dark rounded glass shell instead of introducing a separate admin-style UI.
修改摘要：已在当前 Electron + React 项目内接入本地授权主机流程，包括主机密钥/签发服务、AuthService 中对签名授权码的验签分支、主机状态与签发动作的 IPC/preload 契约、新的毛玻璃风本地主机渲染视图、主应用里打开本地主机窗口的入口，以及 --license-host 的开发态/运行态启动入口。主机界面延续了当前深色圆角玻璃壳，没有另起一套后台风。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
