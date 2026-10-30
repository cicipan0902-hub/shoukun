import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import original from "../../stories/foundation/xianyu-sellers.json";
import community from "../../stories/foundation/community-market.json";
import { compileProject } from "./compile";
import { foundationExtensions } from "./testFixture";
import type { MarketConfig } from "./market";
import { advance, choose, dispatch, visible } from "../engine";
import { initialRuntime, type Work, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
import { marketOrders } from "../personalization/marketRuntime";
import { replyOptions } from "../personalization/chatRuntime";
import { marketChatStatus, XianyuSkin } from "../skins/CommunitySkins";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import type { SkinProps } from "../AppSkins";
const build = (settings: Partial<MarketConfig["settings"]> = {}) => {
  const extension = foundationExtensions();
  (extension.market as MarketConfig).settings = { ...(extension.market as MarketConfig).settings, ...settings };
  return compileProject(source, project, cast, assets, extension, {}, interactions).work;
};
const quiet = { smallProbability: 0, mediumProbability: 0, highAmount: 9999, cumulativeAmount: 9999, purchaseCount: 99 };
const start = (w: Work) => dispatch(w, initialRuntime(w), "start");
const item = (w: Work, id: string) => w.data.xianyu.find(i => i.id === id)!;
const open = (w: Work, s: Runtime, id: string) => dispatch(w, dispatch(w, s, "read", id), "marketOpen", id);
const pay = (w: Work, s: Runtime, id: string) => advance(w, dispatch(w, open(w, s, id), "marketConfirm", id), 6000);
const saved = (w: Work, s: Runtime) => restoreSave(w, JSON.parse(JSON.stringify(s)))!;
const familyMessages = (w: Work, s: Runtime) => w.data.wechat.filter(i => i.meta.conversationId === "family-card-brother" && s.unlocked.includes(i.id));

describe("local market orders and brother's family card", () => {
  it("lists every product initially and preserves all old product and seller content", () => {
    const w = build(), s = start(w);
    expect(w.data.xianyu.filter(i => i.meta.type === "product")).toHaveLength(28);
    expect(w.data.xianyu.filter(i => i.meta.type === "seller")).toHaveLength(7);
    for (const old of [...original.content.xianyu, ...community.content.xianyu].filter(i => ["product", "seller"].includes(i.meta.type))) {
      const found = item(w, old.id);
      expect(found.title).toBe(old.title);expect(found.body).toBe(old.body);expect(found.sender).toBe(old.sender);
      if (old.meta.type === "product") expect(found.meta.price).toBe((old.meta as { price: string }).price);
      expect(visible(found, s)).toBe(true);
    }
    expect(w.data.xianyu.filter(i => i.meta.type === "product").every(i => visible(i, s))).toBe(true);
  });
  it("finishes quiet low-value purchases without messages and always notifies for the large threshold", () => {
    const w = build({ ...quiet, highAmount: 50 });let s = pay(w, start(w), "market-suuuu-iphone");
    expect(marketOrders(s)[0]).toMatchObject({ status: "paid", amount: 6 });
    expect(familyMessages(w, s)).toHaveLength(0);
    s = pay(w, s, "market-xinan-yujie-gaming");
    expect(s.variables["familyCard.total"]).toBe(94);
    expect(familyMessages(w, s).some(i => i.body.includes("账号"))).toBe(true);
    expect(replyOptions(w, s, "张泽禹")).toHaveLength(3);
    const ledger = marketOrders(s), queue = s.scheduled;
    s = dispatch(w, s, "marketConfirm", "market-xinan-yujie-gaming");
    s = advance(w, saved(w, s), 60000);
    expect(marketOrders(s)).toEqual(ledger);expect(s.scheduled).toEqual(queue);
  });
  it("uses configurable small/medium probability, negotiated amount and stable restored outcomes", () => {
    for (const [id, amount] of [["market-suuuu-iphone", 6], ["market-hanbing-sheshou-shoes", 39]] as const) {
      const w = build({ ...quiet, smallProbability: 1, mediumProbability: 1 });
      const a = pay(w, start(w), id), b = pay(w, saved(w, start(w)), id);
      expect(familyMessages(w, a).length).toBeGreaterThan(0);
      expect(a.unlocked).toEqual(b.unlocked);expect(a.variables["familyCard.total"]).toBe(amount);
    }
    const w = build(quiet);let s = open(w, start(w), "market-hanbing-sheshou-cap");
    s = advance(w, dispatch(w, s, "marketSelect", "market-hanbing-sheshou-cap.bargain"), 3000);
    s = advance(w, dispatch(w, s, "marketConfirm", "market-hanbing-sheshou-cap"), 3000);
    expect(marketOrders(s)[0].amount).toBe(15);
  });
  it("cancels before payment, preserves refusals on shelf, and lets a buyer reconsider", () => {
    const w = build({ ...quiet, smallProbability: 1 });let s = open(w, start(w), "market-hanbing-sheshou-shoes");
    s = dispatch(w, s, "marketConfirm", "market-hanbing-sheshou-shoes");
    expect(marketOrders(s)[0].status).toBe("pending");
    s = advance(w, saved(w, dispatch(w, s, "marketCancel", "market-hanbing-sheshou-shoes")), 60000);
    expect(marketOrders(s)[0].status).toBe("cancelled");expect(s.variables["familyCard.total"]).toBe(0);
    expect(familyMessages(w, s)).toHaveLength(0);
    expect(s.variables["market.hanbing-sheshou-shoes.purchased"]).toBe(false);
    expect(visible(item(w, "market-hanbing-sheshou-shoes"), s)).toBe(true);
    s = open(w, s, "market-houmi-yeye-stone");
    s = advance(w, dispatch(w, s, "marketDecline", "market-houmi-yeye-stone"), 2000);
    expect(marketChatStatus(item(w, "market-houmi-yeye-stone"), s).closed).toBe(true);
    s = dispatch(w, s, "marketResume", "market-houmi-yeye-stone");
    s = pay(w, s, "market-houmi-yeye-stone");
    expect(marketOrders(s).find(o => o.productId === "market-houmi-yeye-stone")?.status).toBe("paid");
    let quoted = open(w, start(w), "market-hanbing-sheshou-record");
    quoted = advance(w, dispatch(w, quoted, "marketSelect", "market-hanbing-sheshou-record.bargain"), 3000);
    quoted = advance(w, dispatch(w, quoted, "marketDecline", "market-hanbing-sheshou-record"), 3000);
    quoted = dispatch(w, quoted, "marketResume", "market-hanbing-sheshou-record");
    quoted = pay(w, quoted, "market-hanbing-sheshou-record");
    expect(marketOrders(quoted)[0].amount).toBe(15);
  });
  it("refunds exactly once and queues distinct refund messages without replaying payment", () => {
    const w = build({ ...quiet, smallProbability: 1 });let s = pay(w, start(w), "market-suuuu-iphone");
    s = dispatch(w, s, "marketRefund", "market-suuuu-iphone");
    s = saved(w, s);
    s = dispatch(w, s, "marketRefund", "market-suuuu-iphone");
    expect(marketOrders(s)[0]).toMatchObject({ status: "refunded", amount: 6 });
    expect(s.variables["familyCard.refunded"]).toBe(6);
    s = advance(w, s, 5000);
    s = advance(w, choose(w, s, s.choices.find(c => c.target.startsWith("family-paid-"))!.target), 10000);
    expect(familyMessages(w, s).some(i => i.body.includes("退款看到了"))).toBe(true);
    expect(s.variables["familyCard.count"]).toBe(1);
    s = advance(w, dispatch(w, s, "marketConfirm", "market-suuuu-iphone"), 60000);
    expect(s.variables["familyCard.refunded"]).toBe(6);
    expect(new Set(s.unlocked).size).toBe(s.unlocked.length);
    const old = start(w);
    old.variables["market.hanbing-sheshou-record.purchased"] = true;
    old.variables["market.hanbing-sheshou-record.choice"] = "bargain";
    const refunded = advance(w, dispatch(w, old, "marketRefund", "market-hanbing-sheshou-record"), 5000);
    expect(refunded.variables["market.hanbing-sheshou-record.refundAmount"]).toBe(15);
    expect(refunded.variables["familyCard.count"]).toBe(0);
  });
  it("triggers the bankruptcy scene once for cumulative count or amount and supports all player replies", () => {
    for (const id of ["save", "stubborn", "sweet"]) {
      const w = build({ ...quiet, purchaseCount: 1 });let s = pay(w, start(w), "market-suuuu-iphone");
      expect(s.choices.filter(c => c.target.startsWith("family-bankruptcy-"))).toHaveLength(3);
      s = advance(w, choose(w, saved(w, s), `family-bankruptcy-${id}`), 10000);
      expect(s.variables["familyCard.tag." + (id === "save" ? "explain" : id)]).toBe(1);
      expect(familyMessages(w, s).some(i => /卡没停|卡也给你留着|会议结束/.test(i.body))).toBe(true);
      s = pay(w, s, "market-houmi-yeye-stone");
      expect(s.choices.filter(c => c.target.startsWith("family-bankruptcy-"))).toHaveLength(0);
    }
    const w = build({ ...quiet, cumulativeAmount: 10 });let s = pay(w, start(w), "market-suuuu-iphone");
    s = pay(w, s, "market-suuuu-charger");
    expect(s.variables["familyCard.bankruptcyQueued"]).toBe(true);
  });
  it("keeps seller personalities and only allows one read-no-reply follow-up", () => {
    const w = build(quiet);
    for (const [seller, id] of [["hanbing-sheshou", "shoes"], ["houmi-yeye", "stone"], ["xinan-yujie", "notes"], ["tutucha-mengmengda", "lamp"], ["bobo-baba", "qq"], ["suuuu", "iphone"], ["cr7-only-god", "card"]]) {
      const pid = `market-${seller}-${id}`;let s = open(w, start(w), pid);
      s = advance(w, dispatch(w, s, "marketThink", pid), 2000);
      expect(s.unlocked).toContain(pid + "-extra-think-reply");
      s = advance(w, dispatch(w, s, "marketSilent", pid), 10000);
      const ids = [...s.unlocked];s = advance(w, saved(w, dispatch(w, s, "marketSilent", pid)), 60000);
      expect(s.unlocked).toEqual(ids);
      expect(s.unlocked.includes(pid + "-extra-silent-reply")).toBe(["hanbing-sheshou", "xinan-yujie", "bobo-baba", "cr7-only-god"].includes(seller));
      expect(s.variables["familyCard.count"]).toBe(0);
    }
  });
  it("supports every regular and refund response and retains small interaction tags", () => {
    for (const option of ["stubborn", "sweet", "explain"]) {
      const w = build({ ...quiet, smallProbability: 1 });let s = pay(w, start(w), "market-suuuu-iphone");
      s = advance(w, choose(w, saved(w, s), `family-paid-market-suuuu-iphone-${option}`), 5000);
      expect(s.variables[`familyCard.tag.${option}`]).toBe(1);
      expect(s.variables["familyCard.active"]).toBe("");
      s = advance(w, dispatch(w, s, "marketRefund", "market-suuuu-iphone"), 6000);
      expect(replyOptions(w, s, "张泽禹")).toHaveLength(2);
      s = advance(w, choose(w, s, `family-refund-market-suuuu-iphone-${option === "sweet" ? "dinner" : "careful"}`), 5000);
      expect(s.variables["familyCard.active"]).toBe("");
      expect(marketOrders(s)[0].status).toBe("refunded");
    }
  });
  it("does not consume an unrelated chapter choice when replying to a family-card message", () => {
    const w = build({ ...quiet, highAmount: 50 });let s = start(w);
    s = advance(w, dispatch(w, s, "read", "ch01-b-01"), 5000);
    expect(s.choices.some(c => c.target === "ch01-greeting-a")).toBe(true);
    s = pay(w, s, "market-xinan-yujie-gaming");
    const family = s.choices.find(c => c.target.startsWith("family-paid-"))!.target;
    s = choose(w, s, family);
    expect(s.choices.some(c => c.target === "ch01-greeting-a")).toBe(true);
    s = advance(w, s, 10000);s = choose(w, s, "ch01-greeting-a");
    expect(s.completed).toContain("ch01-greeting-a");
  });
  it("renders order records and refund/consider controls with persisted data", () => {
    const w = build(quiet), s = pay(w, start(w), "market-suuuu-iphone"), noop = () => {};
    const props: SkinProps = { name: "闲鱼", items: w.data.xianyu.filter(i => visible(i, s)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui: { "market-category": "订单" } };
    const html = renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work: w, state: s, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(XianyuSkin, props)));
    expect(html).toContain("已完成");expect(html).toContain("哥哥的亲属卡");
  });
});
