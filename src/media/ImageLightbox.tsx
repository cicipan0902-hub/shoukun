import { useEffect, useRef } from "react";
import { safeMedia } from "../schema";
import "./media.css";
export function ImageLightbox({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault();
        close.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const media = safeMedia(src);
  if (!media.startsWith("data:image/")) return null;
  return (
    <div
      className="chat-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片大图"
    >
      <button ref={close} onClick={onClose}>
        关闭大图
      </button>
      <img src={media} alt={title} />
      <p>{title}</p>
    </div>
  );
}
