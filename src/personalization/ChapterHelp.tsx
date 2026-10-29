import { useContext, useState } from "react";
import { CampusPlayContext } from "./CampusPlayContext";
import { chapterGuide } from "./storyGuide";
import "./daily.css";
export function StoryGuide() {
  const play = useContext(CampusPlayContext);
  const [opened, setOpened] = useState(false);
  const guide = play && chapterGuide(play.work, play.state);
  if (!play || !guide) return null;
  return (
    <>
      <button
        className="campus-guide-toggle"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={() => setOpened(!opened)}
        aria-expanded={opened}
      >
        剧情指引
      </button>
      {opened && (
        <section
          className="campus-guide-panel"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="当前剧情指引"
        >
          <button
            className="campus-guide-close"
            onClick={() => setOpened(false)}
            aria-label="关闭剧情指引"
          >
            ×
          </button>
          <small>校园故事 · 当前进度</small>
          <h3>{guide.title}</h3>
          <p>{guide.detail}</p>
          <button
            onClick={() => {
              play.navigate(guide.app, { view: guide.view, thread: guide.thread, itemId: guide.itemId });
              setOpened(false);
            }}
          >
            打开{guide.view === "moments" ? "朋友圈" : ({ notes: "备忘录", photos: "相册", wechat: "微信", reminders: "提醒事项", files: "文件" }[guide.app] || "应用")}
          </button>
        </section>
      )}
    </>
  );
}
