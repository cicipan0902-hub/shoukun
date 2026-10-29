import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { z } from "zod";
import { CampusContext } from "./CampusContext";
import { CampusPlayContext } from "./CampusPlayContext";
import { chapterGuide } from "./storyGuide";
import { AvatarImage } from "../media/AvatarImage";

import type { Item } from "../schema";
import "./daily.css";
const turnsSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(2000),
    }),
  )
  .max(80);
type Turn = z.infer<typeof turnsSchema>[number];
function savedTurns(key: string): Turn[] {
  try {
    const r = turnsSchema.safeParse(
      JSON.parse(localStorage.getItem(key) || "[]"),
    );
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}
export function LegacyConversation({
  thread,
  items,
  children,
  creator = false,
  fallbackComposer,
}: {
  thread: string;
  items: Item[];
  children: ReactNode;
  creator?: boolean;
  fallbackComposer?: ReactNode;
}) {
  const campus = useContext(CampusContext);
  const play = useContext(CampusPlayContext);
  const guide = play && chapterGuide(play.work, play.state);
  const here = guide?.app === "wechat" && guide.thread === thread;
  const choices = here ? play?.state.choices || [] : [];
  const storyStorageKey = `shoukun.notes.${play?.work.id}.${thread}`;
  const [storyTurns, setStoryTurns] = useState(() =>
    savedTurns(storyStorageKey),
  );
  const [storyDraft, setStoryDraft] = useState("");
  const [storyFeedback, setStoryFeedback] = useState("");
  function sendStory(e: FormEvent) {
    e.preventDefault();
    const content = storyDraft.trim();
    if (!content) return;
    const match = choices.find(
      (c) => c.label.replace(/\s/g, "") === content.replace(/\s/g, ""),
    );
    if (match && play) {
      play.choose(match.target);
      setStoryFeedback("");
    } else {
      const next: Turn[] = [...storyTurns, { role: "user" as const, content }].slice(
        -80,
      );
      setStoryTurns(next);
      try {
        localStorage.setItem(storyStorageKey, JSON.stringify(next));
        setStoryFeedback(
          "留言已保存在本机。主线请用「继续对话」或下方选项推进；AI 尚未连接时不会自动回复。",
        );
      } catch {
        setStoryFeedback(
          "留言已显示，但浏览器未能保存。主线请点「继续对话」或回复选项。",
        );
      }
    }
    setStoryDraft("");
  }
  const role = campus?.cast?.find(
    (r) => r.aiEnabled && (r.name === thread || r.nickname === thread),
  );
  const storageKey = `shoukun.daily.${campus?.profile.runId}.${role?.id}`;
  const [turns, setTurns] = useState(() => savedTurns(storageKey));
  const [mode, setMode] = useState("story");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "offline">(
    "checking",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!campus || !role) return;
    const abort = new AbortController();
    fetch("./api/chat/status", { signal: abort.signal })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((r) => setStatus(r?.configured ? "ready" : "offline"))
      .catch(() => {
        if (!abort.signal.aborted) setStatus("offline");
      });
    return () => {
      abort.abort();
      request.current?.abort();
    };
  }, [campus, role]);
  useEffect(() => {
    if (mode === "daily") end.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy, mode]);
  function save(next: Turn[]) {
    const trimmed = next.slice(-80);
    setTurns(trimmed);
    try {
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {
      setError("本次聊天可以继续，但浏览器未能保存聊天记录。");
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!campus || !role || busy || !draft.trim()) return;
    if (status !== "ready") {
      save([...turns, { role: "user", content: draft.trim() }]);
      setDraft("");
      setError(
        "留言已保存。AI 尚未连接，暂时没有角色自动回复；可以切回剧情消息继续故事。",
      );
      return;
    }
    const text = draft.trim();
    setBusy(true);
    setError("");
    const abort = new AbortController();
    request.current = abort;
    const timeout = setTimeout(() => abort.abort(), 40000);
    try {
      const res = await fetch("./api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          characterId: role.id,
          profile: {
            playerName: campus.profile.playerName,
            playerClass: campus.profile.playerClass,
            temperament: campus.profile.temperament,
          },
          messages: [
            ...turns
              .slice(-11)
              .map((t) => ({ ...t, content: t.content.slice(0, 1000) })),
            { role: "user", content: text },
          ],
          storyContext: items
            .filter((i) => i.title === thread)
            .slice(-8)
            .map((i) => `${i.sender}: ${i.body}`.slice(0, 1200)),
        }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || typeof result?.reply !== "string" || !result.reply.trim())
        throw new Error(result?.error || "暂时没有收到回复，请稍后重试。");
      save([
        ...turns,
        { role: "user", content: text },
        { role: "assistant", content: result.reply },
      ]);
      setDraft("");
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "AbortError"
          ? e.message
          : "等待回复超时，你的文字已保留，可以重试。",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  if (creator || !campus || !role)
    return (
      <>
        {children}
        {fallbackComposer}
      </>
    );
  return (
    <>
      <div className="campus-chat-modes" role="group" aria-label="聊天模式">
        <button
          aria-pressed={mode === "story"}
          onClick={() => setMode("story")}
        >
          剧情消息
        </button>
        <button
          aria-pressed={mode === "daily"}
          onClick={() => setMode("daily")}
        >
          {status === "ready" ? "日常私聊 · AI" : "日常留言"}
        </button>
      </div>
      {mode === "story" ? (
        <>
          {children}
          {storyTurns.length > 0 && (
            <div className="campus-story-local" aria-label="你的自由留言">
              <small>你的自由留言 · 不改变主线</small>
              {storyTurns.map((t, i) => (
                <div className="campus-local-message" key={i}>
                  <p>{t.content}</p>
                  <span className="skin-avatar">
                    <AvatarImage
                      name={campus.profile.playerName}
                      src={
                        campus.cast?.find((c) => c.storyId === "owner")?.avatar
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="campus-story-controls">
            {guide && (
              <p className="campus-next-step">
                <strong>下一步：{guide.title}</strong>
                <span>{guide.detail}</span>
              </p>
            )}
            {choices.length > 0 && (
              <div className="campus-reply-options" aria-label="剧情回复选项">
                {choices.map((c) => (
                  <button key={c.target} onClick={() => play?.choose(c.target)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {here && guide?.messageId && (
              <button
                className="campus-continue"
                onClick={() => {
                  setStoryFeedback("");
                  play?.read(guide.messageId!);
                }}
              >
                继续对话 <span>›</span>
              </button>
            )}
          </div>
          <form className="campus-daily-composer" onSubmit={sendStory}>
            {storyFeedback && <p role="status">{storyFeedback}</p>}
            <div>
              <input
                aria-label="聊天内容"
                placeholder={
                  choices.length
                    ? "选一句回复，或输入同一句话…"
                    : "写一条自由留言…"
                }
                value={storyDraft}
                maxLength={1000}
                onChange={(e) => setStoryDraft(e.target.value)}
              />
              <button disabled={!storyDraft.trim()}>发送</button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div
            className="campus-daily-scroll"
            aria-label={`${thread}的日常私聊记录`}
          >
            <p className="campus-daily-note">
              校园 AU 中的 {thread} · AI 角色
              <br />
              日常聊天不改变主线进度
            </p>
            {turns.length === 0 && (
              <p className="campus-daily-empty">
                {status === "ready"
                  ? "从今天的校园日常聊起吧。"
                  : status === "checking"
                    ? "正在连接…"
                    : "可以输入并保存留言。AI 尚未连接，暂时不会收到角色回复。"}
              </p>
            )}
            {turns.map((t, i) => (
              <div className={`campus-daily-row ${t.role}`} key={i}>
                <small>
                  {t.role === "user" ? campus.profile.playerName : thread}
                </small>
                <p>{t.content}</p>
              </div>
            ))}
            {busy && (
              <p role="status" className="campus-daily-note">
                对方正在输入…
              </p>
            )}
            <div ref={end} />
          </div>
          <form className="campus-daily-composer" onSubmit={send}>
            {error && <p role="alert">{error}</p>}
            <div>
              <input
                aria-label="日常聊天内容"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                disabled={busy}
                placeholder={status === "ready" ? "说点什么…" : "写一条留言…"}
              />
              <button disabled={busy || !draft.trim()}>发送</button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
