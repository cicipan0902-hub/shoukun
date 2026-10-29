import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import extra from "../../stories/foundation/chapter-01.extensions.json";
import project from "../../stories/foundation/project-chapter01.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import { compileProject } from "./compile";
import { testStory } from "../story-engine/testStory";
import { dispatch, advance, choose, visible } from "../engine";
import { initialRuntime, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
const result = () => compileProject(source, project, cast, assets, extra);
describe("好天气 playable chapter", () => {
  it("has exactly 16 visible text Moments, nine locked reserves and no private post or four-boy group in the player phone", () => {
    const { work } = result();
    const s = dispatch(work, initialRuntime(work), "start");
    const moments = work.data.wechat.filter((i) => i.kind === "post");
    expect(moments.filter((i) => visible(i, s))).toHaveLength(16);
    expect(moments.filter((i) => !visible(i, s))).toHaveLength(9);
    expect(moments.every((i) => !i.media)).toBe(true);
    expect(JSON.stringify(work)).not.toContain("有些问题想明白了");
    expect(
      work.data.wechat
        .filter((i) => i.kind !== "post" && visible(i, s))
        .map((i) => i.id),
    ).toEqual(["ch01-b-01"]);
    expect(
      work.data.wechat.every(
        (i) =>
          !i.meta.participants || i.meta.participants.split(",").length === 2,
      ),
    ).toBe(true);
    expect(
      work.data.wechat.some((i) => i.meta.conversationId === "chat-star"),
    ).toBe(false);
  });
  it("all 18 combinations converge and survive save restoration including pending delays without duplicate unlocks", () => {
    const { work, story } = result();
    expect(testStory(story, work)).toEqual([]);
    expect(story.tests).toHaveLength(18);
    for (const path of story.tests) {
      let s = dispatch(work, initialRuntime(work), "start");
      for (const step of path.steps) {
        if (step.choose) s = choose(work, s, step.choose);
        if (step.advanceMs) s = advance(work, s, step.advanceMs);
        if (step.event) {
          const item = work.data.wechat
            .concat(work.data.notes)
            .find((i) => i.id === step.target)!;
          expect(visible(item, s)).toBe(true);
          s = dispatch(work, s, step.event, step.target);
        }
        s = restoreSave(work, JSON.parse(JSON.stringify(s))) as Runtime;
        expect(s).not.toBeNull();
      }
      expect(s.variables["chapter.chapter-01-good-weather.completed"]).toBe(
        true,
      );
      expect(s.variables["ch01.expression"]).not.toBe("unselected");
      expect(new Set(s.unlocked).size).toBe(s.unlocked.length);
      const again = dispatch(work, s, "read", "ch01-note-ending");
      expect(again.endings).toEqual(s.endings);
      expect(again.notifications).toEqual(s.notifications);
      expect(
        work.data.wechat.filter((i) => i.kind === "post" && visible(i, s)),
      ).toHaveLength(16);
    }
  });
  it("reading the weather post before chatting neither skips scenes nor blocks later progress", () => {
    const { work, story } = result();
    let s = dispatch(work, initialRuntime(work), "start");
    s = dispatch(work, s, "read", "ch01-moment-forward-weather");
    expect(s.unlocked).not.toContain("ch01-note-first-day");
    for (const step of story.tests[0].steps) {
      if (step.target === "ch01-moment-forward-weather") break;
      if (step.choose) s = choose(work, s, step.choose);
      if (step.advanceMs) s = advance(work, s, step.advanceMs);
      if (step.event) s = dispatch(work, s, step.event, step.target);
    }
    expect(s.unlocked).toContain("ch01-note-first-day");
    expect(s.unlocked).not.toContain("ch01-z-01");
  });
});
