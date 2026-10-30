import { useEffect, useRef, useState, type ComponentProps } from "react";
import { chunkManifest, readParts } from "../runtime/chunkedAssets";

/** Small/local videos use the original native player; published large videos load on demand. */
export function PublishedVideo(props: ComponentProps<"video">) {
  const { src = "" } = props;
  const chunked = /^\.\/author-media\/[a-f0-9]{64}\.(mp4|mov)\.parts\.json$/.test(src);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState("");
  const current = useRef({ url: "", abort: new AbortController(), busy: false });
  useEffect(() => {
    const session = { url: "", abort: new AbortController(), busy: false };
    current.current = session;
    setUrl(""); setBusy(false); setPercent(0); setError("");
    return () => { session.abort.abort(); if (session.url) URL.revokeObjectURL(session.url); };
  }, [src]);
  async function load() {
    const session = current.current;
    if (session.busy) return;
    session.busy = true; setBusy(true); setError("");
    try {
      const r = await fetch(src, { signal: session.abort.signal, cache: "force-cache" });
      if (!r.ok) throw Error("视频暂时没有加载成功，请重试。");
      const m = chunkManifest(await r.json());
      if (!m.mime.startsWith("video/")) throw Error("视频资源格式不正确。");
      const bytes = await readParts(m, session.abort.signal, (done, total) => setPercent(Math.round(done / total * 100)));
      session.abort.signal.throwIfAborted();
      session.url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: m.mime }));
      setUrl(session.url);
    } catch (e) {
      if (!session.abort.signal.aborted) setError(e instanceof Error ? e.message : "视频加载失败，请重试。");
    } finally {
      session.busy = false;
      if (!session.abort.signal.aborted) setBusy(false);
    }
  }
  if (!chunked) return <video {...props} />;
  if (url) return <video {...props} src={url} />;
  return <div className="published-video-pending" onClick={e => e.stopPropagation()}>
    <p role="status">{error || (busy ? `正在载入视频 ${percent}%` : "视频较大，首次播放前需要加载。")}</p>
    <button disabled={busy} onClick={() => void load()}>{busy ? "正在加载…" : error ? "重新加载" : "加载视频"}</button>
  </div>;
}
