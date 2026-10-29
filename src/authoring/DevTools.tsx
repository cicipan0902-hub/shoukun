import { useState } from "react";
import type { Runtime, Work } from "../schema";
import { initialRuntime } from "../schema";
import { choose, dispatch, testCondition } from "../engine";
import { publicCast } from "./runtime";
import { projectSchema } from "./schema";
import "./devtools.css";
export default function DevTools({
  work,
  state,
  onState,
}: {
  work: Work;
  state: Runtime;
  onState: (s: Runtime) => void;
}) {
  const [open, setOpen] = useState(false),
    [event, setEvent] = useState("read"),
    [target, setTarget] = useState("");
  let chapters: ReturnType<typeof projectSchema.shape.chapters.parse> = [];
  try {
    chapters = projectSchema.shape.chapters.parse(
      JSON.parse(String(work.variables["author.chapters"] || "[]")),
    );
  } catch {
    /* Older works have no author chapter manifest. */
  }
  return (
    <aside className="author-devtools">
      <button onClick={() => setOpen(!open)}>开发调试（仅开发环境）</button>
      {open && (
        <div>
          <p>仅操作当前作品的测试存档，不影响其他周目。</p>
          <button
            onClick={() =>
              onState(dispatch(work, initialRuntime(work), "start"))
            }
          >
            重置当前测试进度
          </button>
          <label>
            章节测试入口
            <select
              aria-label="章节测试入口"
              defaultValue=""
              onChange={(e) => {
                const c = chapters.find((c) => c.id === e.target.value);
                if (c)
                  onState(dispatch(work, state, c.entry.event, c.entry.target));
              }}
            >
              <option value="" disabled>
                选择章节
              </option>
              {chapters.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <p>章节跳转执行配置的测试入口，不自动补齐所有前置剧情。</p>
          <label>
            事件
            <select value={event} onChange={(e) => setEvent(e.target.value)}>
              {[
                "read",
                "openApp",
                "start",
                "callAnswered",
                "callEnded",
                "callDeclined",
              ].map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <input
            aria-label="事件目标 ID"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="事件目标 ID"
          />
          <button onClick={() => onState(dispatch(work, state, event, target))}>
            触发测试事件
          </button>
          <div>
            {state.choices.map((c) => (
              <button
                key={c.target}
                onClick={() => onState(choose(work, state, c.target))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <h4>章节状态</h4>
          {chapters.map((c) => (
            <p key={c.id}>
              {c.id}：
              {c.completeWhen.length &&
              (c.completeLogic === "any"
                ? c.completeWhen.some((x) => testCondition(x, state))
                : c.completeWhen.every((x) => testCondition(x, state)))
                ? "已完成"
                : "进行中 / 尚未完成"}
            </p>
          ))}
          <h4>人物资源</h4>
          {publicCast(work).map((c) => (
            <p key={c.id}>
              {c.avatar && <img src={c.avatar} alt="" />}
              {c.id} · {c.avatar ? "头像已导入" : "使用默认头像"}
            </p>
          ))}
          <h4>事件与关系变量</h4>
          <pre>
            {JSON.stringify(
              {
                completed: state.completed,
                unlocked: state.unlocked,
                scheduled: state.scheduled,
                variables: Object.fromEntries(
                  Object.entries(state.variables).filter(
                    ([k]) => !k.startsWith("author."),
                  ),
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </aside>
  );
}
