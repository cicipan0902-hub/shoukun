# 章节开发工作流

之后章节优先按本页定位，不必重复通读整仓库。原生事件、活动文档、微信消息队列和存档机制见现有实现；只有行为无法用数据表达时才读对应组件。

1. **定位**：先看 `git status`；读 `project.json` 的当前章/下一章入口、本章 JSON、`characters.json` 中涉及的人物、`interactions.json` 对应 flow/document/guide 和必要资源映射。保留未提交修改。
2. **规划**：简列本章目标、人物已知/未知信息、事件顺序和结束状态。决定普通选择是否需要；主线不能依赖某个语气选项或浏览社交 App。
3. **写入**：新增 `chapter-NN.json`，放入 variables/chats/content/events/tests；追加到 `additionalExtensionsFiles` 与 chapters。固定人物 storyId；不改作品 ID/revision、不重写旧章。flows/documents 只追加，保持旧数组顺序和生成 ID；补入口、continuation 与优先 guide。现场短对话用 scene，微信用现有延迟队列。
4. **同步**：主线完成事件或 flow.after 用 `unlock` 固定 ID 的朋友圈、微博、相册、备忘录。不要把读帖/点赞/收藏/评论变量写进主线条件。朋友圈遵循已有好友权限；微博用 accountId/characterRef，独立账号不自动关注。重复事件复用 once/阶段条件，不动态生成重复帖子。
5. **素材**：先查 `assets.json` 与实际文件。复用现有 assetId；新增文件登记到 `docs/MEDIA_ASSET_GUIDE.md`，再追加 project.bindings。缺图保留明确占位，不伪造视频时长或下载图片；旧文件不搬动。角色头像来自唯一角色配置，闲鱼独立卖家头像沿用原规则。
6. **检查**：新增本章可通过路径，至少验证默认继续、必要分支、完全忽略动态和查看动态均可结束；测试刷新恢复与重复进入不重复解锁。不依赖可选选择或媒体文件。运行 `npm run foundation:validate`、`npm run foundation:test`、`npm run author:build`；基础检查需要时运行 `npm test` / `npm run lint`。测试夹具通过 testFixture 按 project 加载所有章节，路径总数不写死。检查原章文件未改；发布前另运行 `npm run release:check`。
7. **汇报**：只报修改文件、章节入口、社交同步、缺失素材确切路径及真实检查结果。开发完成不等于上线；未经本轮发布指令，不自动提交、推送或部署。作者五份备注和任何密钥保持本地。

**本轮参考**：第八章 `chapter-08.json` / `ch08-`。主线为入口 → 微信值班通知 → 走廊 → 旧书摊 → 楼梯偶遇 → 微信收工 → 备忘录；朋友圈、微博、相册全是可选补充。默认可直接点“继续”，选填语气只改变一小段反馈。
