Task: Scale the existing dialogs for the default window size so the close button and footer actions remain visible and usable.
任务：让现有弹窗适配默认窗口尺寸，确保关闭按钮和底部操作在默认窗口下仍然可见且可用。

Start time: 2026-03-16 19:57:27
开始时间：2026-03-16 19:57:27

End time: 2026-03-16 20:01:43
结束时间：2026-03-16 20:01:43

Total time: 0h 4m 16s
总耗时：0小时4分16秒

Modified files: src/components/add-profile-dialog-stitch.css, src/components/confirm-action-dialog-stitch.css, src/shell.css
修改文件：src/components/add-profile-dialog-stitch.css、src/components/confirm-action-dialog-stitch.css、src/shell.css

Summary: Replaced the fixed large dialog sizes with viewport-based width and height limits for the add/edit dialog and confirm dialog, then added compact responsive rules for tighter window heights and widths. Also added max-height and responsive padding/grid rules for the special-mode dialog so the close button and footer actions remain visible in the default window size. Validation: npm run typecheck passed.
修改摘要：把新增/编辑弹窗和确认弹窗原先写死的大尺寸改成基于当前视口的宽高上限，并补上较小窗口宽高下的紧凑响应式规则；同时给特殊功能弹窗增加了最大高度与响应式 padding/grid 调整，确保默认窗口尺寸下关闭按钮和底部操作仍然可见。验证：npm run typecheck 已通过。

Sync status: not synced
同步状态：未同步
