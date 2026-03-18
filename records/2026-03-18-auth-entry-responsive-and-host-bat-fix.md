Task: Move the authorized entry CTA between the lower-left card and the hero-right area based on window height, and fix the local host BAT launcher so it can be opened normally from Explorer.
任务：根据窗口高度在左下卡片和顶部 Hero 右侧之间切换已授权入口按钮，并修复本地主机 BAT 启动器，让它能从资源管理器正常打开。

Start time: 2026-03-18 03:23:48
开始时间：2026-03-18 03:23:48

End time: 2026-03-18 03:28:40
结束时间：2026-03-18 03:28:40

Total time: 00:04:52
总耗时：00:04:52

Modified files: src/App.tsx, src/shell.css, start-license-host.bat, records/2026-03-18-auth-entry-responsive-and-host-bat-fix.md, Codex.md
修改文件：src/App.tsx、src/shell.css、start-license-host.bat、records/2026-03-18-auth-entry-responsive-and-host-bat-fix.md、Codex.md

Summary: Added a compact-height hero-side entry CTA for already authorized devices while keeping the larger lower-left entry CTA in normal-height windows, and switched the local-host BAT launcher to a pure cmd/npm.cmd flow with Windows CRLF line endings so Explorer launches no longer break into “not recognized” fragments.
修改摘要：已为“已授权设备进入主页”补上一个在矮窗口下显示于 Hero 右侧的紧凑入口，同时保留常规窗口下左下角更大的进入按钮；并把本地主机 BAT 启动器改成纯 cmd/npm.cmd 方案，且使用 Windows 标准 CRLF 行尾，避免资源管理器双击时再被拆成“不是内部或外部命令”的碎片报错。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
