# Auth API Switcher 项目说明

这是一个桌面端授权与工作空间切换项目，当前仓库已经按用途分层：

- `App/`：本地客户端、Electron 主进程、React 渲染层、构建脚本、打包产物。
- `Cloudflare/`：官网、下载页、后台静态站、Worker、D1 配置、发布清单与云端部署脚本。
- `Doc/`：交接文档、结构说明、Codex 快速定位文档、旧资料归档。
- `Package/`：打包入口汇总区，只放 `EXE/` 和 `源码/` 两个快捷入口子文件夹。

## 常用入口

- `启动.bat`
  作用：启动客户端，或直接打开云端控制台、官网、激活页、下载页。
- `云端与发布工具.bat`
  作用：统一执行 Cloudflare 登录检查、Worker / D1、构建桌面端、打包安装包、生成发布清单与发布动作。

## 直接开发位置

- 桌面端 UI：`App/src/`
- Electron / IPC / preload：`App/electron/`
- 共享类型与配置：`App/shared/`
- 本地开发与打包脚本：`App/scripts/`
- Cloudflare Worker：`Cloudflare/workers/auth-api/`
- 官网 / 下载页 / 后台静态资源：`Cloudflare/public/`
- 发布清单与更新说明：`Cloudflare/release-manifests/`、`Cloudflare/release-notes/`
- 打包产物真实位置：`App/release-artifacts/`
- 打包快捷入口汇总：`Package/EXE/`、`Package/源码/`

## 文档导航

- `Doc/项目接手说明.md`
- `Doc/目录结构树状图.md`
- `Doc/Codex会话快速定位.md`
- `Doc/剩余工作审计.md`

## 注意

- 根目录不要再堆放截图、日志、`.tmp*`、备份和压缩包。
- `Package/` 只做快捷入口汇总，不额外复制一份真实打包文件。
- 以后如果直接跑 npm 命令，请先进入 `App/`。
- 旧版长 README、旧版使用说明已经归档到 `Doc/归档/`。
