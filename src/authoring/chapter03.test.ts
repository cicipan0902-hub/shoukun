import { foundationExtensions, authorOnlyFixture, foundationPathCount } from "./testFixture";
import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
const reserve = authorOnlyFixture<{ groups: { participants: string[] }[] }>("author-reserve.json");
const plan = authorOnlyFixture<{ notes: { futureConnection: string }[] }>("memo-plan.json");
import { interactionsSchema } from "./interactions";
import { compileProject } from "./compile";
import { dispatch, advance, choose, visible } from "../engine";
import { initialRuntime, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
import { continuation, contactAllowed, chatItemAllowed } from "../personalization/chatRuntime";
import { activityDocument } from "../personalization/activityDocuments";
import { chapterGuide } from "../personalization/storyGuide";
const build = (config: unknown = interactions) => compileProject(source, project, cast, assets, foundationExtensions(), {}, config);
const started = "chapter.chapter-03-beyond-form.started", completed = "chapter.chapter-03-beyond-form.completed";
type Step = { choose?: string; advanceMs?: number; event?: string; target?: string };
function step(work: ReturnType<typeof build>["work"], s: Runtime, t: Step) {
  if (t.choose) s = choose(work, s, t.choose);
  if (t.advanceMs) s = advance(work, s, t.advanceMs);
  if (t.event) s = dispatch(work, s, t.event, t.target);
  return s;
}
function before(target: string) {
  const { work, story } = build();
  let s = dispatch(work, initialRuntime(work), "start");
  for (const t of story.tests[82].steps) {
    if (t.target === target) break;
    s = step(work, s, t);
  }
  return { work, s };
}
describe("chapter three, task documents and private diary", () => {
  it("plays every new branch with restoration after every interaction, keeping chapter 1/2 and friendship history", () => {
    const { work, story } = build();
    expect(story.tests).toHaveLength(foundationPathCount());
    expect(story.tests.slice(82, 94)).toHaveLength(12);
    for (const path of story.tests.slice(82, 94)) {
      let s = dispatch(work, initialRuntime(work), "start");
      for (const t of path.steps) {
        if (t.event === "read") {
          const item = Object.values(work.data).flat().find((i) => i.id === t.target)!;
          expect(visible(item, s)).toBe(true);
          if (work.data.wechat.includes(item)) expect(chatItemAllowed(work, s, item)).toBe(true);
        }
        s = step(work, s, t);
        s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
      }
      expect(s.variables[completed]).toBe(true);
      expect(s.variables["chapter.chapter-01-good-weather.completed"]).toBe(true);
      expect(s.variables["chapter.chapter-02-small-crush.completed"]).toBe(true);
      expect(s.variables["friend.star.state"]).toBe("met");
      expect(s.variables["friend.junhao.state"]).toBe("accepted");
      expect(s.variables["chapter.next"]).toBe("chapter-04-pending");
      expect(new Set(s.unlocked).size).toBe(s.unlocked.length);
      const repeated = dispatch(work, s, "read", "ch03-memo");
      expect(repeated.endings).toEqual(s.endings);
      expect(repeated.notifications).toEqual(s.notifications);
    }
  }, 20000);
  it("starts only after chapter 2, and adds the new entry to an old completed save without resetting it", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    const entry = work.data.notes.find((i) => i.id === "ch03-entry")!;
    expect(visible(entry, s)).toBe(false);
    expect(dispatch(work, s, "chapterStart", "chapter-03-beyond-form").variables[started]).toBe(false);
    for (const t of story.tests[18].steps) s = step(work, s, t);
    const old = JSON.parse(JSON.stringify(s));
    for (const key of Object.keys(old.variables)) if (key.startsWith("ch03.") || key.includes("chapter-03-beyond-form")) delete old.variables[key];
    s = restoreSave(work, old)!;
    expect(visible(entry, s)).toBe(true);
    expect(continuation(work, s)?.target).toBe("chapter-03-beyond-form");
    s = dispatch(work, s, "chapterStart", "chapter-03-beyond-form");
    expect(s.variables[started]).toBe(true);
    expect(dispatch(work, s, "chapterStart", "chapter-03-beyond-form").scheduled).toEqual(s.scheduled);
    expect(s.variables["friend.star.state"]).toBe("met");
  });
  it("locks profile actions before the document is available and requires all four rows before submitting once", () => {
    const { work, s: initial } = before("ch03-roster");
    const item = work.data.files.find((i) => i.id === "ch03-roster")!;
    const fresh = dispatch(work, initialRuntime(work), "start");
    expect(activityDocument(work, fresh, item)).toBeNull();
    expect(dispatch(work, fresh, "documentInspect", "ch03-roster.zhu").variables["document.ch03-roster.zhu.read"]).not.toBe(true);
    let s = dispatch(work, initial, "documentAction", "ch03-roster.submit");
    expect(s.variables["ch03.rosterChecked"]).toBe(false);
    for (const row of ["zhu", "junhao", "brother"]) s = dispatch(work, s, "documentInspect", "ch03-roster." + row);
    expect(dispatch(work, s, "documentAction", "ch03-roster.submit").variables["ch03.rosterChecked"]).toBe(false);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = dispatch(work, s, "documentInspect", "ch03-roster.zuo");
    expect(activityDocument(work, s, item)?.entries).toHaveLength(6);
    s = dispatch(work, s, "documentAction", "ch03-roster.submit");
    expect(s.variables["ch03.rosterChecked"]).toBe(true);
    expect(dispatch(work, s, "documentAction", "ch03-roster.submit").scheduled).toEqual(s.scheduled);
  });
  it("keeps the four-boy private group and author memo map outside the player data; new NPCs only appear in a work group", () => {
    const { work } = build();
    const s = dispatch(work, initialRuntime(work), "start");
    expect(work.data.contacts.filter((i) => contactAllowed(work, s, i)).map((i) => i.id).sort()).toEqual(["brother-card", "zuohang-card"]);
    if (reserve) expect(reserve.groups[0].participants).toEqual(["star", "junhao", "brother", "zuohang"]);
    expect(work.data.wechat.some((i) => i.title === "四个男的")).toBe(false);
    if (plan) expect(JSON.stringify(work)).not.toContain(plan.notes[0].futureConnection);
    expect(work.data.wechat.filter((i) => i.meta.conversationId === "ch03-work").every((i) => i.meta.participants.split(",").includes("owner"))).toBe(true);
    const roster = interactionsSchema.parse(interactions).documents[0];
    expect(roster.entries.map((r) => r.characterId)).toEqual(expect.arrayContaining(["star", "junhao", "brother", "zuohang", "lifei", "jiaqi"]));
    expect(JSON.stringify(roster)).not.toMatch(/赌博|性取向|家庭创伤/);
  });
  it("unlocks the diary after the actual scene, and requires all three wrap-up items before ending", () => {
    const { work, s: start } = before("ch03-onsite.hand-in");
    const memo = work.data.notes.find((i) => i.id === "ch03-memo")!;
    expect(visible(memo, start)).toBe(false);
    let s = dispatch(work, start, "documentAction", "ch03-onsite.honest");
    expect(s.variables["ch03.onsiteDone"]).toBe(false);
    s = dispatch(work, s, "documentAction", "ch03-onsite.hand-in");
    s = dispatch(work, s, "documentAction", "ch03-onsite.honest");
    expect(visible(memo, s)).toBe(true);
    expect(s.variables["ch03.endingTone"]).toBe("honest");
    expect(dispatch(work, s, "documentAction", "ch03-onsite.work").variables["ch03.endingTone"]).toBe("honest");
    s = dispatch(work, s, "read", memo.id);
    expect(s.variables[completed]).toBe(false);
    expect(chapterGuide(work, s)?.itemId).toBe("ch03-updated");
    s = dispatch(work, s, "read", "ch03-updated");
    s = dispatch(work, s, "read", "ch03-moment-work");
    expect(s.variables[completed]).toBe(true);
    expect(memo.body.length).toBeGreaterThan(150);
    expect(work.data.notes.find((i) => i.id === "ch01-note-first-day")!.body.length).toBeGreaterThan(150);
    expect(work.data.files.find((i) => i.id === "ch03-demo-note")!.kind).toBe("note");
    expect(work.data.files.find((i) => i.id === "ch03-demo-note")!.media).toBe("");
  });
  it("rejects invalid profile references, duplicate rows and executable document configuration", () => {
    const bad = interactionsSchema.parse(interactions);
    bad.documents[0].entries[0].characterId = "missing-person";
    expect(() => build(bad)).toThrow(/活动资料人物不存在/);
    const duplicate = interactionsSchema.parse(interactions);
    duplicate.documents[0].entries.push(duplicate.documents[0].entries[0]);
    expect(() => build(duplicate)).toThrow(/活动资料重复 ID/);
    expect(() => build({ ...interactions, documents: [{ ...interactions.documents[0], script: "alert(1)" }] })).toThrow();
  });
});
