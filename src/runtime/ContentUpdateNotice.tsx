import { useEffect, useState } from "react";
declare const __GAME_BUILD__: string;
export function ContentUpdateNotice() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    async function check() {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("./release.json", { cache: "no-store", signal: abort.signal });
        if (!r.ok) return;
        const value: unknown = await r.json();
        if (active && value && typeof value === "object" && "build" in value && typeof value.build === "string" && value.build !== __GAME_BUILD__) setAvailable(true);
      } catch { /* An offline player can keep playing the current version. */ }
    }
    void check();
    const timer = window.setInterval(() => void check(), 60000);
    const focus = () => void check();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { active = false; abort.abort(); clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, []);
  if (!available) return null;
  return <button className="content-update-notice" onClick={() => window.location.reload()}>有新内容 · 刷新更新<br /><small>保留此网址下的游戏进度</small></button>;
}
