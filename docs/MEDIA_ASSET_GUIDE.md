# 媒体素材指南

以下状态按当前资源映射和磁盘文件核对。旧路径原样保留；新文件优先使用英文小写、数字和连字符。**本章没有必须补齐才能通关的图片、音频或视频。**

## A. 角色头像

身份唯一来源是 `stories/foundation/characters.json`，角色通过 `avatarAssetId` 引用 `assets.json`。微信、朋友圈、个人微博沿用同一身份；微博账号默认不关注。不要另外创建同名角色或单独上传一套微博头像。

| 文件名 | 建议目录 | 用途 | 当前状态 | 优先级 |
|---|---|---|---|---|
| avatar-owner.jpg | assets/characters | 女主 · owner | 已存在，统一引用 | 可选 |
| avatar-zhuzhixin.jpg | assets/characters | 朱志鑫 · star | 已存在，统一引用 | 可选 |
| avatar-zhangjunhao.jpg | assets/characters | 张峻豪 · junhao | 已存在，统一引用 | 可选 |
| avatar-zhangzeyu.jpg | assets/characters | 张泽禹 · brother | 已存在，统一引用 | 可选 |
| avatar-zuohang.jpg | assets/characters | 左航 · zuohang | 已存在，统一引用 | 可选 |
| avatar-lifei.png | assets/characters | 礼菲 · lifei | 缺失，当前使用首字占位；已预留映射 | 建议 |
| avatar-zhujiaqi.png | assets/characters | 朱家琪 · jiaqi | 缺失，当前使用首字占位；已预留映射 | 建议 |

除以上七位正式人物，不新增有姓名的表白男配：第八章只使用“同班男生”的现场文字。闲鱼另有七个卖家账号，其中啵啵爸爸、Suuuu、C罗唯一真神为独立卖家 NPC；以下是原有卖家头像，不转成微信好友、不公开匿名卖家的角色关联。

| 文件名 | 建议目录 | 用途 | 当前状态 | 优先级 |
|---|---|---|---|---|
| seller-hanbing-sheshou.pic.jpg | assets/xianyu/avatars | 寒冰射手专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-houmi-yeye.pic.jpg | assets/xianyu/avatars | 厚米爷爷专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-xinan-yujie.pic.jpg | assets/xianyu/avatars | 西南禹姐专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-tutucha-mengmengda.pic.jpg | assets/xianyu/avatars | 兔兔叉萌萌哒专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-bobo-baba.pic.jpg | assets/xianyu/avatars | 啵啵爸爸专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-suuuu.pic.jpg | assets/xianyu/avatars | Suuuu专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |
| seller-cr7-only-god.pic.jpg | assets/xianyu/avatars | C罗唯一真神专用闲鱼头像，与微信头像分开 | 已存在 | 可选 |

## B. App 图标与界面素材

基础图标使用 `assets/app-icons/manifest.json`，闲鱼使用已有独立资源和 `project.json` 的 appIcon 绑定。未安装 App 的图标也列出状态，**无需为尚未使用的 App 重复上传。**

