import { foundationExtensions } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import eighth from "../../stories/foundation/chapter-08.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime } from "../schema";
import { dispatch, advance, choose, visible } from "../engine";
import { restoreSave } from "../saveRestore";
import { ActivityDocumentView } from "../personalization/ActivityDocumentView";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import { activityDocument } from "../personalization/activityDocuments";
import { chapterGuide } from "../personalization/storyGuide";
import { continuation } from "../personalization/chatRuntime";
import type { Runtime, Work } from "../schema";
const build = (media: Record<string, string> = {}) => compileProject(source, project, cast, assets, foundationExtensions(), media, interactions);
type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
function apply(w: Work, s: Runtime, step: Step) {
  if (step.event) s = dispatch(w, s, step.event, step.target);
  if (step.choose) s = choose(w, s, step.choose);
  if (step.advanceMs) s = advance(w, s, step.advanceMs);
  return s;
}
function chapterSevenDone(w: Work) {
  let s = dispatch(w, initialRuntime(w), "start");
  for (const step of eighth.tests[0].steps) {
    if (step.target === "ch08-entry") break;
    s = apply(w, s, step);
  }
  return s;
}
const social = ["ch08-moment-activity", "ch08-moment-junhao", "ch08-weibo-zuo", "ch08-weibo-star", "ch08-weibo-owner", "ch08-photo"];
describe("chapter eight: optional social narrative and restrained approaches", () => {
  it("starts from an existing chapter-seven save and cannot be entered early", () => {
    const { work } = build();let s = dispatch(work, initialRuntime(work), "start");
    s = dispatch(work, s, "chapterStart", "chapter-08-pending");
    expect(s.variables["chapter.chapter-08-pending.started"]).toBe(false);
    s = chapterSevenDone(work);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    expect(continuation(work, s)?.target).toBe("chapter-08-pending");
    expect(chapterGuide(work, s)?.itemId).toBe("ch08-entry");
    s = dispatch(work, s, "chapterStart", "chapter-08-pending");
    s = advance(work, s, 60000);
    expect(chapterGuide(work, s)?.itemId).toBe("ch08-confession");
    expect(s.unlocked).not.toContain("ch08-weibo-star");
  });
  it("finishes all eighteen optional-response/social-reading paths after restoring every new interaction", () => {
    const { work } = build(), base = chapterSevenDone(work);
    for (const route of eighth.tests) {
      let s = structuredClone(base), active = false;
      for (const step of route.steps) {
        if (step.target === "ch08-entry") active = true;
        if (!active) continue;
        s = restoreSave(work, JSON.parse(JSON.stringify(apply(work, s, step))))!;
      }
      expect(s.variables["chapter.chapter-08-pending.completed"]).toBe(true);
      expect(s.endings).toContain(route.ending);
      expect(s.variables["ch08.overheard"]).toBe(true);
      expect(s.variables["ch08.playerKnowsOverheard"]).toBe(false);
      expect(s.variables["friend.star.state"]).toBe(base.variables["friend.star.state"]);
      expect(s.variables["ch07.score"]).toBe(base.variables["ch07.score"]);
      expect(social.every((id) => s.unlocked.includes(id))).toBe(true);
      if (route.name.includes("忽略动态")) for (const id of social) expect(s.read).not.toContain(id);
      expect(s.ui?.weibo).toEqual(base.ui?.weibo);
    }
  }, 15000);
  it("publishes fixed-ID social updates at events, without requiring reads or duplicating posts on reentry", () => {
    const { work } = build();let s = chapterSevenDone(work);
    s = advance(work, dispatch(work, s, "read", "ch08-entry"), 60000);
    s = dispatch(work, s, "documentAction", "ch08-confession.continue");
    expect(s.unlocked).toContain("ch08-moment-activity");
    expect(s.unlocked).not.toContain("ch08-weibo-star");
    const unlocked = [...s.unlocked];
    s = dispatch(work, s, "documentAction", "ch08-confession.continue");
    s = dispatch(work, s, "chapterStart", "chapter-08-pending");
    expect(s.unlocked).toEqual(unlocked);
    s = dispatch(work, s, "documentAction", "ch08-activity.continue");
    s = dispatch(work, s, "documentAction", "ch08-corridor.continue");
    const queued = [...s.scheduled!];
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = dispatch(work, s, "documentAction", "ch08-corridor.continue");
    expect(s.scheduled).toEqual(queued);
    s = advance(work, s, 60000);
    for (const id of social) expect(s.unlocked.filter((x) => x === id)).toHaveLength(1);
    expect(work.data.weibo.filter((i) => i.id === "ch08-weibo-star")).toHaveLength(1);
    expect(new Set(s.unlocked).size).toBe(s.unlocked.length);
  });
  it("allows default continuation without selecting optional dialogue and needs no new media", () => {
    const { work } = build();let s = chapterSevenDone(work);
    s = advance(work, dispatch(work, s, "read", "ch08-entry"), 60000);
    const item = work.data.files.find((i) => i.id === "ch08-confession")!;
    const doc = activityDocument(work, s, item)!;const noop = () => {};
    const html = renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state: s, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(ActivityDocumentView, { item, document: doc, back: noop })));
    expect(html).toContain("去参加旧书交换活动");expect(html).toContain("可选");
    s = dispatch(work, s, "documentAction", "ch08-confession.gentle");
    s = dispatch(work, s, "documentAction", "ch08-confession.clear");
    expect(s.variables["ch08.refusal"]).toBe("gentle");
    s = dispatch(work, s, "documentAction", "ch08-confession.continue");
    expect(s.variables["ch08.stage"]).toBe("activity");
    expect(work.data.photos.find((i) => i.id === "ch08-photo")?.media).toBe("");
    expect(visible(work.data.weibo.find((i) => i.id === "ch08-weibo-star")!, s)).toBe(false);
  });
});
