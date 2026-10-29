import type { Work, Runtime, Item } from "../schema";
import { visible } from "../engine";
import type { PublicActivityDocument } from "../authoring/documents";
import { conditionsPass } from "./chatRuntime";
const cache = new WeakMap<Work, PublicActivityDocument[]>();
export function activityDocument(work: Work, state: Runtime, item: Item) {
  let documents = cache.get(work);
  if (!documents) {
    try { documents = JSON.parse(String(work.variables["author.activityDocuments"] || "[]")); }
    catch { documents = []; }
    if (!Array.isArray(documents)) documents = [];
    cache.set(work, documents!);
  }
  const doc = documents!.find((d) => d.id === item.meta.activityDocument && d.itemId === item.id);
  return doc && visible(item, state) && conditionsPass(doc.conditions, state) ? doc : null;
}
