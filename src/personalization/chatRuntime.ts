import { testCondition, visible } from "../engine";
import type { Work, Runtime, Item, Condition } from "../schema";
import type { Interactions } from "../authoring/interactions";
type Config = Pick<
  Interactions,
  | "autoChat"
  | "initialFriends"
  | "controlledFriends"
  | "requests"
  | "guides"
  | "continuation"
  | "continuations"
> & { timers: Record<string, string>; choices: Record<string, string> };
const cache = new WeakMap<Work, Config | null>();
export function interactionConfig(work: Work): Config | null {
  if (cache.has(work)) return cache.get(work)!;
  try {
    const c = JSON.parse(
      String(work.variables["author.interactions"] || "null"),
    );
    if (!c || !Array.isArray(c.controlledFriends) || !c.timers || !c.choices)
      return null;
    cache.set(work, c);
    return c;
  } catch {
    return null;
  }
}
export const conditionsPass = (conditions: Condition[], s: Runtime) =>
  conditions.every((c) => testCondition(c, s));
export function friendState(work: Work, s: Runtime, id: string): string {
  const c = interactionConfig(work);
  if (!c) return "accepted";
  return String(
    s.variables[`friend.${id}.state`] ||
      (c.initialFriends.includes(id) ? "accepted" : "unknown"),
  );
}
export function canPrivateChat(work: Work, s: Runtime, id: string): boolean {
  const c = interactionConfig(work);
  return (
    !c ||
    !c.controlledFriends.includes(id) ||
    friendState(work, s, id) === "accepted"
  );
}
export function contactAllowed(work: Work, s: Runtime, item: Item) {
  return canPrivateChat(work, s, item.id.replace(/-card$/, ""));
}
export function chatItemAllowed(work: Work, s: Runtime, item: Item) {
  if (item.kind === "post" || item.folder === "朋友圈") {
    const author = work.data.contacts?.find((c) => c.title === item.sender);
    if (author && !contactAllowed(work, s, author)) return false;
  }
  const ids = (item.meta.participants || "").split(",").filter(Boolean);
  if (ids.length !== 2 || !ids.includes("owner")) return true;
  return canPrivateChat(
    work,
    s,
    ids.find((id) => id !== "owner")!,
  );
}
function choiceChat(work: Work, target: string): string | undefined {
  const c = interactionConfig(work);
  if (c?.choices[target]) return c.choices[target];
  const node = work.nodes.find((n) => n.id === target);
  const outgoing = (work.data.wechat || []).find(
    (i) =>
      i.outgoing &&
      node?.actions.some((a) => a.type === "unlock" && a.key === i.id),
  );
  return outgoing?.meta.conversationId;
}
export function pendingChat(work: Work, s: Runtime, thread: string): boolean {
  const c = interactionConfig(work);
  return (s.scheduled || []).some((t) => {
    const chat = c?.timers[t.nodeId];
    if (chat)
      return (work.data.wechat || []).some(
        (i) => i.meta.conversationId === chat && i.title === thread,
      );
    const node = work.nodes.find((n) => n.id === t.nodeId);
    return node?.actions.some(
      (a) =>
        a.type === "unlock" &&
        (work.data.wechat || []).some(
          (i) => i.id === a.key && i.title === thread,
        ),
    );
  });
}
export function replyOptions(work: Work, s: Runtime, thread: string) {
  if (pendingChat(work, s, thread)) return [];
  const available = s.choices.filter((c) => {
    const chat = choiceChat(work, c.target);
    return (work.data.wechat || []).some(
      (i) =>
        i.meta.conversationId === chat &&
        i.title === thread &&
        chatItemAllowed(work, s, i),
    );
  });
  const first = available[0];
  const group = first && work.nodes.find(n => n.type === "choice" && n.next.includes(first.target));
  return group ? available.filter(c => group.next.includes(c.target)) : available;
}
export function nextChatRead(work: Work, s: Runtime, thread: string) {
  if (pendingChat(work, s, thread)) return null;
  return (
    (work.data.wechat || []).find(
      (i) =>
        i.title === thread &&
        i.meta.conversationId &&
        !s.choices.some(c => choiceChat(work, c.target) === i.meta.conversationId) &&
        visible(i, s) &&
        chatItemAllowed(work, s, i) &&
        work.nodes.some(
          (n) =>
            n.event === "read" &&
            n.target === i.id &&
            (!n.once || !s.completed.includes(n.id)) &&
            conditionsPass(n.conditions, s),
        ),
    ) || null
  );
}
export function availableRequests(work: Work, s: Runtime) {
  return (interactionConfig(work)?.requests || []).filter(
    (r) =>
      conditionsPass(r.conditions, s) &&
      ["met", "requested", "accepted"].includes(
        friendState(work, s, r.contactId),
      ),
  );
}
export function continuation(work: Work, s: Runtime) {
  const config = interactionConfig(work);
  const entries = [...(config?.continuations || []), ...(config?.continuation ? [config.continuation] : [])];
  return entries.find((c) => s.variables[c.afterKey] === true && s.variables[c.startedKey] !== true) || null;
}

export function canSubmitChoice(
  work: Work,
  s: Runtime,
  target: string,
): boolean {
  if (!s.choices.some((c) => c.target === target)) return false;
  if (!interactionConfig(work)?.autoChat) return true;
  const chat = choiceChat(work, target);
  const item = (work.data.wechat || []).find(
    (i) => i.meta.conversationId === chat,
  );
  return (
    !!item &&
    chatItemAllowed(work, s, item) &&
    !pendingChat(work, s, item.title)
  );
}
