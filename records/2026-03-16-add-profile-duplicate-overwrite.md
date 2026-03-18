Task: Detect duplicate current-space imports and prompt for overwrite instead of silently creating another Personal-style card.
任务：在导入当前空间时识别重复空间并提示是否覆盖，而不是静默新建另一张 Personal 风格的卡片。

Start time: 2026-03-16 14:42:30
开始时间：2026-03-16 14:42:30

End time:
End time: 2026-03-16 14:48:20
结束时间：2026-03-16 14:48:20

Total time:
Total time: 00:05:50
总耗时：00:05:50

Modified files:
Modified files:
- src/App.tsx
修改文件：
- src/App.tsx

Summary:
Summary:
- Updated src/App.tsx so add-profile submission now checks for an existing profile with the same normalized name or workspace name before creating a new card, and opens a dedicated overwrite confirmation instead of silently adding another profile.
- Reused the existing updateProfile path after confirmation so the matched profile is overwritten in place with the new auth, plan, notes, and quota values, while the add dialog no longer produces an extra Personal-style duplicate card for the same named space.
修改摘要：
- 修改了 src/App.tsx，让新增 profile 提交前先按规范化后的名称和空间名检查是否已存在同名空间；如果命中，就先弹专门的覆盖确认，而不是静默新增另一张卡片。
- 确认覆盖后复用了现有 updateProfile 链路，直接原地覆盖匹配到的那张卡片的 auth、套餐、备注和额度数据，从而避免同一命名空间再长出一张 Personal 风格的重复卡片。

Sync status:
Sync status: not synced
同步状态：未同步
