import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
export const PAGES_FILE_LIMIT = 25 * 1024 * 1024;
const hash = data => createHash("sha256").update(data).digest("hex");
const format = "foundphone-parts-v1";
const mapStrings = (value, replace) => typeof value === "string" ? replace(value) : Array.isArray(value) ? value.map(x => mapStrings(x, replace)) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, replace)])) : value;
export async function filesIn(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error("发布文件不允许软链接");
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) await walk(path); else files.push(relative(root, path));
    }
  }
  await walk(root); return files.sort();
}
export async function preparePublicArtifact(dist, target, { limit = PAGES_FILE_LIMIT, partSize = 8 * 1024 * 1024 } = {}) {
  if (resolve(dist) === resolve(target) || resolve(dist).startsWith(resolve(target) + "/")) throw Error("导出目录不能覆盖构建目录");
  if (partSize > limit || partSize < 1) throw Error("发布分片大小无效");
  const source = JSON.parse(await readFile(resolve(dist, "work.json"), "utf8"));
  await rm(target, { recursive: true, force: true });
  await cp(dist, target, { recursive: true });
  await mkdir(resolve(target, "runtime-data"), { recursive: true });
  async function parts(data, mime) {
    const names = [];
    for (let i = 0; i < data.length; i += partSize) {
      const bytes = data.subarray(i, i + partSize);
      const name = `runtime-data/${hash(bytes)}.${mime === "application/json" ? "txt" : "bin"}`;
      await writeFile(resolve(target, name), bytes); names.push("./" + name);
    }
    return { format, mime, byteLength: data.length, sha256: hash(data), parts: names };
  }
  const media = new Map();
  for (const file of await filesIn(target)) {
    if (!/^author-media\/[a-f0-9]{64}\.(mp4|mov)$/.test(file) || (await stat(resolve(target, file))).size <= limit) continue;
    const bytes = await readFile(resolve(target, file));
    const manifest = await parts(bytes, file.endsWith(".mov") ? "video/quicktime" : "video/mp4");
    await writeFile(resolve(target, file + ".parts.json"), JSON.stringify(manifest));
    await rm(resolve(target, file)); media.set("./" + file, "./" + file + ".parts.json");
  }
  const work = mapStrings(source, s => media.get(s) || s);
  const raw = Buffer.from(JSON.stringify(work));
  await writeFile(resolve(target, "work.json"), raw.length > limit ? JSON.stringify(await parts(raw, "application/json")) : raw);
  const releasePath = resolve(target, "release.json");
  const release = JSON.parse(await readFile(releasePath, "utf8"));
  const chapters = JSON.parse(String(work.variables["author.chapters"] || "[]"));
  await writeFile(releasePath, JSON.stringify({ ...release, platform: "cloudflare-pages", workId: work.id, revision: work.updatedAt,
    chapters: chapters.map(({ id, title }) => ({ id, title })) }));
  await writeFile(resolve(target, "_headers"), [
    "/", "  Cache-Control: no-cache", "/index.html", "  Cache-Control: no-cache",
    "/work.json", "  Cache-Control: no-store", "/release.json", "  Cache-Control: no-store",
    "/sw.js", "  Cache-Control: no-cache", "/registerSW.js", "  Cache-Control: no-cache",
    "/runtime-data/*", "  Cache-Control: public, max-age=31536000, immutable",
    "/author-media/*", "  Cache-Control: public, max-age=31536000, immutable", "",
  ].join("\n"));
  return { videos: media.size, workBytes: raw.length, chapters: chapters.length };
}
export async function inspectPublicArtifact(dist, target, { limit = PAGES_FILE_LIMIT } = {}) {
  const files = await filesIn(target);
  const sourceFiles = new Set(await filesIn(dist));
  for (const file of files) {
    if ((await stat(resolve(target, file))).size > limit) throw Error("超过 Cloudflare Pages 文件上限: " + file);
    if (!sourceFiles.has(file) && file !== "_headers" && !/^runtime-data\/[a-f0-9]{64}\.(bin|txt)$/.test(file) && !/^author-media\/[a-f0-9]{64}\.(mp4|mov)\.parts\.json$/.test(file)) throw Error("意外导出文件: " + file);
  }
  async function join(m) {
    if (m?.format !== format || !Array.isArray(m.parts) || !m.parts.length || !Number.isSafeInteger(m.byteLength) || m.byteLength <= 0 || m.byteLength > 256 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(m.sha256)) throw Error("发布清单格式无效");
    const buffers = [];
    for (const part of m.parts) {
      if (!/^\.\/runtime-data\/[a-f0-9]{64}\.(bin|txt)$/.test(part)) throw Error("非法发布资源路径");
      const bytes = await readFile(resolve(target, part));
      if (bytes.length > 8 * 1024 * 1024 || hash(bytes) !== part.split("/").at(-1).split(".")[0]) throw Error("分片内容校验失败");
      buffers.push(bytes);
    }
    const bytes = Buffer.concat(buffers);
    if (bytes.length !== m.byteLength || hash(bytes) !== m.sha256) throw Error("资源重组校验失败");
    return bytes;
  }
  let work = JSON.parse(await readFile(resolve(target, "work.json"), "utf8"));
  if (work.format === format) {
    if (work.mime !== "application/json") throw Error("剧情清单类型错误");
    work = JSON.parse((await join(work)).toString("utf8"));
  }
  const rewrites = new Map(); let videos = 0;
  for (const file of files.filter(f => /^author-media\/.*\.parts\.json$/.test(f))) {
    const m = JSON.parse(await readFile(resolve(target, file), "utf8"));
    const original = file.replace(/\.parts\.json$/, "");
    if (m.mime !== (original.endsWith(".mov") ? "video/quicktime" : "video/mp4")) throw Error("视频类型不匹配");
    const bytes = await join(m), before = await readFile(resolve(dist, original));
    if (!bytes.equals(before)) throw Error("视频字节发生改变: " + original);
    rewrites.set("./" + file, "./" + original); videos++;
  }
  const restored = mapStrings(work, s => rewrites.get(s) || s);
  const original = JSON.parse(await readFile(resolve(dist, "work.json"), "utf8"));
  if (JSON.stringify(restored) !== JSON.stringify(original)) throw Error("导出后的剧情、素材引用或存档标识与原构建不一致");
  const raw = JSON.stringify(work);
  for (const src of new Set(raw.match(/\.\/author-media\/[a-f0-9]{64}\.(?:mp4|mov)(?:\.parts\.json)?/g) || [])) await stat(resolve(target, src));
  if (work.id !== "shoukun-good-weather" || work.updatedAt !== 1) throw Error("错误作品或存档版本");
  return { files: files.length, videos, workId: work.id, revision: work.updatedAt, chapters: JSON.parse(String(work.variables["author.chapters"] || "[]")).length };
}