| 文件名 | 建议目录 | 用途 | 当前状态 | 优先级 |
|---|---|---|---|---|
| phone.png | assets/app-icons | 电话 App 图标 | 已存在 | 可选 |
| messages.png | assets/app-icons | 信息 App 图标 | 已存在 | 可选 |
| wechat.jpg | assets/app-icons | 微信 App 图标 | 已存在 | 可选 |
| photos.png | assets/app-icons | 相册 App 图标 | 已存在 | 可选 |
| instagram.png | assets/app-icons | Instagram App 图标 | 已存在 | 可选 |
| weibo.jpg | assets/app-icons | 微博 App 图标 | 已存在 | 可选 |
| contacts.png | assets/app-icons | 通讯录 App 图标 | 已存在 | 可选 |
| notes.png | assets/app-icons | 备忘录 App 图标 | 已存在 | 可选 |
| calendar.png | assets/app-icons | 日历 App 图标 | 已存在 | 可选 |
| mail.png | assets/app-icons | 邮件 App 图标 | 已存在 | 可选 |
| safari.png | assets/app-icons | 浏览器 App 图标 | 已存在 | 可选 |
| files.png | assets/app-icons | 文件 App 图标 | 已存在 | 可选 |
| appstore.png | assets/app-icons | App Store App 图标 | 已存在 | 可选 |
| settings.png | assets/app-icons | 设置 App 图标 | 已存在 | 可选 |
| reminders.jpg | assets/app-icons | 提醒事项 App 图标 | 已存在 | 可选 |
| xianyu-app-icon.pic.jpg | assets/xianyu/icon | 闲鱼 App 图标 | 已存在 | 可选 |
| camera.png | assets/app-icons | 相机 App 图标 | 已存在 | 可选 |
| clock.png | assets/app-icons | 时钟 App 图标 | 已存在 | 可选 |
| music.png | assets/app-icons | 音乐 App 图标 | 已存在 | 可选 |
| maps.png | assets/app-icons | 地图 App 图标 | 已存在 | 可选 |
| weather.png | assets/app-icons | 天气 App 图标 | 已存在 | 可选 |
| wallet.png | assets/app-icons | 钱包 App 图标 | 已存在 | 可选 |
| health.png | assets/app-icons | 健康 App 图标 | 已存在 | 可选 |
| find.png | assets/app-icons | 查找 App 图标 | 已存在 | 可选 |
| calculator.png | assets/app-icons | 计算器 App 图标 | 已存在 | 可选 |
| qq.jpg | assets/app-icons | QQ App 图标 | 已存在 | 可选 |
| redbook.jpg | assets/app-icons | 小红书 App 图标 | 已存在 | 可选 |
| douyin.jpg | assets/app-icons | 抖音 App 图标 | 已存在 | 可选 |
| bilibili.jpg | assets/app-icons | 哔哩哔哩 App 图标 | 已存在 | 可选 |
| alipay.jpg | assets/app-icons | 支付宝 App 图标 | 已存在 | 可选 |
| taobao.jpg | assets/app-icons | 淘宝 App 图标 | 已存在 | 可选 |
| netease.jpg | assets/app-icons | 网易云音乐 App 图标 | 已存在 | 可选 |
| delivery.jpg | assets/app-icons | 外卖 App 图标 | 已存在 | 可选 |
| 无文件 | 不新增目录 | 论坛 App 图标 | 内置绘制图标，无文件需求 | 可选 |
| whatsapp.jpg | assets/app-icons | WhatsApp App 图标 | 已存在 | 可选 |
| tiktok.png | assets/app-icons | TikTok App 图标 | 已存在 | 可选 |
| twitter.svg | assets/app-icons | X App 图标 | 已存在 | 可选 |
| telegram.png | assets/app-icons | Telegram App 图标 | 已存在 | 可选 |
| discord.png | assets/app-icons | Discord App 图标 | 已存在 | 可选 |
| youtube.png | assets/app-icons | YouTube App 图标 | 已存在 | 可选 |
| line.jpg | assets/app-icons | LINE App 图标 | 已存在 | 可选 |
| snapchat.jpg | assets/app-icons | Snapchat App 图标 | 已存在 | 可选 |
| facebook.png | assets/app-icons | Facebook App 图标 | 已存在 | 可选 |
| messenger.png | assets/app-icons | Messenger App 图标 | 已存在 | 可选 |
| reddit.png | assets/app-icons | Reddit App 图标 | 已存在 | 可选 |
| spotify.png | assets/app-icons | Spotify App 图标 | 已存在 | 可选 |
| netflix.jpg | assets/app-icons | Netflix App 图标 | 已存在 | 可选 |
| pinterest.jpg | assets/app-icons | Pinterest App 图标 | 已存在 | 可选 |
| kakao.jpg | assets/app-icons | KakaoTalk App 图标 | 已存在 | 可选 |
| threads.png | assets/app-icons | Threads App 图标 | 已存在 | 可选 |

微信、微博图标都已存在。闲鱼已上传 `assets/xianyu/icon/xianyu-app-icon.pic.jpg`；不要再准备第二份。现场记录沿用现有页面，不额外要求背景图。

## C. 剧情图片、音视频和表情包

“已存在”不等于正在使用：表中标注用途和绑定；不把相似照片自动当作缺失素材。

