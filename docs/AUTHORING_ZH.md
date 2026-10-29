> **第四章更新**：先看 [第三章打磨与第四章说明](CHAPTER04_AUTHORING_ZH.md)，以及本轮 CHAPTER34_VERIFICATION_ZH.md 验收记录。旧章节和存档保留。

> **第三章版更新**：先看 [第三章说明](CHAPTER03_AUTHORING_ZH.md) 与 [女主备忘录长期规范](MEMO_WRITING_ZH.md)。前两章素材、事件与存档均保留；第一章主记录按本轮要求扩写。

> **当前 V0.4**：微信预设选项与NPC自动回复、第二章及好友申请，请先看 [创作说明](CHAPTER02_AUTHORING_ZH.md)。第二章台词在 `chapter-02.json`，选项和回复队列在 `interactions.json`，第一章文件保留。

> **V0.3 当前入口已更新**：默认试玩是《好天气》。请先看 [V0.3 交付说明](V0.3_DELIVERY_ZH.md)。当前内容文件为 `chapter-01.extensions.json`，底座为 `chapter-01.json`，默认 `project.json` 已指向这两份文件。下文的 `story.json` / `extensions.json` 示例仍属于保留的旧演示，可通过 `project-demo.json` 单独使用。

# 校园群像手机 · 中文创作手册 V0.2

本手册针对当前 Fork 的本地版本。你可以继续用自然语言把人物和素材交给 Codex，不需要每次重新说明底层架构。优先打开本手册和项目 AGENTS.md。

## 先认识四份创作配置

| 文件 | 你在这里管理什么 |
| --- | --- |
| stories/foundation/characters.json | 五个人的稳定 ID、微信昵称、头像、关系、独立人物线、公开简介和作者备注 |
| stories/foundation/assets.json | 素材 ID 与本地文件路径 |
| stories/foundation/project.json | 章节清单、素材绑定和小游戏 |
| stories/foundation/extensions.json | 本轮以后新增的私聊、群聊、朋友圈、照片、备忘录、事件、变量和通关测试 |

原来的 story.json 是已存在的演示故事，继续保留。扩展采用追加，不会按同名 ID 覆盖已有内容；需要修改已有剧情时明确告诉 Codex 具体内容 ID。

`work/campus/story.json`、public/work.json 和 dist/ 是生成物，**不要手动改**。重新生成会覆盖这些生成物。素材与人物配置才是要长期保存的来源。

## 1. 本地预览、检查与构建

安装 Node.js 22，进入项目目录：

```sh
npm ci
npm run author:check
npm run author:dev
```

打开终端显示的地址。这个开发预览会显示“开发调试（仅开发环境）”，适合作者检查；不要把开发服务器直接公开给玩家。

玩家版：

```sh
npm run author:build
npm run campus:serve
```

若 4173 已被旧预览占用，macOS/Linux 可以使用：

```sh
PORT=4186 npm run campus:serve
```

手机需和电脑连接同一个 Wi-Fi，使用电脑的局域网 IP，而非 127.0.0.1。电脑须保持开机和服务运行。当前静态网页包也可以用 `npm run preview:lan` 本地分享，但不包含 AI 后端。

检查命令：

```sh
npm run typecheck
npm run lint
npm test
npm run test:assets
npm run test:server
npm run foundation:validate
npm run foundation:test
npm run author:build
npm run test:authoring:e2e
```

浏览器自动测试需要可启动的 Chrome；遇到启动限制时，不能把它算作通过。故事校验错误会定位到文件/字段；素材缺失会报告素材 ID。`npm run story` 不是本仓库已有命令，请使用上面实际存在的命令。

## 2. 人物与独立主线

现有稳定 ID 对照：

| 人物 | characters.json 的 id | 聊天 participants / senderId 的 storyId | 独立主线 |
| --- | --- | --- | --- |
| 玩家 | owner | owner | player-growth |
| 朱志鑫 | zhuzhixin | star | zhu-growth |
| 张峻豪 | zhangjunhao | junhao | junhao-music |
| 张泽禹 | zhangzeyu | brother | zeyu-identity |
| 左航 | zuohang | zuohang | zuo-search |

为了兼容旧内容，两种既有 ID 都保留，不要随意改名。新增人物时可让 id 和 storyId 相同。

复制一条人物记录后修改，例如在 characters.json 数组加入：

