// Keep only a small decoded JPEG in the existing local player profile.
// Re-encoding also omits the original photo's metadata.
export async function playerAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("请选择 JPG、PNG 或 WebP 图片；其他格式请先转换。");
  if (file.size > 12 * 1024 * 1024) throw Error("照片超过 12 MB，请选择小一点的图片。");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(Error("这张图片无法读取，请换一张试试。"));
      image.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw Error("图片尺寸无效，请重新选择。");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("浏览器暂时无法处理图片，请换个浏览器重试。");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 320, 320);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
