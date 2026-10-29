import { Fragment, useContext, useState } from "react";
import { safeMedia, type Item } from "../schema";
import type { PublicActivityDocument } from "../authoring/documents";
import { CampusPlayContext } from "./CampusPlayContext";
import { conditionsPass } from "./chatRuntime";
import "./activity-documents.css";
import { BasketballGame } from "./BasketballGame";
export function ActivityDocumentView({ item, document: doc, back }: {
  item: Item; document: PublicActivityDocument; back: () => void;
}) {
  const play = useContext(CampusPlayContext);
  const [selected, setSelected] = useState("");
  if (!play) return null;
  if (doc.kind === "basketball") return <BasketballGame item={item} document={doc} back={back} />;
  const name = (id: string) => play.work.data.contacts.find((c) => c.id === id + "-card")?.title || id;
  const inspected = (id: string) => play.state.variables[`document.${doc.id}.${id}.read`] === true;
  const required = doc.entries.filter((r) => r.required);
  const completed = (id: string) => play.state.completed.includes(`document-${doc.id}-action-${id}`);
  const submitted = doc.controls.some((c) => completed(c.id));
  const audio = safeMedia(item.media);
  const audioReady = audio.startsWith("data:audio/");
  const videoReady = audio.startsWith("data:video/") || audio.startsWith("./author-media/");
  const selectedEntry = doc.entries.find((entry) => entry.id === selected);
  const selectedClip = selectedEntry && play.work.data.files.find((clip) => clip.id === selectedEntry.id);
  const selectedMedia = safeMedia(selectedClip?.media || "");
  const selectedVideo = selectedMedia.startsWith("data:video/") || selectedMedia.startsWith("./author-media/");
  return <div className="activity-document">
    <header className="app-nav"><button aria-label="返回" onClick={back}>‹ 文件</button><strong>{doc.kind === "roster" ? "报名核对" : doc.kind === "media-gallery" ? "KTV 现场" : doc.kind === "media-review" ? "试听记录" : "现场记录"}</strong><span /></header>
    <div className="activity-document-scroll">
      <small>{item.time}</small><h2>{item.title}</h2>
      {doc.kind === "media-review" && (videoReady ? <video className="activity-video" controls playsInline preload="metadata" aria-label="Demo视频" src={audio} /> : audioReady ? <audio className="activity-audio" controls preload="metadata" aria-label="Demo音频" src={audio} /> : <p className="activity-media-pending" role="status">{item.meta.mediaPendingLabel || "音频尚未提供 · 当前为文字试听记录，没有实际音频播放。"}</p>)}
      <p>{item.body}</p>
      {doc.kind === "media-gallery" && <>
        <div className="activity-video-options" role="group" aria-label="选择演唱者">
          {doc.entries.map((entry) => <button key={entry.id} aria-pressed={selected === entry.id} onClick={() => {
            setSelected(entry.id);
            play.event("documentInspect", `${doc.id}.${entry.id}`);
          }}>{name(entry.characterId)}<small>{selected === entry.id ? "当前选择" : "点击观看"}</small></button>)}
        </div>
        {selectedEntry && <section className="activity-video-selection" aria-label={`${name(selectedEntry.characterId)}的演唱视频`}>
          <h3>{name(selectedEntry.characterId)}</h3>
          {selectedVideo ? <video key={selectedEntry.id} className="activity-video" controls playsInline preload="metadata" aria-label={`${name(selectedEntry.characterId)}演唱`} src={selectedMedia} /> : <p className="activity-media-pending" role="status">这段视频尚未提供，可以先看其他人或回群继续。</p>}
        </section>}
      </>}
      {doc.kind === "roster" && <>
        <p className="activity-progress" role="status">公开资料已查看 {required.filter((r) => inspected(r.id)).length} / {required.length}</p>
        <div className="activity-table-scroll"><table><caption>文化节报名项目与当前状态 · 点姓名展开资料</caption><thead><tr><th>姓名</th><th>参与项目</th><th>状态</th></tr></thead><tbody>
          {doc.entries.map((r) => <Fragment key={r.id}>
            <tr><td><button aria-label={`查看${name(r.characterId)}的报名资料`} aria-expanded={r.id === selected} onClick={() => { setSelected(selected === r.id ? "" : r.id); play.event("documentInspect", `${doc.id}.${r.id}`); }}>{name(r.characterId)}{inspected(r.id) && <span aria-label="已查看"> ✓</span>}</button></td><td>{r.project}</td><td>{r.status}</td></tr>
            {r.id === selected && <tr className="activity-profile-row"><td colSpan={3}><section className="activity-profile" aria-label={`${name(r.characterId)}的公开资料`}><h3>{name(r.characterId)}</h3><p>{r.project}</p><p>{r.profile}</p><small>{r.status}</small></section></td></tr>}
          </Fragment>)}
        </tbody></table></div>
      </>}
      {doc.sections.filter((s) => conditionsPass(s.conditions, play.state)).map((s, i) => <section className="activity-scene-section" key={i}><p>{s.text}</p></section>)}
      <div className="activity-controls">{doc.controls.map((control) => {
        const allowed = conditionsPass(control.conditions, play.state);
        if (!allowed && !(["roster", "media-review"].includes(doc.kind) && !completed(control.id))) return null;
        return <button key={control.id} disabled={!allowed} onClick={() => play.event("documentAction", `${doc.id}.${control.id}`)}>{control.label}</button>;
      })}</div>
      {doc.kind === "roster" && submitted && <p className="activity-hint" role="status">本轮核对已提交。资料仍可回看，回工作群继续即可。</p>}
      {doc.kind === "roster" && !submitted && required.every((r) => inspected(r.id)) && <p className="activity-hint">已查看本轮必需资料。提交后回工作群继续讨论。</p>}
      {doc.kind === "roster" && !required.every((r) => inspected(r.id)) && <p className="activity-hint">点名字查看资料，核对完必需条目后才能提交。其他工作成员的资料可按需查看。</p>}
    </div>
  </div>;
}
