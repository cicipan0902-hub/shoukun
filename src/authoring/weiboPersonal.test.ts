import { foundationExtensions } from "./testFixture";
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "../../stories/foundation/chapter-01.json";
import project from "../../stories/foundation/project.json";
import cast from "../../stories/foundation/characters.json";
import assets from "../../stories/foundation/assets.json";
import interactions from "../../stories/foundation/interactions.json";
import { compileProject } from "./compile";
import { initialRuntime } from "../schema";
import { dispatch, visible } from "../engine";
import { restoreSave } from "../saveRestore";
import { CampusWeiboSkin, resolveWeiboItems } from "../skins/CommunitySkins";
import { CampusPlayContext } from "../personalization/CampusPlayContext";


import type { SkinProps } from "../AppSkins";
import personal from "../../stories/foundation/weibo-personal.json";
import entertainment from "../../stories/foundation/weibo-entertainment.json";
const build = (media: Record<string, string> = {}) => compileProject(source, project, cast, assets, foundationExtensions(), media, interactions);
describe("independent personal Weibo and local entertainment topics", () => {
  it("configures three to four posts per role and hides later experiences before their chapter", () => {
    const { work } = build(), state = initialRuntime(work);
    for (const id of ["owner", "star", "junhao", "brother", "zuohang", "jiaqi", "lifei"]) {
      const posts = work.data.weibo.filter((i) => i.meta.personal === "true" && i.meta.type === "post" && i.meta.accountId === id);
      expect(posts.length).toBeGreaterThanOrEqual(3);expect(posts.length).toBeLessThanOrEqual(5);
    }
    const late = work.data.weibo.find((i) => i.id === "personal-star-04")!;
    expect(visible(late, state)).toBe(false);
    state.variables["chapter.chapter-07-pending.completed"] = true;
    expect(visible(late, state)).toBe(true);
    expect(personal.content.weibo.every((i) => !i.comments?.length)).toBe(true);
  });
  it("uses contact identity and player identity, without establishing follows or WeChat friendships", () => {
    const { work } = build();let state = dispatch(work, initialRuntime(work), "start");
    const contacts = work.data.contacts.map((c) => c.id === "star-card" ? { ...c, title: "微信里改的昵称", avatar: "same-avatar" } : c);
    const items = resolveWeiboItems(work.data.weibo, contacts, "我的昵称", "my-avatar");
    for (const item of items.filter((i) => (i.meta.characterRef || i.meta.accountId) === "star")) { expect(item.sender).toBe("微信里改的昵称");expect(item.avatar).toBe("same-avatar"); }
    expect(items.find((i) => i.id === "community-account-owner")?.title).toBe("我的昵称");
    expect(items.find((i) => i.id === "personal-owner-01")?.avatar).toBe("my-avatar");
    const before = state.variables["friend.star.state"];
    state = dispatch(work, state, "read", "personal-star-01");
    expect(state.variables["friend.star.state"]).toBe(before);
    expect(Object.keys(state.ui?.weibo || {}).some((k) => k.startsWith("followed-"))).toBe(false);
    state.ui = { weibo: { "followed-张泽禹": true, "saved-personal-owner-01": true } };
    state = restoreSave(work, JSON.parse(JSON.stringify(state)))!;
    expect(state.ui?.weibo?.["followed-张泽禹"]).toBe(true);
  });
  it("keeps six candidate topics, source fields and explicit simulated comments without invented heat", () => {
    const topics = entertainment.content.weibo.filter((i) => i.meta.type === "topic");
    expect(topics).toHaveLength(6);
    for (const item of entertainment.content.weibo) {
      expect(item.meta.verificationStatus).toBe("pending");expect(item.meta.sourceUrl).toBe("");
      expect(item.meta.sourceNote).toBeTruthy();expect(item.meta.imagePath).toContain("assets/weibo/entertainment/");
      expect(item.meta).not.toHaveProperty("rank");expect(item.meta).not.toHaveProperty("views");
      if (item.meta.type === "post") for (const comment of item.comments!) expect(comment).toContain("虚构示例");
    }
  });
  it("renders separate feeds, searchable profiles, topic details and persistent interactions", () => {
    const { work } = build(), state = initialRuntime(work), noop = () => {};
    const render = (ui: NonNullable<SkinProps["ui"]>) => renderToStaticMarkup(createElement(CampusPlayContext.Provider, { value: { work, state, read: noop, choose: noop, navigate: noop, event: noop } }, createElement(CampusWeiboSkin, { name: "微博", owner: "试玩", items: work.data.weibo.filter((i) => visible(i, state)), creator: false, onRead: noop, onItem: noop, onAdd: noop, onBack: noop, onThread: noop, thread: "", ui, onUi: noop })));
    expect(render({})).toContain("八小节");expect(render({})).not.toContain("#TOP都穿长裤不告诉朱志鑫#");
    expect(render({ "community-section": "个人微博", "community-query": "朱志鑫" })).toContain("查找角色主页");
    const profile = render({ "community-account": "star" });expect(profile).toContain("台灯");expect(profile).not.toContain("娱乐候选话题");
    const topic = render({ "community-topic": "ent-topic-apology" });expect(topic).toContain("待核实");expect(topic).toContain("游戏内模拟讨论");expect(topic).toContain("返回话题列表");
    expect(render({ "community-section": "关注" })).toContain("还没有关注账号");
    expect(render({ "community-section": "收藏", "saved-personal-owner-01": true })).toContain("改了三遍的志愿表");
    const detail = render({ "community-post": "ent-post-luelue", "replies-ent-post-luelue": ["试玩：自己的本地评论"] });expect(detail).toContain("自己的本地评论");expect(detail).toContain("虚构示例");
    expect(render({ "community-section": "校园论坛" })).toContain("最后一道大题到底几分");
  });
});