| 文件名 | 建议目录 | 用途 | 当前状态 | 优先级 |
|---|---|---|---|---|
| 无文件 | 不新增目录 | gallery-court：篮球场照片占位，暂无实际图片 | 未指定文件；当前无绑定，不要求补传 | 可选 |
| 无文件 | 不新增目录 | moment-school：朋友圈图片占位 | 未指定文件；当前无绑定，不要求补传 | 可选 |
| 开学典礼.pic.jpg | assets/gallery | photo-ceremony：开学典礼那天的人物侧影 | 已存在，已映射 | 可选 |
| 零食.pic.jpg | assets/gallery | photo-snacks：新学期的零食购物车 | 已存在，已映射 | 可选 |
| 试卷.pic.jpg | assets/gallery | photo-exam：桌上的试卷 | 已存在，已映射 | 可选 |
| 图书馆.pic.jpg | assets/gallery | photo-library：图书馆里的书本 | 已存在，已映射 | 可选 |
| 文化节海报.pic.jpg | assets/gallery | photo-festival-poster：文化节招募配图 | 已存在，已映射 | 可选 |
| 夕阳.pic.jpg | assets/gallery | photo-sunset：校园操场的夕阳 | 已存在，已映射 | 可选 |
| 表情包-不烧心.pic.jpg | assets/chat-images | sticker-calm：不烧心 | 已存在，已映射 | 可选 |
| 表情包-反应不过来 .pic.jpg | assets/chat-images | sticker-confused：每日反应不过来 | 已存在，已映射 | 可选 |
| 表情包-好的坏的都是暂时的.pic.jpg | assets/chat-images | sticker-temporary：好的坏的都是暂时的 | 已存在，已映射 | 可选 |
| 表情包-奸笑.pic.jpg | assets/chat-images | sticker-grin：奸笑 | 已存在，已映射 | 可选 |
| 表情包—苦涩.pic.jpg | assets/chat-images | sticker-bitter：虽然我打不倒，但也不能一直打我吧 | 已存在，已映射 | 可选 |
| junhao-demo.MP4 | assets/audio | audio-junhao-demo：作者提供的作品草稿视频 Demo，沿用稳定素材 ID | 已存在，已映射 | 可选 |
| party-evening-01.jpg | assets/gallery | photo-party-evening：第六章聚会合照；待作者上传，不用无关照片替代。 | 缺失，已预留映射；不阻断剧情 | 建议 |
| 无文件 | 不新增目录 | video-party-sing：第六章 KTV 现场合唱 MP4；与旧作品 Demo 分开。 | 未指定文件；当前无绑定，不要求补传 | 可选 |
| 朱志鑫ktv.MP4 | assets/ktv | video-ktv-star：朱志鑫 KTV演唱视频，作者上传 | 已存在，已映射 | 可选 |
| 张峻豪ktv.MP4 | assets/ktv | video-ktv-junhao：张峻豪 KTV演唱视频，作者上传 | 已存在，已映射 | 可选 |
| 张泽禹ktv.MP4 | assets/ktv | video-ktv-brother：张泽禹 KTV演唱视频，作者上传 | 已存在，已映射 | 可选 |
| 左航ktv.MP4 | assets/ktv | video-ktv-zuohang：左航 KTV演唱视频，作者上传 | 已存在，已映射 | 可选 |
| 运动会.pic.jpg | assets/gallery | photo-sports-day：第七章运动会照片，待作者上传 | 缺失，已预留映射；不阻断剧情 | 建议 |
| trousers-01.jpg | assets/weibo/entertainment | weibo-ent-trousers：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| bad-blood-01.jpg | assets/weibo/entertainment | weibo-ent-bad-blood：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| sweet-venom-01.jpg | assets/weibo/entertainment | weibo-ent-sweet-venom：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| apology-01.jpg | assets/weibo/entertainment | weibo-ent-apology：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| luelue-01.jpg | assets/weibo/entertainment | weibo-ent-luelue：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| football-01.jpg | assets/weibo/entertainment | weibo-ent-football：娱乐候选话题配图，待作者提供有权使用的原始素材 | 缺失，已预留映射；不阻断剧情 | 可选 |
| ch08-book-exchange-01.jpg | assets/events | photo-ch08-book-exchange：第八章旧书交换活动照片，可选，不阻断主线 | 缺失，已预留映射；不阻断剧情 | 建议 |

篮球场、篮球、篮筐由现有 Canvas 绘制，不需要 `ch07-basketball-background.png` 或独立音效。走廊和教室当前用短对话呈现，没有绑定背景照片，因此不批量创建相关素材需求。第八章只新增一张可选旧书活动照片引用，供相册及哥哥朋友圈共用。

### 商品图片

闲鱼所有原有商品映射保留在 `assets/xianyu/assets-map.json` 和 `stories/foundation/assets.json`。这里只列缺失映射，已有商品图无需重传。

| 文件名 | 建议目录 | 用途 | 当前状态 | 优先级 |
|---|---|---|---|---|
| cr7-only-god-figure-01.jpg | assets/xianyu/products/cr7-only-god | C罗唯一真神：足球球星小手办，展示柜挪位置 | 当前引用缺失；目录中的其他手办图片不自动替换，需作者确认 | 建议 |

### 现有未映射表情包

以下文件实际存在于 `assets/chat-images/`，但不在当前素材映射中。可复用，不要求重复上传；使用前新增稳定 assetId 和对应 itemMedia 绑定。
- `assets/chat-images/表情包-傻逼.pic.jpg`（已存在、未映射）
- `assets/chat-images/表情包-想上吊.pic.jpg`（已存在、未映射）
- `assets/chat-images/表情包-想哭.pic.jpg`（已存在、未映射）
- `assets/chat-images/表情包-想退学.pic.jpg`（已存在、未映射）
- `assets/chat-images/表情包-耍起.pic.jpg`（已存在、未映射）

