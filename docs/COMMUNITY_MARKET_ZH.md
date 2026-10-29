# 微博与闲鱼本地模拟器

入口：手机桌面“微博”“闲鱼”。旧存档可继续，没看到图标时去手机 App Store 搜索，不需要重开。没有接入账号、API、后端、支付或真实热搜。

## 只改数据的入口

`stories/foundation/community-market.json` 是本轮新增的独立剧情扩展，沿用原 Item、事件、变量和存档格式。`project.json` 已登记该扩展。不要改生成的 public/work.json 或 dist。

### 帖子、账号与本地榜单

- `content.weibo` 中 `meta.type=post` 是帖子。编辑 title/body/comments/sender；comments 为“昵称：评论”字符串数组。
- 帖子 `folder` 选择“校园论坛”或“娱乐热搜”；`meta.topic` 是可搜索话题。
- `meta.type=account` 是账号，title 为昵称，body 为简介，`meta.accountId` 是稳定账号 ID。帖子引用同一 accountId。已配置六位 NPC 角色账号、校园匿名墙和舞台资料夹，共八个账号（玩家沿用机主身份）。本轮不改人物主配置。
- `meta.type=topic` 是本地话题榜条目，title 与 meta.topic 对应话题文字，folder 对应分区。展示顺序就是数据顺序，不抓取真实榜单。
- 图片/视频在 `project.json.bindings` 用 `itemMedia` 绑定已有 assets.json 的素材 ID；视频条目的 kind 设为 video。现有舞台讨论区只是明确标注的本地示例，所用视频是游戏 Demo 播放示意，不是真实 TF 舞台素材。
- 添加客串账号：复制一个 account 条目，换唯一 id、accountId、昵称与简介，再让新帖子引用；头像可用 itemAvatar 绑定本地素材。
- 未加微信好友也可看公开微博；这不解锁朋友圈或私人微信。

点赞、收藏、关注、玩家评论和评论回复沿用 Runtime.ui 的已有 useSkinState。阅读沿用 Runtime.read。账号页、搜索词和当前详情也在原 UI 存档中，切换 App、刷新仍可恢复。

### 商品与卖家选项

- `content.xianyu` 中 `meta.type=product` 是商品，title/body 为名称描述，sender 为卖家，folder 为分类，meta.price 为展示价格。
- `meta.options` 是 JSON 数组字符串，字段 id/text/result/price 为预设回复、显示结果和报价；meta.stateKey 对应 events 的状态变量前缀。新增商品复制一组商品、问候、回复与相关 events，修改唯一 ID 和相互引用，UI 不需要重写。
- `meta.type=gallery` 的条目通过 meta.product 指向商品，形成第二张及后续图片，照常添加媒体绑定。
- `meta.type=reply`、meta.product 指向商品，hidden=true，靠对应事件延迟解锁，不能把卖家回复设成初始可见。
- `marketOpen` 以商品 ID 为 target，需先读商品；`marketSelect` 的 target 为“商品ID.选项ID”；`marketConfirm` 的 target 为商品 ID。已选状态防重复，延迟队列随原存档保存，离开 App 仍可完成回复。
- 聊天先选砍价或人物闲聊，卖家分条回复后才出现买／不买。两种话题各可聊一次，也可换个顺序再决定。购买回执和保存状态记录“哥哥的亲情卡”、成交金额；没有真实扣款、订单或物流。
- 彩蛋入口放在商品 meta.rewardItemId / rewardApp / rewardLabel；对应内容必须同时在事件里 unlock。页面不写死具体彩蛋台词。

## 两个验证联动

1. 微博阅读 `community-post-notice` → community.noticeSeen → 原微信自动消息 flow-community-zuo → 左航两条消息。重复阅读不重复发，不改变任何章节阶段或好友状态。
2. 闲鱼 `market-draft` 标价成交或砍价后确认 → 解锁 `market-hidden-note` → 可从聊天按钮跳转备忘录。退出议价不会解锁。

