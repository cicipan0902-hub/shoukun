import { z } from "zod";
import { actionSchema, conditionSchema } from "../schema";
import type { Story } from "../story-engine/compiler";
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/);
const documentAction = z.object({
  id, label: z.string().min(1), conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema),
}).strict();
export const activityDocumentSchema = z.object({
  id, itemId: id, kind: z.enum(["roster", "scene", "media-review", "media-gallery", "basketball", "birthday", "photo-pair"]),
  conditions: z.array(conditionSchema).default([]),
  entries: z.array(z.object({
    id, characterId: id, project: z.string(), profile: z.string(), status: z.string(),
    required: z.boolean().default(false),
  }).strict()).default([]),
  sections: z.array(z.object({
    text: z.string(), conditions: z.array(conditionSchema).default([]),
  }).strict()).default([]),
  controls: z.array(documentAction).default([]),
  birthday: z.object({
    blessings: z.array(z.object({ characterId: id, text: z.string() }).strict()).default([]),
    memories: z.array(id).default([]),
    questions: z.array(z.object({ id, key: z.string(), prompt: z.string() }).strict()).default([]),
  }).strict().optional(),
}).strict();
export type ActivityDocument = z.infer<typeof activityDocumentSchema>;
export type PublicActivityDocument = Omit<ActivityDocument, "controls"> & {
  controls: Omit<ActivityDocument["controls"][number], "actions">[];
};
export function appendDocuments(story: Story, documents: ActivityDocument[]) {
  const ids = new Set<string>();
  const items = Object.values(story.content).flat();
  for (const doc of documents) {
    if (ids.has(doc.id)) throw Error(`活动文档重复 ID: ${doc.id}`);
    ids.add(doc.id);
    const item = items.find((i) => i.id === doc.itemId);
    if (!item || item.meta?.activityDocument !== doc.id)
      throw Error(`活动文档条目不存在或绑定不一致: ${doc.itemId}`);
    const guard = [
      { key: `unlocked:${doc.itemId}`, op: "eq" as const, value: true },
      ...doc.conditions,
    ];
    const entries = new Set<string>();
    for (const row of doc.entries) {
      if (entries.has(row.id)) throw Error(`活动资料重复 ID: ${row.id}`);
      entries.add(row.id);
      if (!story.contacts.some((c) => c.id === row.characterId))
        throw Error(`活动资料人物不存在: ${row.characterId}`);
      story.events.push({
        id: `document-${doc.id}-${row.id}`, label: "查看活动公开资料", type: "event",
        event: "documentInspect", target: `${doc.id}.${row.id}`, conditions: guard,
        actions: [{ type: "variable", key: `document.${doc.id}.${row.id}.read`, value: true }],
      });
    }
    const controls = new Set<string>();
    for (const control of doc.controls) {
      if (controls.has(control.id)) throw Error(`活动操作重复 ID: ${control.id}`);
      controls.add(control.id);
      story.events.push({
        id: `document-${doc.id}-action-${control.id}`, label: control.label,
        type: "event", event: "documentAction", target: `${doc.id}.${control.id}`,
        conditions: [...guard, ...control.conditions], actions: control.actions,
      });
    }
  }
  story.variables["author.activityDocuments"] = JSON.stringify(documents.map((doc) => ({
    ...doc, controls: doc.controls.map(({ actions: _actions, ...control }) => control),
  })));
}
