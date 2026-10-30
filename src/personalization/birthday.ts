import { safeMedia, type Runtime, type Work } from "../schema";

// Store only a stable item ID in the save; an uploaded image can resolve on the next update.
export function selectedWallpaper(work: Work, state: Runtime) {
  const id = state.variables["phone.wallpaperItem"];
  const image = typeof id === "string" ? safeMedia(work.data.files?.find(item => item.id === id)?.media || "") : "";
  return image.startsWith("data:image/") ? image : work.phone.wallpaper;
}
