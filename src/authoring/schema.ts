import { z } from "zod";
import { conditionSchema } from "../schema";
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/);
const ref = z.string().min(1);
export const characterSchema = z
  .object({
    id,
    storyId: id,
    name: ref,
    nickname: z.string(),
    persona: z.string(),
    avatarAssetId: id,
    avatarStages: z.record(z.string(), id).default({}),
    wechat: z
      .object({ nickname: ref, bio: z.string(), momentsBio: z.string() })
      .strict(),
    tags: z.array(z.string()),
    storylineId: id,
    aiEnabled: z.boolean(),
    relationships: z.array(
      z
        .object({ characterId: id, kind: ref, description: z.string() })
        .strict(),
    ),
    publicBio: z.string(),
    authorNotes: z.string(),
    placeholders: z
      .object({
        age: z.number().int().min(1).max(120).nullable(),
        grade: z.string().max(40).nullable(),
        birthday: z.string().max(40).nullable(),
        school: z.string().max(100).nullable(),
      })
      .strict(),
    contentIds: z.array(id).default([]),
    initialStates: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()]),
    ),
  })
  .strict();
export const castSchema = z.array(characterSchema).min(1);
export const assetSchema = z
  .object({
    id,
    category: z.enum([
      "characters",
      "chat-images",
      "moments",
      "gallery",
      "backgrounds",
      "events",
      "minigames",
      "audio",
    ]),
    file: z.string().nullable(),
    required: z.boolean().default(false),
    description: z.string(),
  })
  .strict();
export const assetsSchema = z
  .object({ version: z.literal(1), assets: z.array(assetSchema) })
  .strict();
export const gameSchema = z
  .object({
    id,
    type: z.literal("password"),
    title: ref,
    app: z.literal("notes"),
    itemId: id,
    prompt: ref,
    password: z.string().min(1).max(30),
    successText: ref,
    start: z.object({ event: z.literal("read"), target: id }).strict(),
    conditions: z.array(conditionSchema).default([]),
    unlockIds: z.array(id).default([]),
  })
  .strict();
export const projectSchema = z
  .object({
    version: z.literal(1),
    id,
    sourceFile: ref,
    charactersFile: ref,
    assetsFile: ref,
    extensionsFile: ref,
    interactionsFile: ref.optional(),
    additionalExtensionsFiles: z.array(ref).default([]),
    fictionNotice: ref,
    dateLabel: ref,
    chapters: z.array(
      z
        .object({
          id,
          title: ref,
          kind: z.enum(["main", "side", "hidden", "ambient", "demo"]),
          date: z.string().nullable(),
          characterIds: z.array(id),
          eventIds: z.array(id),
          entry: z.object({ event: z.string(), target: z.string() }).strict(),
          completeWhen: z.array(conditionSchema),
          completeLogic: z.enum(["all", "any"]).default("all"),
          next: z.array(id),
        })
        .strict(),
    ),
    bindings: z.array(
      z
        .object({
          assetId: id,
          target: z.enum([
            "itemMedia",
            "itemAvatar",
            "groupAvatar",
            "wallpaper",
            "appIcon",
          ]),
          targetId: z.string(),
        })
        .strict(),
    ),
    minigames: z.array(gameSchema),
  })
  .strict();
export type AuthorProject = z.infer<typeof projectSchema>;
export type AuthorCharacter = z.infer<typeof characterSchema>;
