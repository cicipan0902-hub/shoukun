> 本页记录第一阶段的空框架准备。当前已继续加入校园个性化演示，最新用法请看 [CAMPUS_DEMO.md](CAMPUS_DEMO.md)。

# 捡手机：框架准备与启动

本阶段先准备可运行的手机框架，后续再加入人物和剧情。

## 来源与本地版本

- 目标 Fork：https://github.com/cicipan0902-hub/shoukun
- 原项目：https://github.com/keoyyo85/FoundPhone-Studio
- 本地源码来自目标 Fork 的 main 分支压缩包，基准提交：`978d1c6bafefa84c8f2402de5260cfb3c26fe442`。
- 获取日期：2026-10-28。Git 拉取连接失败后改用 GitHub 源码压缩包，因此这个交付目录没有 Git 历史与远程配置，也没有推送任何更改。
- 沿用原有 UI、App 注册、事件引擎和存档；保留 MIT、第三方许可及版权声明。

## 本次准备的内容

| 文件 | 用途 |
| --- | --- |
| `stories/foundation/story.json` | 本作品的独立故事入口；已安装 12 个基础 App，无人物、聊天、线索或事件 |
| `stories/foundation/AUTHORING.md` | 之后填写人物、线索、触发条件与结局的准备表 |
| `scripts/foundation.mjs` | 将本作品路径传给原项目命令，复用现有编译与运行流程 |
| `package.json` | 增加四个 `foundation:*` 命令 |
| `.github/workflows/pages.yml` | 原 Pages 工作流选择本作品数据进行检查与构建 |

基础 App：电话、信息、微信、相册、通讯录、备忘录、日历、邮件、浏览器、文件、App Store、设置。其他 App 可从原框架的 App Store 安装。这里没有加入正式人物或剧情。

## 本地启动

安装 Node.js 22（与原项目 CI 保持一致）。在项目目录打开终端：

```sh
npm ci
npm run foundation:validate
npm run foundation:test
npm run foundation:dev
```

打开终端显示的网址。三个入口使用不同作品 ID，避免把测试预览存档混入正式作品：

| 地址 | 用途 |
| --- | --- |
| `/` | 本作品的无剧情手机，后续编辑这里 |
| `/?preview=test` | 原项目完整 App 中性测试预览 |
| `/?template=blank` | 原项目最小空白手机 |

上述根入口以 `foundation:dev` 或 `foundation:build` 为前提。原命令 `npm run dev`、`npm run build` 仍使用上游的 `stories/template/story.json`，用于保留原有使用方式。

## 构建与上线准备

```sh
npm run foundation:build
npm run preview
```

`dist/` 是可托管的静态网站，不能直接双击其中的 HTML 打开。已沿用原项目的相对资源路径与 PWA 缓存配置。

实际发布到 GitHub 前，先把本次文件更改合并到你的 Fork。若远程仓库已有新提交，需先比对合并，避免覆盖其他修改。交付的补丁以本页记录的提交为基准。

要使用 Pages，在自己的仓库启用 Actions，并在 Settings → Pages 中把 Source 选择为 GitHub Actions，然后运行原有的 Validate and deploy Pages 工作流。本次已在 build 任务设置 `STORY_FILE: stories/foundation/story.json`，让校验、测试与构建都选择本作品。实际访问网址以成功部署任务显示的地址为准。

工作流会在推送 main 时运行。当前准备不等于已经完成线上发布。

## 后续加入故事

1. 先填写 `stories/foundation/AUTHORING.md`，确定机主、人物关系、玩家目标、线索顺序与结局。
2. 将内容转换到同目录 `story.json`。联系人、会话、内容和事件使用稳定英文 ID，遵守 `docs/STORY_SCHEMA.md`。
3. 用 `events` 连接跨 App 线索、来电、通知、密码与分支，并为每个结局编写可通过的 `tests` 路径。
4. 内容更新后递增 `revision`，再执行 `foundation:validate`、`foundation:test`、`foundation:build`。
5. 浏览器检查阅读、解锁、来电、结局、刷新后存档，以及手机尺寸下的操作。

当前空作品的 `tests` 为空，因此通过脚本检查只证明空作品合法，不代表已有剧情可玩或所有设备交互都通过。App 为虚拟界面，不连接真实社交账号、通话或支付。

本地检查结果见 `VERIFICATION.md`。

## 用真实手机打开本地预览

`127.0.0.1` 和 `localhost` 指向正在访问的设备本身，不能把电脑上的这类地址直接发到手机。

在电脑上先执行 `npm run foundation:build`，再执行：

```sh
npm run preview:lan
```

手机与电脑连接同一个 Wi-Fi，在手机浏览器输入终端显示的 Network 地址。本次电脑的地址为 `http://10.47.131.94:4173/`；换网络后地址可能变化，以实际 Network 地址为准。访问时保持电脑开机且预览服务运行。若同网仍无法连接，需检查当前 Wi-Fi 是否隔离设备，以及电脑是否允许该服务的传入连接。

这是临时局域网预览。要通过手机流量或其他网络访问，需完成前述 Pages 等公开静态托管部署，并使用成功部署后的网址。
