Task: Replace the placeholder avatar-edit notice with a real local avatar picker that updates the visible avatar and persists locally.
任务：把占位的头像修改提示替换成真实可用的本地头像选择器，并让可见头像立即更新且本地持久化。

Start time: 2026-03-18 03:32:46
开始时间：2026-03-18 03:32:46

End time: 2026-03-18 03:48:16
结束时间：2026-03-18 03:48:16

Total time: 00:15:30
总耗时：00:15:30

Modified files: src/App.tsx, src/components/UserCenterDrawer.tsx, src/shell.css, records/2026-03-18-avatar-local-picker.md, Codex.md
修改文件：src/App.tsx、src/components/UserCenterDrawer.tsx、src/shell.css、records/2026-03-18-avatar-local-picker.md、Codex.md

Summary: Added a hidden local image picker in the renderer, wired avatar editing to open it for authenticated users, normalized the chosen file into a square compressed data URL, stored it in localStorage by account identity, and switched the top-right shell avatar plus the user-center avatar from text initials to the stored image when present.
修改摘要：已在前端加入隐藏的本地图片选择器，并把头像修改入口接成“登录用户点击即打开选择器”；选图后会被裁成方形并压缩成 data URL，以账号身份作为键保存在 localStorage 里；右上角壳层头像和用户中心头像在有图时都会从文字缩写切换成真实图片显示。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
