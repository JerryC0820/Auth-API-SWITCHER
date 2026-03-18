Task: Remove the extra outer frame around the local license-host window and make the full host interface fit the window properly.
任务：去掉本地授权主机窗口外围多余的大框，并让主机完整界面更好地贴合窗口显示。

Start time: 2026-03-18 10:41:51
开始时间：2026-03-18 10:41:51

End time: 2026-03-18 10:46:06
结束时间：2026-03-18 10:46:06

Total time: 00:04:15
总耗时：00:04:15

Modified files: electron/main.ts, src/shell.css, records/2026-03-18-license-host-shell-full-window.md, Codex.md
修改文件：electron/main.ts、src/shell.css、records/2026-03-18-license-host-shell-full-window.md、Codex.md

Summary: Removed the extra centered outer shell feel from the local license-host page by letting the host shell fill the whole window, removed the large rounded outer border and shadow, preserved only the internal section cards, enabled full-window scrolling, and increased the default host window size so the lower functional areas are less likely to be clipped.
修改摘要：已去掉本地授权主机页面那层居中的大外壳观感，让主机页壳层直接铺满整个窗口，移除了外围大圆角边框和外阴影，只保留内部功能卡片，并启用了整窗滚动；同时把主机窗口默认尺寸调大，降低底部功能区被裁切的概率。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
