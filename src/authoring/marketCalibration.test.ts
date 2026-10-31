import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { foundationExtensions } from "./testFixture";
import { compileProject } from "./compile";
import { advance, dispatch, visible } from "../engine";
import { initialRuntime, type Runtime, type Work } from "../schema";
import { restoreSave } from "../saveRestore";
import { marketOrders } from "../personalization/marketRuntime";
import { XianyuSkin, marketOffers, marketChatStatus } from "../skins/CommunitySkins";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import type { SkinProps } from "../AppSkins";
let w: Work;
beforeAll(() => { w = compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions).work; });
const start = () => dispatch(w, initialRuntime(w), "start");
const open = (s: Runtime, id: string) => dispatch(w, dispatch(w, s, "read", id), "marketOpen", id);
const saved = (s: Runtime) => restoreSave(w, JSON.parse(JSON.stringify(s)))!;
const products = () => w.data.xianyu.filter(i => i.meta.type === "product");
function render(s: Runtime, ui: NonNullable<SkinProps["ui"]>) {
  const noop = () => {};
  const p: SkinProps = { name: "闲鱼", owner: "试玩", items: w.data.xianyu.filter(i => visible(i, s)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui };
  return renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work: w, state: s, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(XianyuSkin, p)));
}
describe("market catalog calibration", () => {
  it("keeps every product price, seller attribution and conversation question consistent", () => {
    expect(products()).toHaveLength(28);
    for (const p of products()) {
      const messages = w.data.xianyu.filter(i => i.meta.product === p.id);
      const question = marketOffers(p).find(o => o.id === "chat")!;
      expect(messages.find(i => i.id === p.id + "-buyer-chat")?.body).toBe(question.text);
      for (const m of messages.filter(i => i.meta.type === "reply")) {
        expect(m.sender).toBe(p.sender);
        if (p.meta.sellerId && m.meta.sellerId) expect(m.meta.sellerId).toBe(p.meta.sellerId);
      }
      const quote = marketOffers(p).find(o => o.id === "bargain")!.price;
      expect(quote).toBeLessThanOrEqual(Number(p.meta.price));
      expect(messages.find(i => i.id === p.id + "-reply-bargain")?.body).toContain(`${quote} 元`);
      expect(messages.some(i => i.body.includes("[议价]"))).toBe(false);
    }
  });
  it("charges the confirmed base or quoted amount for all products after restore, without duplicate payments", () => {
    for (const p of products()) for (const bargain of [false, true]) {
      let s = open(start(), p.id);
      if (bargain) s = advance(w, dispatch(w, s, "marketSelect", p.id + ".bargain"), 4000);
      const expected = bargain ? marketOffers(p).find(o => o.id === "bargain")!.price : Number(p.meta.price);
      s = advance(w, dispatch(w, saved(s), "marketConfirm", p.id), 5000);
      expect(marketOrders(s).find(o => o.productId === p.id)).toMatchObject({ amount: expected, status: "paid" });
      const orders = marketOrders(s);
      s = advance(w, dispatch(w, saved(s), "marketConfirm", p.id), 10000);
      expect(marketOrders(s)).toEqual(orders);
      expect(marketChatStatus(p, s).canDecide).toBe(false);
    }
  });
  it("preserves a quoted price through chatting, declining and returning", () => {
    const p = products().find(i => i.id === "market-xinan-yujie-gaming")!;
    let s = open(start(), p.id);
    for (const action of ["bargain", "chat"]) s = advance(w, dispatch(w, saved(s), "marketSelect", `${p.id}.${action}`), 4000);
    s = advance(w, dispatch(w, s, "marketDecline", p.id), 3000);
    s = dispatch(w, saved(s), "marketResume", p.id);
    expect(marketChatStatus(p, s).price).toBe(80);
    s = advance(w, dispatch(w, s, "marketConfirm", p.id), 4000);
    expect(marketOrders(s)[0]).toMatchObject({ amount: 80, status: "paid" });
  });
  it("shows sold, refunded and cancelled records without presenting them as a new sale", () => {
    const id = "market-tutucha-mengmengda-shirt";
    let s = advance(w, dispatch(w, open(start(), id), "marketConfirm", id), 4000);
    expect(render(s, {})).toContain("已售出 · 仅供查看");
    const detail = render(s, { "market-product": id });
    expect(detail).toContain("查看交易记录");expect(detail).not.toContain("联系卖家／砍价");
    s = advance(w, dispatch(w, saved(s), "marketRefund", id), 4000);
    expect(render(s, {})).toContain("已退款 · 交易记录");
    expect(marketChatStatus(products().find(i => i.id === id)!, s).canDecide).toBe(false);
    let cancelled = dispatch(w, open(start(), id), "marketConfirm", id);
    cancelled = advance(w, dispatch(w, cancelled, "marketCancel", id), 5000);
    expect(marketOrders(cancelled)[0].status).toBe("cancelled");
    expect(render(cancelled, { "market-chat": id })).not.toContain("虚拟成交 ¥");
  });
  it("uses a placeholder for the unrelated figure image and keeps the correct wallpaper preview", () => {
    expect(project.bindings.some(b => b.targetId === "market-cr7-only-god-figure" && b.target === "itemMedia")).toBe(false);
    expect(products().find(p => p.id === "market-cr7-only-god-figure")!.media).toBeFalsy();
    expect(project.bindings.some(b => b.targetId === "market-cr7-only-god-handsome" && b.assetId === "xianyu-product-cr7-only-god-handsome")).toBe(true);
  });
});
