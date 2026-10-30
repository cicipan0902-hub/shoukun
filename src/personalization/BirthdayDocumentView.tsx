import { useContext, useState } from "react";
import { CampusPlayContext } from "./CampusPlayContext";
import { AvatarImage } from "../media/AvatarImage";
import { visible } from "../engine";
import { safeMedia, type Item } from "../schema";
import type { PublicActivityDocument } from "../authoring/documents";
import { conditionsPass } from "./chatRuntime";
import "./birthday.css";

export function BirthdayDocumentView({ item, document: doc, back }: {
  item: Item; document: PublicActivityDocument; back: () => void;
}) {
  const play = useContext(CampusPlayContext);
  const [tab, setTab] = useState("wishes");
  if (!play || !doc.birthday) return null;
  const { state, work } = play;
  const config = doc.birthday;
  const pair = doc.kind === "photo-pair";
  const control = (id: string) => doc.controls.find(c => c.id === id);
  const allowed = (id: string) => {
    const c = control(id);
    return !!c && conditionsPass(c.conditions, state);
  };
  const select = (id: string) => {
    if (allowed(id)) play.event("documentAction", `${doc.id}.${id}`);
  };
  const awaitingFinalLine = pair && doc.controls.some(c => allowed(c.id));
  const picture = (id: string) => {
    const photo = work.data.photos?.find(p => p.id === id);
    const media = safeMedia(photo?.media || "");
    return <figure className="birthday-photo" key={id}>
      {media.startsWith("data:image/") ? <img src={media} alt={photo?.title || "生日照片"} /> : <div className="birthday-photo-pending">照片待放入</div>}
      <figcaption>{awaitingFinalLine ? "照片正在显影" : photo?.title || "生日照片"}</figcaption>
    </figure>;
  };
  return <div className={`activity-document birthday-document ${pair ? "birthday-ending" : ""}`}>
    <header className="app-nav"><button aria-label="返回" onClick={back}>‹ 返回</button><strong>{pair ? "拍立得" : "生日专题"}</strong><span /></header>
    <div className="activity-document-scroll">
      <small>{item.time}</small><h2>{item.title}</h2><p>{item.body}</p>
      {pair ? <>
        <div className="birthday-photo-pair">{config.memories.slice(0, awaitingFinalLine ? 1 : 2).map(picture)}</div>
        {doc.sections.filter(s => conditionsPass(s.conditions, state)).map((s, i) => <p key={i}>{s.text}</p>)}
        <div className="activity-controls">{doc.controls.filter(c => allowed(c.id)).map(c => <button key={c.id} onClick={() => select(c.id)}>{c.label}</button>)}</div>
      </> : <>
        <nav className="birthday-tabs" aria-label="生日专题分区">
          {[["wall", "祝福墙"], ["memories", "回忆"], ["wishes", "暗愿 · 仅自己"]].map(([id, title]) =>
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{title}</button>)}
        </nav>
        {tab === "wall" && <section aria-label="生日祝福墙">{config.blessings.map(blessing => {
          const contact = work.data.contacts.find(c => c.id === blessing.characterId + "-card");
          return <article className="birthday-blessing" key={blessing.characterId}>
            <span className="birthday-avatar"><AvatarImage src={contact?.avatar || ""} name={contact?.title || "朋友"} /></span>
            <div><strong>{contact?.title || "朋友"}</strong><p>{blessing.text}</p></div>
          </article>;
        })}</section>}
        {tab === "memories" && <section className="birthday-memory-grid" aria-label="生日回忆">{config.memories.filter(id => { const photo = work.data.photos?.find(p => p.id === id); return photo && visible(photo, state); }).map(picture)}</section>}
        {tab === "wishes" && <section className="birthday-wishes" aria-label="私人暗愿">
          <small>只存进自己的备忘录，不会发送给朋友。</small>
          {config.questions.map((q, index) => {
            const answer = String(state.variables[q.key] ?? "unset");
            const choices = doc.controls.filter(c => c.id.startsWith(q.id + "-"));
            return <fieldset key={q.id}><legend>{index + 1}. {q.prompt}</legend>
              {answer !== "unset" ? <p className="birthday-saved">{control(q.id + "-" + answer)?.label || "这次先留白。"}<small>已收好，可以以后再回看。</small></p> : choices.map(c => <button disabled={!allowed(c.id)} key={c.id} onClick={() => select(c.id)}>{c.label}</button>)}
            </fieldset>;
          })}
          {allowed("finish-wishes") ? <button className="birthday-continue" onClick={() => select("finish-wishes")}>{control("finish-wishes")?.label}</button> : <p className="birthday-private-note">{config.questions.every(q => state.variables[q.key] !== "unset") ? "愿望留在备忘录里了。回到文件，继续《拍立得 · 第一张合照》。" : "没想好的问题可以先留白。"}</p>}
        </section>}
      </>}
    </div>
  </div>;
}
