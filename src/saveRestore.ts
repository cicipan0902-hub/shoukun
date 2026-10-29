import { interactionConfig } from "./personalization/chatRuntime";
import { z } from "zod";
import { itemSchema, type Runtime, type Work } from "./schema";
const strings = z.array(z.string());
const value = z.union([z.string(), z.number().finite(), z.boolean()]);
const runtimeSchema = z.object({
  workId: z.string(),
  revision: z.number(),
  variables: z.record(z.string(), value),
  visited: strings,
  read: strings,
  clues: strings,
  unlocked: strings,
  hidden: strings,
  completed: strings,
  notifications: strings,
  endings: strings,
  choices: z.array(z.object({ label: z.string(), target: z.string() })),
  messages: z.record(z.string(), z.array(itemSchema)),
  time: z.string(),
  trace: strings,
  date: z.string().optional(),
  elapsedMs: z.number().optional(),
  clockRemainderMs: z.number().optional(),
  scheduled: z
    .array(z.object({ nodeId: z.string(), due: z.number() }))
    .optional(),
  incomingCall: z
    .object({
      caller: z.string(),
      target: z.string(),
      status: z.enum(["ringing", "answered"]),
    })
    .nullable()
    .optional(),
  ui: z
    .record(z.string(), z.record(z.string(), z.union([value, strings])))
    .optional(),
});
export function restoreSave(work: Work, input: unknown): Runtime | null {
  const parsed = runtimeSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.workId !== work.id ||
    parsed.data.revision !== work.updatedAt
  )
    return null;
  const saved = parsed.data;
  // Same-revision additions receive defaults. Existing choices and history stay intact.
  // Revision changes keep upstream behavior; no automatic save migration is performed.
  // Only retain friend access already evidenced by a previous private chat, never by public posts/group messages.
  const provenFriends = (
    interactionConfig(work)?.controlledFriends || []
  ).filter(
    (id) =>
      !("friend." + id + ".state" in saved.variables) &&
      (work.data.wechat || []).some(
        (i) =>
          i.meta.participants?.split(",").length === 2 &&
          i.meta.participants.split(",").includes(id) &&
          (saved.read.includes(i.id) ||
            (saved.ui?.wechat?.seenMessageIds instanceof Array &&
              saved.ui.wechat.seenMessageIds.includes(i.id))),
      ),
  );
  saved.variables = { ...work.variables, ...saved.variables };
  for (const id of provenFriends)
    saved.variables[`friend.${id}.state`] = "accepted";
  for (const [key, value] of Object.entries(work.variables))
    if (key.startsWith("author.")) saved.variables[key] = value;
  return saved;
}
