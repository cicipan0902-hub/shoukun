import { interactionConfig, conditionsPass, continuation } from "./chatRuntime";
import { testCondition, visible } from "../engine";
import type { Runtime, Work } from "../schema";
export type ChapterGuide = {
  app: string;
  thread?: string;
  view?: string;
  messageId?: string;
  itemId?: string;
  title: string;
  detail: string;
  waiting?: boolean;
};
export function chapterGuide(work: Work, state: Runtime): ChapterGuide | null {
  if (!work.id.startsWith("shoukun-good-weather")) return null;
  const config = interactionConfig(work);
  if (state.variables["chapter.chapter-02-small-crush.started"] === true) {
    const guide = config?.guides.find((g) =>
      conditionsPass(g.conditions, state),
    );
    if (guide) return guide;
  }
  if (state.variables["chapter.chapter-01-good-weather.completed"])
    return {
      app: "notes",
      title: "第一章已完成",
      detail: continuation(work, state)
        ? "第一章完成。打开备忘录《第二章 · 关于喜欢这件小事》开始下一章；通关提示中也可直接进入。"
        : "今天的故事到这里。进度已保存，可以重新浏览手机内容。",
    };
  const find = (id: string) =>
    Object.values(work.data)
      .flat()
      .find((i) => i.id === id);
  const unlocked = (id: string) => {
    const item = find(id);
    return !!item && visible(item, state);
  };
  if (state.choices.length) {
    const thread = state.choices[0].target.startsWith("ch01-zuo-")
      ? "左航"
      : "张泽禹";
    return {
      app: "wechat",
      thread,
      title: `回复${thread}`,
      detail: "点击底部「选择回复」，再点选一句预设回复。",
    };
  }
  if (unlocked("ch01-note-ending"))
    return {
      app: "notes",
      title: "读完今天的最后一句话",
      detail: "返回桌面 → 备忘录 →《好像也没那么无聊》，阅读后完成第一章。",
    };
  const next = (work.data.wechat || []).find(
    (i) =>
      i.meta.conversationId &&
      visible(i, state) &&
      work.nodes.some(
        (n) =>
          n.event === "read" &&
          n.target === i.id &&
          !state.completed.includes(n.id) &&
          n.conditions.every((c) => testCondition(c, state)),
      ),
  );
  if (next)
    return {
      app: "wechat",
      thread: next.title,
      messageId: next.id,
      title: `继续与${next.title}聊天`,
      detail: "打开聊天后消息会自动继续；出现「选择回复」时点选即可。",
    };
  if (state.scheduled?.length)
    return {
      app: "wechat",
      thread:
        unlocked("ch01-note-first-day") &&
        state.read.includes("ch01-note-first-day")
          ? "左航"
          : "张泽禹",
      title: "对方正在输入…",
      detail: "稍等片刻，新的消息即将出现。",
      waiting: true,
    };
  if (
    unlocked("ch01-note-first-day") &&
    !state.read.includes("ch01-note-first-day")
  )
    return {
      app: "notes",
      title: "你写下了一段备忘录",
      detail: "返回桌面 → 备忘录 →《开学第一天》，点开阅读。",
    };
  return {
    app: "wechat",
    view: "moments",
    title: "看看哥哥转发的动态",
    detail: "微信 → 发现 → 朋友圈，点开张泽禹的《转发：今天的天不错》。",
  };
}
