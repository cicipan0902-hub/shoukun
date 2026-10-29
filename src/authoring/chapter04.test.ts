import { foundationExtensions, authorOnlyFixture, foundationPathCount } from "./testFixture";
import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
const planning = authorOnlyFixture<{ starObservation: string; nextChapter: { plannedEvent: string } }>("chapter04-author-notes.json");
import { compileProject } from "./compile";
import { dispatch, advance, choose, visible } from "../engine";
import { initialRuntime, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
import { continuation, chatItemAllowed } from "../personalization/chatRuntime";
import { activityDocument } from "../personalization/activityDocuments";
import { chapterGuide } from "../personalization/storyGuide";
const build = (media: Record<string, string> = {}) => compileProject(source, project, cast, assets, foundationExtensions(), media, interactions);
type Step = { choose?: string; advanceMs?: number; event?: string; target?: string };
function step(work: ReturnType<typeof build>["work"], s: Runtime, t: Step) {
  if (t.choose) s = choose(work, s, t.choose);
  if (t.advanceMs) s = advance(work, s, t.advanceMs);
  if (t.event) s = dispatch(work, s, t.event, t.target);
  return s;
}
const started = "chapter.chapter-04-unfinished-melody.started", completed = "chapter.chapter-04-unfinished-melody.completed";
function before(target: string) {
  const { work, story } = build();
  let s = dispatch(work, initialRuntime(work), "start");
  for (const t of story.tests[94].steps) {
    if (t.target === target) break;
    s = step(work, s, t);
  }
  return { work, s };
}
describe("unfinished melody chapter and safe draft handoff", () => {
  it("plays all three Demo choices through the same ending with distinct recorded replies and private memos", () => {
    const { work, story } = build();
    expect(story.tests).toHaveLength(foundationPathCount());
    expect(story.tests.slice(82, 94)).toHaveLength(12);
    const relationshipStates: unknown[] = [];
    for (const [index, path] of story.tests.slice(94, 97).entries()) {
      let s = dispatch(work, initialRuntime(work), "start");
      for (const t of path.steps) {
        if (t.event === "read") {
          const item = Object.values(work.data).flat().find((i) => i.id === t.target)!;
          expect(visible(item, s)).toBe(true);
          if (work.data.wechat.includes(item)) expect(chatItemAllowed(work, s, item)).toBe(true);
        }
        s = step(work, s, t);
        s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
        expect(s).not.toBeNull();
      }
      const reply = ["question", "like", "work"][index];
      expect(s.variables["ch04.demoReply"]).toBe(reply);
      expect(s.variables["choice.ch04-demo-response"]).toBe("ch04-demo-" + reply);
      expect(s.variables[completed]).toBe(true);
      expect(s.endings).toContain(path.ending);
      expect(s.variables["friend.star.state"]).toBe("met");
      expect(s.variables["friend.junhao.state"]).toBe("accepted");
      expect(s.variables["friend.lifei.state"]).toBe("met");
      expect(s.variables["chapter.next"]).toBe("chapter-05-pending");
      const notes = work.data.notes.filter((i) => i.id.startsWith("ch04-memo-") && visible(i, s));
      expect(notes.map((i) => i.id)).toEqual(["ch04-memo-" + reply]);
      expect(notes[0].body.length).toBeGreaterThan(150);
      relationshipStates.push(Object.entries(s.variables).filter(([key]) => key.startsWith("character.")));
      const repeated = dispatch(work, s, "read", notes[0].id);
      expect(repeated.endings).toEqual(s.endings);
      expect(repeated.notifications).toEqual(s.notifications);
    }
    expect(relationshipStates[1]).toEqual(relationshipStates[0]);
    expect(relationshipStates[2]).toEqual(relationshipStates[0]);
  });
  it("keeps old chapter 3 completed saves and exposes a fourth chapter entry without changing the revision", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    const entry = work.data.notes.find((i) => i.id === "ch04-entry")!;
    expect(visible(entry, s)).toBe(false);
    expect(dispatch(work, s, "chapterStart", "chapter-04-unfinished-melody").variables[started]).toBe(false);
    for (const t of story.tests[82].steps) s = step(work, s, t);
    const old = JSON.parse(JSON.stringify(s));
    for (const key of Object.keys(old.variables)) if (key.startsWith("ch04.") || key.startsWith("ch05.") || key.includes("chapter-04-unfinished-melody")) delete old.variables[key];
    s = restoreSave(work, old)!;
    expect(s.revision).toBe(1);
    expect(visible(entry, s)).toBe(true);
    expect(continuation(work, s)?.target).toBe("chapter-04-unfinished-melody");
    expect(chapterGuide(work, s)?.itemId).toBe(entry.id);
    const history = [...s.unlocked];
    s = dispatch(work, s, "read", entry.id);
    expect(s.variables[started]).toBe(true);
    expect(s.unlocked).toEqual(expect.arrayContaining(history));
    expect(dispatch(work, s, "chapterStart", "chapter-04-unfinished-melody").scheduled).toEqual(s.scheduled);
  });
  it("requires the real work checklist before the text-review action and supports the supplied Demo configuration", () => {
    const { work, s: start } = before("ch04-attachment");
    const demo = work.data.files.find((i) => i.id === "ch04-demo")!;
    expect(demo.media).toBe("");
    expect(activityDocument(work, start, demo)?.kind).toBe("media-review");
    expect(demo.body).toContain("视频 Demo");
    expect(assets.assets.filter((a) => a.id === "audio-junhao-demo")).toHaveLength(1);
    expect(assets.assets.find((a) => a.id === "audio-junhao-demo")!.file).toBe("assets/audio/junhao-demo.MP4");
    let s = dispatch(work, start, "documentAction", "ch04-demo.review");
    expect(s.variables["ch04.demoReviewed"]).toBe(false);
    s = dispatch(work, s, "read", "ch04-attachment");
    s = dispatch(work, s, "documentAction", "ch04-demo.review");
    expect(s.variables["ch04.demoReviewed"]).toBe(true);
    expect(dispatch(work, s, "documentAction", "ch04-demo.review").scheduled).toEqual(s.scheduled);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = advance(work, s, 60000);
    expect(s.choices.map((c) => c.target)).toEqual(["ch04-demo-question", "ch04-demo-like", "ch04-demo-work"]);
    s = choose(work, s, "ch04-demo-work");
    expect(choose(work, s, "ch04-demo-question")).toEqual(s);
    expect(() => build({ "audio-junhao-demo": "data:image/png;base64,iVBORw0KGgo=" })).toThrow(/试听文档必须绑定音频/);
  });
  it("unlocks only the selected memo after the scene and group wrap, without starting later chapters or exposing private author notes", () => {
    const { work, s: start } = before("ch04-onsite.finish");
    const memos = work.data.notes.filter((i) => i.id.startsWith("ch04-memo-"));
    expect(memos.every((i) => !visible(i, start))).toBe(true);
    let s = dispatch(work, start, "documentAction", "ch04-onsite.finish");
    expect(memos.every((i) => !visible(i, s))).toBe(true);
    expect(dispatch(work, s, "documentAction", "ch04-onsite.finish").scheduled).toEqual(s.scheduled);
    s = advance(work, s, 60000);
    expect(memos.filter((i) => visible(i, s)).map((i) => i.id)).toEqual(["ch04-memo-question"]);
    expect(s.variables[completed]).toBe(false);
    expect(s.variables["ch04.demoActualSeconds"]).toBe("unconfirmed");
    expect(s.variables["ch04.demoDeclaredSeconds"]).toBe("unconfirmed");
    expect(s.variables["ch05.durationCheck.status"]).toBe("pending-media");
    expect(JSON.parse(String(work.variables["author.chapters"]))).toEqual(project.chapters);
    expect(s.variables["chapter.chapter-05-pending.started"]).toBe(false);
    if (planning) expect(JSON.stringify(work)).not.toContain(planning.starObservation);
    if (planning) expect(JSON.stringify(work)).not.toContain(planning.nextChapter.plannedEvent);
    expect(work.data.wechat.some((i) => i.title === "四个男的")).toBe(false);
    expect(work.data.wechat.filter((i) => i.meta.conversationId === "ch04-work").every((i) => i.meta.participants.includes("owner"))).toBe(true);
  });
});