```json
{
  "id": "new_friend",
  "storyId": "new_friend",
  "name": "新角色（待定）",
  "nickname": "新角色",
  "persona": "沟通语气待补充",
  "avatarAssetId": "avatar-new-friend",
  "avatarStages": {},
  "wechat": { "nickname": "新角色", "bio": "待补充", "momentsBio": "资料待补充" },
  "tags": ["待补充"],
  "storylineId": "new-friend-growth",
  "aiEnabled": false,
  "relationships": [{ "characterId": "owner", "kind": "朋友", "description": "待补充" }],
  "publicBio": "公开简介待补充",
  "authorNotes": "尚未揭晓的作者设定放这里，不写入公开简介",
  "placeholders": { "age": null, "grade": null, "birthday": null, "school": null },
  "contentIds": [],
  "initialStates": { "trust": "unexplored", "understanding": "unexplored", "conflict": "none", "growth": "not-started" }
}
```

再登记下面介绍的 avatar-new-friend 素材 ID。准备器会为新人物生成通讯录联系人；具体聊天需另外添加。

`authorNotes` 不编入玩家包，也不会自动送给日常聊天模型。它不是现实人物信息。公开简介与已写入剧情的内容则会随静态网页分发。

现有年龄、年级、生日、学校字段用 null 标记待定。不要为通过校验而编造最终设定。玩家输入的班级只是该次体验的个人设定，不能当作正式时间线。

## 3. 放入和替换头像、图片、音频

| 素材类别 | 目录 | 推荐 |
| --- | --- | --- |
| 人物 / 群头像 | assets/characters/ | 正方形，512 × 512；JPEG/WebP/PNG，建议 50–200 KB |
| 聊天图 / 表情包 | assets/chat-images/ | JPEG/WebP/PNG/GIF，长边 800–1600；避免超长截屏一次显示 |
| 朋友圈图片 | assets/moments/ | JPEG/WebP/PNG，长边约 1200 |
| 相册照片 | assets/gallery/ | JPEG/WebP/PNG，保留必要线索清晰度 |
| 壁纸 / 校园场景 | assets/backgrounds/ | 竖屏图可用约 1170 × 2532，先压缩到合理大小 |
| 特殊剧情图 | assets/events/ | JPEG/WebP/PNG |
| 小游戏素材 | assets/minigames/ | 依实际玩法分类，使用稳定素材 ID |
| 音频 / 录音 | assets/audio/ | MP3/WAV/OGG；人声可用单声道，建议 MP3 96–128 kbps |

这些尺寸和体积是建议，不是必须。导入器限制单图 4 MB、单音频 10 MB；大型音频会增加整个剧情包体积。无损线索截图可用 PNG，普通照片优先 JPEG/WebP。无需为头像上传原始大图。

文件命名推荐小写英文、数字、短横线，例如 `zhu-avatar-01.webp`。不要重用素材 ID 来指代完全不同的内容；替换同一头像可保留原 ID，仅更换 file。

把授权文件放好后，在 assets.json 的 assets 数组中登记：

```json
{
  "id": "avatar-zhuzhixin",
  "category": "characters",
  "file": "assets/characters/zhu-avatar-01.webp",
  "required": false,
  "description": "朱志鑫的微信与通讯录头像"
}
```

这条 ID 已存在时，**修改原记录，不要重复新增**。characters.json 中 avatarAssetId 指向同一个 ID，聊天列表、聊天气泡、朋友圈和通讯录就会统一使用。群头像通过 project.json 的 groupAvatar 绑定到会话 ID。

未提供素材时用 `"file": null`，显示原框架的首字头像或标题占位。路径失效且 required 为 false 时给出告警并使用占位；required 为 true 时阻止构建。错误格式、假图片、越界路径和指向项目外的符号链接会被拒绝。当前导入器不接收 SVG、远程 URL 或任意 HTML。

替换不会自动清除原故事内已有的内嵌图片。只有提供了有效的新素材，映射才会替换该位置。

阶段头像：在 avatarStages 中登记 `"later": "avatar-zhu-later"`，再在某条消息或朋友圈的 meta 写 `"avatarStage": "later"`。这是按内容阶段选图，暂不提供运行中全局换头像的编辑界面。

素材导入时自动转换为原框架支持的内嵌媒体，玩家网页不用再寻找本地图片路径。源码备份必须同时保存 assets/ 和 stories/；只备份 dist 无法完整恢复创作来源。目录可用源码 ZIP 或 Git 管理；本轮没有推送 GitHub。

## 4. 新增私聊与群聊

在 extensions.json 的 chats 数组中加入。若 chats 不存在，新增此键；不要覆盖整个文件：

```json
{
  "id": "late-chat-demo",
  "app": "wechat",
  "title": "张泽禹",
  "participants": ["brother", "owner"],
  "messages": [
    { "id": "late-chat-01", "senderId": "brother", "body": "【测试占位】这条消息由作者以后替换。", "time": "2026-10-28 21:00" },
    { "id": "late-chat-02", "senderId": "owner", "body": "【测试回复占位】", "time": "2026-10-28 21:01", "hidden": true }
  ]
}
```

