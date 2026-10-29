> 第三章已接入：第二章通关后可从结尾按钮或备忘录进入《报名表之外》。以下为第二章实现说明，第三章详见 CHAPTER03_AUTHORING_ZH.md。

# V0.4 选项微信与第二章创作说明

## 默认入口与兼容性

继续使用当前工作区，不重建项目、不推送远程、不公开发布。默认作品 ID 仍是 `shoukun-good-weather`，revision 仍为 1，浏览器里的昵称、第一章进度和旧消息保留。

第一章《好天气》的底座与原始扩展文件不改写。完成第一章后，结尾提示中点击 **进入第二章 · 关于喜欢这件小事**。也可返回手机，到备忘录打开《第二章 · 关于喜欢这件小事》。已有第一章通关存档可直接续接，无需从头重玩。第二章标题与所有台词都属于可修改初稿。

当前玩家微信采用预设选项模式：轮到玩家时，聊天底部出现“选择回复”，点开2—4个候选句子；选择后发送到正常右侧气泡，面板收起，NPC稍后自动回复。没有选项时没有无效输入框。主线不调用AI，也不接受自由文字推动剧情。旧版本的自由留言与日常聊天记录仍保存在浏览器，若有记录可点“旧留言记录（只读）”查看；原AI代码保留给以后明确配置的用途。

旧演示 `project-demo.json`、原 story.json、原 extensions.json、原四人作者群资料、人物关系和照片素材均保留。新增的是一个**文化节临时筹备群**，成员包含女主和四位男生，和“「四个男的」私群”是不同的群。

## 初始好友与申请

| 人物 | 初始状态 | 私聊权限 |
| --- | --- | --- |
| 张泽禹 brother | 已添加 | 可以 |
| 左航 zuohang | 已添加 | 可以 |
| 张峻豪 junhao | 未添加 | 不显示入口，不可私聊 |
| 朱志鑫 star | 未添加 | 不显示入口，不可私聊 |

未加好友时不显示该角色自己发布的朋友圈；仍可在已加好友的转发、评论和共同群聊中间接出现。加为好友后显示其已解锁动态，素材与记录不删除。第一章通过张泽禹《转发：今天的天不错》推进，旧存档曾读原天气动态的进度仍兼容。微信好友通讯录与独立通讯录 App 都按同一状态筛选；不会从群成员或朋友圈作者自动生成好友。

运行状态键为 `friend.<联系人ID>.state`，取值依次为 `unknown`、`met`、`requested`、`accepted`。群聊建立初步交集后，张峻豪为发报名资料而提出申请。玩家去 **微信 → 通讯录 → 新的朋友 → 同意**；通过后联系人和私聊同步出现，群聊历史保留。重复同意、未收到申请就触发同意都不会重复发消息或越权添加。

朱志鑫默认停在 `met`，第二章不会强行加好友或突然主动私聊。若作者决定在章末开放好友添加，把 `chapter-02.json` 中变量 `ch02.addZhuAtEnd` 改为 `true`。群聊完成后，“新的朋友”会出现可发送的申请，玩家点击后等待短暂模拟验证，通过后才出现私聊。这是虚拟剧情里的预设验证，不是真实微信请求；克制的验证后消息仍由台词配置决定。

注意：同 revision 恢复时已有玩家变量优先，作者修改默认值只自动影响新周目。测试已有周目应在开发面板中用变量事件明确改变该变量，或开一个新的测试周目；不要为了改配置清空玩家存档。旧存档中若已有私聊阅读记录，可保留其已建立的好友权限；没有历史证据不会自动补全好友。

## 第二章场景与五处选择

