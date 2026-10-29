# GitHub Pages 公网发布与内容更新

## 发布目标

使用自己的 Fork `cicipan0902-hub/shoukun` 的 `main`，由现有 `.github/workflows/pages.yml` 构建并发布 `dist`。不使用本地服务器作为公网服务，不创建新的 Sites 网站，不更改已有自定义域名。

当前游戏目录已接入该 Fork 的 Git 历史，仍在原目录编辑，不需要移动素材。

## 首次上线

1. 完成类型检查、代码检查、完整单元测试、故事校验、故事测试、构建和发布产物检查。
2. 查看 `git status` 和 `git diff`，确认待提交剧情与素材后，再提交并推送 `main`。
3. 登录自己的 GitHub，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 在仓库 **Actions → Validate and deploy Pages** 查看对应提交的运行。只有 build 和 deploy 均成功才算上线；需要时在 **Run workflow** 中选择 main 手动运行。
5. 从部署任务的 `github-pages` 环境或部署结果获取真实公开网址，再检查网页与静态资源。不要把推测的网址或本地构建成功当作上线成功。

仓库设置：https://github.com/cicipan0902-hub/shoukun/settings/pages
Actions：https://github.com/cicipan0902-hub/shoukun/actions

公开的 Pages 页面无需玩家登录 GitHub，也不依赖作者电脑开机。

## 以后更新剧情

在当前目录修改剧情配置和素材，然后运行检查：

```sh
npm run typecheck
npm run lint
npm test
npm run foundation:validate
npm run foundation:test
npm run foundation:build
npm run release:check
```

检查通过并确认差异后提交、推送：

```sh
git status
git diff
git add -A
git commit -m "更新校园剧情内容"
git push origin main
```

推送后 Actions 会重新部署同一个网址。内容不是本地保存即自动上线，需要等待部署成功。在线玩家每分钟或重新切回页面时检查版本，发现新内容会显示刷新按钮，不强制中断游戏。

## 存档与版本

保留作品 ID `shoukun-good-weather` 和 revision `1`。各玩家进度保存在各自浏览器中；同一公网网址下追加剧情和修改文字可沿用原进度。第一次从 localhost/局域网地址换到公网网址，不会自动复制旧域名下的存档。不要清除浏览器数据。

## 发布边界

正式网页仅包含玩家页面、运行时剧情、已引用素材、图标和许可文件。`release:check` 检查禁止额外源码、环境文件、开发预览、作者备注或玩家存档混入 `dist`，并确认入口和 PWA 支持 GitHub Pages 的 `/shoukun/` 子路径。

以下五份作者专用文件只留本地，由 `.gitignore` 排除，不提交到公开源码仓库：

- `stories/foundation/author-reserve.json`
- `stories/foundation/chapter04-author-notes.json`
- `stories/foundation/chapter05-author-notes.json`
- `stories/foundation/memo-plan.json`
- `stories/foundation/xianyu-seller-links.author.json`

环境文件、可再生成的 `public/author-media` 和 macOS 元数据也不提交。CI 不依赖这些本地作者备注。

视频暂时沿用作者原文件。手机浏览器能否播放具体 HEVC/MOV 视频取决于编解码支持；若个别视频无法播放，可以之后转为 H.264/AAC MP4，不影响剧情与存档。
