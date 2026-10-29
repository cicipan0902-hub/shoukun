import { z } from "zod";
import { activityDocumentSchema, appendDocuments } from "./documents";
import { actionSchema, conditionSchema } from "../schema";
import type { Story } from "../story-engine/compiler";
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/);
const message = z
  .object({
    message: id,
    delayMs: z.number().int().min(200).max(60000).optional(),
  })
  .strict();
const option = z
  .object({
    id,
    text: z.string().min(1).max(200),
    kind: z.enum(["tone", "information", "important"]),
    replies: z.array(message).default([]),
    actions: z.array(actionSchema).default([]),
  })
  .strict();
const choice = z
  .object({
    choice: id,
    prompt: z.string(),
    options: z.array(option).min(2).max(4),
  })
  .strict();
export const interactionsSchema = z
  .object({
    version: z.literal(1),
    autoChat: z.boolean().default(true),
    defaultDelayMs: z.number().int().min(200).max(60000).default(1000),
    additionalApps: z.array(z.string()).default([]),
    initialFriends: z.array(id).default([]),
    controlledFriends: z.array(id).default([]),
    requests: z
      .array(
        z
          .object({
            id,
            contactId: id,
            direction: z.enum(["incoming", "outgoing"]),
            message: z.string(),
            conditions: z.array(conditionSchema).default([]),
            acceptActions: z.array(actionSchema).default([]),
          })
          .strict(),
      )
      .default([]),
    flows: z
      .array(
        z
          .object({
            id,
            chatId: id,
            trigger: z
              .object({
                event: z.string().min(1),
                target: z.string(),
                conditions: z.array(conditionSchema).default([]),
              })
              .strict(),
            steps: z.array(z.union([message, choice])),
            onStart: z.array(actionSchema).default([]),
            after: z.array(actionSchema).default([]),
          })
          .strict(),
      )
      .default([]),
    guides: z
      .array(
        z
          .object({
            conditions: z.array(conditionSchema),
            title: z.string(),
            detail: z.string(),
            app: z.string(),
            thread: z.string().optional(),
            itemId: id.optional(),
            view: z.enum(["moments"]).optional(),
          })
          .strict(),
      )
      .default([]),
    documents: z.array(activityDocumentSchema).default([]),
    continuations: z.array(z.object({ afterKey: id, startedKey: id, label: z.string(), event: z.string(), target: z.string() }).strict()).default([]),
    continuation: z
      .object({
        afterKey: z.string(),
        startedKey: z.string(),
        label: z.string(),
        event: z.string(),
        target: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Interactions = z.infer<typeof interactionsSchema>;
export function appendInteractions(story: Story, raw: unknown) {
  const config = interactionsSchema.parse(raw);
  const timers: Record<string, string> = {},
    choices: Record<string, string> = {};
  const add = (
    n: Omit<Story["events"][number], "type"> & {
      type?: Story["events"][number]["type"];
    },
  ) => {
    story.events.push({ type: "event", ...n });
    return n.id;
  };
  const chats = new Map(story.chats.map((c) => [c.id, c]));
  const itemIds = new Set(
    [
      ...story.chats.flatMap((c) => c.messages),
      ...Object.values(story.content).flat(),
    ].map((i) => i.id),
  );
  const unique = new Set<string>();
  const checkId = (key: string) => {
    if (unique.has(key)) throw Error(`交互配置重复 ID: ${key}`);
    unique.add(key);
  };
  for (const name of config.additionalApps)
    if (
      !story.installedApps.some(
        (a) => (typeof a === "string" ? a : a.id) === name,
      )
    )
      story.installedApps.push(name);
  for (const id of [...config.initialFriends, ...config.controlledFriends]) {
    if (!story.contacts.some((c) => c.id === id))
      throw Error(`好友不存在: ${id}`);
    story.variables[`friend.${id}.state`] ??= config.initialFriends.includes(id)
      ? "accepted"
      : "unknown";
  }
  for (const req of config.requests) {
    checkId(req.id);
    if (!config.controlledFriends.includes(req.contactId))
      throw Error(`申请角色必须在 controlledFriends 中: ${req.contactId}`);
    const key = `friend.${req.contactId}.state`;
    add({
      id: `friend-send-${req.id}`,
      label: "发送好友申请",
      event: "friendRequest",
      target: req.id,
      conditions: [{ key, op: "eq", value: "met" }, ...req.conditions],
      actions: [
        { type: "variable", key, value: "requested" },
        {
          type: "notification",
          key: "",
          value: "微信：好友申请已发送，等待验证。",
        },
      ],
      next: req.direction === "outgoing" ? [`friend-confirm-${req.id}`] : [],
    });
    if (req.direction === "outgoing")
      add({
        id: `friend-confirm-${req.id}`,
        label: "好友验证通过",
        type: "delay",
        delayMs: config.defaultDelayMs,
        conditions: [{ key, op: "eq", value: "requested" }],
        actions: [
          { type: "variable", key, value: "accepted" },
          ...req.acceptActions,
          {
            type: "notification",
            key: "",
            value: "微信：好友验证通过，可以开始私聊。",
          },
        ],
      });
    else
      add({
        id: `friend-accept-${req.id}`,
        label: "同意好友申请",
        event: "friendAccept",
        target: req.id,
        conditions: [{ key, op: "eq", value: "requested" }, ...req.conditions],
        actions: [
          { type: "variable", key, value: "accepted" },
          ...req.acceptActions,
          { type: "notification", key: "", value: "微信：已通过好友申请。" },
        ],
      });
  }
  for (const flow of config.flows) {
    checkId("flow." + flow.id);
    const chat = chats.get(flow.chatId);
    if (!chat) throw Error(`对话会话不存在: ${flow.chatId}`);
    if (chat.app !== "wechat")
      throw Error(`当前选项队列仅支持微信: ${flow.chatId}`);
    const prefix = `flow-${flow.id}`;
    const finish = `${prefix}-done`;
    const msgNode = (m: z.infer<typeof message>, nid: string, next: string) => {
      const item = chat.messages.find((i) => i.id === m.message);
      if (!item || !item.hidden)
        throw Error(`自动消息必须是当前会话的隐藏消息: ${m.message}`);
      timers[nid] = chat.id;
      add({
        id: nid,
        label: `发送 ${m.message}`,
        type: "delay",
        delayMs: m.delayMs ?? config.defaultDelayMs,
        actions: [{ type: "unlock", key: m.message, value: true }],
        next: [next],
      });
    };
    add({
      id: finish,
      label: `完成 ${flow.id}`,
      type: "action",
      actions: flow.after,
    });
    flow.steps.forEach((step, index) => {
      const nid = `${prefix}-${index}`,
        next =
          index + 1 < flow.steps.length ? `${prefix}-${index + 1}` : finish;
      if ("message" in step) msgNode(step, nid, next);
      else {
        checkId("choice." + step.choice);
        add({
          id: nid,
          label: step.prompt,
          type: "choice",
          next: step.options.map((o) => o.id),
        });
        for (const o of step.options) {
          checkId(o.id);
          choices[o.id] = chat.id;
          const mid = `${o.id}-message`;
          if (itemIds.has(mid)) throw Error(`选项消息 ID 冲突: ${mid}`);
          itemIds.add(mid);
          chat.messages.push({
            id: mid,
            title: "",
            body: o.text,
            senderId: "owner",
            hidden: true,
            time: "校园日常",
          });
          const replyIds = o.replies.map(
            (_, i) => `${prefix}-${index}-${o.id}-${i}`,
          );
          add({
            id: o.id,
            label: o.text,
            type: "action",
            actions: [
              { type: "unlock", key: mid, value: true },
              { type: "variable", key: `choice.${step.choice}`, value: o.id },
              {
                type: "variable",
                key: `choice.${step.choice}.kind`,
                value: o.kind,
              },
              ...o.actions,
            ],
            next: [replyIds[0] || next],
          });
          o.replies.forEach((m, i) =>
            msgNode(m, replyIds[i], replyIds[i + 1] || next),
          );
        }
      }
    });
    const privatePeer =
      chat.participants.length === 2
        ? chat.participants.find((x) => x !== "owner")
        : undefined;
    const permissions =
      privatePeer && config.controlledFriends.includes(privatePeer)
        ? [
            {
              key: `friend.${privatePeer}.state`,
              op: "eq" as const,
              value: "accepted",
            },
          ]
        : [];
    add({
      id: prefix,
      label: `开始 ${flow.id}`,
      event: flow.trigger.event,
      target: flow.trigger.target,
      conditions: [...flow.trigger.conditions, ...permissions],
      actions: flow.onStart,
      next: [flow.steps.length ? `${prefix}-0` : finish],
    });
  }
  appendDocuments(story, config.documents);
  story.variables["author.interactions"] = JSON.stringify({
    autoChat: config.autoChat,
    initialFriends: config.initialFriends,
    controlledFriends: config.controlledFriends,
    requests: config.requests.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      direction: r.direction,
      message: r.message,
      conditions: r.conditions,
    })),
    timers,
    choices,
    guides: config.guides,
    continuation: config.continuation,
    continuations: config.continuations,
  });
  return config;
}
