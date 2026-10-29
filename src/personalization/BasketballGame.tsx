import { useContext, useEffect, useRef, useState } from "react";
import type { Item } from "../schema";
import type { PublicActivityDocument } from "../authoring/documents";
import { CampusPlayContext } from "./CampusPlayContext";
import { court, launch, stepBall, type Ball } from "../vendor/hoops88/physics";
import "./basketball.css";
export function BasketballGame({ item, document: doc, back }: { item: Item; document: PublicActivityDocument; back: () => void }) {
  const play = useContext(CampusPlayContext)!;
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ ball: null as Ball | null, power: 0, direction: 1, charging: false, angle: 65 });
  const [power, setPower] = useState(0), [flying, setFlying] = useState(false), [angle, setAngle] = useState(65);
  const [notice, setNotice] = useState("按住投篮蓄力，松开出手。");
  const shots = Number(play.state.variables[`${doc.id}.shots`] || 0);
  const hits = Number(play.state.variables[`${doc.id}.hits`] || 0);
  const settled = play.state.variables[`${doc.id}.settled`] === true;
  const current = useRef({ play, shots, hits, settled });
  useEffect(() => { current.current = { play, shots, hits, settled }; }, [play, shots, hits, settled]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    let frame = 0, last = 0, accumulator = 0;
    function tick(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
      const v = live.current;
      if (v.charging) {
        v.power += v.direction * 1.1 * dt;
        if (v.power >= 1) { v.power = 1; v.direction = -1; }
        if (v.power <= 0) { v.power = 0; v.direction = 1; }
        setPower(v.power);
      }
      accumulator += dt;
      while (accumulator >= 1 / 120) {
        if (v.ball) stepBall(v.ball, 1 / 120);
        accumulator -= 1 / 120;
      }
      if (v.ball?.done) {
        const hit = v.ball.scored; v.ball = null; setFlying(false);
        const c = current.current;
        if (!c.settled && c.shots < 5) c.play.event("basketballShot", `${doc.id}.${c.shots}.${c.hits}.${hit ? "hit" : "miss"}`);
        setNotice(hit ? "进了。下一球，照自己的节奏来。" : "没进。下一球还有机会。");
      }
      const c = ctx!;
      c.fillStyle = "#e9efeb"; c.fillRect(0, 0, 480, 540);
      c.fillStyle = "#b7c7b2"; c.fillRect(0, 310, 480, 180);
      c.fillStyle = "#d7ad7d"; c.fillRect(0, 490, 480, 50);
      c.strokeStyle = "#fff"; c.lineWidth = 3; c.strokeRect(25, 340, 430, 150);
      c.strokeStyle = "#71847a"; c.lineWidth = 7; c.beginPath(); c.moveTo(400, 60); c.lineTo(400, 490); c.stroke();
      c.fillStyle = "#fff"; c.fillRect(391, 60, 14, 110);
      c.strokeStyle = "#8a9690"; c.lineWidth = 2;
      for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(295 + i * 15, 172); c.lineTo(315 + i * 8, 215); c.stroke(); }
      c.strokeStyle = "#bb593b"; c.lineWidth = 6; c.beginPath(); c.moveTo(295, 170); c.lineTo(385, 170); c.stroke();
      c.fillStyle = "#3f6257"; c.fillRect(54, 441, 38, 49);
      const b = v.ball || { x: 80, y: 420 };
      c.fillStyle = "#da773b"; c.beginPath(); c.arc(b.x, b.y, court.radius, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#733b24"; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(b.x - 17, b.y); c.lineTo(b.x + 17, b.y); c.stroke();
      if (!v.ball && current.current.shots < 5 && !current.current.settled) {
        c.setLineDash([5, 7]); c.strokeStyle = "#53766a"; c.beginPath(); c.moveTo(80, 420); c.lineTo(80 + Math.cos(v.angle * Math.PI / 180) * 95, 420 - Math.sin(v.angle * Math.PI / 180) * 95); c.stroke(); c.setLineDash([]);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const cancel = () => { live.current.charging = false; live.current.power = 0; setPower(0); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, [doc.id]);
  function release() {
    const v = live.current; if (!v.charging) return;
    v.charging = false;
    if (shots >= 5 || settled || v.ball) return;
    v.ball = launch(v.power, v.angle); v.power = 0; setPower(0); setFlying(true); setNotice("球在空中……");
  }
  return <div className="basketball-game">
    <header className="app-nav"><button onClick={back}>‹ 返回手机</button><strong>趣味投篮赛</strong><span /></header>
    <div className="basketball-scroll"><h2>{item.title}</h2>
      <p className="basketball-score" role="status">剩余 {5 - shots} 球 · 已中 {hits} / 5</p>
      <canvas ref={canvas} width={480} height={540} aria-label="篮球场：按住下方投篮按钮蓄力，松开投球" />
      {settled ? <><p>成绩已采用：{hits} / 5。回微信「运动会临时群」查看赛后消息。</p><button onClick={() => play.navigate("wechat", { thread: "运动会临时群" })}>回群继续剧情</button></> : shots >= 5 ? <><p role="status">五球结束，命中 {hits} 球。任何成绩都可以继续。</p><button onClick={() => play.event("basketballFinish", `${doc.id}.${hits}`)}>采用本次成绩，继续剧情</button></> : <>
        <p role="status">{notice}</p><label>出手角度 {angle}°<input type="range" min="45" max="80" value={angle} disabled={flying} onChange={(e) => { const value = Number(e.target.value); setAngle(value); live.current.angle = value; }} /></label>
        <meter min={0} max={1} value={power} aria-label="投篮力度" />
        <button className="basketball-shoot" disabled={flying} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); if (live.current.ball || live.current.charging || shots >= 5 || settled) return; live.current.charging = true; live.current.power = 0; live.current.direction = 1; }} onPointerUp={release} onPointerCancel={() => { live.current.charging = false; setPower(0); }} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat && !flying) { e.preventDefault(); live.current.charging = true; live.current.power = 0; live.current.direction = 1; } }} onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }} onContextMenu={(e) => e.preventDefault()}>按住蓄力 · 松开投篮</button>
        <small>先试试六成左右的力度，再微调角度。退出会保留已投完的球；尚在空中的球不计次。</small>
      </>}
      {!settled && <button className="basketball-secondary" disabled={flying} onClick={() => { live.current.charging = false; live.current.power = 0; setPower(0); play.event("basketballReset", doc.id); setNotice("重新开始，别急。"); }}>重新开始五球</button>}
      <small className="basketball-credit">投篮核心改编自 HOOPS '88 · Carlos Sardo &amp; Eduardo Sardo · MIT</small>
    </div>
  </div>;
}
