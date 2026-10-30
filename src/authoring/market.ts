import { z } from "zod";
import type { Story } from "../story-engine/compiler";
import type { Action } from "../schema";
import { interactionsSchema, type Interactions } from "./interactions";

const lines = z.array(z.string().min(1).max(300)).min(1).max(5);
const seller = z.object({ decline: lines, bargain: z.string(), think: z.string(), silent: z.string(), refund: z.string(), cancel: z.string() }).strict();
export const marketSchema = z.object({
  settings: z.object({ highAmount: z.number().positive(), mediumAmount: z.number().nonnegative(), smallProbability: z.number().min(0).max(1), mediumProbability: z.number().min(0).max(1), cumulativeAmount: z.number().positive(), purchaseCount: z.number().int().positive(), refundNotice: z.boolean() }).strict(),
  sellers: z.record(z.string(), seller),
  productTags: z.record(z.string(), z.string()),
  reactions: z.record(z.string(), z.array(lines).min(1).max(3)),
  replyOptions: z.array(z.object({ id: z.string().regex(/^[a-z]+$/), text: z.string(), tag: z.enum(["stubborn", "sweet", "explain"]), replies: lines }).strict()).min(2).max(3),
  refundOptions: z.array(z.object({ id: z.string().regex(/^[a-z]+$/), text: z.string(), tag: z.enum(["stubborn", "sweet", "explain"]), replies: lines }).strict()).min(2).max(3),
  bankruptcy: z.object({ lines, options: z.array(z.object({ id: z.string().regex(/^[a-z]+$/), text: z.string(), tag: z.enum(["stubborn", "sweet", "explain"]), replies: lines }).strict()).min(2).max(3) }).strict(),
}).strict();
export type MarketConfig = z.infer<typeof marketSchema>;
export type MarketProduct = { id: string; key: string; title: string; tag: string };
export type RuntimeMarketConfig = MarketConfig & { products: MarketProduct[] };
const eq = (key: string, value: string | boolean = true) => ({ key, op: "eq" as const, value });
const variable = (key: string, value: string | boolean): Action => ({ type: "variable", key, value });
const unlock = (key: string): Action => ({ type: "unlock", key, value: true });

