Task: Fix trial-day access so the one-day experience can enter the main UI, and correct the oversized or vertically offset auth-gate top metric background block.
任务：修复 1 天体验仍无法进入主界面的问题，并修正授权 gate 顶部指标区背景块过大或向下偏移的布局异常。

Start time: 2026-03-18 01:44:23
开始时间：2026-03-18 01:44:23

End time: 2026-03-18 01:46:56
结束时间：2026-03-18 01:46:56

Total time: 00:02:33
总耗时：00:02:33

Modified files: src/App.tsx, src/shell.css, records/2026-03-18-trial-access-and-auth-gate-layout-fix.md, Codex.md
修改文件：src/App.tsx、src/shell.css、records/2026-03-18-trial-access-and-auth-gate-layout-fix.md、Codex.md

Summary: Fixed the auth gate so an unexpired one-day trial now counts as usable access and can enter the main UI; fixed the auth-gate layout so the panel is no longer stretched to full viewport height and the top hero metric block no longer shows the oversized or downward-shifted background area; validated with typecheck and renderer build.
修改摘要：已修复授权 gate 放行规则，未过期的 1 天体验现在会被视为可用授权并允许进入主界面；同时修复 auth-gate 布局，不再把整块 panel 拉满整个视口高度，顶部 hero 指标区也不再出现过大或下偏移的背景块；并已通过 typecheck 与渲染层构建验证。

Sync status: Functional files only; no runtime overwrite or external sync performed.
同步状态：仅修改功能文件；未执行运行目录覆盖或外部同步。
