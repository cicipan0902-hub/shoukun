# GitHub → Cloudflare Pages 自动发布

## 已核实的项目入口

- GitHub：`https://github.com/cicipan0902-hub/shoukun`，正式分支 `main`。
- 仓库根目录就是含 `package.json` 的目录，不是本地目录的上一层。
- `npm run author:build`：读取当前 `project.json`、章节扩展及本地素材，校验故事路径，生成 `work/campus/story.json`，再生成玩家版 `dist/`。
- `public/` 是构建输入，包含生成的剧情 JSON、媒体和开发预览；不能整目录直接上传。
- `dist/` 是完整普通玩家版：`index.html`、JS/CSS、当前游戏 `work.json`、视频、PWA、更新标识和许可证。与创作工具入口不同。
- `npm run public:prepare`：先执行上面的最新游戏构建和发布安全检查，再生成仓库内的 `dist-public/`，核对作品 ID、revision、所有剧情和媒体内容、单文件大小。
- 以前 `../campus-public-site/dist/` 是另一套旧发布副本。现在不依赖、不更新、不删除它，也不会使用其中可能过期的模板。
- `dist-public/` 已忽略，不提交到 GitHub；Cloudflare 每次从源码独立重新生成。

## Cloudflare 网页配置

1. 登录 https://dash.cloudflare.com/ 。进入 **Workers & Pages → Create application → Pages → Connect to Git / Import an existing Git repository**，不要选择 Workers 部署。
2. 连接 GitHub。授权时可选择 **Only select repositories → cicipan0902-hub/shoukun**。账号授权由本人完成。
3. 为 Pages 项目选择一个可用名称。此名称决定正式 `https://项目名.pages.dev/`。上线后一直保留同一个项目，不要每次更新重建项目。
4. 填写：

| 设置 | 值 |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | 留空（仓库根目录） |
| Build command | `npm run public:prepare` |
| Build output directory | `dist-public` |
| Node 环境变量 | `NODE_VERSION` = `22`，同时用于 Production / Preview |
| 其他环境变量 | 无；不需要 API 密钥、Cloudflare Token 或后端 |

不要设置 `STORY_FILE` 或 `CAMPUS_PROJECT` 指向模板。依赖由 Cloudflare 原生 Git 构建环境安装；仓库保留 `package-lock.json`。

5. 点击 **Save and Deploy**。只有构建及部署都成功，才打开 Cloudflare 实际显示的正式 `pages.dev` 网址。
6. 在 Pages 项目的 **Settings → Builds / Build & deployments** 中确认自动生产分支部署已开启。后续只需推送 `main`。

官方文档：
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/headers/

## 为什么需要单独发布产物

Cloudflare Pages 单文件最多 25 MiB。当前游戏的普通 `work.json` 约 33 MiB，五个现有视频也超出该限制。

发布脚本只改变传输包装：大剧情文件拆成静态分片，大视频拆成静态分片和清单；每片最多 8 MiB。播放器会校验并重组原始内容。没有转码、删减剧情、重新生成照片或接入外部存储/API。

较大的视频首次需要点击“加载视频”，下载完整后用原生视频控件播放；可以重试或退出。普通小视频维持原有播放方式。手机上实际的解码能力仍取决于原视频格式与浏览器。

`dist-public/_headers` 对入口、剧情清单和版本标识配置重新验证/不缓存；内容哈希分片可长期缓存。版本检查保留每分钟及切回页面时检测，发现新版本显示提示，只有玩家点击才刷新。

## 怎么确认不是原模板

- 构建日志应出现当前人物、章节和导入素材数；本次应为 **7 人物 / 10 章节 / 71 已导入素材**。
- 打开正式网址的 `/release.json`：`platform` 应为 `cloudflare-pages`，`workId` 应为 `shoukun-good-weather`，`revision` 仍为 `1`，`chapters` 应有当前章节列表。
- `commit` 应与 Cloudflare 该次部署和 GitHub `main` 的提交一致。Cloudflare 会提供 `CF_PAGES_COMMIT_SHA`，不必手工填写。
- 页面应有上传的进入页背景、玩家头像选择、2580 密码锁屏，以及当前校园微信和闲鱼。
- `/work.json` 在这个产物中可能是资源清单，不是缺少游戏；实际剧情由页面读取 `runtime-data/` 分片。
- 手机实际试玩一次微信回复、闲鱼图片和一个视频；确认后再对外分享正式域名，不分享每次部署的预览域名。

## 本地检查和以后更新

```sh
npm run public:prepare
npm run public:check
npm run public:preview
```

本地发布预览在 `http://127.0.0.1:4188/`，仅用于检查，不是公网网址。

以后可以直接对 Codex 说：**“修改这些剧情/素材，检查通过后提交并推送 main，更新现有 Cloudflare Pages 项目。”**

流程：修改源码和素材 → 按改动运行必要检查 → Git commit → Git push origin main → Cloudflare 自动构建 → 同一个正式网址更新。GitHub Pages 原有工作流保留；Cloudflare 不依赖它成功完成才开始原生构建。

## 存档范围

作品 ID `shoukun-good-weather`、revision `1`、玩家 runId 和存档恢复逻辑保留。本轮不改变存档结构。同一个正式域名内的更新不会主动清除存档。

浏览器存档按域名隔离：从 localhost / GitHub Pages 第一次切换到 Cloudflare 域名，旧站进度不会自动出现。旧站进度仍在原浏览器原网址下；不要清空原站数据。以后请始终使用同一个正式 Cloudflare 项目域名，不要用每次部署产生的不同预览网址游玩。
