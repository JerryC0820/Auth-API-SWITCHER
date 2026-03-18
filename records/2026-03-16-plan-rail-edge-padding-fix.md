Task: Fix the plan selector rail in the edit-space dialog so the left and right edges no longer clip or sit too close to the container border.
任务：修复编辑空间弹窗里的套餐滑轨，让左右边缘不再被裁切或贴得过近。

Start time: 2026-03-16 11:52:50
开始时间：2026-03-16 11:52:50

End time:
End time: 2026-03-16 11:56:05
结束时间：2026-03-16 11:56:05

Total time:
Total time: 00:03:15
总耗时：00:03:15

Modified files:
Modified files:
- src/components/add-profile-dialog-stitch.css
修改文件：
- src/components/add-profile-dialog-stitch.css

Summary:
Summary:
- Added horizontal inner padding and scroll-padding to the plan selector shell so the first and last plan pills no longer sit against the visible edge.
- Added a tiny inline margin to the plan selector track to keep the rail border and active-pill glow from looking clipped at both ends.
修改摘要：
- 给套餐滑轨外壳补了横向内边距和滚动边距，让首尾套餐胶囊不再贴着可视边缘。
- 给套餐滑轨轨道补了很小的左右外边距，避免边框和激活态蓝色发光在两端看起来像被裁掉。

Sync status:
Sync status: not synced
同步状态：未同步
