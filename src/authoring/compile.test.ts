import { describe, it, expect } from "vitest";
import source from "../../stories/foundation/story.json";
import project from "../../stories/foundation/project-demo.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import extra from "../../stories/foundation/extensions.json";
import { compileProject } from "./compile";
import { testStory } from "../story-engine/testStory";
import { dispatch, choose } from "../engine";
import { initialRuntime } from "../schema";
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=";
const compile = () => compileProject(source, project, cast, assets, extra);
describe("additive authoring configuration", () => {
  it("preserves all existing story IDs and passing paths, adds a separately testable optional game", () => {
    const before = structuredClone(source),
      r = compile();
    expect(source).toEqual(before);
    expect(r.cast).toHaveLength(7);
    expect(r.cast.map((c) => c.name)).toEqual(expect.arrayContaining(["礼菲", "朱家琪"]));
    expect(r.story.revision).toBe(source.revision);
    expect(r.work.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(source.events.map((n) => n.id)),
    );
    expect(testStory(r.story, r.work)).toEqual([]);
    expect(r.story.tests).toHaveLength(9);
    expect(String(r.work.variables["author.cast"])).not.toContain(
      "authorNotes",
    );
    expect(String(r.work.variables["author.cast"])).not.toContain("赌博");
  });
  it("one avatar mapping reaches private/group messages, Moments and contact cards", () => {
    const r = compileProject(source, project, cast, assets, extra, {
      "avatar-zhuzhixin": pixel,
      "group-after-class": pixel,
    });
    expect(
      r.work.data.wechat.find((i) => i.id === "wx-invitation")?.avatar,
    ).toBe(pixel);
    expect(r.work.data.wechat.find((i) => i.id === "group-star")?.avatar).toBe(
      pixel,
    );
    expect(r.work.data.wechat.find((i) => i.id === "moment-zhu")?.avatar).toBe(
      pixel,
    );
    expect(r.work.data.contacts.find((i) => i.id === "star-card")?.avatar).toBe(
      pixel,
    );
    expect(
      r.work.data.wechat.find((i) => i.id === "group-star")?.meta.groupAvatar,
    ).toBe(pixel);
  });
  it("supports large inline group avatar metadata without relaxing ordinary metadata limits", () => {
    const media = pixel + " ".repeat(10000);
    const r = compileProject(source, project, cast, assets, extra, {
      "group-after-class": media,
    });
    expect(
      r.work.data.wechat.find((i) => i.id === "group-star")?.meta
        .groupAvatarRef,
    ).toBe("group-after-class");
    expect(
      JSON.parse(String(r.work.variables["author.groupAvatars"]))[
        "group-after-class"
      ],
    ).toBe(media);
    const bad = structuredClone(source);
    bad.chats[0].messages[0] = {
      ...bad.chats[0].messages[0],
      meta: { custom: "x".repeat(2001) },
    } as (typeof bad.chats)[0]["messages"][0];
    expect(() => compileProject(bad, project, cast, assets, extra)).toThrow();
  });
  it("rejects unregistered assets, unsupported games, dangling characters and code-like extra fields", () => {
    const p = structuredClone(project);
    p.bindings[0].assetId = "unknown";
    expect(() => compileProject(source, p, cast, assets, extra)).toThrow(
      "不存在的素材",
    );
    expect(() =>
      compileProject(
        source,
        {
          ...project,
          minigames: [
            { ...project.minigames[0], type: "javascript", code: "alert(1)" },
          ],
        },
        cast,
        assets,
        extra,
      ),
    ).toThrow();
    const c = structuredClone(cast);
    c[0].relationships[0].characterId = "unknown";
    expect(() => compileProject(source, project, c, assets, extra)).toThrow(
      "关系引用不存在",
    );
    expect(() =>
      compileProject(source, project, cast, assets, {
        ...extra,
        scripts: ["alert(1)"],
      }),
    ).toThrow();
  });
  it("wrong password is rejected in real path replay; correct completion is once-only and optional", () => {
    const r = compile(),
      t = structuredClone(r.story);
    const last = t.tests.at(-1)!;
    last.steps.find((s) => s.target === "v02-clue-box")!.password = "wrong";
    expect(testStory(t, r.work).join()).toContain("密码不正确");
    let s = dispatch(r.work, initialRuntime(r.work), "start");
    s = dispatch(r.work, s, "read", "photo-light");
    expect(s.unlocked).toContain("v02-clue-box");
    s = dispatch(r.work, s, "read", "v02-clue-box");
    expect(s.variables["minigame.clue-demo.completed"]).toBe(true);
    expect(s.unlocked).toContain("v02-game-reward");
    const count = s.notifications.length;
    s = dispatch(r.work, s, "read", "v02-clue-box");
    expect(s.notifications).toHaveLength(count);
    expect(choose(r.work, s, "not-an-option")).toEqual(s);
  });
  it("preserves embedded legacy images when replacement material is still a placeholder", () => {
    const raw = structuredClone(source);
    Object.assign(raw.content.photos[0], { media: pixel });
    const result = compileProject(raw, project, cast, assets, extra);
    expect(
      result.work.data.photos.find((i) => i.id === "photo-light")?.media,
    ).toBe(pixel);
  });
  it("registers a new cast member without requiring duplicate contact configuration", () => {
    const people = structuredClone(cast);
    people.push({
      ...people[1],
      id: "new_friend",
      storyId: "new_friend",
      name: "新同学",
      wechat: { ...people[1].wechat, nickname: "新同学" },
      avatarAssetId: "avatar-owner",
      relationships: [],
    });
    const result = compileProject(source, project, people, assets, extra);
    expect(
      result.work.data.contacts.some((i) => i.id === "new_friend-card"),
    ).toBe(true);
  });
});
