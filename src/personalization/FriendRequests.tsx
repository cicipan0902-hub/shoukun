import { useContext } from "react";
import { CampusPlayContext } from "./CampusPlayContext";
import { availableRequests, friendState } from "./chatRuntime";
import { AvatarImage } from "../media/AvatarImage";
export function FriendRequests({ onChat }: { onChat: (name: string) => void }) {
  const play = useContext(CampusPlayContext);
  if (!play) return <p className="skin-empty">暂无好友申请</p>;
  const requests = availableRequests(play.work, play.state).filter(
    (r) =>
      r.direction === "outgoing" ||
      friendState(play.work, play.state, r.contactId) !== "met",
  );
  return (
    <div className="wx-friend-requests">
      <p className="wx-friend-explainer">
        通过活动或共同好友认识的人，会在这里出现好友申请。
      </p>
      {requests.length === 0 && <p className="skin-empty">暂无新的好友申请</p>}
      {requests.map((r) => {
        const card = play.work.data.contacts?.find(
          (c) => c.id === r.contactId + "-card",
        );
        const state = friendState(play.work, play.state, r.contactId);
        return (
          <article key={r.id}>
            <span className="skin-avatar">
              <AvatarImage
                name={card?.title || r.contactId}
                src={card?.avatar}
              />
            </span>
            <div>
              <strong>{card?.title || r.contactId}</strong>
              <p>{r.message}</p>
              <small>
                {state === "accepted"
                  ? "已成为好友"
                  : state === "requested"
                    ? r.direction === "incoming"
                      ? "收到好友申请"
                      : "好友验证中"
                    : "活动中认识 · 尚未添加"}
              </small>
            </div>
            {state === "accepted" ? (
              <button onClick={() => onChat(card?.title || r.contactId)}>
                发消息
              </button>
            ) : r.direction === "incoming" && state === "requested" ? (
              <button onClick={() => play.event("friendAccept", r.id)}>
                同意
              </button>
            ) : r.direction === "outgoing" && state === "met" ? (
              <button onClick={() => play.event("friendRequest", r.id)}>
                发送申请
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
