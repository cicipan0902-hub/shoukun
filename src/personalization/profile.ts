import { z } from "zod";
import { validateWork, type Work } from "../schema";

export const profileSchema = z.object({
  runId: z.string().uuid(),
  playerName: z.string().trim().min(1, "请填写你的昵称").max(20),
  starName: z.string().trim().min(1, "请填写角色名字").max(20),
  playerClass: z.string().trim().min(1).max(20),
  temperament: z.enum([
    "温柔细腻，有自己的想法",
    "活泼，有点小倔强",
    "慢热，但很认真",
    "直率，喜欢开玩笑",
  ]),
});
export type PlayerProfile = z.infer<typeof profileSchema>;
export function newRunId(): string {
  // getRandomValues also works for a phone opening an HTTP LAN preview.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const PROFILE_KEY = "shoukun.campus-profile.v1";
export function readProfile(raw: string | null): PlayerProfile | null {
  try {
    const result = profileSchema.safeParse(JSON.parse(raw || "null"));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function personalizeWork(source: Work, input: PlayerProfile): Work {
  const p = profileSchema.parse(input);
  const values: Record<string, string> = {
    playerName: p.playerName,
    starName: p.starName,
    playerClass: p.playerClass,
    temperament: p.temperament,
  };
  // Callback replacement treats user text literally, including $ and braces.
  const text = (value: string) =>
    value.replace(
      /\{\{(playerName|starName|playerClass|temperament)\}\}/g,
      (_, key: string) => values[key],
    );
  const w = structuredClone(source);
  w.id = `${source.id}--${p.runId}`;
  w.phone.owner = p.playerName;
  w.description = text(w.description);
  for (const items of Object.values(w.data))
    for (const item of items) {
      item.title = text(item.title);
      item.body = text(item.body);
      item.sender = text(item.sender);
      item.comments = item.comments.map(text);
      item.meta = Object.fromEntries(
        Object.entries(item.meta).map(([k, v]) => [k, text(v)]),
      );
    }
  for (const node of w.nodes) {
    node.label = text(node.label);
    for (const action of node.actions)
      if (typeof action.value === "string") action.value = text(action.value);
  }
  try {
    const cast = JSON.parse(String(w.variables["author.cast"] || "[]"));
    w.variables["author.cast"] = JSON.stringify(
      cast.map((c: Record<string, unknown>) => ({
        ...c,
        name: text(String(c.name)),
        nickname: text(String(c.nickname)),
      })),
    );
  } catch {
    /* Preserve support for older works without cast metadata. */
  }
  w.variables = {
    ...w.variables,
    playerName: p.playerName,
    starName: p.starName,
    playerClass: p.playerClass,
    temperament: p.temperament,
  };
  return validateWork(w);
}
