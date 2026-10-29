import { appendInteractions } from "./interactions";
import { castSchema, assetsSchema, projectSchema } from "./schema";
import {
  compileStory,
  storySchema,
  type Story,
} from "../story-engine/compiler";
import { safeMedia } from "../schema";
import { z } from "zod";
const extensionSchema = z
  .object({
    contacts: storySchema.shape.contacts.optional(),
    chats: storySchema.shape.chats.optional(),
    content: storySchema.shape.content.optional(),
    events: storySchema.shape.events.optional(),
    variables: storySchema.shape.variables.optional(),
    tests: storySchema.shape.tests.optional(),
  })
  .strict();
export function mergeExtensions(raw: unknown[]) {
  const merged: Record<string, unknown> = {
    contacts: [],
    chats: [],
    content: {},
    events: [],
    variables: {},
    tests: [],
  };
  for (const input of raw) {
    const extra = extensionSchema.parse(input);
    for (const key of ["contacts", "chats", "events", "tests"] as const)
      (merged[key] as unknown[]).push(...(extra[key] || []));
    for (const [app, items] of Object.entries(extra.content || {})) {
      const content = merged.content as Record<string, unknown[]>;
      content[app] = [...(content[app] || []), ...items];
    }
    for (const [key, value] of Object.entries(extra.variables || {})) {
      const vars = merged.variables as Record<string, unknown>;
      if (key in vars) throw Error(`扩展变量冲突: ${key}`);
      vars[key] = value;
    }
  }
  return merged;
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw Error(`${label} 存在重复 ID`);
}
export function compileProject(
  rawStory: unknown,
  rawProject: unknown,
  rawCast: unknown,
  rawAssets: unknown,
  rawExtensions: unknown,
  media: Record<string, string> = {},
  rawInteractions?: unknown,
) {
  const project = projectSchema.parse(rawProject),
    cast = castSchema.parse(rawCast),
    assets = assetsSchema.parse(rawAssets),
    extra = extensionSchema.parse(rawExtensions);
  unique(
    cast.map((c) => c.id),
    "人物",
  );
  unique(
    cast.map((c) => c.storyId),
    "人物故事引用",
  );
  unique(
    assets.assets.map((a) => a.id),
    "素材",
  );
  unique(
    project.chapters.map((c) => c.id),
    "章节",
  );
  unique(
    project.minigames.map((g) => g.id),
    "小游戏",
  );
  const assetIds = new Set(assets.assets.map((a) => a.id));
  const image = (id: string) => {
    if (!assetIds.has(id)) throw Error(`不存在的素材 ID: ${id}`);
    const value = media[id] || "";
    if (value && !safeMedia(value)) throw Error(`不安全的素材: ${id}`);
    return value;
  };
  const avatar = (id: string) => {
    const v = image(id);
    if (v && !v.startsWith("data:image/")) throw Error(`头像必须是图片: ${id}`);
    return v;
  };
  const source = storySchema.parse(rawStory),
    story: Story = structuredClone(source);
  story.contacts.push(...(extra.contacts || []));
  story.chats.push(...(extra.chats || []));
  for (const [app, items] of Object.entries(extra.content || {}))
    story.content[app] = [...(story.content[app] || []), ...items];
  story.events.push(...(extra.events || []));
  story.tests.push(...(extra.tests || []));
  for (const [key, value] of Object.entries(extra.variables || {})) {
    if (key in story.variables) throw Error(`扩展不能覆盖已有变量: ${key}`);
    story.variables[key] = value;
  }
  for (const c of cast)
    if (
      c.storyId !== "owner" &&
      !story.contacts.some((contact) => contact.id === c.storyId)
    )
      story.contacts.push({
        id: c.storyId,
        name: c.name,
        avatar: "",
        phone: "",
        bio: c.publicBio,
      });
  if (rawInteractions) appendInteractions(story, rawInteractions);
  const byStoryId = new Map(cast.map((c) => [c.storyId, c]));
  const byName = new Map(
    cast.flatMap((c) =>
      [c.name, c.wechat.nickname].map((n) => [n, c] as const),
    ),
  );
  for (const contact of source.contacts) {
    const c = byStoryId.get(contact.id);
    if (c) byName.set(contact.name, c);
  }
  for (const c of cast) {
    avatar(c.avatarAssetId);
    Object.values(c.avatarStages).forEach(avatar);
    for (const rel of c.relationships)
      if (!cast.some((r) => r.id === rel.characterId))
        throw Error(`人物关系引用不存在: ${rel.characterId}`);
    for (const [key, value] of Object.entries(c.initialStates))
      story.variables[`character.${c.id}.${key}`] ??= value;
  }
  for (const contact of story.contacts) {
    const c = byStoryId.get(contact.id);
    if (!c) continue;
    contact.avatar = avatar(c.avatarAssetId) || contact.avatar;
    contact.bio = c.publicBio;
    contact.name = c.wechat.nickname;
  }
  for (const chat of story.chats)
    for (const item of chat.messages) {
      const c = byStoryId.get(item.senderId || "");
      if (c) {
        item.avatar =
          avatar(
            c.avatarStages[item.meta?.avatarStage || ""] || c.avatarAssetId,
          ) || item.avatar;
        // WeChat resolves large shared portraits from the existing contact cards at display time.
        if (
          chat.app === "wechat" &&
          item.avatar &&
          item.avatar.length > 2000 &&
          item.avatar === avatar(c.avatarAssetId)
        ) {
          item.avatar = "";
          item.meta = { ...item.meta, sharedAvatar: "true" };
        }
        item.meta = { ...item.meta, characterId: c.id };
      }
    }
  for (const [app, items] of Object.entries(story.content))
    for (const item of items) {
      const c = byName.get(item.sender || "");
      if (c) {
        item.avatar =
          avatar(
            c.avatarStages[item.meta?.avatarStage || ""] || c.avatarAssetId,
          ) || item.avatar;
        if (
          app === "wechat" &&
          item.avatar &&
          item.avatar.length > 2000 &&
          item.avatar === avatar(c.avatarAssetId)
        ) {
          item.avatar = "";
          item.meta = { ...item.meta, sharedAvatar: "true" };
        }
        item.meta = { ...item.meta, characterId: c.id };
      }
    }
  const allItems = () => [
    ...story.chats.flatMap((c) => c.messages),
    ...Object.values(story.content).flat(),
  ];
  for (const binding of project.bindings) {
    const value = ["itemAvatar", "groupAvatar", "wallpaper", "appIcon"].includes(
      binding.target,
    )
      ? avatar(binding.assetId)
      : image(binding.assetId);
    if (binding.target === "appIcon") {
      if (!story.installedApps.some((app) => (typeof app === "string" ? app : app.id) === binding.targetId))
        throw Error(`图标绑定App未安装: ${binding.targetId}`);
      if (value) story.variables[`author.appIcon.${binding.targetId}`] = value;
    } else if (binding.target === "wallpaper") {
      if (value && !value.startsWith("data:image/"))
        throw Error("壁纸必须是图片");
      if (value) story.phone.wallpaper = value;
    } else if (binding.target === "groupAvatar") {
      const chat = story.chats.find((c) => c.id === binding.targetId);
      if (!chat) throw Error(`群聊不存在: ${binding.targetId}`);
      if (value.length > 2000) {
        const groups = JSON.parse(
          String(story.variables["author.groupAvatars"] || "{}"),
        );
        groups[binding.assetId] = value;
        story.variables["author.groupAvatars"] = JSON.stringify(groups);
      }
      for (const item of chat.messages)
        item.meta = {
          ...item.meta,
          groupAvatar:
            value.length > 2000 ? "" : value || item.meta?.groupAvatar || "",
          ...(value.length > 2000 ? { groupAvatarRef: binding.assetId } : {}),
        };
    } else {
      const item = allItems().find((i) => i.id === binding.targetId);
      if (!item) throw Error(`素材绑定内容不存在: ${binding.targetId}`);
      if (value) {
        if (binding.target === "itemAvatar") {
          item.avatar = value;
          if (item.meta) delete item.meta.sharedAvatar;
        } else item.media = value;
      }
    }
  }
  for (const item of allItems())
    if (item.meta?.reviewMedia === "audio" && item.media && !/^(data:(audio\/|video\/mp4;)|\.\/author-media\/[a-f0-9]{64}\.(mp4|mov)$)/.test(item.media))
      throw Error(`试听文档必须绑定音频或视频素材: ${item.id}`);
  for (const game of project.minigames) {
    const prefix = `game-${game.id}`;
    story.content.notes ??= [];
    story.content.notes.push({
      id: game.itemId,
      title: game.title,
      body: game.successText,
      password: game.password,
      hidden: true,
      kind: "note",
      meta: { minigameId: game.id, hint: game.prompt },
    } as Story["content"][string][number]);
    story.variables[`minigame.${game.id}.completed`] = false;
    story.variables[`minigame.${game.id}.result`] = "not-started";
    story.events.push({
      id: `${prefix}-start`,
      label: game.title,
      event: game.start.event,
      target: game.start.target,
      conditions: game.conditions,
      actions: [
        { type: "unlock", key: game.itemId, value: true },
        {
          type: "notification",
          key: "",
          value: `备忘录：${game.title} 已解锁。${game.prompt}`,
        },
      ],
    } as Story["events"][number]);
    story.events.push({
      id: `${prefix}-done`,
      label: `完成 ${game.title}`,
      event: "read",
      target: game.itemId,
      actions: [
        { type: "variable", key: `minigame.${game.id}.completed`, value: true },
        {
          type: "variable",
          key: `minigame.${game.id}.result`,
          value: "success",
        },
        ...game.unlockIds.map((key) => ({
          type: "unlock" as const,
          key,
          value: true,
        })),
        { type: "notification", key: "", value: `已完成：${game.title}` },
      ],
    } as Story["events"][number]);
  }
  const checked = compileStory(story);
  const itemIds = new Set(allItems().map((i) => i.id));
  const nodeIds = new Set(checked.work.nodes.map((n) => n.id));
  for (const c of cast)
    for (const id of c.contentIds)
      if (!itemIds.has(id)) throw Error(`人物关联内容不存在: ${id}`);
  for (const chapter of project.chapters) {
    if (chapter.entry.event === "read" && !itemIds.has(chapter.entry.target))
      throw Error(`章节入口内容不存在: ${chapter.entry.target}`);
    for (const condition of chapter.completeWhen) {
      const [scope, ...rest] = condition.key.split(":");
      const target = rest.join(":");
      if (["read", "unlocked"].includes(scope) && !itemIds.has(target))
        throw Error(`章节条件内容不存在: ${target}`);
      if (scope === "completed" && !nodeIds.has(target))
        throw Error(`章节条件事件不存在: ${target}`);
    }
    for (const id of chapter.characterIds)
      if (!cast.some((c) => c.id === id)) throw Error(`章节人物不存在: ${id}`);
    for (const id of chapter.eventIds)
      if (!nodeIds.has(id)) throw Error(`章节事件不存在: ${id}`);
    for (const id of chapter.next)
      if (!project.chapters.some((c) => c.id === id))
        throw Error(`后续章节不存在: ${id}`);
  }
  // Public runtime metadata excludes author-only family, identity and future plot notes.
  checked.work.variables["author.ownerAvatar"] = avatar(
    cast.find((c) => c.storyId === "owner")?.avatarAssetId ||
      cast[0].avatarAssetId,
  );
  checked.work.variables["author.cast"] = JSON.stringify(
    cast.map((c) => ({
      id: c.id,
      storyId: c.storyId,
      name: c.name,
      nickname: c.wechat.nickname,
      avatar: avatar(c.avatarAssetId),
      bio: c.publicBio,
      tags: c.tags,
      storylineId: c.storylineId,
      aiEnabled: c.aiEnabled,
    })),
  );
  checked.work.variables["author.chapters"] = JSON.stringify(project.chapters);
  checked.work.variables["author.minigames"] = JSON.stringify(
    project.minigames.map((g) => ({
      id: g.id,
      itemId: g.itemId,
      title: g.title,
      prompt: g.prompt,
    })),
  );
  checked.work.variables["author.dateLabel"] = project.dateLabel;
  checked.story.variables = { ...checked.work.variables };
  return { ...checked, project, cast, assets };
}
