Task: Improve copy feedback, machine-fingerprint copy behavior, auth-center entry flow, and expired-license warnings in the current client UI.
任务：改进当前客户端里的复制反馈、机器指纹复制行为、授权中心入口流程，以及过期授权警示效果。

Start time: 2026-03-18 02:30:25
开始时间：2026-03-18 02:30:25

End time: 2026-03-18 02:46:47
结束时间：2026-03-18 02:46:47

Total time: 00:16:22
总耗时：00:16:22

Modified files: src/App.tsx, src/shell.css, src/components/UserCenterDrawer.tsx, src/components/LicenseHostView.tsx, records/2026-03-18-auth-center-copy-feedback-and-alerts.md, Codex.md
修改文件：src/App.tsx、src/shell.css、src/components/UserCenterDrawer.tsx、src/components/LicenseHostView.tsx、records/2026-03-18-auth-center-copy-feedback-and-alerts.md、Codex.md

Summary: Changed copy feedback to a centered in-app toast that fades out quickly; made the client-side device-number and machine-fingerprint cards copy the full underlying values while still displaying a shortened fingerprint preview; redirected the “license center” entry to the same unified auth overlay used for unauthorized access, added a manual “enter homepage” action when already authorized, and added urgent red warning / blinking expiry presentation when no usable license time remains; adjusted the local host view so it no longer auto-fills the host machine as the default customer target and now labels host-local fingerprint actions more clearly.
修改摘要：已把复制反馈改成软件中间出现并快速渐隐的提示；让客户端里的设备编号和机器指纹卡片可以点击复制真实完整值，同时界面继续只显示缩略指纹；把“授权中心”入口改成直接进入当前这张统一授权界面，并在已授权状态下补了“进入主页”按钮，同时在没有可用授权时长时加入了红色警示和闪烁的到期展示；另外调整了本地主机页面，不再默认把主机本机自动带成客户目标设备，并把主机本机指纹相关文案标得更清楚。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
