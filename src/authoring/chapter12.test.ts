import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import previous from "../../stories/foundation/chapter-11.json";
import chapter from "../../stories/foundation/chapter-12.json";
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
import { chapterGuide } from "../personalization/storyGuide";
import { activityDocument } from "../personalization/activityDocuments";
import { ActivityDocumentView } from "../personalization/ActivityDocumentView";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
let w: Work, base: Runtime;
type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
function apply(s: Runtime, step: Step) {
 if (step.event) s = dispatch(w, s, step.event, step.target);
 if (step.choose) s = choose(w, s, step.choose);
 if (step.advanceMs !== undefined) s = advance(w, s, step.advanceMs);
 return s;
}
const saved = (s: Runtime) => restoreSave(w, JSON.parse(JSON.stringify(s)))!;
const steps = (route = chapter.tests[0]) => route.steps.slice(route.steps.findIndex(s => s.target === "ch12-entry"));
function render(s: Runtime, id: string) {
 const item = w.data.files.find(x => x.id === id)!, doc = activityDocument(w, s, item)!;
 const noop = () => {};
 return renderToStaticMarkup(createElement(CampusPlayContext.Provider, {value:{work:w,state:s,read:noop,choose:noop,navigate:noop,event:noop}},createElement(ActivityDocumentView,{item,document:doc,back:noop})));
}
beforeAll(() => {
 w = compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions).work;
 base = dispatch(w, initialRuntime(w), "start");
 // The chapter-eleven epilogue was optional: a player who skipped it can continue.
 for (const step of previous.tests[0].steps) { if (step.target === "ch11-tail.tell") break; base = apply(base, step); }
 expect(base.variables["chapter.chapter-11-pending.completed"]).toBe(true);
 expect(base.variables["ch11.tailDone"]).toBe(false);
});
describe("chapter twelve: private pages, personal plans and a meeting still to come", () => {
 it("guards entry and continues an old save even when the prior optional tail was skipped", () => {
  let s = dispatch(w, initialRuntime(w), "chapterStart", "chapter-12-pending");
  expect(s.variables["ch12.stage"]).toBe("locked");
  const entry = w.data.notes.find(x => x.id === "ch12-entry")!;
  expect(visible(entry, base)).toBe(true);expect(continuation(w, base)?.target).toBe("chapter-12-pending");
  const old = structuredClone(base);
  for (const k of Object.keys(old.variables)) if (k.startsWith("ch12.") || k.startsWith("chapter.chapter-12")) delete old.variables[k];
  s = dispatch(w, saved(old), "chapterStart", "chapter-12-pending");
  expect(chapterGuide(w, s)?.itemId).toBe("ch12-morning");
  expect(render(s, "ch12-morning")).toContain("哥哥当时说，他不知道");
 });
 it("finishes both diary branches with all wallpaper choices, saves each step, and never requires socials", () => {
  for (const route of chapter.tests) {
   let s = structuredClone(base);
   for (const step of steps(route)) s = saved(apply(s, step));
   expect(s.variables["chapter.chapter-12-pending.completed"]).toBe(true);
   const read = s.variables["ch12.diary"] === "read";
   expect(s.unlocked.includes("ch12-memo-read")).toBe(read);
   expect(s.unlocked.includes("ch12-memo-closed")).toBe(!read);
   expect(s.unlocked.includes("ch12-diary")).toBe(read);
   expect(s.endings.at(-1)).toBe("你说，他找我什么事？");
   expect(s.variables["chapter.next"]).toBe("chapter-13-pending");
   expect(s.read).not.toContain("ch12-moment-junhao");
   expect(chapterGuide(w, s)?.title).toBe("第十二章已完成");
   const old = structuredClone(s);
   s = advance(w, dispatch(w, s, "chapterStart", "chapter-12-pending"), 60000);
   s = dispatch(w, s, "documentAction", "ch12-notebook.read");
   s = dispatch(w, s, "documentAction", "ch12-ending.finish");
   expect(s.variables).toEqual(old.variables);expect(s.unlocked).toEqual(old.unlocked);
  }
 });
 it("separates voluntary player records from the heroine's diary knowledge and does not replay the demo as a new recording", () => {
  let s = structuredClone(base);
  for (const step of steps()) { s = apply(s, step); if (step.target === "ch12-demo.leave") break; }
  const vars = {...s.variables};
  const page = render(s, "ch12-record-brother");
  expect(page).toContain("玩家视角");expect(page).toContain("不改变她在剧情中知道的事");
  s = dispatch(w, s, "read", "ch12-record-brother");
  expect(s.variables).toEqual(vars);expect(s.variables["ch12.diary"]).toBe("unset");
  expect(w.data.files.find(x => x.id === "ch12-demo")!.body).toContain("不冒充本章新录音");
  const closed = w.data.notes.find(x => x.id === "ch12-memo-closed")!;
  expect(closed.body).not.toContain("本子里那几行我看了");
  expect(closed.body).not.toContain("又不是只有我能跟他讲话");
 });
});
