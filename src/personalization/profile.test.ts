import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/story.json";
import { compileStory } from "../story-engine/compiler";
import { testStory } from "../story-engine/testStory";
import { dispatch, advance, choose } from "../engine";
import { initialRuntime } from "../schema";
import { newRunId, personalizeWork, readProfile } from "./profile";
const profile = {
  runId: "b3b84be1-f0e3-461a-868a-47985904ae97",
  playerName: "小雨$&",
  starName: "林星",
  playerClass: "高一（3）班",
  temperament: "活泼，有点小倔强" as const,
};
describe("personalized fan story", () => {
  it("replays every authored reply, ending and declined-call path", () => {
    const { story, work } = compileStory(source);
    expect(story.tests).toHaveLength(8);
    expect(testStory(story, work)).toEqual([]);
  });
  it("substitutes literal names across apps and calls without mutating story IDs", () => {
    const { work } = compileStory(source);
    const original = structuredClone(work);
    const result = personalizeWork(work, profile);
    expect(work).toEqual(original);
    expect(result.phone.owner).toBe("小雨$&");
    expect(
      result.data.wechat.find((i) => i.id === "wx-invitation")?.body,
    ).toContain("小雨$&");
    expect(result.data.wechat.find((i) => i.id === "moment-zhu")?.sender).toBe(
      "林星",
    );
    expect(
      result.nodes.find((n) => n.id === "call-delay")?.actions[0].value,
    ).toBe("林星");
    expect(result.nodes.map((n) => n.id)).toEqual(work.nodes.map((n) => n.id));
    expect(result.id).not.toBe(work.id);
    expect(personalizeWork(work, profile).id).toBe(result.id);
    expect(
      personalizeWork(work, { ...profile, runId: newRunId() }).id,
    ).not.toBe(result.id);
  });
  it("personalized choices unlock the right replies and end with the player name", () => {
    const w = personalizeWork(compileStory(source).work, profile);
    let s = dispatch(w, initialRuntime(w), "start");
    for (const id of ["wb-aftershow", "photo-light", "wx-invitation"])
      s = dispatch(w, s, "read", id);
    s = choose(w, s, "reply-shy");
    expect(s.unlocked).toContain("wx-answer-shy");
    expect(s.unlocked).not.toContain("wx-answer-warm");
    s = advance(w, s, 6000);
    expect(s.incomingCall?.caller).toBe("林星");
    s = dispatch(w, { ...s, incomingCall: null }, "callDeclined", "call-star");
    expect(s.unlocked).toContain("ig-night");
    s = dispatch(w, s, "read", "ig-night");
    s = choose(w, s, "ending-save");
    expect(s.endings[0]).toContain("林星");
    expect(s.endings[0]).not.toContain("{{");
  });
  it("recovers corrupt or outdated browser profiles without crashing", () => {
    expect(readProfile("broken")).toBeNull();
    expect(
      readProfile(JSON.stringify({ ...profile, runId: "bad" })),
    ).toBeNull();
    expect(
      readProfile(JSON.stringify({ ...profile, playerName: "   " })),
    ).toBeNull();
    expect(readProfile(JSON.stringify(profile))).toEqual(profile);
  });
  it("creates run IDs on HTTP LAN pages without randomUUID", () => {
    const id = newRunId();
    expect(readProfile(JSON.stringify({ ...profile, runId: id }))?.runId).toBe(
      id,
    );
    expect(newRunId()).not.toBe(id);
  });
});
