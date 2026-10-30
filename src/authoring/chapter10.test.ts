import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import ninth from "../../stories/foundation/chapter-09.json";
import tenth from "../../stories/foundation/chapter-10.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { foundationExtensions } from "./testFixture";
import { advance, choose, dispatch, visible } from "../engine";
import { initialRuntime, type Runtime, type Work } from "../schema";
import { restoreSave } from "../saveRestore";
import { continuation } from "../personalization/chatRuntime";
import { activityDocument } from "../personalization/activityDocuments";
import { ActivityDocumentView } from "../personalization/ActivityDocumentView";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import { selectedWallpaper } from "../personalization/birthday";
import { marketOrders } from "../personalization/marketRuntime";
import { personalizeWork } from "../personalization/profile";

type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
let w: Work, base: Runtime;
function apply(s: Runtime, step: Step) {
  if (step.event) s = dispatch(w, s, step.event, step.target);
  if (step.choose) s = choose(w, s, step.choose);
  if (step.advanceMs !== undefined) s = advance(w, s, step.advanceMs);
  return s;
}
const saved = (s: Runtime) => restoreSave(w, JSON.parse(JSON.stringify(s)))!;
function chapterSteps(route = tenth.tests[0]) {
  const at = route.steps.findIndex(s => s.target === "ch10-entry");
  return route.steps.slice(at);
}
function beforeWishes() {
  let s = structuredClone(base);
  for (const step of chapterSteps()) {
    if (step.target === "ch10-birthday.self-0") break;
    s = apply(s, step);
  }
  expect(s.variables["ch10.stage"]).toBe("wishes");
  return s;
}
beforeAll(() => {
  w = compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions).work;
  base = dispatch(w, initialRuntime(w), "start");
  for (const step of ninth.tests[0].steps) base = apply(base, step);
  expect(base.variables["chapter.chapter-09-pending.completed"]).toBe(true);
});
describe("birthday chapter: private wishes, paid wallpaper and the final photograph", () => {
  it("locks the new entry until chapter nine and requires actual purchase before applying wallpaper", () => {
    let s = dispatch(w, initialRuntime(w), "start");
    s = dispatch(w, s, "chapterStart", "chapter-10-pending");
    expect(s.variables["ch10.stage"]).toBe("locked");
    expect(continuation(w, base)?.target).toBe("chapter-10-pending");
    s = dispatch(w, structuredClone(base), "read", "ch10-entry");
    s = dispatch(w, s, "documentAction", "ch10-wallpaper.apply");
    expect(s.variables["ch10.stage"]).toBe("wallpaper");
    expect(s.variables["phone.wallpaperItem"]).toBe("");
  });
  it("finishes all three authored wish/skip paths after restoring every step without reading social posts or memos", () => {
    for (const route of tenth.tests) {
      let s = structuredClone(base);
      for (const step of chapterSteps(route)) s = saved(apply(s, step));
      expect(s.variables["chapter.chapter-10-pending.completed"]).toBe(true);
      expect(s.endings.at(-1)).toBe("一张给你。另一张我自己留着。");
      expect(s.variables["story.inlineEnding"]).toBe(s.endings.at(-1));
      expect(s.variables["growth.birthday.recorded"]).toBe(true);
      expect(s.variables["friend.star.state"]).toBe(base.variables["friend.star.state"]);
      expect(s.variables["friend.junhao.state"]).toBe(base.variables["friend.junhao.state"]);
      expect(s.read).not.toContain("ch10-wish-memo");
      expect(s.read).not.toContain("ch10-moment-owner");
      const orders = marketOrders(s).filter(o => o.productId === "market-cr7-only-god-handsome");
      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({ status: "paid", amount: 2 });
      const snapshot = { orders: marketOrders(s), endings: s.endings, unlocked: s.unlocked };
      s = dispatch(w, s, "marketConfirm", "market-cr7-only-god-handsome");
      s = dispatch(w, s, "documentAction", "ch10-polaroids.keep");
      s = advance(w, dispatch(w, s, "read", "ch10-entry"), 60000);
      expect({ orders: marketOrders(s), endings: s.endings, unlocked: s.unlocked }).toEqual(snapshot);
    }
  });
  it("saves all 18 individual answers or skips once without NPC reactions or public wish text", () => {
    const start = beforeWishes();
    for (const question of ["self", "love", "future"]) for (const answer of ["0", "1", "2", "3", "4", "skip"]) {
      const id = "ch10-birthday." + question + "-" + answer;
      let s = saved(dispatch(w, structuredClone(start), "documentAction", id));
      expect(s.variables["growth.birthday." + question]).toBe(answer);
      s = dispatch(w, s, "documentAction", "ch10-birthday." + question + "-" + (answer === "0" ? "1" : "0"));
      expect(s.variables["growth.birthday." + question]).toBe(answer);
      expect(s.scheduled).toEqual(start.scheduled);
      expect(s.unlocked).toEqual(start.unlocked);
      expect(s.notifications).toEqual(start.notifications);
      for (const key of ["friend.star.state", "friend.junhao.state"]) expect(s.variables[key]).toBe(start.variables[key]);
    }
    const before = dispatch(w, start, "documentAction", "ch10-birthday.finish-wishes");
    expect(before.variables["growth.birthday.recorded"]).toBe(false);
    expect(before.variables["ch10.stage"]).toBe("wishes");
    const publicText = [...w.data.wechat, ...w.data.weibo].filter(i => i.id.startsWith("ch10-")).map(i => i.body).join("\n");
    expect(publicText).not.toContain("growth.birthday");
    expect(publicText).not.toContain("不要为了让所有人满意而委屈自己");
  });
  it("keeps the private memo readable and original answers unchanged after completion and re-entry", () => {
    let s = structuredClone(base);
    for (const step of chapterSteps()) s = apply(s, step);
    const memo = w.data.notes.find(i => i.id === "ch10-wish-memo")!;
    const doc = activityDocument(w, s, memo)!;
    expect(visible(memo, s)).toBe(true);
    const markup = renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: {
      work: w, state: s, read() {}, choose() {}, navigate() {}, event() {},
    } }, createElement(ActivityDocumentView, { item: memo, document: doc, back() {} })));
    expect(markup).toContain("想留一点时间");
    expect(markup).not.toContain("我试着想一件非实现不可的事");
    s = saved(dispatch(w, s, "documentAction", "ch10-birthday.self-4"));
    expect(s.variables["growth.birthday.self"]).toBe("0");
  });
  it("retains the chosen wallpaper resource through saves, with an honest fallback until the image exists", () => {
    const s = beforeWishes();
    expect(saved(s).variables["phone.wallpaperItem"]).toBe("ch10-wallpaper");
    expect(selectedWallpaper(w, s)).toBe(w.phone.wallpaper);
    const imageWork = structuredClone(w);
    imageWork.data.files.find(i => i.id === "ch10-wallpaper")!.media = "data:image/png;base64,aGVsbG8=";
    expect(selectedWallpaper(imageWork, saved(s))).toBe("data:image/png;base64,aGVsbG8=");
    const profile = { runId: "b3b84be1-f0e3-461a-868a-47985904ae97", playerName: "同学", playerClass: "班级待定", starName: "朱志鑫", temperament: "活泼，有点小倔强" as const };
    const personal = personalizeWork(w, profile);
    expect(personal.phone.passcode).toBe("2580");
    expect(personal.id).toBe(w.id + "--" + profile.runId);
    expect(w.phone.passcode).not.toBe("2580");
  });
});
