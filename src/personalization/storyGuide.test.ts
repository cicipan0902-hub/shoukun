import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import extra from "../../stories/foundation/chapter-01.extensions.json";
import project from "../../stories/foundation/project-chapter01.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import { compileProject } from "../authoring/compile";
import { initialRuntime } from "../schema";
import { dispatch, advance, choose } from "../engine";
import { chapterGuide } from "./storyGuide";
describe("player-facing chapter guidance", () => {
  it("points at an actionable visible message, waiting, choice or cross-app destination throughout every route", () => {
    const { work, story } = compileProject(source, project, cast, assets, extra);
    for (const path of story.tests) {
      let state = dispatch(work, initialRuntime(work), "start");
      expect(chapterGuide(work, state)?.messageId).toBe("ch01-b-01");
      for (const step of path.steps) {
        const guide = chapterGuide(work, state)!;
        if (step.choose) {
          expect(guide.app).toBe("wechat");
          expect(guide.title).toContain("回复");
          state = choose(work, state, step.choose);
        }
        if (step.advanceMs) state = advance(work, state, step.advanceMs);
        if (step.event) {
          if (step.target.startsWith("ch01-b-") || step.target.startsWith("ch01-expression-answer") || step.target.startsWith("ch01-z-") || step.target.startsWith("ch01-zuo-answer")) {
            expect(chapterGuide(work, state)?.messageId).toBe(step.target);
          }
          state = dispatch(work, state, step.event, step.target);
        }
      }
      expect(chapterGuide(work, state)?.title).toBe("第一章已完成");
    }
  });
  it("keeps other works and legacy previews unchanged", () => {
    const { work } = compileProject(source, project, cast, assets, extra);
    expect(chapterGuide({ ...work, id: "another-work" }, initialRuntime(work))).toBeNull();
  });
});
