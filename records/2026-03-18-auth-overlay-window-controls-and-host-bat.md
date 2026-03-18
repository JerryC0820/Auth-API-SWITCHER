Task: Center the authorization overlay, move and enlarge the authorized entry button, remove the customer-side host entry, restore visible custom window controls, add a root BAT launcher for the local license host, and move restart access into the user center and host page.
任务：让授权遮罩上下居中、移动并放大已授权时的进入按钮、移除顾客端主机入口、恢复可见的自定义窗口控制、补根目录本地授权主机启动 BAT，并把重启入口移到用户中心和授权主机页面。

Start time: 2026-03-18 03:04:53
开始时间：2026-03-18 03:04:53

End time: 2026-03-18 03:20:54
结束时间：2026-03-18 03:20:54

Total time: 00:16:01
总耗时：00:16:01

Modified files: src/App.tsx, src/shell.css, src/components/UserCenterDrawer.tsx, src/components/LicenseHostView.tsx, electron/main.ts, electron/preload.ts, shared/ipc.ts, start-license-host.bat, records/2026-03-18-auth-overlay-window-controls-and-host-bat.md, Codex.md
修改文件：src/App.tsx、src/shell.css、src/components/UserCenterDrawer.tsx、src/components/LicenseHostView.tsx、electron/main.ts、electron/preload.ts、shared/ipc.ts、start-license-host.bat、records/2026-03-18-auth-overlay-window-controls-and-host-bat.md、Codex.md

Summary: Centered the authorization overlay inside the visible window area and moved the authorized entry button into the left account card as a larger pulsing CTA; removed the customer-side local-host entry from the auth overlay; changed the header update-status icon; moved app restart access into the user center; exposed avatar editing more clearly in the user drawer; added a real frameless window-control bar plus restart action to the local license host page; made window state IPC target the current sender window and added a dedicated close-window IPC; and added a root start-license-host.bat launcher for opening the host stack directly from the project root.
修改摘要：已把授权遮罩改为在可见窗口区域内上下居中，并把已授权时的进入按钮移到左侧账号卡底部，改成更大的闪烁主操作按钮；移除了顾客端授权页里的本地授权主机入口；替换了顶栏更新状态图标；把应用重启入口移到了用户中心；让头像修改入口在用户中心里更明显；给本地授权主机页面补上了真正的无边框窗口控制条和重启动作；让窗口状态 IPC 作用于当前发起请求的窗口并新增独立的关闭窗口 IPC；同时在项目根目录新增了可直接启动授权主机的 start-license-host.bat。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
