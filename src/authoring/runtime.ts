import { z } from "zod";
import type { Work } from "../schema";
export const publicCastSchema = z.array(
  z.object({
    id: z.string(),
    storyId: z.string(),
    name: z.string(),
    nickname: z.string(),
    avatar: z.string(),
    bio: z.string(),
    tags: z.array(z.string()),
    storylineId: z.string(),
    aiEnabled: z.boolean(),
  }),
);
export type PublicCharacter = z.infer<typeof publicCastSchema>[number];
export function publicCast(work: Work): PublicCharacter[] {
  try {
    return publicCastSchema.parse(
      JSON.parse(String(work.variables["author.cast"] || "[]")),
    );
  } catch {
    return [];
  }
}