1. **哥哥发现秘密**：哥哥发现女主反复转发活动通知。四种语气：否认、含糊、反问、半开玩笑承认。各有不同调侃，最后回到文化节、值日和一支借走的笔。
2. **学校里的日常**：朋友圈有文化节招募、午饭窗口、图书馆书签。读招募动态跨 App 解锁相册里的《开学典礼那天》照片。左航关心午饭，玩家选择问书或问午饭，得到不同信息；问书可多一张阅读便签。
3. **为了接近他，也为了自己**：读《不是只有一个理由》，思考参与活动的私心与真实兴趣。选择资料整理或现场协助，记录工作意向 `ch02.activityRole`，哥哥给出不同建议，解锁待办。
4. **进入共同社交圈**：新五人临时群自动聊天，彼此有玩笑、作业和各自任务。张峻豪申请好友并发来文件说明。女主在群里可问岗位试做或集合地点，朱志鑫分别认真回答；没有过早暧昧。
5. **平静收束**：选择先存报名表或主动提出帮忙，只改变交流语气。阅读《先把名字放回日常里》，第二章完成。默认不加朱志鑫好友；可配置开放的申请是活动对接用途，不确定恋爱关系。下一章钩子保存在 `chapter.next = chapter-03-pending`，现已接入《报名表之外》；误会与解释仍留待后续。

消息队列的显示顺序沿用实际解锁顺序，玩家选项气泡会出现在NPC回应之前；即使分支消息在文件中分开存放，也不会挤到记录末尾。

五个选择节点中：哥哥试探与收束为普通语气，左航日常与群里问事为信息探索，活动岗位为重要细节选择。共有64种组合，汇合为一个章末，不用好感度数值强行定义关系。实际时长受阅读速度和探索影响，没有为凑8—12分钟加入长时间等待。

## 台词、选项与速度在哪里改

| 文件 | 作用 |
| --- | --- |
| stories/foundation/chapter-01.json | 第一章底座，保留原内容 |
| stories/foundation/chapter-01.extensions.json | 第一章原台词与事件，保留 |
| stories/foundation/chapter-02.json | 第二章NPC台词、朋友圈、相册占位、备忘录、待办、变量、跨App事件与64条通关路径 |
| stories/foundation/interactions.json | 通用聊天配置、选项、回复顺序、分支动作、延迟、好友申请、进度提示与章节续接入口 |
| stories/foundation/project.json | 加载原第一章扩展，再追加第二章；启用交互配置，登记两章 |
| stories/foundation/project-chapter01.json | 本轮改动前的单章项目，供回归检查 |

### 改某个选项文字

在 interactions.json 找到相应 flow.steps 中的 `choice`。例如 `ch02-secret` 的一个选项：

```json
{
  "id": "ch02-secret-deny",
  "text": "没有啊，你想多了。",
  "kind": "tone",
  "replies": [
    { "message": "ch02-brother-04" },
    { "message": "ch02-brother-05" }
  ],
  "actions": []
}
```

只改 `text` 即可同步改变按钮文字和玩家发送的气泡。不要修改稳定 id。选项对应的玩家消息由准备器生成，不需要再手写同一句台词。`kind` 可为 tone / information / important，会随该选择记录；改变人物状态用 actions 明确声明。

### 改NPC回复

在 chapter-02.json 的 chats 中，通过稳定 message ID 找到对应消息，改 `body`。senderId 决定发言者（star / junhao / brother / zuohang / owner）。不在当前会话 participants 中的角色不能发消息。消息仍设 hidden:true，由队列逐条解锁。

正文也可以使用既有的图片、表情字符或音频消息类型及资产绑定，自动发送队列不限制为纯文字。V0.4.2 已接入作者放入 assets/ 的6张照片和5张表情包；未生成语音。照片与海报通过 assets.json 登记，再由 project.json 的 itemMedia 绑定到对应记录。带原台词的表情包消息使用 kind=image、meta.imageCaption=true。

### 添加一个分支

给已有 choice.options 追加一项，保持总数2—4：

