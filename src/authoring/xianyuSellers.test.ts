import { foundationExtensions, authorOnlyFixture } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
const links = authorOnlyFixture<{ description: string; sellers: { characterId?: string; storyId: string }[] }>("xianyu-seller-links.author.json");
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime } from "../schema";
import { dispatch, advance, visible } from "../engine";
import { restoreSave } from "../saveRestore";
import { XianyuSkin, marketOffers } from "../skins/CommunitySkins";
import type { SkinProps } from "../AppSkins";
import initialSellers from "../../stories/foundation/xianyu-sellers.json";
const build = (media: Record<string, string> = {}) => compileProject(source, project, cast, assets, foundationExtensions(), media, interactions);
describe("seven local Xianyu sellers", () => {
  it("adds seven aliases, two to four products each and stable optional image paths without exposing the anonymous character", () => {
    const { work } = build();
    const accounts = work.data.xianyu.filter((i) => i.meta.type === "seller");
    expect(accounts.map((i) => i.sender)).toEqual(["寒冰射手", "厚米爷爷", "西南禹姐", "兔兔叉萌萌哒", "啵啵爸爸", "Suuuu", "C罗唯一真神"]);
    const originalIds = new Set(initialSellers.content.xianyu.filter(i => i.meta.type === "product").map(i => i.id));
    const products = work.data.xianyu.filter((i) => originalIds.has(i.id));
    expect(products).toHaveLength(19);
    expect(work.data.xianyu.some((i) => i.id === "market-draft")).toBe(true);
    for (const account of accounts) {
      const goods = products.filter((i) => i.meta.sellerId === account.id);
      expect(goods.length).toBeGreaterThanOrEqual(2);expect(goods.length).toBeLessThanOrEqual(4);
      const avatar = project.bindings.find((b) => b.targetId === account.id && b.target === "itemAvatar")!;
      expect(assets.assets.find((a) => a.id === avatar.assetId)?.file).toContain("assets/xianyu/avatars/seller-");
      for (const g of goods) expect(project.bindings.some((b) => b.targetId === g.id && b.target === "itemMedia")).toBe(true);
    }
    const anonymous = work.data.xianyu.filter((i) => i.meta.sellerId === "seller-tutucha-mengmengda" || i.id === "seller-tutucha-mengmengda");
    expect(JSON.stringify(anonymous)).not.toMatch(/朱志鑫|zhuzhixin|"star"|赌博|离婚/);
    if (links) expect(JSON.stringify(work)).not.toContain(links.description);
    for (const link of (links?.sellers || []).filter((x) => x.characterId)) expect(cast.some((c) => c.id === link.characterId && c.storyId === link.storyId)).toBe(true);
  });
  it("supports chat and negotiation in either order, then explicit buying or leaving with family-card receipts", () => {
    const { work } = build();
    for (const product of work.data.xianyu.filter((i) => i.meta.type === "product" && i.meta.sellerId)) for (const sequence of [["chat"], ["bargain"], ["chat", "bargain"], ["bargain", "chat"]]) for (const decision of ["buy", "leave"]) {
      const key = product.meta.stateKey;
      let s = dispatch(work, initialRuntime(work), "start");const friend = s.variables["friend.star.state"];
      s = dispatch(work, s, "read", product.id);s = dispatch(work, s, "marketOpen", product.id);
      for (const action of sequence) {
        s = dispatch(work, s, "marketSelect", product.id + "." + action);
        expect(s.variables[key + ".busy"]).toBe(true);
        expect(dispatch(work, s, "marketConfirm", product.id).variables[key + ".purchased"]).toBe(false);
        const queued = s.scheduled;expect(dispatch(work, s, "marketSelect", product.id + "." + action).scheduled).toEqual(queued);
        s = advance(work, restoreSave(work, JSON.parse(JSON.stringify(s)))!, 5000);
        expect(s.variables[key + ".busy"]).toBe(false);
      }
      s = dispatch(work, s, decision === "buy" ? "marketConfirm" : "marketDecline", product.id);
      const queued = s.scheduled;expect(dispatch(work, s, decision === "buy" ? "marketConfirm" : "marketDecline", product.id).scheduled).toEqual(queued);
      s = advance(work, restoreSave(work, JSON.parse(JSON.stringify(s)))!, 5000);
      expect(s.variables[key + ".purchased"]).toBe(decision === "buy");
      expect(s.variables["friend.star.state"]).toBe(friend);
      if (decision === "buy") {
        expect(s.variables[key + ".paymentSource"]).toBe("哥哥的亲情卡");
        expect(s.variables[key + ".paymentAmount"]).toBe(sequence.includes("bargain") ? marketOffers(product).find((o) => o.id === "bargain")!.price : Number(product.meta.price));
      }
      if (product.meta.rewardItemId) expect(s.unlocked.includes(product.meta.rewardItemId)).toBe(decision === "buy");
    }
  });
  it("uses uploaded seller avatars, product images and the optional app icon without changing identity labels", () => {
    const png = "data:image/png;base64,YQ==";
    const { work } = build({ "xianyu-app-icon": png, "xianyu-avatar-tutucha-mengmengda": png, "xianyu-product-tutucha-mengmengda-lamp": png });
    expect(work.variables["author.appIcon.xianyu"]).toBe(png);
    expect(work.data.xianyu.find((i) => i.id === "seller-tutucha-mengmengda")?.avatar).toBe(png);
    expect(work.data.xianyu.find((i) => i.id === "market-tutucha-mengmengda-lamp")?.media).toBe(png);
    const noop = () => {};
    const state = initialRuntime(work);
    const p: SkinProps = { name: "闲鱼", owner: "试玩", items: work.data.xianyu.filter((i) => visible(i, state)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui: { "market-seller": "兔兔叉萌萌哒" } };
    const html = renderToStaticMarkup(createElement(XianyuSkin, p));expect(html).toContain("兔兔叉萌萌哒");expect(html).toContain("台灯");expect(html).not.toContain("朱志鑫");
    const list = renderToStaticMarkup(createElement(XianyuSkin, { ...p, ui: { "market-category": "卖家" } }));for (const alias of work.data.xianyu.filter((i) => i.meta.type === "seller").map((i) => i.sender)) expect(list).toContain(alias);
    expect(() => build({ "xianyu-app-icon": "data:video/mp4;base64,YQ==" })).toThrow(/头像必须是图片/);
  });
});
