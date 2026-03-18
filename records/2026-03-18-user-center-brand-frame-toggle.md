Task: Fix the avatar display framing and add a User Center toggle for the branded ambient icon frame.
任务：修正头像显示的边框异常，并给用户中心加入品牌氛围图标边框开关。

Start time: 2026-03-18 04:12:34
开始时间：2026-03-18 04:12:34

End time: 2026-03-18 04:17:48
结束时间：2026-03-18 04:17:48

Total time: 00:05:14
总耗时：00:05:14

Modified files: src/App.tsx, src/components/UserCenterDrawer.tsx, src/shell.css, records/2026-03-18-user-center-brand-frame-toggle.md, Codex.md
修改文件：src/App.tsx、src/components/UserCenterDrawer.tsx、src/shell.css、records/2026-03-18-user-center-brand-frame-toggle.md、Codex.md

Summary: Adjusted the real-avatar display so the header avatar and drawer avatar switch to a clean image-only state when an uploaded picture exists instead of always keeping the old bright frame; added a User Center visual toggle that controls whether the ambient OpenAI brand mark uses the glass frame or a borderless icon-only presentation, and persisted that preference locally.
修改摘要：已调整真实头像的显示方式，让顶部头像和用户中心头像在存在上传图片时切换成更干净的纯图片态，而不是继续保留原来的亮色边框底；同时在用户中心里加入了“品牌图标玻璃框”开关，用来控制中间 OpenAI 品牌图形是显示玻璃框版本还是无边框纯图标版本，并把该偏好本地持久化。

Sync status: Functional files only; no runtime overwrite or repository push performed.
同步状态：仅修改功能文件；未执行运行目录覆盖，也未执行仓库推送。
