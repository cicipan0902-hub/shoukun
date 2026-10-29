import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Sparkles,
  MessageCircle,
  Camera,
  Heart,
} from "lucide-react";
import { newRunId, profileSchema, type PlayerProfile } from "./profile";
import "./setup.css";

export function PlayerSetup({
  saved,
  chapter = false,
  onEnter,
}: {
  saved: PlayerProfile | null;
  chapter?: boolean;
  onEnter: (p: PlayerProfile) => void;
}) {
  const [name, setName] = useState(saved?.playerName || "");
  const [playerClass, setClass] = useState(saved?.playerClass || "班级待定");
  const [temperament, setTemperament] = useState<PlayerProfile["temperament"]>(
    saved?.temperament || "温柔细腻，有自己的想法",
  );
  const [error, setError] = useState("");
  function start(e: FormEvent) {
    e.preventDefault();
    const result = profileSchema.safeParse({
      runId: newRunId(),
      playerName: name,
      starName: "朱志鑫",
      playerClass,
      temperament,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onEnter(result.data);
  }
  return (
    <section className="player-setup" aria-label="进入故事前的个人设定">
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
        <label>
          你在故事里的性格
          <select
            value={temperament}
            onChange={(e) =>
              setTemperament(e.target.value as PlayerProfile["temperament"])
            }
          >
            {[
              "温柔细腻，有自己的想法",
              "活泼，有点小倔强",
              "慢热，但很认真",
              "直率，喜欢开玩笑",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
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
            onClick={() => onEnter(saved)}
          >
            继续 {saved.playerName} 的故事 <ArrowUpRight size={17} />
          </button>
        )}
        <button className="setup-submit" type="submit">
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
