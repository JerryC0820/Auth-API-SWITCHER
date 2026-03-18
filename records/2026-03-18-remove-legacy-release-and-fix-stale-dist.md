Task: Remove the legacy packaged release output that still opens the old UI, and fix the renderer build wrapper so stale dist files are no longer accepted as a successful build.
任务：删除仍会打开旧界面的旧打包产物，并修正 renderer 构建包装脚本，避免把陈旧的 dist 误判为成功构建。

Start time: 2026-03-18 13:39:27
开始时间：2026-03-18 13:39:27

End time: 2026-03-18 13:48:25
结束时间：2026-03-18 13:48:25

Total time: 00:08:58
总耗时：00:08:58

Modified files: scripts/build-renderer.ps1, records/2026-03-18-remove-legacy-release-and-fix-stale-dist.md, Codex.md
修改文件：scripts/build-renderer.ps1、records/2026-03-18-remove-legacy-release-and-fix-stale-dist.md、Codex.md

Summary: Confirmed the old host UI came from stale packaged output under release and stale dist assets. Fixed the renderer build wrapper to delete dist before each build and only accept the known Vite fallback when fresh files were generated in the current run, rebuilt dist into current assets, and removed the confirmed legacy release directory.
修改摘要：已确认旧主机界面来自 release 下的陈旧打包产物和陈旧 dist 资源。现已修正 renderer 构建包装脚本：每次构建前先清空 dist，且只有本轮确实生成了新文件时才允许已知的 Vite 容错；同时已重建当前 dist，并删除确认过时的旧 release 目录。

Sync status: Functional files plus removal of confirmed legacy packaged artifacts; no user data paths will be touched.
同步状态：修改功能文件并删除已确认的旧打包产物；不会触碰用户数据目录。
