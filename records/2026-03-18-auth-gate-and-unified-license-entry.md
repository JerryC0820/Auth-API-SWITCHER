Task: Add an unauthorized full-screen glass auth gate, merge login/register/auth entry into one screen, and expose contact/help acquisition paths inside the unauthorized experience.
任务：新增未授权全屏玻璃授权锁定层，把登录/注册/授权入口合到一个屏幕里，并在未授权体验中加入联系客服/帮助/获取授权路径。

Start time: 2026-03-18 01:27:23
开始时间：2026-03-18 01:27:23

End time: 2026-03-18 01:37:54
结束时间：2026-03-18 01:37:54

Total time: 00:10:31
总耗时：00:10:31

Modified files: src/App.tsx, src/shell.css, records/2026-03-18-auth-gate-and-unified-license-entry.md, Codex.md
修改文件：src/App.tsx、src/shell.css、records/2026-03-18-auth-gate-and-unified-license-entry.md、Codex.md

Summary: Added a full-screen unauthorized glass auth gate that keeps the main app blurred and inaccessible until a non-trial license is active; merged login/register/forgot-password and activation/reward/invite inputs into the same gate screen; added direct contact/help/get-license actions and QR placeholders next to the authorization area; adjusted auth result handling so login no longer jumps into a separate dialog while the gate is active; and kept update, packaging, and real backend behavior unchanged.
修改摘要：新增了未授权全屏玻璃授权锁定层，在非试用正式授权生效前持续模糊并阻断主界面；把登录/注册/忘记密码与授权码/奖励码/邀请码入口合并到同一屏；在授权区旁边加入了联系客服、帮助、获取授权入口和二维码占位；同时调整授权结果处理，在 gate 激活期间登录后不再跳去单独弹窗；更新、打包和真实后端行为保持不变。

Sync status: Functional files only; no runtime overwrite or external sync performed.
同步状态：仅修改功能文件；未执行运行目录覆盖或外部同步。
