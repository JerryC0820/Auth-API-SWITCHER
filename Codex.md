# Codex Memory
# Codex 记忆

## Stable Rules
## 稳定规则

English: Reply in concise Chinese by default unless the user asks otherwise.
中文：默认使用简洁中文回复，除非用户另有要求。

English: Only change the explicitly requested release-facing scope in this repo.
中文：本仓库只改用户明确要求的发布侧范围。

English: This release repo keeps release-facing content only; do not add source-code or product-logic edits here.
中文：这个发布仓只保留发布侧内容；不要在这里加入源码或产品逻辑改动。

English: When syncing release docs here, verify the source repo first and then mirror only the required README, manifest, and release-note files.
中文：在这里同步发布文档时，先核对源码仓，再只镜像必要的 README、manifest 和 release note 文件。

## Task Log
## 任务记录

English: Task: Refresh the public release repo README for stable 1.0.3 and add the required local memory/record scaffolding.
中文：任务：刷新公开发布仓的 stable 1.0.3 README，并补上必须的本地记忆文件与记录文件。

English: Request: Surface the latest stable highlights around support chat, cloud sync, and card transfer in the public release repo, without changing product code.
中文：要求：在公开发布仓里把客服会话、云同步和传卡的最新稳定版亮点写出来，不改产品代码。

English: Changed: Updated the release-facing README with the latest 1.0.3 highlights and capability rows, and added the mandatory Codex.md plus a task record for this repo.
中文：改动：更新了发布侧 README 的 1.0.3 最新亮点与能力状态行，并为本仓库补上了必须的 Codex.md 和任务记录。

English: Validation: Verified that the remote release repo already had the 1.0.3 stable manifest and release note, so only README plus the missing local project-memory files needed to be added in this sync step.
中文：验证：已确认远端发布仓本身已经具备 1.0.3 的 stable manifest 和 release note，因此这次同步步骤只需要补 README 和缺失的本地项目记忆文件。

English: Failure: The original local release mirror was stale and not pushable fast-forward, so the safe path was to patch a fresh remote clone instead of rebasing over unrelated local changes.
中文：失败：原来的本地发布镜像已经落后，且无法直接快进推送；因此最安全的做法是改用远端最新克隆来补丁，而不是在本地无关改动上强行 rebase。

English: Avoid next time: If the public release repo rejects a push because remote `master` is ahead, refresh from the remote head first and patch only the true diff instead of replaying a stale local mirror blindly.
中文：下次避免：如果公开发布仓因为远端 `master` 更靠前而拒绝推送，应先从远端头部刷新，再只补真实差异，不要盲目重放一份已经陈旧的本地镜像。

English: Task: Expand the public README into a screenshot gallery for stable 1.0.3.
中文：任务：把公开发布仓 README 扩展成 stable 1.0.3 的截图画廊版本。

English: Request: Use all provided screenshots, emphasize support chat, cloud sync, and switch animation, and make the release-facing README descriptive enough to stand on its own.
中文：要求：使用全部已提供截图，重点突出客服聊天、云同步和切换动画，并让发布侧 README 自身就能把这些功能说明白。

English: Changed: Added the screenshot gallery section to the release-facing README, grouped the 13 screenshots by workflow, and prepared the same screenshot asset folder for the release repo so remote rendering will match the source repo.
中文：改动：给发布侧 README 新增了截图画廊章节，把 13 张截图按工作流分组展示，并准备把同一套截图资源加入发布仓，确保远端显示效果和源码仓一致。

English: Validation: Checked the provided screenshots locally before writing the captions and kept the README image paths relative to the repo root, which lets the same markdown layout render in GitHub and Gitee once the assets are committed.
中文：验证：在写说明前先本地核对了截图内容，并把 README 的图片路径保持为仓库根目录相对路径；这样只要图片入库，GitHub 和 Gitee 都能直接渲染同一版版式。

English: Failure: The fresh release clone had no screenshot assets yet, so the README update had to include the image-folder sync as part of the same delivery rather than assuming the files already existed remotely.
中文：失败：新的发布仓克隆里一开始没有任何截图资源，所以这次 README 更新必须把图片目录同步一起完成，不能假设远端已经有这些文件。

English: Avoid next time: Any release-facing README change that embeds screenshots should be treated as docs plus asset sync together, otherwise the markdown can be correct while the rendered page is still broken.
中文：下次避免：凡是发布侧 README 嵌入截图的改动，都要把“文档更新 + 资源同步”视为一个整体任务；否则 markdown 虽然写对了，页面渲染仍然会坏。