日期只是现有测试日期，正式时间线待定。联系人引用使用 storyId，不是角色 AI ID。title 是微信会话名；改昵称时需同步会话标题，避免同一人出现两个会话。

群聊只需换标题，participants 列出所有成员，每条消息 senderId 指向对应人物：

```json
{
  "id": "music-group-demo",
  "app": "wechat",
  "title": "音乐活动测试群",
  "participants": ["junhao", "brother", "owner"],
  "messages": [{ "id": "music-group-01", "senderId": "junhao", "body": "【群聊测试占位】" }]
}
```

图片/表情包消息设 `"kind": "image"`，再通过素材绑定将图片映射给该消息 ID。表情字符可直接写进 body。音频消息设 `"kind": "audio"`，绑定 MP3/WAV/OGG；没有素材时先留文字占位，不伪造语音。

## 5. 朋友圈与相册

在 extensions.json 的 content.wechat 数组加入朋友圈：

```json
{
  "id": "moment-music-demo",
  "title": "练习室测试动态",
  "sender": "张峻豪",
  "body": "【等待作者提供的日常文字】",
  "kind": "post",
  "folder": "朋友圈",
  "hidden": true,
  "likes": 0,
  "comments": ["张泽禹：【预设评论占位】"]
}
```

点赞保存在原手机 ui 存档中。评论目前是作者预设内容，尚不支持玩家自由写评论。

相册写在 content.photos：

```json
{
  "id": "photo-music-demo",
  "title": "练习室的一角",
  "body": "【图片说明或线索占位】",
  "kind": "image",
  "folder": "音乐活动",
  "hidden": true
}
```

在 assets.json 注册实际图片，然后在 project.json 的 bindings 加入：

```json
{ "assetId": "music-room-photo", "target": "itemMedia", "targetId": "photo-music-demo" }
```

target 可用 itemMedia、itemAvatar、groupAvatar、wallpaper。groupAvatar 的 targetId 是聊天会话 ID；wallpaper 的 targetId 可写 phone。当前锁屏与桌面共用一份自定义壁纸。

## 6. 备忘录、日记、信件与密码

在 content.notes 加入：

```json
{
  "id": "zuo-reading-demo",
  "title": "未完成的阅读笔记",
  "body": "【左航个人成长线的短记录，待作者填写】",
  "sender": "左航",
  "kind": "note",
  "folder": "阅读与自我探索",
  "hidden": true
}
```

folder 可用于日记、草稿、未发出的信、心情等分类。若只需要原有内容密码，可加 `"password": "测试密码"`。密码是静态谜题，不是保密措施。正确解锁后，本轮已支持保存解密状态。

## 7. 跨 App 事件、选择与消息节奏

在 extensions.json 的 events 数组加入：

```json
{
  "id": "unlock-moment-after-chat",
  "label": "读完聊天后出现朋友圈",
  "event": "read",
  "target": "music-group-01",
  "actions": [
    { "type": "unlock", "key": "moment-music-demo", "value": true },
    { "type": "notification", "key": "", "value": "微信：朋友圈有新动态。" }
  ]
}
```

再以 moment-music-demo 的 read 事件解锁 photo-music-demo，以照片的 read 解锁 zuo-reading-demo，即可组成跨 App 链。

阅读剧情由玩家点击内容触发；会话的视觉已查看状态不等于完成阅读剧情，避免打开列表就跳过线索。新消息必须先作为 hidden 内容存在，再由 unlock 显示；不要一次性把所有隐藏消息改成可见。

延时示例：

```json
{
  "id": "music-reply-delay",
  "label": "稍后出现的回复",
  "type": "delay",
  "delayMs": 3000,
  "actions": [{ "type": "unlock", "key": "late-chat-02", "value": true }]
}
```

由前一事件的 next 指向此 ID；不要写会在所有 App 打开时都触发的空 target 事件。默认 once 防止重复执行。多个同时发生的事件应避免互相覆盖同一个变量，来电尽量串行安排。

选择沿用原 choice 节点，next 列出两个 action 节点；action 可 unlock 不同回复并记录变量，例如：

```json
{ "type": "variable", "key": "relationship.owner.zeyu.understanding", "value": "talked-openly" }
```

在 extensions.variables 中声明这个键的初始值，例如 unseen。信任、理解、冲突、成长分别记录，不用单一好感度控制全部人物线。`character.<角色id>.trust/understanding/conflict/growth` 已有初始状态，可按剧情更新。

## 8. 章节

project.json 的 chapters 只负责组织和测试入口，实际推进仍由事件引擎驱动。新增示例：

