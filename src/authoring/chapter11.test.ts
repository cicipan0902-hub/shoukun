import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import tenth from "../../stories/foundation/chapter-10.json";
import chapter from "../../stories/foundation/chapter-11.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { foundationExtensions } from "./testFixture";
import { advance, choose, dispatch, visible } from "../engine";
import { initialRuntime, type Work, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
import { continuation } from "../personalization/chatRuntime";
import { activityDocument } from "../personalization/activityDocuments";
import { ActivityDocumentView } from "../personalization/ActivityDocumentView";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import { chapterGuide } from "../personalization/storyGuide";
import { resolveWeiboItems } from "../skins/CommunitySkins";
let w: Work, base: Runtime;
type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
function apply(s: Runtime, step: Step) {
 if (step.event) s = dispatch(w, s, step.event, step.target);
 if (step.choose) s = choose(w, s, step.choose);
 if (step.advanceMs !== undefined) s = advance(w, s, step.advanceMs);
 return s;
}
const saved = (s: Runtime) => restoreSave(w, JSON.parse(JSON.stringify(s)))!;
const steps = (route = chapter.tests[0]) => route.steps.slice(route.steps.findIndex(s => s.target === "ch11-entry"));
beforeAll(() => {
 w = compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions).work;
 base = dispatch(w, initialRuntime(w), "start");
 for (const s of tenth.tests[0].steps) base = apply(base, s);
 expect(base.variables["chapter.chapter-10-pending.completed"]).toBe(true);
});
describe("chapter eleven: a shared book and an optional return-journey epilogue", () => {
 it("continues chapter-ten saves, guards early entry and preserves birthday wishes and friends", () => {
  let early = dispatch(w, initialRuntime(w), "start");
  early = dispatch(w, early, "chapterStart", "chapter-11-pending");
  expect(early.variables["ch11.stage"]).toBe("locked");
  expect(continuation(w, base)?.target).toBe("chapter-11-pending");
  const entry = w.data.notes.find(i => i.id === "ch11-entry")!;
  expect(visible(entry, early)).toBe(false);
  expect(visible(entry, base)).toBe(true);
  const old = structuredClone(base);
  for (const k of Object.keys(old.variables)) if (k.startsWith("ch11.") || k.startsWith("chapter.chapter-11")) delete old.variables[k];
  const restored = saved(old);
  const next = dispatch(w, restored, "chapterStart", "chapter-11-pending");
  expect(next.variables["ch11.stage"]).toBe("invite");
  for (const k of ["growth.birthday.self", "growth.birthday.love", "growth.birthday.future", "friend.star.state", "friend.junhao.state", "phone.wallpaperItem"]) expect(next.variables[k]).toBe(base.variables[k]);
 });
 it("finishes all nine reading combinations after restoring every step, without reading social posts", () => {
  for (const route of chapter.tests) {
   let s = structuredClone(base);
   for (const step of steps(route)) s = saved(apply(s, step));
   expect(s.variables["chapter.chapter-11-pending.completed"]).toBe(true);
   expect(s.unlocked).toContain("ch11-weibo-zuo-book");
   expect(s.variables["ch11.tailDone"]).toBe(true);
   expect(s.endings.at(-1)).toBe("换回最开始那张，今天先记到这里。");
   expect(s.unlocked).toContain("ch11-memo");expect(s.read).toContain("ch11-memo");
   expect(s.read).not.toContain("ch11-moment-owner");
   const ids = [...s.unlocked], done = [...s.completed];
   s = advance(w, dispatch(w, saved(s), "documentAction", "ch11-tail.tell"), 60000);
   s = advance(w, dispatch(w, s, "chapterStart", "chapter-11-pending"), 60000);
   expect(s.unlocked).toEqual(ids);expect(s.completed).toEqual(done);
   expect(new Set(s.unlocked).size).toBe(s.unlocked.length);
  }
 });
 it("does not let the reading choices be skipped or replaced after a choice", () => {
  let s = structuredClone(base);
  for (const step of steps()) { if (step.target === "ch11-book.first-like") break; s = apply(s, step); }
  expect(s.variables["ch11.page"]).toBe("first");
  expect(s.unlocked).not.toContain("ch11-weibo-zuo-book");
  s = dispatch(w, s, "documentAction", "ch11-book.next");
  expect(s.variables["ch11.page"]).toBe("first");
  s = dispatch(w, s, "documentAction", "ch11-book.first-ideal");
  s = dispatch(w, saved(s), "documentAction", "ch11-book.first-like");
  expect(s.variables["ch11.read1"]).toBe("ideal");
  const item = w.data.files.find(i => i.id === "ch11-book")!, doc = activityDocument(w, s, item)!;
  const noop = () => {};
  const html = renderToStaticMarkup(createElement(CampusPlayContext.Provider, {value:{work:w,state:s,read:noop,choose:noop,navigate:noop,event:noop}},createElement(ActivityDocumentView,{item,document:doc,back:noop})));
  expect(html).toContain("书店阅读");expect(html).toContain("牧羊少年奇幻之旅");
  expect(html).toContain("不是谁都走得开");expect(html).not.toContain("我喜欢他至少肯去找");
  expect(html).toContain("往后翻一页");
 });
 it("completes the main chapter before the optional epilogue and never forces a new wallpaper", () => {
  let s = structuredClone(base);
  for (const step of steps()) { if (step.target === "ch11-tail.tell") break; s = apply(s, step); }
  expect(s.variables["chapter.chapter-11-pending.completed"]).toBe(true);
  expect(s.variables["ch11.tailDone"]).toBe(false);
  expect(s.variables["phone.wallpaperItem"]).toBe("");
  expect(s.variables["chapter.next"]).toBe("chapter-12-pending");
  expect(s.unlocked).not.toContain("ch11-tail-1");
  expect(w.data.wechat.find(i => i.id === "ch11-tail-1")!.body).toBe("我不知道。");
 });
 it("shows the newest chapter guide, repairs old post identities and resumes an old completed save", () => {
  expect(chapterGuide(w, base)?.title).toContain("第十章已完成");
  const post = w.data.weibo.find(i => i.id === "ch11-weibo-star")!;
  const oldPost = { ...post, sender: "", meta: { ...post.meta, characterRef: "zhuzhixin" } };
  expect(resolveWeiboItems([oldPost], w.data.contacts, "我", "")[0].sender).toBe(w.data.contacts.find(i => i.id === "star-card")!.title);
  let s = structuredClone(base);
  for (const step of steps()) { if (step.target === "ch11-finish.restore") break; s = apply(s, step); }
  s.variables["chapter.chapter-11-pending.completed"] = true;
  s.variables["ch11.stage"] = "completed";
  s.unlocked = s.unlocked.filter(id => id !== "ch11-finish");
  expect(chapterGuide(w, saved(s))?.itemId).toBe("ch11-finish");
  s = dispatch(w, saved(s), "read", "ch11-finish");
  s = dispatch(w, s, "documentAction", "ch11-finish.restore");
  expect(s.variables["phone.wallpaperItem"]).toBe("");
  expect(chapterGuide(w, s)?.itemId).toBe("ch11-memo");
  s = dispatch(w, s, "read", "ch11-memo");
  expect(s.variables["ch11.wrapDone"]).toBe(true);
 });

});
