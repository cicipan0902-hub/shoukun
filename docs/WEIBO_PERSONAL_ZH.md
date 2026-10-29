# 微博内容维护

打开手机「微博」，进入「个人微博」「账号」或「娱乐热搜」。原校园论坛、关注、收藏仍保留。默认无人关注；手动关注、评论和收藏随原存档保存，不会因本轮更新清空。

## 个人微博

编辑 `stories/foundation/weibo-personal.json` 的 `content.weibo`。每篇用唯一英文 `id`；修改 `title`、`body`、`time`、可选 `comments`。`meta.accountId` 和 `meta.characterRef` 填原角色 storyId：`owner`、`star`、`junhao`、`brother`、`zuohang`、`jiaqi`、`lifei`。昵称、头像在显示时直接读取微信联系人和玩家资料，不要再填写一套头像。

原有六个人物主页保留原 ID；新增玩家主页。`folder` 为「个人微博」，`meta.type` 为 `post`。`meta.sequence` 是主页与个人分区的显示顺序，数字越大越靠前。可用 `unlock` 填既有章节完成变量，避免提前透露后续经历；不填则初始可见。现有内容每人三至四篇，部分随第三、五、七章完成后出现。阅读微博不自动触发 NPC 获取信息，也不新增微信好友。

图片使用项目原素材映射：在 `assets.json` 注册文件，再在 `project.json.bindings` 用 `itemMedia` 指向帖子 ID。左航第一篇复用现有图书馆图片。`meta.imagePath` 只是供作者查找的素材位置，不能代替映射。

## 娱乐候选话题

编辑 `stories/foundation/weibo-entertainment.json`。每个话题一条 `meta.type: topic` 记录，以及至少一条 `post`；帖子 `meta.topicId` 指向话题 ID。标题、正文和 `comments` 都可直接修改，评论字符串标注虚构示例，不冒充真实粉丝原话。

每条记录的 `meta` 包含：
- `sourceUrl`：已核实的具体原始物料页；没有则留空。
- `sourceNote`：核对范围与尚缺资料。
- `verificationStatus`：当前全部为 `pending`；人工完成核对后可改为 `verified`。
- `referenceUrl` / `referenceNote`：检索线索，不能代替已核验来源。
- `imagePath`：预留的本地配图路径。

当前六个话题均待原始素材核对，尤其《笨小孩的道歉信》的参与版本、演出阵容与场次尚未确认。抖音首页只作为检索入口，不作为具体足球片段的证据。页面不显示候选话题的热搜排名或真实热度。

六张配图已登记映射，上传到 `assets/weibo/entertainment/` 后重新构建即可：
`trousers-01.jpg`、`bad-blood-01.jpg`、`sweet-venom-01.jpg`、`apology-01.jpg`、`luelue-01.jpg`、`football-01.jpg`。
图片缺失时显示「配图待补」；只使用作者有权使用的素材。

新增话题时复制一组 topic/post，换唯一 ID 和 topicId；新图片需追加上述素材映射。所有内容本地配置，不联网抓取。

## 更新预览

修改后执行项目现有的 `npm run author:build`，刷新游戏；不必重置进度。已锁定的后期微博仍需完成相应章节后查看。
