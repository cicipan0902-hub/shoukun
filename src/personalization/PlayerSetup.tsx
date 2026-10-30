import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowUpRight,
  Sparkles,
  MessageCircle,
  Camera,
  Heart,
} from "lucide-react";
import { newRunId, profileSchema, type PlayerProfile } from "./profile";
import { playerAvatar } from "./playerAvatar";
import { AvatarImage } from "../media/AvatarImage";
import { safeMedia } from "../schema";
import "./setup.css";

export function PlayerSetup({
  saved,
  chapter = false,
  background = "",
  defaultAvatar = "",
  onEnter,
}: {
  saved: PlayerProfile | null;
  chapter?: boolean;
  background?: string;
  defaultAvatar?: string;
  onEnter: (p: PlayerProfile) => void;
}) {
  const [name, setName] = useState(saved?.playerName || "");
  const [playerClass, setClass] = useState(saved?.playerClass || "班级待定");
  const [avatar, setAvatar] = useState(saved?.avatar || "");
  const [busy, setBusy] = useState(false);
  const selection = useRef(0);
  const [error, setError] = useState("");
  async function selectAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const request = ++selection.current;
    setBusy(true);
    setError("");
    try {
      const image = await playerAvatar(file);
      if (request === selection.current) setAvatar(image);
    } catch (reason) {
      if (request === selection.current) setError(reason instanceof Error ? reason.message : "图片读取失败，请重试。");
    } finally {
      if (request === selection.current) setBusy(false);
    }
  }
  function submit(resume: boolean) {
    if (busy) return;
    const result = profileSchema.safeParse({
      runId: resume && saved ? saved.runId : newRunId(),
      playerName: name,
      starName: saved?.starName || "朱志鑫",
      playerClass,
      temperament: saved?.temperament,
      avatar,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onEnter(result.data);
  }
  function start(e: FormEvent) {
    e.preventDefault();
    submit(false);
  }
  const photo = safeMedia(background);
  return (
    <section className={`player-setup${photo ? " has-background" : ""}`} aria-label="进入故事前的个人设定">
      {photo && <img className="setup-background" src={photo} alt="" />}
      <div className="setup-orbit" aria-hidden="true" />
      <div className="setup-intro">
        <span className="setup-kicker">
          <Sparkles size={14} /> AFTER CLASS, BEFORE SUNSET
        </span>
        <p className="setup-chapter">
          {chapter ? "第一章 · 好天气" : "校园手机故事 · 放学后，未完待续"}
        </p>
        <h1>
          有些心事，
          <br />
          {chapter ? "从好天气开始。" : "藏在放学以后。"}
        </h1>
        <p className="setup-lead">
          哥哥的朋友，走廊里的学长。
          <br />
          {chapter
            ? "开学典礼之后，你记住了一个名字。"
            : "从一句「顺路」，慢慢靠近他的世界。"}
        </p>
        <div className="setup-features">
          <span>
            <MessageCircle size={16} />
            私聊
          </span>
          <span>
            <Camera size={16} />
            校园日常
          </span>
          <span>
            <Heart size={16} />
            你的选择
          </span>
        </div>
        <p className="setup-caption">微信 · 微博 · 相册 · 电话 · Instagram</p>
      </div>
      <form className="setup-card" onSubmit={start}>
        <span className="setup-step">01 / YOUR STORY</span>
        <h2>这次，以你的名字。</h2>
        <p className="setup-card-copy">角色会在聊天和故事里这样称呼你。</p>
        <div className="setup-avatar-row">
          <span className="setup-avatar"><AvatarImage name={name || "我"} src={avatar || defaultAvatar} /></span>
          <div>
            <label className="setup-avatar-picker">
              {busy ? "正在准备照片…" : "选择你的头像"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} disabled={busy} />
            </label>
            <p className="setup-avatar-hint">照片只保存在当前浏览器，不会上传。</p>
            {avatar && <button className="setup-avatar-reset" type="button" disabled={busy} onClick={() => setAvatar("")}>使用默认头像</button>}
          </div>
        </div>
        <label>
          你的昵称
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
            placeholder="希望他怎么称呼你？"
            autoComplete="nickname"
          />
        </label>
        <label>
          你的班级
          <input
            value={playerClass}
            onChange={(e) => setClass(e.target.value)}
            maxLength={20}
            required
          />
        </label>
        {error && (
          <p className="setup-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <button
            type="button"
            className="setup-resume"
            disabled={busy}
            onClick={() => submit(true)}
          >
            保存设定并继续故事 <ArrowUpRight size={17} />
          </button>
        )}
        <button className="setup-submit" type="submit" disabled={busy}>
          {saved ? "以新设定开始" : "让故事发生"}
          <ArrowUpRight size={18} />
        </button>
        <p className="setup-footnote">
          朱志鑫校园 AU · 架空同人演示
          <br />
          资料和进度保存在当前浏览器
        </p>
      </form>
    </section>
  );
}