export function appendMarket(story: Story, config: MarketConfig, rawInteractions: unknown) {
  const interactions = interactionsSchema.parse(rawInteractions);
  const products = (story.content.xianyu || []).filter(i => i.meta?.type === "product");
  const descriptors: MarketProduct[] = [];
  const familyChat: Story["chats"][number] = { id: "family-card-brother", title: "张泽禹", app: "wechat", participants: ["owner", "brother"], messages: [] };
  story.chats.push(familyChat);
  for (const i of story.content.xianyu || []) if (["product", "seller", "gallery"].includes(i.meta?.type || "")) { i.hidden = false; i.unlock = ""; }
  const addFlow = (token: string, text: string[], options = config.replyOptions) => {
    const steps: Interactions["flows"][number]["steps"] = [];
    text.forEach((body, index) => {
      const id = `family-${token}-line-${index}`;
      familyChat.messages.push({ id, title: "", senderId: "brother", body, hidden: true, time: "亲属卡 · 账单消息" });
      steps.push({ message: id, delayMs: index ? 1000 : 1500 });
    });
    steps.push({ choice: `family-${token}-choice`, prompt: "回复哥哥的账单消息", options: options.map(option => ({
      id: `family-${token}-${option.id}`, text: option.text, kind: "tone", actions: [variable(`familyCard.replyTag.${token}`, option.tag)],
      replies: [option.replies.join("\n")].map((body, index) => {
        const id = `family-${token}-${option.id}-reply-${index}`;
        familyChat.messages.push({ id, title: "", senderId: "brother", body, hidden: true, time: "亲属卡 · 账单消息" });
        return { message: id, delayMs: 1000 + index * 300 };
      }),
    })) });
    const flag = `familyCard.trigger.${token}`;
    story.variables[flag] = false;
    interactions.flows.push({ id: `family-${token}`, chatId: familyChat.id, trigger: { event: "variable", target: flag, conditions: [eq(flag)] }, steps,
      onStart: [{ type: "notification", key: "", value: "微信：张泽禹发来了亲属卡账单消息。" }],
      after: [variable("familyCard.active", "")],
    });
  };
  for (const product of products) {
    const id = product.id, key = product.meta!.stateKey || `market.${id.slice(7)}`;
    const profile = config.sellers[product.meta?.sellerId || product.sender || ""] || config.sellers.default;
    const tag = config.productTags[id] || "normal";
    descriptors.push({ id, key, title: product.title || "闲置商品", tag });
    for (const [suffix, value] of Object.entries({ orderStatus: "unset", thinkDone: false, silentDone: false, cancelRequested: false, refundRequested: false, refundAmount: 0 })) story.variables[`${key}.${suffix}`] = value;
    // Keep product cards and seller profiles intact; only personalize transactional speech.
    for (const item of story.content.xianyu) if (item.meta?.product === id && item.meta.type === "reply") {
      if (item.id.endsWith("-reply-leave")) item.body = profile.decline[products.indexOf(product) % profile.decline.length];
      if (item.id.endsWith("-reply-bargain")) {
        const offers = JSON.parse(product.meta?.options || "[]") as { id: string; price: number }[];
        const price = offers.find(o => o.id === "bargain")?.price ?? Number(product.meta?.price);
        item.body = `${profile.bargain} 最低 ${price} 元，再少就先不出了。`;
      }
    }
    // Existing base-price and quoted-price payment nodes remain authoritative.
    for (const node of story.events) if (node.target === id && ["marketConfirm", "marketDecline"].includes(node.event || ""))
      node.conditions = node.conditions?.filter(c => c.key !== `${key}.interacted`);
    const action = (name: string, body: string, triggerActions: Action[], conditions = [eq(`${key}.opened`), eq(`${key}.busy`, false), eq(`${key}.purchased`, false), eq(`${key}.decision`, "unset")], delayMs = 1100, buyer = "") => {
      const replyId = `${id}-extra-${name}-reply`;
      if (body) story.content.xianyu.push({ id: replyId, title: product.title, body, sender: product.sender, hidden: true, time: "闲鱼 · 交易消息", meta: { type: "reply", product: id } });
      const buyerId = `${id}-extra-${name}-buyer`;
      if (buyer) story.content.xianyu.push({ id: buyerId, title: product.title, body: buyer, sender: "{{playerName}}", hidden: true, time: "闲鱼 · 交易消息", meta: { type: "buyer", product: id } });
      story.events.push({ id: `${id}-extra-${name}`, label: name, type: "event", event: `market${name[0].toUpperCase()}${name.slice(1)}`, target: id, conditions,
        actions: [...(buyer ? [unlock(buyerId)] : []), ...triggerActions], next: body ? [`${id}-extra-${name}-delay`] : [] });
      if (body) story.events.push({ id: `${id}-extra-${name}-delay`, label: "卖家正在回复", type: "delay", delayMs,
        ...(name === "silent" ? { conditions: [eq(`${key}.purchased`, false), eq(`${key}.decision`, "unset")] } : {}),
        actions: [unlock(replyId)] });
    };
    action("think", profile.think, [variable(`${key}.thinkDone`, true)], [eq(`${key}.opened`), eq(`${key}.busy`, false), eq(`${key}.purchased`, false), eq(`${key}.decision`, "unset"), eq(`${key}.thinkDone`, false)], 1100, "我再考虑一下。");
    action("silent", profile.silent, [variable(`${key}.silentDone`, true)], [eq(`${key}.opened`), eq(`${key}.busy`, false), eq(`${key}.purchased`, false), eq(`${key}.decision`, "unset"), eq(`${key}.silentDone`, false)], 6000);
    action("cancel", profile.cancel, [variable(`${key}.cancelRequested`, true)], [eq(`${key}.purchased`, false), eq(`${key}.decision`, "buy"), eq(`${key}.busy`)], 1100, "先取消这次订单。");
    action("refund", profile.refund, [variable(`${key}.refundRequested`, true)], [eq(`${key}.purchased`), eq(`${key}.busy`, false), eq(`${key}.refundRequested`, false)], 1100, "申请退款，不继续这笔模拟交易了。");
    story.events.push({ id: `${id}-extra-resume`, label: "重新考虑这件商品", type: "event", event: "marketResume", target: id,
      conditions: [eq(`${key}.outcome`, "declined"), eq(`${key}.purchased`, false), eq(`${key}.busy`, false), eq(`${key}.bargainDone`, false)],
      actions: [variable(`${key}.outcome`, "ready"), variable(`${key}.decision`, "unset")], once: false });
    story.events.push({ id: `${id}-extra-resume-quoted`, label: "保留此前议价重新考虑", type: "event", event: "marketResume", target: id,
      conditions: [eq(`${key}.outcome`, "declined"), eq(`${key}.purchased`, false), eq(`${key}.busy`, false), eq(`${key}.bargainDone`)],
      actions: [variable(`${key}.outcome`, "quoted"), variable(`${key}.decision`, "unset")], once: false });
    const variants = config.reactions[tag] || config.reactions.normal;
    const text = variants[products.indexOf(product) % variants.length];
    addFlow(`paid-${id}`, text.map(line => line.replaceAll("[商品]", product.title || "闲置商品")));
    addFlow(`refund-${id}`, [`“${product.title}”那笔退款看到了，已经回亲属卡了。`], config.refundOptions);
  }
  addFlow("bankruptcy", config.bankruptcy.lines, config.bankruptcy.options);
  Object.assign(story.variables, { "familyCard.orders": "[]", "familyCard.queue": "[]", "familyCard.active": "", "familyCard.total": 0, "familyCard.count": 0, "familyCard.refunded": 0, "familyCard.bankruptcyQueued": false });
  story.variables["author.market"] = JSON.stringify({ ...config, products: descriptors });
  return interactions;
}