## D. 目录、命名与替换步骤

1. 原文件不移动、不删除、不重命名。现有中文名、空格及大写 MP4 保持原样，避免破坏引用。
2. 新文件格式：`ch08-book-exchange-01.jpg`、`ch09-<已经确定的用途>-01.jpg`；不为未设计的下一章预建文件。头像使用已有 `avatar-<角色>.jpg/png` 规则。
3. 文件放到表中的实际目录；在 `assets.json` 对应 assetId 设置 file；在 `project.json.bindings` 绑定 itemMedia / itemAvatar / appIcon。不要把磁盘路径直接当作可播放 URL 写进消息。
4. 表内标注“已预留映射”的文件，只需按确切路径上传后构建；同一内容保持 assetId 与条目 ID 不变。`file: null` 的历史未用素材无需上传。
5. 建议图片使用 JPEG/PNG/WebP；视频新增时优先 MP4（H.264/AAC），音频优先 MP3。后缀须与真实格式相符；不能将改后缀当转码。
6. 构建会导入图片并为大视频生成散列文件，不要手改 `public/author-media`、`public/work.json` 或 `dist`。新素材如需公开发布，先确认可公开使用；作者备注、密钥、存档不进入发布产物。

## E. 按优先级上传

**必需：无。现有文字、选项、Canvas 与占位机制足够试玩。**

建议，按顺序：
1. `assets/events/ch08-book-exchange-01.pic.jpg`：本章旧书摊现场，勿含表白私下谈话。已预留相册/朋友圈共用映射。
2. `assets/characters/avatar-zhujiaqi.pic.jpg`、`assets/characters/avatar-lifei.pic.jpg`：两位 NPC 的统一头像，已预留原 assetId 的路径。
3. `assets/gallery/运动会.pic.jpg`：第七章已有路径，保持中文文件名以兼容旧引用。
4. `assets/gallery/party-evening-01.pic.jpg`：第六章合照，沿用 photo-party-evening，已补预留路径。
5. `assets/xianyu/products/cr7-only-god/手办.pic.jpg`：当前商品映射缺失；先确认现有备用图片能否使用，再决定是否补图。

可选：
- `assets/weibo/entertainment/{trousers,bad-blood,sweet-venom,apology,luelue,football}-01.jpg`：六个已配置娱乐候选话题。具体六条路径已在上表逐项列出；需连同可核对的原始来源，不以图片代替活动核实。
- 走廊、教室背景、篮球背景、额外音效：当前未引用，不要求上传。
- 已有头像、微信/微博/闲鱼图标、五个已映射表情包、六张相册图、作品 Demo 和四段 KTV 视频：不需重复上传。

## 第九章《好友申请》补充

本章无必需新素材；人物头像沿用角色配置。以下均为可选照片，不上传也可通关：

| 素材 | 准确路径 | 用途 | 当前状态 |
| --- | --- | --- | --- |
| 小吃店聚会合照 | `assets/events/ch09-snack-shop-group-01.pic.jpg` | 相册、女主及张泽禹朋友圈 | 待补，占位 |
| 朱志鑫自然微笑的抓拍 | `assets/events/ch09-star-candid-01.pic.jpg` | 相册、女主发送的私聊原图 | 待补，占位 |

上传到对应路径后运行 `npm run author:build`；无需改聊天组件。只使用你有权使用的素材，不需要额外二维码、微信号截图或背景图。

## 进入页背景、手机壁纸与玩家头像

| 用途 | 准确路径 | 建议尺寸 | 状态 |
| --- | --- | --- | --- |
| 进入页照片背景 | `assets/backgrounds/entry-background.pic.jpg` | 已上传 1206×1809；居中裁切 | 已接入 |
| 手机桌面/锁屏壁纸 | `assets/backgrounds/phone-wallpaper.pic.jpg` | 已上传 1206×2102；居中裁切 | 已接入 |

作品背景供所有玩家使用，文件已绑定，上传后构建即可。PNG/WebP 请使用真实后缀并修改 assets.json 中的 file。
玩家在进入页自选头像，支持 JPG/PNG/WebP，自动居中裁成方形小图，只保存在当前浏览器；旧存档可通过“我的设定 → 保存设定并继续故事”更换头像，进度与作品 ID 不变。不再显示性格选择。

## 闲鱼亲属卡更新新增素材

原商品与图片保持不变；新增6件商品的准确路径见 [闲鱼亲属卡说明](./XIANYU_FAMILY_CARD.md#待补素材)。当前均为可选占位，不影响购买、退款或微信回复。
