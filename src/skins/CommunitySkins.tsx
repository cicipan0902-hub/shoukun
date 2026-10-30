import { useContext, useState } from "react";
import { Heart, Bookmark, MessageCircle, ChevronLeft } from "lucide-react";
import { useSkinState } from "../skinState";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import { safeMedia, type Item, type Runtime } from "../schema";
import { Header, Avatar, Media, SearchBox, Empty, type Props } from "./shared";
import { SocialDetail } from "./SocialDetails";
import "./community.css";
import { marketOrders } from "../personalization/marketRuntime";
export const communityMatch = (item: Item, query: string) => `${item.title} ${item.body} ${item.sender} ${item.meta.topic || ""}`.toLowerCase().includes(query.trim().toLowerCase());
type Offer = { id: string; text: string; result: string; price: number };
export function marketOffers(item: Item): Offer[] {
  try {
    const parsed: unknown = JSON.parse(item.meta.options || "[]");
    return Array.isArray(parsed) ? parsed.filter((o): o is Offer => !!o && typeof o.id === "string" && typeof o.text === "string" && typeof o.price === "number" && typeof o.result === "string") : [];
  } catch { return []; }
}
function PostCard({ p, item, open, account }: { p: Props; item: Item; open: () => void; account: () => void }) {
  const [liked, like] = useSkinState<boolean>(p, "liked-" + item.id, false);
  const [saved, save] = useSkinState<boolean>(p, "saved-" + item.id, false);
  const count = item.comments.length + (Array.isArray(p.ui?.["replies-" + item.id]) ? (p.ui!["replies-" + item.id] as string[]).length : 0);
  return <article className="community-post">
    <button className="community-author" onClick={account}><Avatar name={item.sender} src={item.avatar} /><span><b>{item.sender}</b><small>{item.time}</small></span></button>
    <button className="community-body" onClick={open}><strong>{item.title}</strong><p>{item.body}</p></button>
    {item.meta.imagePath && !item.media && <small className="community-media-pending">配图待补</small>}
    {item.media && (item.kind === "video" ? <Media item={item} /> : <button className="community-photo" onClick={open}><Media item={item} /></button>)}
    <div className="community-actions"><button onClick={open}><MessageCircle size={16} />评论 {count}</button><button aria-pressed={liked} onClick={() => like(!liked)}><Heart size={16} />{item.likes + Number(liked)}</button><button aria-pressed={saved} onClick={() => save(!saved)}><Bookmark size={16} />{saved ? "已收藏" : "收藏"}</button>{p.readIds?.includes(item.id) && <small>已读</small>}</div>
  </article>;
}
function Follow({ p, account }: { p: Props; account: Item }) {
  const [followed, follow] = useSkinState<boolean>(p, "followed-" + account.sender, false);
  return <button className="community-primary" aria-pressed={followed} onClick={() => follow(!followed)}>{followed ? "已关注" : "关注"}</button>;
}
// Role accounts reuse the same contact cards as WeChat; no separate identity/avatar copy.
export function resolveWeiboItems(items: Item[], contacts: Item[], owner: string, ownerAvatar: string): Item[] {
  return items.map((item) => {
    const ref = item.meta.characterRef || item.meta.accountId;
    const contact = contacts.find((c) => c.id === ref + "-card");
    if (ref !== "owner" && !contact) return item;
    const name = ref === "owner" ? owner || "我" : contact!.title;
    return { ...item, sender: name, avatar: ref === "owner" ? ownerAvatar : contact!.avatar,
      title: item.meta.type === "account" ? name : item.title };
  });
}
function SourceStatus({ item }: { item: Item }) {
  if (!item.meta.verificationStatus) return null;
  const source = item.meta.sourceUrl;
  const sourceSafe = /^https:\/\//.test(source || "");
  return <aside className="community-source"><b>{item.meta.verificationStatus === "verified" ? "来源已核对" : "待核实 · 待补原始素材"}</b><p>{item.meta.sourceNote}</p><small>游戏候选话题，未确认真实上榜记录。评论为游戏内虚构示例，互动数字仅记录本地操作。</small>{sourceSafe && <a href={source} target="_blank" rel="noreferrer">查看配置来源</a>}</aside>;
}
export function CampusWeiboSkin(p: Props) {
  const play = useContext(CampusPlayContext);
  const items = resolveWeiboItems(p.items, [...(p.contacts || []), ...(play?.work.data.contacts || [])], p.owner || "我", p.ownerAvatar || String(play?.work.variables["author.ownerAvatar"] || ""));
  const [storedSection, setSection] = useSkinState<string>(p, "community-section", "个人微博");
  const section = storedSection === "热搜" ? "娱乐热搜" : storedSection;
  const [query, setQuery] = useSkinState<string>(p, "community-query", "");
  const [postId, setPost] = useSkinState<string>(p, "community-post", "");
  const [accountId, setAccount] = useSkinState<string>(p, "community-account", "");
  const [topicId, setTopic] = useSkinState<string>(p, "community-topic", "");
  const [zoom, setZoom] = useState("");
  const posts = items.filter((i) => i.meta.type === "post" || !i.meta.type);
  const configuredAccounts = items.filter((i) => i.meta.type === "account");
  const accounts: Item[] = [...configuredAccounts, ...posts.filter((post, index) => !configuredAccounts.some((a) => a.sender === post.sender) && posts.findIndex((p) => p.sender === post.sender) === index).map((post) => ({ ...post, id: "account-" + post.id, title: post.sender || "校园用户", body: "作品中的本地模拟账号", meta: { ...post.meta, accountId: "legacy-" + post.id } }))];
  const accountKey = (i: Item) => i.meta.accountId || accounts.find((a) => a.sender === i.sender)?.meta.accountId || "";
  const topics = items.filter((i) => i.meta.type === "topic");
  const topic = topics.find((i) => i.id === topicId);
  const account = accounts.find((i) => accountKey(i) === accountId);
  const post = posts.find((i) => i.id === postId);
  const open = (i: Item) => { p.onRead(i.id); play?.event("viewComments", i.id); setAccount(""); setPost(i.id); };
  const cards = (list: Item[]) => list.map((i) => <PostCard key={i.id} p={p} item={i} open={() => open(i)} account={() => setAccount(accountKey(i))} />);
  if (zoom) return <div className="community-app"><button className="community-back" onClick={() => setZoom("")}>‹ 返回帖子</button><img className="community-zoom" src={zoom} alt="帖子配图" /></div>;
  if (account) return <div className="community-app"><button className="community-back" onClick={() => setAccount("")}>‹ 返回</button><div className="community-scroll"><section className="community-profile"><Avatar name={account.sender} src={account.avatar} /><h2>{account.title}</h2><p>{account.body}</p><Follow p={p} account={account} /></section>{cards(posts.filter((i) => accountKey(i) === accountId).sort((a, b) => Number(b.meta.sequence || 0) - Number(a.meta.sequence || 0)))}</div></div>;
  if (post) return <div className="community-app community-detail"><SourceStatus item={post} /><SocialDetail app="weibo" item={post} owner={p.owner || "我"} ui={p.ui} onUi={p.onUi} back={() => setPost("")} onProfile={() => setAccount(accountKey(post))} />{post.media && post.kind !== "video" && <button className="community-image-link" onClick={() => setZoom(safeMedia(post.media))}>放大配图</button>}</div>;
  if (topic) {
    const related = posts.filter((i) => i.meta.topicId === topic.id || i.meta.topic === topic.meta.topic);
    return <div className="community-app"><button className="community-back" onClick={() => setTopic("")}>‹ 返回话题列表</button><div className="community-scroll"><section className="community-profile"><h2>#{topic.title}#</h2><p>{topic.body}</p><small>{topic.meta.category || topic.folder} · 本地话题</small></section><SourceStatus item={topic} />{cards(related)}<Empty items={related} label="讨论内容待补充" /></div></div>;
  }
  const list = posts.filter((i) => (section === "收藏" ? p.ui?.["saved-" + i.id] : section === "关注" ? p.ui?.["followed-" + i.sender] : section === "校园论坛" ? i.folder === section || !i.meta.community : i.folder === section) && communityMatch(i, query));
  const ordered = section === "个人微博" ? [...list].sort((a, b) => Number(b.meta.sequence || 0) - Number(a.meta.sequence || 0)) : list;
  return <div className="community-app"><Header p={p} /><p className="community-notice">校园角色及评论均为虚构 · 娱乐话题非实时榜单</p><nav className="community-tabs">{["个人微博", "校园论坛", "娱乐热搜", "关注", "收藏", "账号"].map((s) => <button key={s} aria-pressed={section === s} onClick={() => { setSection(s); setQuery(""); }}>{s}</button>)}</nav><SearchBox value={query} set={setQuery} placeholder="搜索帖子、话题或账号" /><div className="community-scroll">
    {section === "账号" ? <>{accounts.filter((i) => communityMatch(i, query)).map((a) => <button className="community-account-row" key={a.id} onClick={() => setAccount(a.meta.accountId)}><Avatar name={a.sender} src={a.avatar} /><span><b>{a.title}</b><small>{a.body}</small></span></button>)}</> : <>
      {["校园论坛", "娱乐热搜"].includes(section) && <section className="community-topics"><h3>{section === "娱乐热搜" ? "娱乐候选话题 · 无实时排名" : "正在聊"}</h3>{topics.filter((t) => t.folder === section && communityMatch(t, query)).map((t) => <button key={t.id} onClick={() => { p.onRead(t.id); play?.event("topicView", t.id); setTopic(t.id); }}><span>#{t.title}#</span><small>{t.meta.verificationStatus === "pending" ? "待补素材" : t.folder === "娱乐热搜" ? "本地示例" : "校园"}</small></button>)}</section>}
      {section === "个人微博" && query && <section className="community-topics"><h3>查找角色主页</h3>{accounts.filter((a) => a.meta.characterRef || ["owner", "star", "junhao", "brother", "zuohang", "jiaqi", "lifei"].includes(a.meta.accountId)).filter((a) => communityMatch(a, query)).map((a) => <button key={a.id} onClick={() => setAccount(a.meta.accountId)}><Avatar name={a.sender} src={a.avatar} /><span>{a.title}</span></button>)}</section>}
      {cards(ordered)}<Empty items={list} label={section === "关注" ? "还没有关注账号，可以先去账号页逛逛。" : "没有找到相关帖子"} />
    </>}
  </div></div>;
}
export function marketSeller(p: Pick<Props, "items">, item: Item) {
  return p.items.find((seller) => seller.meta.type === "seller" && seller.id === item.meta.sellerId);
}
function ProductCard({ p, item, open }: { p: Props; item: Item; open: () => void }) {
  const [saved, save] = useSkinState<boolean>(p, "market-saved-" + item.id, false);
  return <article className="market-card"><button className="market-card-open" onClick={open}><Media item={item} /><strong>{item.title}</strong><span className="market-price">¥ {item.meta.price}</span><small className="market-card-seller"><Avatar name={item.sender} src={marketSeller(p, item)?.avatar || item.avatar} />{item.sender}</small></button><button aria-pressed={saved} onClick={() => save(!saved)}>{saved ? "已收藏" : "收藏"}</button></article>;
}
export function marketChatStatus(item: Item, state?: Runtime) {
  const key = item.meta.stateKey || "market." + item.id.slice(7);
  const vars = state?.variables || {};
  const selected = String(vars[key + ".choice"] || "unset");
  const outcome = String(vars[key + ".outcome"] || "unset");
  const busy = vars[key + ".busy"] === true || !!state?.scheduled?.some((timer) => timer.nodeId.startsWith(item.id + "-") && (timer.nodeId.includes("-delay-") || timer.nodeId.includes("-pay-") || timer.nodeId.endsWith("-extra-think-delay") || timer.nodeId.endsWith("-extra-refund-delay")));
  const paid = vars[key + ".purchased"] === true || outcome === "purchased";
  const closed = outcome === "declined";
  const orderStatus = String(vars[key + ".orderStatus"] || (paid ? "paid" : "unset"));
  const active = vars[key + ".opened"] === true && !busy && !paid && !closed && !["cancelled", "refunded"].includes(orderStatus) && (!vars[key + ".decision"] || vars[key + ".decision"] === "unset");
  const quote = marketOffers(item).find((option) => option.id === "bargain")?.price ?? Number(item.meta.price);
  const price = outcome === "quoted" || vars[key + ".bargainDone"] === true || (!vars[key + ".paymentSource"] && selected === "bargain" && paid) ? quote : Number(item.meta.price);
  const paymentSource = String(vars[key + ".paymentSource"] || "哥哥的亲情卡");
  const paymentAmount = vars[key + ".paymentSource"] && typeof vars[key + ".paymentAmount"] === "number" ? Number(vars[key + ".paymentAmount"]) : price;
  return { key, selected, outcome, busy, paid, closed, price, paymentSource, paymentAmount, orderStatus,
    canDecide: active,
    canChat: active && vars[key + ".chatDone"] !== true,
    canBargain: active && vars[key + ".bargainDone"] !== true && outcome !== "quoted" };
}
function SellerChat({ p, item, back }: { p: Props; item: Item; back: () => void }) {
  const play = useContext(CampusPlayContext);
  const status = marketChatStatus(item, play?.state);
  const options = marketOffers(item);
  const order = (id: string) => play?.state.unlocked.indexOf(id) ?? -1;
  const messages = p.items.filter((i) => ["reply", "buyer"].includes(i.meta.type) && i.meta.product === item.id).sort((a, b) => order(a.id) - order(b.id));
  const missingLegacyBargain = messages.some((i) => i.id === item.id + "-reply-bargain") && !messages.some((i) => i.id === item.id + "-buyer-bargain");
  const legacyBuyer = missingLegacyBargain ? "还能少一点吗？" : !messages.some((i) => i.meta.type === "buyer") && status.selected !== "unset" ? options.find((o) => o.id === status.selected)?.text || (status.selected === "buy" ? "好，我要了。" : status.selected === "leave" ? "我先不买了，谢谢。" : "") : "";
  return <div className="community-app market-chat">
    <button className="community-back" onClick={back}><ChevronLeft size={20} /><Avatar name={item.sender} src={marketSeller(p, item)?.avatar || item.avatar} />{item.sender} · {item.title}</button>
    <p className="community-notice">预设对话 · 虚拟亲情卡，不涉及真实支付</p>
    <div className="community-scroll">
      {messages.filter((i) => i.id.endsWith("-hello")).map((i) => <p key={i.id} className="market-bubble">{i.body}</p>)}
      {legacyBuyer && <p className="market-bubble mine">{legacyBuyer}</p>}
      {messages.filter((i) => !i.id.endsWith("-hello")).map((i) => <p key={i.id} className={"market-bubble" + (i.meta.type === "buyer" ? " mine" : "")}>{i.body}</p>)}
      {status.busy && <p className="market-typing" role="status">卖家正在输入…</p>}
      {status.paid && <div className="market-result market-payment" role="status"><span>虚拟成交 ¥ {status.paymentAmount}</span><strong>付款方式：{status.paymentSource}</strong><small>张泽禹的虚拟亲情卡 · 不涉及真实扣款</small></div>}
      {status.orderStatus === "refunded" && <p className="market-result" role="status">已退款 ¥ {status.paymentAmount}，原路退回哥哥的亲属卡。</p>}
      {status.orderStatus === "cancelled" && <p className="market-result" role="status">订单已取消，没有扣款。商品仍可浏览。</p>}
      {status.closed && <p className="market-result">这次先不买。聊天记录和收藏都留着，可以继续逛。</p>}
    </div>
    <div className="market-offers">
      {!status.paid && !status.closed && options.filter((o) => o.id === "chat" ? status.canChat || status.busy : o.id === "bargain" ? status.canBargain || status.busy : false).map((o) => <button key={o.id} disabled={!play || status.busy} onClick={() => play?.event("marketSelect", item.id + "." + o.id)}>{o.id === "chat" ? "闲聊：" : "砍价："}{o.text}</button>)}
      {status.canDecide && <>
        <div className="market-decisions"><button className="market-buy" onClick={() => play?.event("marketConfirm", item.id)}>买下 · 亲属卡 ¥ {status.price}</button><button onClick={() => play?.event("marketDecline", item.id)}>先不买了</button></div>
        {play?.work.variables["author.market"] && <div className="market-decisions"><button disabled={play.state.variables[status.key + ".thinkDone"] === true} onClick={() => play.event("marketThink", item.id)}>再考虑一下</button><button disabled={play.state.variables[status.key + ".silentDone"] === true} onClick={() => play.event("marketSilent", item.id)}>已读不回</button></div>}
      </>}
      {status.closed && <button onClick={() => play?.event("marketResume", item.id)}>回来再看看</button>}
      {status.orderStatus === "pending" && <button onClick={() => play?.event("marketCancel", item.id)}>取消订单（尚未付款）</button>}
      {status.paid && !status.busy && status.orderStatus !== "refunded" && play?.work.variables["author.market"] && <button onClick={() => play.event("marketRefund", item.id)}>申请模拟退款</button>}
      {item.meta.rewardItemId && status.paid && <button onClick={() => play?.navigate(item.meta.rewardApp || "notes", { itemId: item.meta.rewardItemId })}>{item.meta.rewardLabel || "查看发现的内容"}</button>}
    </div>
  </div>;
}
function ProductDetail({ p, item, back, seller, contact }: { p: Props; item: Item; back: () => void; seller: () => void; contact: () => void }) {
  const [saved, save] = useSkinState<boolean>(p, "market-saved-" + item.id, false);
  const photos = [item, ...p.items.filter((i) => i.meta.type === "gallery" && i.meta.product === item.id)];
  const [index, setIndex] = useState(0);
  return <div className="community-app"><button className="community-back" onClick={back}>‹ 返回商品</button><div className="community-scroll"><section className="market-detail"><Media item={photos[index] || item} /><div className="market-gallery-controls">{photos.map((photo, i) => <button key={photo.id} aria-pressed={index === i} onClick={() => setIndex(i)}>图片 {i + 1}</button>)}</div><small>{safeMedia((photos[index] || item).media) ? (item.meta.imageCaption || (item.meta.sellerId ? "卖家提供的商品图片" : "现有素材示意配图")) : "商品图片待补"}</small><h2>{item.title}</h2><strong className="market-price">¥ {item.meta.price}</strong><p>{item.body}</p><button className="community-author" onClick={seller}><Avatar name={item.sender} src={marketSeller(p, item)?.avatar || item.avatar} /><span>{item.sender} · 查看卖家</span></button></section></div><footer className="market-detail-footer"><button aria-pressed={saved} onClick={() => save(!saved)}>{saved ? "已收藏" : "收藏"}</button><button className="community-primary" onClick={contact}>联系卖家／砍价</button></footer></div>;
}
export function XianyuSkin(p: Props) {
  const play = useContext(CampusPlayContext);
  const [query, setQuery] = useSkinState<string>(p, "market-query", "");
  const [category, setCategory] = useSkinState<string>(p, "market-category", "全部");
  const [productId, setProduct] = useSkinState<string>(p, "market-product", "");
  const [sellerName, setSeller] = useSkinState<string>(p, "market-seller", "");
  const [chatId, setChat] = useSkinState<string>(p, "market-chat", "");
  const products = p.items.filter((i) => i.meta.type === "product");
  const sellers = p.items.filter((i) => i.meta.type === "seller");
  const orders = play ? marketOrders(play.state, play.work) : [];
  const selected = products.find((i) => i.id === productId);
  const chat = products.find((i) => i.id === chatId);
  const open = (i: Item) => { p.onRead(i.id); setProduct(i.id); };
  if (chat) return <SellerChat p={p} item={chat} back={() => setChat("")} />;
  if (sellerName) {
    const goods = products.filter((i) => i.sender === sellerName);
    const seller = sellers.find((i) => i.sender === sellerName);
    return <div className="community-app market-app"><button className="community-back" onClick={() => setSeller("")}>‹ 返回</button><div className="community-scroll"><section className="community-profile"><Avatar name={sellerName} src={seller?.avatar || goods[0]?.avatar} /><h2>{sellerName}</h2><p>{seller?.body || goods[0]?.meta.sellerBio}</p></section><div className="market-grid">{goods.map((i) => <ProductCard key={i.id} p={p} item={i} open={() => { setSeller(""); open(i); }} />)}</div></div></div>;
  }
  if (selected) return <ProductDetail key={selected.id} p={p} item={selected} back={() => setProduct("")} seller={() => setSeller(selected.sender)} contact={() => { play?.event("marketOpen", selected.id); setChat(selected.id); }} />;
  const list = products.filter((i) => communityMatch(i, query) && (category === "全部" || (category === "收藏" ? p.ui?.["market-saved-" + i.id] === true : i.folder === category)));
  return <div className="community-app market-app"><Header p={p} /><p className="community-notice">闲鱼娱乐模拟器 · 本地虚拟商品，不涉及真实支付</p><SearchBox value={query} set={setQuery} placeholder="搜点有用或没用的东西" /><nav className="community-tabs">{["全部", "卖家", ...new Set(products.map((i) => i.folder)), "收藏", "订单"].map((s) => <button key={s} aria-pressed={category === s} onClick={() => setCategory(s)}>{s}</button>)}</nav><div className="community-scroll">{category === "订单" ? <>{orders.length ? orders.map(order => <button className="community-account-row" key={order.id} onClick={() => { const item = products.find(p => p.id === order.productId);if (item) { setCategory("全部");open(item); } }}><span><b>{order.title}</b><small>{({ pending: "待付款", paid: "已完成", cancelled: "已取消 · 未扣款", refunded: "已退款" })[order.status]} · ¥ {order.amount} · 哥哥的亲属卡</small></span></button>) : <p className="skin-empty">还没有模拟订单</p>}</> : category === "卖家" ? <>{sellers.filter((i) => communityMatch(i, query)).map((seller) => <button className="community-account-row" key={seller.id} onClick={() => setSeller(seller.sender)}><Avatar name={seller.sender} src={seller.avatar} /><span><b>{seller.title}</b><small>{seller.body}</small></span></button>)}</> : <><div className="market-grid">{list.map((i) => <ProductCard key={i.id} p={p} item={i} open={() => open(i)} />)}</div><Empty items={list} label="还没有相关闲置" /></>}</div></div>;
}
