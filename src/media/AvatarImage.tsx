import { safeMedia } from "../schema";
export function AvatarImage({
  name,
  src = "",
}: {
  name: string;
  src?: string;
}) {
  const image = safeMedia(src);
  return (
    <>
      {name.slice(0, 1) || "人"}
      {image?.startsWith("data:image/") && (
        <img
          key={image}
          src={image}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            margin: 0,
            display: "block",
            maxWidth: "none",
            borderRadius: "inherit",
          }}
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </>
  );
}
