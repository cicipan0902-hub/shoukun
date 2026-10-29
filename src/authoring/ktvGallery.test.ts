import { foundationExtensions } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import sixth from "../../stories/foundation/chapter-06.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { dispatch, advance, choose } from "../engine";
import { initialRuntime, safeMedia, type Runtime } from "../schema";
import { restoreSave } from "../saveRestore";
import { activityDocument } from "../personalization/activityDocuments";
import { ActivityDocumentView } from "../personalization/ActivityDocumentView";
import { CampusPlayContext } from "../personalization/CampusPlayContext";
const people = ["star", "junhao", "brother", "zuohang"];
const media = Object.fromEntries(people.map((p, index) => [`video-ktv-${p}`, `./author-media/${String(index + 1).repeat(64)}.${index < 2 ? "mov" : "mp4"}`]));
function build() { return compileProject(source, project, cast, assets, foundationExtensions(), media, interactions); }
type Step = { choose?: string; advanceMs?: number; event?: string; target?: string };
function step(work: ReturnType<typeof build>["work"], state: Runtime, input: Step) {
  if (input.choose) state = choose(work, state, input.choose);
  if (input.advanceMs) state = advance(work, state, input.advanceMs);
  if (input.event) state = dispatch(work, state, input.event, input.target);
  return state;
}
describe("KTV singer gallery", () => {
  it("shows four choices without loading or auto-playing four videos", () => {
    const { work } = build();
    let state = dispatch(work, initialRuntime(work), "start");
    for (const s of sixth.tests.find((t) => t.name.includes("-ktv-"))!.steps) {
      if (s.target === "ch06-ktv-clip") break;
      state = step(work, state, s);
    }
    const item = work.data.files.find((i) => i.id === "ch06-ktv-clip")!;
    const doc = activityDocument(work, state, item)!;
    expect(doc.kind).toBe("media-gallery");
    expect(doc.entries.map((e) => e.characterId)).toEqual(people);
    for (const person of people) expect(safeMedia(work.data.files.find((i) => i.id === `ch06-ktv-${person}`)!.media)).toBe(media[`video-ktv-${person}`]);
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(ActivityDocumentView, { item, document: doc, back: noop })));
    for (const name of ["朱志鑫", "张峻豪", "张泽禹", "左航"]) expect(html).toContain(name);
    expect(html).toContain("选择演唱者");
    expect(html).toContain("回群继续真心话");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("autoplay");
  });
  it("keeps watched flags after restore and permits continuation without watching every singer", () => {
    const { work } = build();
    for (const route of sixth.tests.filter((t) => t.name.includes("-ktv-"))) {
      let state = dispatch(work, initialRuntime(work), "start");
      for (const s of route.steps) {
        if (s.target?.startsWith("ch06-ktv-clip.ch06-ktv-")) continue;
        if (s.target === "ch06-ktv-clip.continue") {
          state = dispatch(work, state, "documentInspect", "ch06-ktv-clip.ch06-ktv-star");
          const scheduled = state.scheduled;
          state = dispatch(work, state, "documentInspect", "ch06-ktv-clip.ch06-ktv-star");
          expect(state.scheduled).toEqual(scheduled);
          state = restoreSave(work, JSON.parse(JSON.stringify(state)))!;
          expect(state.variables["document.ch06-ktv-clip.ch06-ktv-star.read"]).toBe(true);
          expect(state.variables["document.ch06-ktv-clip.ch06-ktv-junhao.read"]).not.toBe(true);
        }
        state = step(work, state, s);
      }
      expect(state.variables["chapter.chapter-06-pending.completed"]).toBe(true);
    }
  });
  it("does not unlock KTV inspection on the restaurant route", () => {
    const { work } = build();
    let state = dispatch(work, initialRuntime(work), "start");
    for (const s of sixth.tests.find((t) => t.name.includes("-restaurant-"))!.steps) state = step(work, state, s);
    state = dispatch(work, state, "documentInspect", "ch06-ktv-clip.ch06-ktv-star");
    expect(state.variables["document.ch06-ktv-clip.ch06-ktv-star.read"]).not.toBe(true);
    expect(state.unlocked).not.toContain("ch06-ktv-clip");
    expect(safeMedia(`./author-media/${"a".repeat(64)}.mov`)).not.toBe("");
    expect(safeMedia("./author-media/../../secret.mov")).toBe("");
  });
});