```json
{
  "id": "ch02-secret-new-option",
  "text": "新的预设回答，待作者填写。",
  "kind": "information",
  "replies": [{ "message": "new-brother-reply" }],
  "actions": [
    { "type": "variable", "key": "ch02.exploredTopic", "value": true }
  ]
}
```

再向同一个 chats 会话的 messages 添加 hidden:true、senderId正确、ID为 new-brother-reply 的台词。分支回复播放完会自动回到 choice 后的共同 steps。需要新的后续段落，可添加 flow，并用 read、variable 或自定义事件及 conditions 触发；关系条件使用原引擎的条件键与动作白名单。新增选项也应补一条对应 tests 通关路径。

### 调整速度

interactions.json 顶层 `defaultDelayMs` 是第二章默认间隔，本轮为1100毫秒。单条可覆盖：

```json
{ "message": "ch02-activity-01", "delayMs": 1600 }
```

引擎按秒更新，200毫秒等短间隔可能约一秒才显示。不要设置0或把所有消息一次解锁。`replies` 与普通 steps 都支持同一延迟设置。NPC发言由现有事件引擎安排，切换手机 App 仍继续；关闭页面则暂停，重新打开续接剩余队列，不进行现实时间补发。

第一章的 read 链保留；聊天打开时自动阅读可触发的最新可见消息，继续沿原链运行。原有700/600毫秒等延迟仍在第一章配置里。朋友圈、相册和备忘录仍需要玩家实际打开阅读，不会被自动聊天跳过。

## 通用代码结构

- src/authoring/interactions.ts：验证白名单配置，将顺序消息、选择分支和好友申请编译成原引擎事件；未重写引擎。
- src/authoring/compile.ts 与 scripts/prepare-campus.mjs：加载追加文件、检查冲突与引用，复用素材与角色。
- src/personalization/chatRuntime.ts：好友权限、当前可回复选项、等待状态、可自动阅读消息、章节续接。
- src/personalization/CampusConversation.tsx：底部回复入口、小型选项面板、打字状态与只读旧留言。
- src/personalization/FriendRequests.tsx：模拟申请、同意、验证结果与私聊入口。
- src/personalization/storyGuide.ts / ChapterHelp.tsx：进度提示；第二章文案来自配置。
- src/Phone.tsx / AppSkins.tsx：同步权限过滤、按消息解锁顺序显示、下一章入口与通讯录左对齐。
- src/runtime/RuntimeBoundary.tsx 与 StoryPlayer.tsx：本地预览更新导致资源失效时显示刷新恢复提示，保留存档。
- src/saveRestore.ts：保留原存档格式，同版本补新增默认变量和新作者元数据；不删除历史。
- src/story-engine/compiler.ts：只增补共享头像标记的解析，避免重复把联系人图片内嵌到每条微信；仍支持旧内嵌头像。
- src/authoring/interactions.test.ts：自动顺序、分支、好友权限、存档、重复点击与可配置朱志鑫申请测试。

头像原图保持不变，微信在显示时复用已有联系人头像，群头像集中登记一次。既有图片与大图功能保留；当前两章 work.json 约1.8MB，避免随消息数量重复膨胀。

## 本地预览与验证

项目目录中运行：

```sh
npm run author:dev
```

玩家版：

```sh
npm run author:build
PORT=4187 npm run campus:serve
```

电脑 <http://127.0.0.1:4187/>，同一Wi-Fi手机 <http://10.47.131.94:4187/>。当前电脑IP改变后需替换地址。电脑保持开机和服务运行。更新后如仍看到旧输入框，等几秒刷新一次让离线缓存更新，不需要清除存档。

检查实际存在的命令：

```sh
npm run author:check
npm run foundation:validate
npm run foundation:test
npm run typecheck
npm run lint
npm test
npm run author:build
npm run test:authoring:e2e
```

结果与实际浏览器验收另见 V0.4_VERIFICATION_ZH.md。测试预览和开发跳转不能冒充真实通关；同样不能把Chrome启动失败当成端到端测试通过。
