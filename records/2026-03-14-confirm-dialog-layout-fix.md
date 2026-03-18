# 2026-03-14 confirm dialog layout fix
- Start time: 2026-03-14 14:25:35
- End time: 2026-03-14 14:28:18
- Total time: 00:02:43
- Modified files: src/components/ConfirmActionDialog.tsx
- Summary: Fixed the confirm dialog layout regression by removing the fixed oversized height, making the dialog use a max-height shell, enabling the split layout from medium window widths instead of only large screens, and tightening the left summary and right detail card structure so the prompt no longer collapses into a long black single-column block.
- Sync status: not synced
