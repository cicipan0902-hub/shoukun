import { foundationExtensions } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import seventh from "../../stories/foundation/chapter-07.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime } from "../schema";
import { dispatch, advance, choose } from "../engine";
import { restoreSave } from "../saveRestore";
import { BasketballGame } from "../personalization/BasketballGame";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
import { activityDocument } from "../personalization/activityDocuments";
import { launch, stepBall } from "../vendor/hoops88/physics";
import type { Runtime, Work } from "../schema";
const build = (media: Record<string, string> = {}) => compileProject(source, project, cast, assets, foundationExtensions(), media, interactions);
type Step = { event?: string; target?: string; choose?: string; advanceMs?: number };
function apply(w: Work, s: Runtime, step: Step) {
  if (step.event) s = dispatch(w, s, step.event, step.target);
  if (step.choose) s = choose(w, s, step.choose);
  if (step.advanceMs) s = advance(w, s, step.advanceMs);
  return s;
}
function ready(w: Work) {
  let s = dispatch(w, initialRuntime(w), "start");
  for (const step of seventh.tests[0].steps) {
    if (step.event === "basketballShot") break;
    s = apply(w, s, step);
  }
  return s;
}
describe("chapter seven / five shots", () => {
  it("has genuinely reachable baskets and misses using the adapted physics", () => {
    const results: boolean[] = [];
    for (let power = 0; power <= 1; power += 0.01) {
      const b = launch(power);for (let i = 0; i < 660 && !b.done; i++) stepBall(b, 1 / 120);
      expect(b.done).toBe(true);results.push(b.scored);
    }
    expect(results).toContain(true);expect(results).toContain(false);
    // Descending through the rim counts; the same ball cannot score twice.
    const b = { x: 340, y: 169, vx: 0, vy: 180, scored: false, age: 0, done: false };
    stepBall(b, 1 / 120);expect(b.scored).toBe(true);
    stepBall(b, 1 / 120);expect(b.scored).toBe(true);
    const ascending = { ...b, y: 172, vy: -400, scored: false };
    stepBall(ascending, 1 / 120);expect(ascending.scored).toBe(false);
  });
  it("locks the chapter until chapter six and hides the court until signup/practice", () => {
    const { work } = build();let s = dispatch(work, initialRuntime(work), "start");
    s = dispatch(work, s, "chapterStart", "chapter-07-pending");
    expect(s.variables["chapter.chapter-07-pending.started"]).toBe(false);
    s = dispatch(work, s, "basketballShot", "ch07-basketball.0.0.hit");
    expect(s.variables["ch07-basketball.shots"]).toBe(0);
    expect(activityDocument(work, s, work.data.files.find((x) => x.id === "ch07-basketball")!)).toBeNull();
  });
  it("restores partial rounds, blocks duplicate shots/results, permits reset and saves zero", () => {
    const { work } = build();let s = ready(work);
    s = dispatch(work, s, "basketballShot", "ch07-basketball.0.0.hit");
    s = dispatch(work, s, "basketballShot", "ch07-basketball.0.0.hit");
    expect(s.variables["ch07-basketball.shots"]).toBe(1);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    expect(s.variables["ch07-basketball.hits"]).toBe(1);
    s = dispatch(work, s, "basketballFinish", "ch07-basketball.1");
    expect(s.variables["ch07-basketball.settled"]).toBe(false);
    s = dispatch(work, s, "basketballReset", "ch07-basketball");
    expect(s.variables["ch07-basketball.shots"]).toBe(0);
    // Repeating the same path after reset must still count (repeatable checkpoint events).
    s = dispatch(work, s, "basketballShot", "ch07-basketball.0.0.hit");
    expect(s.variables["ch07-basketball.hits"]).toBe(1);
    s = dispatch(work, s, "basketballReset", "ch07-basketball");
    for (let n = 0; n < 5; n++) s = dispatch(work, s, "basketballShot", `ch07-basketball.${n}.0.miss`);
    s = dispatch(work, s, "basketballFinish", "ch07-basketball.0");
    const queued = s.scheduled;
    s = dispatch(work, s, "basketballFinish", "ch07-basketball.5");
    s = dispatch(work, s, "basketballFinish", "ch07-basketball.0");
    s = dispatch(work, s, "basketballReset", "ch07-basketball");
    expect(s.scheduled).toEqual(queued);expect(s.variables["ch07.score"]).toBe(0);
    expect(s.variables["ch07-basketball.shots"]).toBe(5);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    expect(s.variables["ch07-basketball.settled"]).toBe(true);
  });
  it("all six scores and both reply routes finish, keep prior chapters and do not add Zhu", () => {
    const { work } = build();
    for (const route of seventh.tests) {
      let s = dispatch(work, initialRuntime(work), "start");
      for (const step of route.steps) {
        s = apply(work, s, step);
        if (step.event === "basketballShot" || step.choose) s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
      }
      const score = Number(route.name.match(/-(\d)球/)![1]);
      expect(s.variables["ch07.score"]).toBe(score);
      expect(s.variables["ch07.tier"]).toBe(score < 2 ? "low" : score < 4 ? "mid" : "high");
      expect(s.variables["chapter.chapter-07-pending.completed"]).toBe(true);
      expect(s.variables["chapter.chapter-06-pending.completed"]).toBe(true);
      expect(s.variables["friend.star.state"]).not.toBe("accepted");
      expect(s.endings).toContain(route.ending);
      expect(s.unlocked).toContain(`ch07-score-${score < 2 ? "low" : score < 4 ? "mid" : "high"}-2`);
    }
  });
  it("renders usable controls for both unfinished and settled rounds", () => {
    const { work } = build(), s = ready(work);
    const item = work.data.files.find((x) => x.id === "ch07-basketball")!, doc = activityDocument(work, s, item)!;
    const noop = () => {};
    const render = (state: Runtime) => renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(BasketballGame, { item, document: doc, back: noop })));
    expect(render(s)).toContain("按住蓄力");expect(render(s)).toContain("重新开始五球");
    s.variables["ch07-basketball.shots"] = 5;expect(render(s)).toContain("采用本次成绩");
    s.variables["ch07-basketball.settled"] = true;expect(render(s)).toContain("回群继续剧情");expect(render(s)).not.toContain("重新开始五球");
  });
});
