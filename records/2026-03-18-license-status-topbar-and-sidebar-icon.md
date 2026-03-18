Task: Show authorization remaining time in the shell header, remove the redundant root-directory pill there, and add a larger OpenAI icon to the current-profile card.
任务：在主界面顶部显示授权剩余时长，移除顶部冗余的根目录展示，并在当前 Profile 卡片里加入更大的 OpenAI 图标。

Start time: 2026-03-18 02:50:09
开始时间：2026-03-18 02:50:09

End time: 2026-03-18 02:54:20
结束时间：2026-03-18 02:54:20

Total time: 00:04:13
总耗时：00:04:13

Modified files: src/App.tsx, src/shell.css, records/2026-03-18-license-status-topbar-and-sidebar-icon.md, Codex.md
修改文件：src/App.tsx、src/shell.css、records/2026-03-18-license-status-topbar-and-sidebar-icon.md、Codex.md

Summary: Replaced the shell-header root-directory pill with a live authorization-status pill that shows the current license type plus either a precise second-level countdown or “永久”; kept the countdown updating in the main UI even when the auth overlay is closed; and added a larger OpenAI glass icon badge to the top-right corner of the current-profile card in the left sidebar.
修改摘要：已把主界面顶栏里的根目录胶囊替换成实时授权状态胶囊，显示当前授权类型以及精确到秒的倒计时或“永久”；同时让这个倒计时在主界面里也会持续刷新，不再依赖授权遮罩打开；并在左侧当前 Profile 卡片右上角加入了更大的 OpenAI 毛玻璃图标徽记。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