```json
{
  "id": "chapter-music-demo",
  "title": "音乐活动（测试）",
  "kind": "side",
  "date": null,
  "characterIds": ["zhangjunhao", "zhangzeyu", "owner"],
  "eventIds": ["unlock-moment-after-chat"],
  "entry": { "event": "read", "target": "music-group-01" },
  "completeWhen": [{ "key": "read:zuo-reading-demo", "op": "eq", "value": true }],
  "completeLogic": "all",
  "next": []
}
```

kind 区分 main 主线、side 支线、hidden 隐藏、ambient 日常、demo 测试。next 记录后续章节引用，**不会自动跳转或解锁**；仍需写对应条件/事件。completeLogic 可为 all 或 any。

新章节采用独立 ID 和文件中的独立记录，避免修改第一章现有 ID。少量兼容追加可以保持同 revision；删除、重命名内容或重大改写前，应先讨论版本策略。不要为了兼容而自动迁移或清空玩家存档。

## 9. 小游戏

当前实现一种受控 password 类型，复用 notes，不执行配置中的脚本。project.json 已有可运行的 clue-demo：查看照片后解锁，测试密码 1028，成功后出现反馈备忘录。

新增模板：

```json
{
  "id": "my-clue-demo",
  "type": "password",
  "title": "新的测试线索盒",
  "app": "notes",
  "itemId": "my-clue-box",
  "prompt": "提示文字，必须让玩家知道线索在哪里。",
  "password": "1234",
  "successText": "测试完成反馈。",
  "start": { "event": "read", "target": "photo-music-demo" },
  "conditions": [],
  "unlockIds": ["zuo-reading-demo"]
}
```

生成器会写入 `minigame.my-clue-demo.completed` 布尔值及 `.result` 状态，并产生 `game-my-clue-demo-start/done` 事件。错误密码不触发完成事件，可重试或退出。

要做问答、排序或节奏类型，需先由 Codex 在 schema 白名单及编译器/组件中增加受测试的类型；不要把 JavaScript、HTML 或可执行导入塞入 JSON。新增小游戏不需要改手机路由。

## 10. 开发调试与存档

仅 `author:dev` 中显示开发面板，可以：

- 重置当前作品/周目的测试进度，不删除其他作品或周目。
- 执行某章节配置的测试入口；这不是替作者自动走完整章。
- 触发指定 read/openApp/来电事件，或测试当前可选回复。
- 查看完成事件、解锁内容、定时任务、人物状态和头像状态。

调试事件会直接驱动引擎，可能绕过真实玩家操作顺序，因此不能用调试跳转冒充完整游玩验证。玩家版没有该面板。

自动保存仍使用当前浏览器 IndexedDB。昵称等资料保存在当前浏览器；换设备/浏览器不会自动同步。新增变量会在同一 revision 恢复时补默认值，已有选择保留；跨 revision 不自动迁移。

每个结局仍需有 tests 路径。密码测试 step 要提供 password，延时用 advanceMs，选择用 choose。小游戏可加入已有通关路径验证，也可以创建专用的引擎测试。

## 11. 部署、备份与浏览器上传的边界

`author:build` 的 dist/ 是玩家静态包。原有 GitHub Pages 工作流已改为使用准备后的校园作品，但本轮没有推送或公开部署。静态部署无需云存储；AI 后端不能运行在纯 GitHub Pages 上，且仍按用户选择保持未配置。

当前没有浏览器内上传素材库。以后若要增加，可选择“上传后导出完整作品 ZIP”的纯本地方案；若要求上传后跨设备持续可用，则需要服务端/对象存储、权限和备份设计，应另行确认，不会自动接入云服务。

长期保存源码时，应包括 stories/、assets/、src/、scripts/、package-lock.json 及许可证。不要保存或分享 .env、浏览器个人存档、node_modules、临时缓存。当前交付源码 ZIP 已排除这些文件。

## 下一次你可以这样告诉 Codex

- “这张图是朱志鑫的授权头像，替换 avatar-zhuzhixin，保持其他素材和剧情不变，运行素材检查。”
- “把这三张图片加入音乐活动相册，ID 为 photo-music-01 到 03，阅读 music-group-01 后解锁，新增一条测试路径。”
- “新增张泽禹和张峻豪的深夜群聊，作为独立支线，不要求恋爱变量，台词如下……”
- “在女主读完某条消息后解锁左航的阅读笔记；具体消息 ID 和笔记文字如下……”
- “修改第三章，不改变第一章 ID 和已完成状态；先告诉我是否涉及 revision 或存档迁移。”

下一批建议先提供五个人的授权正方形头像、一个群头像，以及 2–3 张可用于测试的校园/相册图片。音频可以晚一点给。附上“谁的素材、用途、替换哪个 ID、是否需要剧情解锁”即可。
