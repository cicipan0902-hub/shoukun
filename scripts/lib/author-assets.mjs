import { readFile, realpath, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { resolve, sep, extname } from "node:path";
export function safeProjectPath(root, file) {
  if (
    typeof file !== "string" ||
    /^(?:[a-z]+:|\/|\\)/i.test(file) ||
    file.includes("\\")
  )
    throw Error(`必须使用项目内的相对路径: ${file}`);
  const target = resolve(root, file);
  if (!target.startsWith(resolve(root) + sep)) throw Error(`路径越界: ${file}`);
  return target;
}
function detect(buffer) {
  if (buffer.length >= 24 && buffer.subarray(4, 8).toString() === "ftyp") {
    const boxSize = buffer.readUInt32BE(0);
    if (boxSize >= 16 && boxSize <= buffer.length && buffer.subarray(8, 12).toString() === "qt  ")
      return "video/quicktime";
    const brands = new Set(["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "MSNV"]);
    if (boxSize >= 16 && boxSize <= buffer.length && brands.has(buffer.subarray(8, 12).toString()))
      return "video/mp4";
  }
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString()))
    return "image/gif";
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WAVE"
  )
    return "audio/wav";
  if (buffer.subarray(0, 4).toString() === "OggS") return "audio/ogg";
  if (
    buffer.subarray(0, 3).toString() === "ID3" ||
    (buffer[0] === 255 && (buffer[1] & 224) === 224)
  )
    return "audio/mpeg";
  return "";
}
const extensions = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};
export async function loadAuthorAssets(root, manifest) {
  const media = {},
    report = [];
  const assetsRoot = await realpath(resolve(root, "assets"));
  for (const asset of manifest.assets) {
    if (asset.file === null) {
      if (asset.required) throw Error(`必需素材未提供: ${asset.id}`);
      media[asset.id] = "";
      report.push({ id: asset.id, status: "placeholder", file: null });
      continue;
    }
    const candidate = safeProjectPath(root, asset.file);
    if (!candidate.startsWith(resolve(root, "assets") + sep))
      throw Error(`素材必须放在 assets/ 内: ${asset.file}`);
    let actual;
    try {
      actual = await realpath(candidate);
    } catch (error) {
      if (error.code !== "ENOENT" || asset.required)
        throw Error(`素材路径不可读: ${asset.id} (${asset.file})`);
      media[asset.id] = "";
      report.push({
        id: asset.id,
        status: "missing-using-placeholder",
        file: asset.file,
      });
      continue;
    }
    if (!actual.startsWith(assetsRoot + sep))
      throw Error(`素材链接越界: ${asset.file}`);
    const data = await readFile(actual),
      expected = extensions[extname(asset.file).toLowerCase()];
    const detected = detect(data);
    if (!expected || (detected !== expected && !(expected === "video/mp4" && detected === "video/quicktime")))
      throw Error(
        `素材格式或文件内容错误: ${asset.id}，请用 PNG/JPEG/WebP/GIF/MP3/WAV/OGG/MP4/MOV`,
      );
    if (data.length > (expected.startsWith("video/") ? 128 : expected.startsWith("image/") ? 4 : 10) * 1024 * 1024)
      throw Error(`素材过大: ${asset.id}，请先压缩`);
    if (detected.startsWith("video/")) {
      const name = createHash("sha256").update(data).digest("hex") + (detected === "video/quicktime" ? ".mov" : ".mp4");
      const directory = resolve(root, "public/author-media");
      await mkdir(directory, { recursive: true });
      await copyFile(actual, resolve(directory, name), constants.COPYFILE_FICLONE);
      media[asset.id] = `./author-media/${name}`;
    } else media[asset.id] = `data:${expected};base64,${data.toString("base64")}`;
    report.push({
      id: asset.id,
      status: "ready",
      file: asset.file,
      bytes: data.length,
    });
  }
  return { media, report };
}
