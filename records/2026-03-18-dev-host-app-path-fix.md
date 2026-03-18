Task: Fix the local license-host startup error where Electron resolves the app path incorrectly.
任务：修复本地授权主机启动时 Electron 错误解析应用路径的问题。

Start time: 2026-03-18 10:26:47
开始时间：2026-03-18 10:26:47

End time: 2026-03-18 10:35:34
结束时间：2026-03-18 10:35:34

Total time: 00:08:47
总耗时：00:08:47

Modified files: scripts/restart-dev.ps1, records/2026-03-18-dev-host-app-path-fix.md, Codex.md
修改文件：scripts/restart-dev.ps1、records/2026-03-18-dev-host-app-path-fix.md、Codex.md

Summary: Updated the development Electron loop to launch the app from the project root using '.' instead of re-passing the absolute workspace path, and wrapped the loop in Push-Location/Pop-Location so Windows no longer mis-resolves the app path to a broken relative form like ...\\Oauth切换免登版\\D when starting the local license host.
修改摘要：已更新开发态 Electron 循环，让它在项目根目录下用 `.` 作为应用入口，而不是再次传递绝对工作区路径；同时用 Push-Location/Pop-Location 固定工作目录，避免 Windows 在启动本地授权主机时把应用路径错误解析成 `...\\Oauth切换免登版\\D` 这类损坏的相对路径。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