帖子详情默认显示评论，页面打开会发 `viewComments` 事件；点击本地话题发 `topicView`。将事件的 target 配成帖子/话题 ID 即可添加后续触发，本轮无需额外系统。

## 素材与当前范围

现有本地头像、图书馆、试卷、零食图片和作品 Demo 都复用原素材；商品配图明确为示意。后续可补商品实拍、客串头像、娱乐区授权图片/短视频，不需要再上传已导入的 KTV 视频。

已实现基础浏览、搜索、详情、评论回复、账号关注、收藏、商品多图、卖家主页、预设议价及两个联动。没有真实发布、私信网络、支付、物流、推荐算法或实时热搜。本轮不做复杂发布系统。

## 参考来源与许可边界

- [vue-demo-tucao-weibo](https://github.com/weieyuan/vue-demo-tucao-weibo)：README 为 Vue/Vuex/Vue-router 的微博信息流、评论和回复演示。根目录及 README 未见明确许可证，未复制源码。
- [Pixel-Web](https://github.com/werbhelius/Pixel-Web)：Vue/Vuex/Vue-router，主页标示 Apache-2.0；许可证正文此次未能读取，仅参考信息流与个人主页交互，不复制代码或接入其 API。
- [vue-ali-xianyu](https://github.com/gybber/vue-ali-xianyu)：Vue2/Vuex/Vue-router，README 展示分类、搜索、多图及商品页。根目录及 README 未见明确许可证，未复制源码。

实现使用当前 React 组件与本地原引擎，无新依赖或下载素材。

## 更新预览

在项目终端先配置此前提供的 npm 路径，再执行 `npm run author:build`。刷新现有预览并继续原进度，不需要清空存档。

## 本轮改动与验收

新增：
- stories/foundation/community-market.json：本地账号、帖子、话题、商品、选项、卖家回复与联动事件。
- src/skins/CommunitySkins.tsx、community.css：微博扩展页与闲鱼页面，复用已有 Header/Avatar/Media/SearchBox/SocialDetail/useSkinState。
- src/authoring/communityMarket.test.ts：联动、延迟存档、分支、搜索、详情与收藏恢复检查。
- 本文档。

更新：
- stories/foundation/project.json、interactions.json：加载扩展、安装闲鱼、追加微信消息流程。
- src/registry.ts、src/skins/catalog.tsx：在既有注册表末尾追加闲鱼，不改变原App顺序。
- src/skins/SocialSkins.tsx、SocialDetails.tsx：微博按数据启用扩展页、作者主页入口、评论回复标明被回复人。旧微博内容保留。
- src/apps.test.ts、skins.test.ts：新增App后的数量断言与路由断言，原测试保留。

实际通过：类型检查、本轮修改文件 ESLint、14 项相关单元/静态渲染测试、117 条故事路径、author:build。前六章文件哈希与本轮开始时一致。没有进行真实手机逐项交互验收，也未将静态渲染测试写作浏览器点击验收。

## 卖家聊天更新

所有22件商品使用两阶段对话：marketSelect 的 chat / bargain 选项各一次；等待 NPC 回复后，用 marketConfirm 确认购买或 marketDecline 放下。聊天和砍价都可以先后体验，闲聊不会重置议价金额。

买家气泡是 meta.type=buyer、meta.product 指向商品的隐藏条目；NPC 闲聊也在本地 JSON 中，分两条延迟解锁。每件商品的 busy、chatDone、bargainDone、interacted、decision、currentPrice、paymentSource 和 paymentAmount 都随原 Runtime 存档。已议价旧存档仍能购买或退出，旧购买延迟节点 ID 保留。

付款展示使用“哥哥的亲情卡”，付款人为张泽禹的虚拟亲情卡；没有卡号、真实余额或支付接口。只有确认购买才解锁商品彩蛋，不买不会解锁，也不改变微信好友状态。
