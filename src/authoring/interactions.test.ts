import { foundationExtensions, foundationPathCount } from "./testFixture";
import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime, type Runtime } from "../schema";
import { dispatch, advance, choose, visible } from "../engine";
import { testStory } from "../story-engine/testStory";
import { restoreSave } from "../saveRestore";
import { chapterGuide } from "../personalization/storyGuide";
import {
  canPrivateChat,
  contactAllowed,
  chatItemAllowed,
  replyOptions,
  pendingChat,
} from "../personalization/chatRuntime";
const build = (config: unknown = interactions, media: Record<string, string> = {}) =>
  compileProject(
    source,
    project,
    cast,
    assets,
    foundationExtensions(),
    media,
    config,
  );
function step(
  work: ReturnType<typeof build>["work"],
  s: Runtime,
  t: { choose?: string; advanceMs?: number; event?: string; target?: string },
) {
  if (t.choose) s = choose(work, s, t.choose);
  if (t.advanceMs) s = advance(work, s, t.advanceMs);
  if (t.event) s = dispatch(work, s, t.event, t.target);
  return s;
}
describe("reusable choice conversations and friendship progression", () => {
  it("retains every first chapter path and all 64 second chapter combinations", () => {
    const { work, story } = build();
    expect(story.tests).toHaveLength(foundationPathCount());
    expect(testStory(story, work)).toEqual([]);
    for (const path of story.tests.slice(18, 82)) {
      let state = dispatch(work, initialRuntime(work), "start");
      for (const t of path.steps) {
        if (t.event === "read") {
          const item = work.data.wechat.find((i) => i.id === t.target);
          if (item) expect(chatItemAllowed(work, state, item)).toBe(true);
        }
        state = step(work, state, t);
        state = restoreSave(work, JSON.parse(JSON.stringify(state)))!;
        expect(state).not.toBeNull();
      }
      expect(state.variables["chapter.chapter-02-small-crush.completed"]).toBe(
        true,
      );
      expect(state.variables["friend.junhao.state"]).toBe("accepted");
      expect(state.variables["friend.star.state"]).toBe("met");
      expect(new Set(state.unlocked).size).toBe(state.unlocked.length);
      expect(state.variables["chapter.next"]).toBe("chapter-03-pending");
    }
  }, 30000);
  it("initially exposes only brother and Zuo, and hides nonfriend Moments until friendship is accepted", () => {
    const { work } = build(),
      s = dispatch(work, initialRuntime(work), "start");
    expect(
      work.data.contacts
        .filter((i) => contactAllowed(work, s, i))
        .map((i) => i.id)
        .sort(),
    ).toEqual(["brother-card", "zuohang-card"]);
    expect(canPrivateChat(work, s, "star")).toBe(false);
    expect(canPrivateChat(work, s, "junhao")).toBe(false);
    expect(
      chatItemAllowed(
        work,
        s,
        work.data.wechat.find((i) => i.id === "moment-zhu-01")!,
      ),
    ).toBe(false);
    const accepted = { ...s, variables: { ...s.variables, "friend.star.state": "accepted" } };
    expect(chatItemAllowed(work, accepted, work.data.wechat.find((i) => i.id === "moment-zhu-01")!)).toBe(true);
    expect(work.data.wechat.filter((i) => i.kind === "post" && visible(i, s) && chatItemAllowed(work, s, i))).toHaveLength(10);
    expect(chatItemAllowed(work, s, work.data.wechat.find((i) => i.id === "ch01-moment-forward-weather")!)).toBe(true);
    const forged = { ...s, unlocked: [...s.unlocked, "ch02-star-01"] };
    expect(
      chatItemAllowed(
        work,
        forged,
        work.data.wechat.find((i) => i.id === "ch02-star-01")!,
      ),
    ).toBe(false);
    const rejected = dispatch(work, s, "friendAccept", "ch02-junhao-request");
    expect(rejected.variables["friend.junhao.state"]).toBe("unknown");
  });
  it("keeps old weather-read saves valid and points new chapter 2 readers straight to Moments", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    s = dispatch(work, s, "read", "moment-zhu-01");
    for (const t of story.tests[0].steps) {
      if (t.target === "ch01-moment-forward-weather") break;
      s = step(work, s, t);
    }
    expect(s.unlocked).toContain("ch01-note-first-day");
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    expect(chatItemAllowed(work, s, work.data.wechat.find((i) => i.id === "moment-zhu-01")!)).toBe(false);
    for (const t of story.tests[18].steps) {
      if (t.target === "ch02-moment-activity") break;
      s = step(work, s, t);
    }
    expect(chapterGuide(work, s)?.view).toBe("moments");
    const recruitment = work.data.wechat.find((i) => i.id === "ch02-moment-activity")!;
    expect(visible(recruitment, s) && chatItemAllowed(work, s, recruitment)).toBe(true);
    s = dispatch(work, s, "read", recruitment.id);
    expect(s.unlocked).toContain("ch02-ceremony-photo");
  });
  it("binds supplied photos and captioned stickers without changing any existing queue IDs", () => {
    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=";
    const { work, story } = build(interactions, Object.fromEntries(assets.assets.filter((a) => a.category !== "audio").map((a) => [a.id, pixel])));
    const photo = work.data.photos.find((i) => i.id === "ch02-ceremony-photo")!;
    expect(photo.media).toBe(pixel);
    expect(photo.title).toBe("开学典礼那天");
    expect(photo.body).not.toContain("占位");
    const stickers = work.data.wechat.filter((i) => i.meta.imageCaption === "true");
    expect(stickers).toHaveLength(5);
    expect(stickers.every((i) => i.kind === "image" && i.media === pixel && !!i.body)).toBe(true);
    expect(work.nodes.some((n) => n.id === "flow-ch02-group-talk-0")).toBe(true);
    let s = dispatch(work, initialRuntime(work), "start");
    for (const t of story.tests[18].steps) s = step(work, s, t);
    expect(s.variables["chapter.chapter-02-small-crush.completed"]).toBe(true);
    expect(s.unlocked).toContain("ch02-activity-11");
    expect(s.unlocked.filter((id) => id === "ch02-activity-11")).toHaveLength(1);
  });
  it("paces messages, retains scheduled replies, records a choice once and prevents resubmission", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    for (const t of story.tests[0].steps) s = step(work, s, t);
    s = dispatch(work, s, "chapterStart", "chapter-02-small-crush");
    expect(pendingChat(work, s, "张泽禹")).toBe(true);
    expect(
      visible(
        work.data.wechat.find((i) => i.id === "ch02-brother-01")!,
        s,
      ),
    ).toBe(false);
    s = advance(work, s, 1100);
    expect(
      visible(
        work.data.wechat.find((i) => i.id === "ch02-brother-01")!,
        s,
      ),
    ).toBe(true);
    expect(
      visible(
        work.data.wechat.find((i) => i.id === "ch02-brother-02")!,
        s,
      ),
    ).toBe(false);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = advance(work, s, 10000);
    expect(replyOptions(work, s, "张泽禹")).toHaveLength(4);
    expect(replyOptions(work, s, "左航")).toHaveLength(0);
    s = choose(work, s, "ch02-secret-deny");
    const again = choose(work, s, "ch02-secret-vague");
    expect(again).toEqual(s);
    s = advance(work, s, 60000);
    expect(s.variables["choice.ch02-secret"]).toBe("ch02-secret-deny");
    expect(
      s.unlocked.filter((id) => id === "ch02-secret-deny-message"),
    ).toHaveLength(1);
    const startAgain = dispatch(
      work,
      s,
      "chapterStart",
      "chapter-02-small-crush",
    );
    expect(startAgain.unlocked).toEqual(s.unlocked);
  });
  it("accepts Junhao only after his request and keeps group history after accepting", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    for (const t of story.tests[18].steps) {
      if (t.event === "friendAccept") break;
      s = step(work, s, t);
    }
    expect(s.variables["friend.junhao.state"]).toBe("requested");
    expect(canPrivateChat(work, s, "junhao")).toBe(false);
    const history = s.unlocked.filter((id) => id.startsWith("ch02-activity-"));
    expect(history.length).toBeGreaterThan(5);
    s = dispatch(work, s, "friendAccept", "ch02-junhao-request");
    expect(canPrivateChat(work, s, "junhao")).toBe(true);
    expect(s.unlocked).toEqual(expect.arrayContaining(history));
    const repeated = dispatch(work, s, "friendAccept", "ch02-junhao-request");
    expect(repeated.scheduled).toEqual(s.scheduled);
    expect(repeated.notifications).toEqual(s.notifications);
  });
  it("keeps Zhu optional: a configured outgoing application waits and then unlocks his private chat", () => {
    const { work, story } = build();
    let s = dispatch(work, initialRuntime(work), "start");
    for (const t of story.tests[18].steps) s = step(work, s, t);
    expect(canPrivateChat(work, s, "star")).toBe(false);
    expect(
      dispatch(work, s, "friendRequest", "ch02-star-request").variables[
        "friend.star.state"
      ],
    ).toBe("met");
    s = { ...s, variables: { ...s.variables, "ch02.addZhuAtEnd": true } };
    s = dispatch(work, s, "friendRequest", "ch02-star-request");
    expect(s.variables["friend.star.state"]).toBe("requested");
    expect(canPrivateChat(work, s, "star")).toBe(false);
    s = restoreSave(work, JSON.parse(JSON.stringify(s)))!;
    s = advance(work, s, 60000);
    expect(canPrivateChat(work, s, "star")).toBe(true);
    expect(
      visible(
        work.data.wechat.find((i) => i.id === "ch02-star-01")!,
        s,
      ),
    ).toBe(true);
  });
  it("rejects executable/unregistered flow data and preserves proven legacy private friendships", () => {
    expect(() => build({ ...interactions, script: "run()" })).toThrow();
    const bad = structuredClone(interactions);
    bad.flows[0].steps[0] = { message: "missing-message" };
    expect(() => build(bad)).toThrow();
    const { work } = build();
    const old = initialRuntime(work);
    delete old.variables["friend.star.state"];
    old.read.push("ch02-star-01");
    expect(restoreSave(work, old)?.variables["friend.star.state"]).toBe(
      "accepted",
    );
  });
});
