import { foundationExtensions } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime } from "../schema";
import { dispatch, advance, visible } from "../engine";
import { restoreSave } from "../saveRestore";
import { CampusWeiboSkin, XianyuSkin, marketOffers, communityMatch, marketChatStatus } from "../skins/CommunitySkins";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import type { SkinProps } from "../AppSkins";
import { defaultLayout, validateLayout } from "../launcher/layout";
const build = () => compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions);
describe("local campus social and market apps", () => {
  it("installs the new app into old layouts and triggers WeChat exactly once without altering chapter state", () => {
    const { work } = build();
    const old = structuredClone(work);old.apps = old.apps.filter((a) => a.id !== "xianyu");
    expect(validateLayout(defaultLayout(old), work).apps.find((a) => a.id === "xianyu")?.installed).toBe(true);
    let s = dispatch(work, initialRuntime(work), "start");
    s = dispatch(work, s, "read", "community-post-notice");
    const queued = s.scheduled;
    expect(dispatch(work, s, "read", "community-post-notice").scheduled).toEqual(queued);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = advance(work, s, 60000);
    expect(s.unlocked).toEqual(expect.arrayContaining(["community-zuo-01", "community-zuo-02"]));
    expect(s.variables["friend.star.state"]).not.toBe("accepted");
    expect(s.variables["chapter.chapter-06-pending.completed"]).toBe(false);
  });
  it("requires conversation before purchase and preserves both outcomes across refresh", () => {
    const { work } = build();
    for (const product of work.data.xianyu.filter((i) => i.meta.type === "product")) for (const action of ["chat", "bargain"]) for (const decision of ["buy", "leave"]) {
      const key = product.meta.stateKey || "market." + product.id.slice(7);
      let s = dispatch(work, initialRuntime(work), "start");
      s = dispatch(work, s, "read", product.id);s = dispatch(work, s, "marketOpen", product.id);
      expect(dispatch(work, s, "marketConfirm", product.id).variables[key + ".purchased"]).toBe(false);
      s = dispatch(work, s, "marketSelect", product.id + "." + action);
      const queued = s.scheduled;
      expect(dispatch(work, s, "marketSelect", product.id + "." + action).scheduled).toEqual(queued);
      expect(dispatch(work, s, "marketConfirm", product.id).variables[key + ".purchased"]).toBe(false);
      s = advance(work, restoreSave(work, JSON.parse(JSON.stringify(s)))!, 5000);
      expect(s.variables[key + ".interacted"]).toBe(true);
      s = dispatch(work, s, decision === "buy" ? "marketConfirm" : "marketDecline", product.id);
      s = advance(work, restoreSave(work, JSON.parse(JSON.stringify(s)))!, 5000);
      expect(s.variables[key + ".purchased"]).toBe(decision === "buy");
      if (decision === "buy") expect(s.variables[key + ".paymentSource"]).toBe("哥哥的亲情卡");
      expect(s.unlocked.includes("market-hidden-note")).toBe(product.id === "market-draft" && decision === "buy");
    }
  });
  it("restores older quoted or pending purchases and shows the family card in the receipt", () => {
    const { work } = build();const product = work.data.xianyu.find((i) => i.id === "market-draft")!;const key = product.meta.stateKey;
    let s = dispatch(work, initialRuntime(work), "start");s = dispatch(work, s, "read", product.id);s = dispatch(work, s, "marketOpen", product.id);
    s.variables[key + ".choice"] = "bargain";s.variables[key + ".outcome"] = "quoted";s.unlocked.push(product.id + "-reply-bargain");
    s.completed.push(product.id + "-select-bargain", product.id + "-delay-bargain");
    for (const suffix of ["busy", "chatDone", "bargainDone", "interacted", "decision", "currentPrice", "paymentSource", "paymentAmount"]) delete s.variables[key + "." + suffix];
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    const legacy = structuredClone(s);
    expect(marketChatStatus(product, s).canDecide).toBe(true);
    expect(marketChatStatus(product, s).canBargain).toBe(false);
    expect(marketChatStatus(product, s).price).toBe(1);
    let declined = dispatch(work, structuredClone(s), "marketDecline", product.id);declined = advance(work, declined, 5000);
    expect(declined.variables[key + ".outcome"]).toBe("declined");expect(declined.variables[key + ".purchased"]).toBe(false);
    s = dispatch(work, s, "marketSelect", product.id + ".chat");s = advance(work, restoreSave(work, JSON.parse(JSON.stringify(s)))!, 5000);
    s = dispatch(work, s, "marketConfirm", product.id);s = advance(work, s, 5000);
    expect(s.variables[key + ".paymentAmount"]).toBe(1);expect(s.variables[key + ".paymentSource"]).toBe("哥哥的亲情卡");
    const noop = () => {};
    const p: SkinProps = { name: "闲鱼", owner: "试玩", items: work.data.xianyu.filter((i) => visible(i, s)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui: { "market-chat": product.id } };
    const html = renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state: s, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(XianyuSkin, p)));
    expect(html).toContain("付款方式：哥哥的亲情卡");expect(html).toContain("张泽禹的虚拟亲情卡");expect(marketChatStatus(product, s).canDecide).toBe(false);
    legacy.variables[key + ".choice"] = "buy";legacy.variables[key + ".outcome"] = "unset";legacy.completed = legacy.completed.filter((id) => id !== product.id + "-delay-buy");legacy.scheduled!.push({ nodeId: product.id + "-delay-buy", due: (legacy.elapsedMs || 0) + 1100 });
    const pending = restoreSave(work, JSON.parse(JSON.stringify(legacy)))!;expect(marketChatStatus(product, pending).busy).toBe(true);
    const paid = advance(work, pending, 5000);expect(paid.variables[key + ".purchased"]).toBe(true);expect(paid.variables[key + ".paymentSource"]).toBe("哥哥的亲情卡");
  });
  it("renders search, favorites, profiles, replies and multi-image details from existing saved UI", () => {
    const { work } = build();const state = initialRuntime(work);
    const noop = () => {};
    function props(app: string, ui: NonNullable<SkinProps["ui"]> = {}): SkinProps { return { name: app, appId: app, owner: "试玩", items: work.data[app].filter((i) => visible(i, state)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui, onUi: noop }; }
    function render(app: "weibo" | "xianyu", ui = {}) { return renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(app === "weibo" ? CampusWeiboSkin : XianyuSkin, props(app, ui)))); }
    expect(render("weibo")).toContain("校园论坛");
    const entertainment = render("weibo", { "community-section": "娱乐热搜" });
    expect(entertainment).toContain("非实时");expect(entertainment).toContain("舞台讨论收集");expect(entertainment).not.toContain("最后一道大题到底几分");
    expect(render("weibo", { "community-section": "收藏", "saved-community-post-exam": true })).toContain("最后一道大题到底几分");
    expect(render("weibo", { "community-account": "junhao" })).toContain("写歌，也写作业");
    expect(render("weibo", { "community-post": "community-post-exam", "replies-community-post-exam": ["试玩：回复 @礼菲：收到"] })).toContain("回复 @礼菲");
    const searched = render("xianyu", { "market-query": "自律" });expect(searched).toContain("用了三天的自律计划");expect(searched).not.toContain("期末周续命套餐");
    expect(render("xianyu", { "market-product": "market-snacks" })).toContain("图片 2");
    expect(render("xianyu", { "market-seller": "左航" })).toContain("借书记得还");
    expect(render("xianyu", { "market-category": "收藏", "market-saved-market-draft": true })).toContain("神秘学霸二手草稿纸");
    const item = work.data.xianyu.find((i) => i.id === "market-draft")!;expect(communityMatch(item, " 左航 ")).toBe(true);expect(marketOffers({ ...item, meta: { options: "bad json" } })).toEqual([]);
  });
});
