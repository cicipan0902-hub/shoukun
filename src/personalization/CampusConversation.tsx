import { useContext, useEffect, useState, type ReactNode } from "react";
import type { Item } from "../schema";
import { CampusContext } from "./CampusContext";
import { CampusPlayContext } from "./CampusPlayContext";
import {
  interactionConfig,
  nextChatRead,
  pendingChat,
  replyOptions,
} from "./chatRuntime";
import { chapterGuide } from "./storyGuide";
import { LegacyConversation } from "./LegacyConversation";
import "./daily.css";
export function CampusConversation(p: {
  thread: string;
  items: Item[];
  children: ReactNode;
  creator?: boolean;
  fallbackComposer?: ReactNode;
}) {
  const play = useContext(CampusPlayContext);
  const campus = useContext(CampusContext);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archive] = useState<string[]>(() => {
    try {
      const role = campus?.cast?.find(
        (c) => c.name === p.thread || c.nickname === p.thread,
      );
      const keys = [
        `shoukun.notes.${play?.work.id}.${p.thread}`,
        `shoukun.daily.${campus?.profile.runId}.${role?.id}`,
      ];
      return keys
        .flatMap((key) => {
          const rows = JSON.parse(localStorage.getItem(key) || "[]");
          return Array.isArray(rows)
            ? rows
                .filter((r) => r && typeof r.content === "string")
                .map((r) => String(r.content).slice(0, 2000))
            : [];
        })
        .slice(-80);
    } catch {
      return [];
    }
  });
  const [openedFor, setOpenedFor] = useState("");
  const config = play && interactionConfig(play.work);
  const options = play ? replyOptions(play.work, play.state, p.thread) : [];
  const key = options.map((c) => c.target).join("|");
  const pending = !!play && pendingChat(play.work, play.state, p.thread);
  const next = play && nextChatRead(play.work, play.state, p.thread);
  const guide = play && chapterGuide(play.work, play.state);
  // Legacy read-triggered chats now advance on screen; generated flows advance in the engine even outside this App.
  useEffect(() => {
    if (p.creator || !config?.autoChat || !next || !play) return;
    const timer = setTimeout(() => play.read(next.id), 650);
    return () => clearTimeout(timer);
  }, [p.creator, config?.autoChat, next?.id, play?.read]);
  if (p.creator || !config?.autoChat || !play)
    return <LegacyConversation {...p} />;
  return (
    <>
      {p.children}
      <div className="campus-choice-area">
        {archive.length > 0 && (
          <>
            <button
              className="campus-archive-link"
              onClick={() => setArchiveOpen(!archiveOpen)}
            >
              旧留言记录（只读）
            </button>
            {archiveOpen && (
              <div className="campus-archive-log">
                {archive.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </div>
            )}
          </>
        )}
        {pending && (
          <p className="campus-typing" role="status">
            对方正在输入中<span>…</span>
          </p>
        )}
        {!pending && options.length === 0 && guide && (
          <p className="campus-next-step">
            <strong>下一步：{guide.title}</strong>
            <span>{guide.detail}</span>
            {guide.view === "moments" && (
              <button className="campus-moments-link" onClick={() => play.navigate("wechat", { view: "moments" })}>去朋友圈查看</button>
            )}
          </p>
        )}
        {options.length > 0 && (
          <>
            {openedFor === key && (
              <div
                className="campus-reply-options"
                role="group"
                aria-label="预设回复选项"
              >
                {options.map((c) => (
                  <button
                    key={c.target}
                    onClick={() => {
                      setOpenedFor("");
                      play.choose(c.target);
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <button
              className="campus-choice-entry"
              aria-expanded={openedFor === key}
              onClick={() => setOpenedFor(openedFor === key ? "" : key)}
            >
              选择回复 <span>{openedFor === key ? "⌄" : "⌃"}</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
