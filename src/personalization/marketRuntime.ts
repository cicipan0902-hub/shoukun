import type { Action, Runtime, Work } from "../schema";
import type { RuntimeMarketConfig } from "../authoring/market";
export type MarketOrder = { id: string; productId: string; title: string; amount: number; status: "pending" | "paid" | "cancelled" | "refunded"; paidAt?: number; refundedAt?: number };
const cache = new WeakMap<Work, RuntimeMarketConfig | null>();
export function marketConfig(work: Work) {
  if (cache.has(work)) return cache.get(work)!;
  let value: RuntimeMarketConfig | null = null;
  try { const raw = JSON.parse(String(work.variables["author.market"] || "null")); if (raw?.settings && Array.isArray(raw.products)) value = raw; } catch { /* Older works have no market integration. */ }
  cache.set(work, value);return value;
}
function array<T>(value: unknown): T[] { try { const a = JSON.parse(String(value || "[]"));return Array.isArray(a) ? a : []; } catch { return []; } }
function previousPayment(w: Work, s: Runtime, key: string, productId: string) {
  if (s.variables[`${key}.paymentSource`]) return Number(s.variables[`${key}.paymentAmount`] || 0);
  const item = w.data.xianyu.find(i => i.id === productId);
  const offers = array<{ id: string; price: number }>(item?.meta.options);
  return s.variables[`${key}.bargainDone`] || s.variables[`${key}.choice`] === "bargain" ? offers.find(o => o.id === "bargain")?.price ?? Number(item?.meta.price || 0) : Number(item?.meta.price || 0);
}
export function marketOrders(s: Runtime, w?: Work) {
  const orders = array<MarketOrder>(s.variables["familyCard.orders"]);
  // Show old receipts without counting them as new payments or resending notices.
  if (w) for (const product of marketConfig(w)?.products || [])
    if (s.variables[`${product.key}.purchased`] && !orders.some(o => o.productId === product.id))
      orders.push({ id: `${product.id}:1`, productId: product.id, title: product.title, amount: previousPayment(w, s, product.key, product.id), status: "paid" });
  return orders;
}
function hash(text: string) { let h = 2166136261;for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);return h >>> 0; }

// Called after native story actions. Return ordinary actions so variable-triggered
// WeChat flows, delays and saves continue through the existing engine.
export function marketEffects(w: Work, s: Runtime, actions: Action[]): Action[] {
  const config = marketConfig(w);
  if (!config) return [];
  const changed = actions.filter(a => a.type === "variable");
  if (!changed.some(a => a.key.startsWith("market.") || a.key.startsWith("familyCard."))) return [];
  const updates = new Map<string, string | number | boolean>();
  const get = (key: string) => updates.has(key) ? updates.get(key)! : s.variables[key];
  const set = (key: string, value: string | number | boolean) => updates.set(key, value);
  const queue = array<string>(get("familyCard.queue"));
  const enqueue = (token: string) => { if (!get(`familyCard.queued.${token}`)) { queue.push(token);set(`familyCard.queued.${token}`, true); } };
  const orders = marketOrders(s);let dirty = false;
  for (const a of changed) {
    if (a.key.startsWith("familyCard.replyTag.")) { const tag = `familyCard.tag.${a.value}`;set(tag, Number(get(tag) || 0) + 1); }
    const product = config.products.find(p => ["decision", "purchased", "cancelRequested", "refundRequested"].some(suffix => a.key === `${p.key}.${suffix}`));
    if (!product) continue;
    const key = product.key;
    let order = orders.find(o => o.productId === product.id);
    if (a.key === `${key}.decision` && a.value === "buy" && !get(`${key}.purchased`) && !order) {
      order = { id: `${product.id}:1`, productId: product.id, title: product.title, amount: Number(get(`${key}.currentPrice`) || 0), status: "pending" };orders.push(order);dirty = true;set(`${key}.orderStatus`, "pending");
    }
    if (a.key === `${key}.purchased` && a.value === true && (!order || order.status === "pending")) {
      const amount = Number(get(`${key}.paymentAmount`));
      if (!Number.isFinite(amount) || amount < 0) continue;
      order ??= { id: `${product.id}:1`, productId: product.id, title: product.title, amount, status: "pending" };
      if (!orders.includes(order)) orders.push(order);
      Object.assign(order, { amount, status: "paid", paidAt: s.elapsedMs || 0 });dirty = true;set(`${key}.orderStatus`, "paid");
      const total = Math.round((Number(get("familyCard.total") || 0) + amount) * 100) / 100, count = Number(get("familyCard.count") || 0) + 1;
      set("familyCard.total", total);set("familyCard.count", count);
      const cfg = config.settings;
      if (!get("familyCard.bankruptcyQueued") && (total >= cfg.cumulativeAmount || count >= cfg.purchaseCount)) {
        set("familyCard.bankruptcyQueued", true);enqueue("bankruptcy");
      } else {
        const chance = amount >= cfg.mediumAmount ? cfg.mediumProbability : cfg.smallProbability;
        const roll = hash(`${w.id}|${product.id}|${count}`) / 4294967296;
        if (amount >= cfg.highAmount || roll < chance) {
          enqueue(`paid-${product.id}`);
        }
      }
    }
    if (a.key === `${key}.cancelRequested` && a.value === true && !get(`${key}.purchased`) && (!order || order.status === "pending")) {
      order ??= { id: `${product.id}:1`, productId: product.id, title: product.title, amount: 0, status: "pending" };if (!orders.includes(order)) orders.push(order);
      order.status = "cancelled";dirty = true;
      s.scheduled = s.scheduled?.filter(t => !(t.nodeId.startsWith(product.id + "-") && (t.nodeId.includes("-pay-") || t.nodeId.endsWith("-delay-buy"))));
      set(`${key}.orderStatus`, "cancelled");set(`${key}.decision`, "cancel");set(`${key}.busy`, false);
    }
    if (a.key === `${key}.refundRequested` && a.value === true && get(`${key}.purchased`) && (!order || order.status === "paid")) {
      // Compatibility: an old paid save can refund without replaying its payment notice.
      const amount = previousPayment(w, s, key, product.id);
      order ??= { id: `${product.id}:1`, productId: product.id, title: product.title, amount, status: "paid" };if (!orders.includes(order)) orders.push(order);
      order.status = "refunded";order.refundedAt = s.elapsedMs || 0;dirty = true;
      set(`${key}.orderStatus`, "refunded");set(`${key}.refundAmount`, order.amount);
      set("familyCard.refunded", Math.round((Number(get("familyCard.refunded") || 0) + order.amount) * 100) / 100);
      if (config.settings.refundNotice) enqueue(`refund-${product.id}`);
    }
  }
  if (dirty) set("familyCard.orders", JSON.stringify(orders));
  if (!get("familyCard.active") && queue.length) { const token = queue.shift()!;set("familyCard.active", token);set(`familyCard.trigger.${token}`, true); }
  if (queue.length || get("familyCard.queue") !== "[]") set("familyCard.queue", JSON.stringify(queue));
  return [...updates].filter(([key, value]) => value !== s.variables[key]).map(([key, value]) => ({ type: "variable", key, value }));
}
