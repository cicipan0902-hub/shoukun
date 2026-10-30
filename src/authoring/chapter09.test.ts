import { describe, expect, it } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import ninth from "../../stories/foundation/chapter-09.json";
import eighth from "../../stories/foundation/chapter-08.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { foundationExtensions } from "./testFixture";
import { advance, choose, dispatch, visible } from "../engine";
import { initialRuntime, type Runtime, type Work } from "../schema";
import { restoreSave } from "../saveRestore";
import { availableRequests, canPrivateChat, continuation, pendingChat, replyOptions } from "../personalization/chatRuntime";
import { chapterGuide } from "../personalization/storyGuide";

type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
const build = () => compileProject(source, project, cast, assets, foundationExtensions(), {}, interactions).work;
function apply(w: Work, s: Runtime, step: Step) {
  if (step.event) s = dispatch(w, s, step.event, step.target);
  if (step.choose) s = choose(w, s, step.choose);
  if (step.advanceMs) s = advance(w, s, step.advanceMs);
  return s;
}
function previousChapter(w: Work) {
  let s = dispatch(w, initialRuntime(w), "start");
  for (const step of eighth.tests[0].steps) s = apply(w, s, step);
  return s;
}
function untilRequest(w: Work, base: Runtime) {
  let s = base, active = false;
  for (const step of ninth.tests[0].steps) {
    if (step.target === "ch09-entry") active = true;
    if (step.event === "friendRequest") break;
    if (active) s = apply(w, s, step);
  }
  return s;
}
const social = ["ch09-moment-owner", "ch09-moment-brother", "ch09-weibo-zuo", "ch09-weibo-star"];
describe("chapter nine: explicit outgoing friendship and independent private conversation", () => {
  it("keeps entry and the request locked before their story prerequisites", () => {
    const w = build();let s = dispatch(w, initialRuntime(w), "start");
    s = dispatch(w, s, "chapterStart", "chapter-09-pending");
    s = advance(w, dispatch(w, s, "friendRequest", "ch09-star-request"), 60000);
    expect(s.variables["chapter.chapter-09-pending.started"]).toBe(false);
    expect(canPrivateChat(w, s, "star")).toBe(false);
    s = previousChapter(w);
    for (const key of Object.keys(ninth.variables)) delete s.variables[key];
    s = restoreSave(w, JSON.parse(JSON.stringify(s)))!;
    expect(s.variables["chapter.chapter-09-pending.started"]).toBe(false);
    expect(continuation(w, s)?.target).toBe("chapter-09-pending");
    expect(chapterGuide(w, s)?.itemId).toBe("ch09-entry");
    expect(availableRequests(w, s).some(r => r.id === "ch09-star-request")).toBe(false);
    expect(s.variables["friend.junhao.state"]).toBe("accepted");
  });
  it("persists a single pending request and only starts private replies after verification", () => {
    const w = build();let s = untilRequest(w, previousChapter(w));
    expect(s.variables["ch09.stage"]).toBe("request");
    expect(canPrivateChat(w, s, "star")).toBe(false);
    expect(availableRequests(w, s).some(r => r.id === "ch09-star-request")).toBe(true);
    s = dispatch(w, s, "friendRequest", "ch09-star-request");
    expect(s.variables["friend.star.state"]).toBe("requested");
    expect(canPrivateChat(w, s, "star")).toBe(false);
    const queued = structuredClone(s.scheduled);
    s = restoreSave(w, JSON.parse(JSON.stringify(s)))!;
    s = dispatch(w, s, "friendRequest", "ch09-star-request");
    expect(s.scheduled).toEqual(queued);
    s = advance(w, s, 1100);
    expect(s.variables["friend.star.state"]).toBe("accepted");
    expect(canPrivateChat(w, s, "star")).toBe(true);
    expect(pendingChat(w, s, "朱志鑫")).toBe(true);
    expect(s.unlocked).not.toContain("ch09-private-1");
    expect(replyOptions(w, s, "朱志鑫")).toHaveLength(0);
    s = advance(w, s, 1100);
    expect(s.unlocked).toContain("ch09-private-1");
    expect(replyOptions(w, s, "朱志鑫")).toHaveLength(2);
    s = choose(w, s, "ch09-photo-plain");
    const after = structuredClone(s.scheduled);
    s = choose(w, s, "ch09-photo-plain");
    expect(s.scheduled).toEqual(after);
    expect(s.unlocked.filter(id => id === "ch09-photo-plain-message")).toHaveLength(1);
    s = advance(w, s, 500);
    expect(s.unlocked).toContain("ch09-photo-original");
    expect(s.unlocked).not.toContain("ch09-photo-plain-reply");
    s = restoreSave(w, JSON.parse(JSON.stringify(s)))!;
    s = advance(w, s, 1100);
    expect(s.unlocked).toContain("ch09-photo-plain-reply");
  });
  it("finishes every configured tone/social path with restore after each step, retaining the real unread hook", () => {
    const w = build(), base = previousChapter(w);
    for (const route of ninth.tests) {
      let s = structuredClone(base), active = false;
      for (const step of route.steps) {
        if (step.target === "ch09-entry") active = true;
        if (active) s = restoreSave(w, JSON.parse(JSON.stringify(apply(w, s, step))))!;
      }
      expect(s.variables["chapter.chapter-09-pending.completed"]).toBe(true);
      expect(s.variables["friend.star.state"]).toBe("accepted");
      expect(s.variables["friend.junhao.state"]).toBe(base.variables["friend.junhao.state"]);
      expect(s.variables["ch08.playerKnowsOverheard"]).toBe(false);
      expect(s.variables["ch07.score"]).toBe(base.variables["ch07.score"]);
      expect(s.endings).toContain(route.ending);
      expect(s.unlocked).toContain("ch09-next-morning");
      expect(s.read).not.toContain("ch09-next-morning");
      expect(s.ui?.weibo).toEqual(base.ui?.weibo);
      if (route.name.includes("忽略动态")) for (const id of social) expect(s.read).not.toContain(id);
      for (const id of social) expect(s.unlocked.filter(x => x === id)).toHaveLength(1);
      const count = s.notifications.length, unlocked = [...s.unlocked];
      s = dispatch(w, s, "read", "ch09-memo");
      s = dispatch(w, s, "documentAction", "ch09-dinner.continue");
      s = dispatch(w, s, "chapterStart", "chapter-09-pending");
      s = advance(w, s, 60000);
      expect(s.notifications).toHaveLength(count);
      expect(s.unlocked).toEqual(unlocked);
    }
  }, 20000);
  it("preserves already-accepted old saves, unlocks optional updates by phase and works without new media", () => {
    const w = build(), base = previousChapter(w);
    base.variables["friend.star.state"] = "accepted";
    let s = untilRequest(w, base);
    expect(s.variables["ch09.stage"]).toBe("private");
    expect(s.variables["friend.star.state"]).toBe("accepted");
    expect(s.completed).not.toContain("friend-send-ch09-star-request");
    expect(s.unlocked).toContain("ch09-moment-owner");
    expect(visible(w.data.weibo.find(i => i.id === "ch09-weibo-star")!, s)).toBe(false);
    expect(w.data.photos.find(i => i.id === "ch09-photo-group")?.media).toBe("");
    for (const step of ninth.tests[0].steps.slice(ninth.tests[0].steps.findIndex(x => x.event === "friendRequest") + 1)) s = apply(w, s, step);
    expect(s.variables["chapter.chapter-09-pending.completed"]).toBe(true);
    expect(visible(w.data.weibo.find(i => i.id === "ch09-weibo-star")!, s)).toBe(true);
  });
});
