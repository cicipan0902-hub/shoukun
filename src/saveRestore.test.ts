import { describe, it, expect } from "vitest";
import source from "../stories/foundation/story.json";
import { compileStory } from "./story-engine/compiler";
import { initialRuntime } from "./schema";
import { restoreSave } from "./saveRestore";
describe("same-revision save compatibility", () => {
  it("keeps choices, relationship states, unlocks and passwords while adding defaults", () => {
    const w = compileStory(source).work,
      s = initialRuntime(w);
    s.completed = ["read-photo"];
    s.unlocked = ["wx-invitation"];
    s.variables.trust = "understood";
    s.ui = { notes: { passwordUnlocks: ["v02-clue-box"] } };
    w.variables["character.zuohang.growth"] = "not-started";
    w.variables["author.cast"] = "new-avatar-map";
    s.variables["author.cast"] = "old-avatar-map";
    const restored = restoreSave(w, s)!;
    expect(restored.completed).toEqual(s.completed);
    expect(restored.variables.trust).toBe("understood");
    expect(restored.variables["character.zuohang.growth"]).toBe("not-started");
    expect(restored.variables["author.cast"]).toBe("new-avatar-map");
    expect(restored.ui?.notes.passwordUnlocks).toEqual(["v02-clue-box"]);
    expect(s.variables["author.cast"]).toBe("old-avatar-map");
  });
  it("does not silently migrate another work or revision, and rejects damaged saves", () => {
    const w = compileStory(source).work,
      s = initialRuntime(w);
    expect(restoreSave(w, { ...s, workId: "other" })).toBeNull();
    expect(restoreSave(w, { ...s, revision: w.updatedAt + 1 })).toBeNull();
    expect(restoreSave(w, { ...s, completed: "corrupt" })).toBeNull();
  });
});
