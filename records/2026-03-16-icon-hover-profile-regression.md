Task: Fix the remaining taskbar and tray icon mismatch, remove the delayed tray hover-card appearance, and restore the correct profile names and notes in the cards without changing unrelated logic.
任务：修复仍未生效的任务栏与托盘图标统一、去掉托盘悬浮卡片的延迟出现，并恢复卡片中正确的 profile 名称和备注显示，不改无关逻辑。

Start time: 2026-03-16 20:04:52
开始时间：2026-03-16 20:04:52

End time: 2026-03-16 20:16:19
结束时间：2026-03-16 20:16:19

Total time: 0h 11m 27s
总耗时：0小时11分27秒

Modified files: electron/main.ts, electron/profile-service.ts
修改文件：electron/main.ts、electron/profile-service.ts

Summary: Removed the native tray tooltip text so the hover card no longer waits behind a small system hint, changed the tray hover flow to show immediately on mouse-enter using cached state and preload the hidden tray-card window at startup, and added a Windows app user model id plus explicit window icon assignment for better runtime icon pickup. Also changed profile materialization to preserve stored profile names instead of replacing titles with JWT-detected workspace names like Personal, and hardened profiles.json reading so a parse failure now throws instead of silently rewriting the file with rebuilt generic entries. Validation: npm run typecheck passed. Data recovery note: the current C:\\codex-profiles\\profiles.json already contains rebuilt generic names and empty notes, and no local metadata backup was found, so this task did not rewrite user data.
修改摘要：移除了托盘原生 tooltip 文本，避免完整悬浮卡片被系统小提示挡住和拖慢；把托盘悬浮改成鼠标进入即用缓存态立即显示，并在应用启动时预加载隐藏的 tray-card 窗口；同时补上 Windows app user model id 和显式窗口图标设置，以提高运行时图标生效概率。还修改了 profile 物化逻辑，保留存储层里的 profile 名称，不再把卡片标题强行替换成 JWT 检测出的 Personal 之类工作区名；并加固了 profiles.json 读取，解析失败时现在会直接报错，不再静默重写成通用目录项。验证：npm run typecheck 已通过。数据恢复说明：当前 C:\\codex-profiles\\profiles.json 里已经是重建后的通用名称和空备注，且本地未找到旧元数据备份，因此本次没有直接改写用户数据。

Sync status: not synced
同步状态：未同步
