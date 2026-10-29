import { ContentUpdateNotice } from "./ContentUpdateNotice";
import { RuntimeBoundary } from "./RuntimeBoundary";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
import { publicCast } from "../authoring/runtime";
import { CampusContext } from "../personalization/CampusContext";
import { PlayerSetup } from "../personalization/PlayerSetup";
import {
  PROFILE_KEY,
  readProfile,
  personalizeWork,
  type PlayerProfile,
} from "../personalization/profile";
function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState("");
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    try {
      return readProfile(localStorage.getItem(PROFILE_KEY));
    } catch {
      return null;
    }
  });
  const [entered, setEntered] = useState(false);
  const [storageNote, setStorageNote] = useState("");
  const [personalWork, setPersonalWork] = useState<Work | null>(null);
  function enter(p: PlayerProfile) {
    if (!work) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      setStorageNote("浏览器未允许保存个人设定，本次仍可体验。");
    }
    setProfile(p);
    setPersonalWork(personalizeWork(work, p));
    setEntered(true);
  }
  useEffect(() => {
    const abort = new AbortController();
    fetch(
      new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : new URLSearchParams(location.search).get("template") === "blank"
          ? "./blank-work.json"
          : "./work.json",
      { signal: abort.signal, cache: "no-store" },
    )
      .then((r) => {
        if (!r.ok) throw Error("缺少作品文件，请运行 npm run story:build");
        return r.json();
      })
      .then((x) => {
        const w = validateWork(x);
        document.title =
          w.title === "捡手机" ? "捡手机" : w.title + " · 捡手机";
        setWork(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  return (
    <main className="story-runtime">
      <ContentUpdateNotice />
      {work ? (
        ["shoukun-foundation", "shoukun-good-weather"].includes(work.id) ? (
          entered && personalWork ? (
            <>
              <CampusContext.Provider
                value={
                  profile ? { profile, cast: publicCast(personalWork) } : null
                }
              >
                <RuntimeBoundary key={personalWork.id}>
                  <Phone work={personalWork} />
                </RuntimeBoundary>
              </CampusContext.Provider>
              <button
                className="profile-control"
                onClick={() => setEntered(false)}
              >
                我的设定
              </button>
              {storageNote && (
                <p className="profile-storage-note" role="status">
                  {storageNote}
                </p>
              )}
            </>
          ) : (
            <PlayerSetup
              saved={profile}
              onEnter={enter}
              chapter={work.id === "shoukun-good-weather"}
            />
          )
        ) : (
          <RuntimeBoundary key={work.id}>
            <Phone work={work} />
          </RuntimeBoundary>
        )
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
