# 闲鱼与亲属卡

所有卖家与28件商品初始上架，没有章节、随机刷新或时间限制。原有22件商品的ID、标题、描述、价格、图片和卖家资料保持不变。

## 内容与配置

`stories/foundation/market-interactions.json`：新增6件商品、素材引用、所有卖家的交易语气和亲属卡规则。`market.settings` 默认：

- `highAmount: 50`：单次实际支付达到50元必定通知。
- `mediumAmount: 20`、`mediumProbability: 0.6`：20至不足50元的通知概率。
- `smallProbability: 0.25`：不足20元的通知概率。
- `cumulativeAmount: 120`、`purchaseCount: 4`：累计付款达到120元或4次，触发一次“假装破产”。不关闭或限制卡。
- `refundNotice: true`：退款后通知。

`market.productTags` 将商品ID映射到 cap/book/career/fruit/gaming/contact 等消息池；`market.reactions` 是消息池，按商品稳定选取不同文案；`replyOptions`、`refundOptions`、`bankruptcy` 配置玩家预设回复与哥哥自动回复。

小额概率依据作品/玩家存档ID、商品ID、购买次数稳定计算，刷新不会重新抽取。累计统计是本轮联动记录的历史付款总额，退款另计。旧购买记录不补发消费通知，旧成交仍支持退款。没有API、真实订单、支付或账号交接。

## 操作与存档

商品详情 → 联系卖家，可先砍价、闲聊，也可直接购买、拒绝、再考虑、已读不回。已读不回最多收到一条追问，左航与匿名日用品卖家不催促。拒绝后可“回来再看看”，保留议价。

确认后短暂等待付款，可在等待期间取消；付款成功才能触发微信。完成订单可申请模拟退款，按实际付款金额原路退卡。每件二手商品仅产生一个模拟订单，重复点击、刷新与退款后均不再次扣款。商品始终可浏览。

闲鱼“订单”页查看待付款、已完成、已取消、已退款状态。交易记录保存在原Runtime.variables，微信通过原预设选项与延迟队列回复；多个账单依次发送，回复不会清除其他主线选项。

## 待补素材

全部可选，未上传时显示“商品图片待补”。上传后运行 `npm run author:build`。

| 商品 | 路径 |
| --- | --- |
| 奶嘴帽 | `assets/xianyu/products/hanbing-sheshou/hanbing-sheshou-cap-01.jpg` |
| 虚构打瓦体验卡 | `assets/xianyu/products/xinan-yujie/xinan-yujie-gaming-01.jpg` |
| 闲置衬衫 | `assets/xianyu/products/tutucha-mengmengda/tutucha-mengmengda-shirt-01.jpg` |
| 事业运壁纸 | `assets/xianyu/products/cr7-only-god/cr7-only-god-career-01.jpg` |
| 帅哥主题壁纸 | `assets/xianyu/products/cr7-only-god/cr7-only-god-handsome-01.jpg` |
| 好运壁纸 | `assets/xianyu/products/cr7-only-god/cr7-only-god-luck-01.jpg` |

素材映射继续沿用 assets.json、project.json.bindings 和 assets/xianyu/assets-map.json。
