import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const read = (p) => readFile(resolve(root, p), "utf8");
const allowedRoot = new Set(["index.html", "icon.svg", "manifest.webmanifest", "registerSW.js", "release.json", "work.json", "sw.js", "LICENSE", "THIRD_PARTY_LICENSES.txt", "BRAND_NOTICE.txt", "MYMY_NOTICE.txt", "HOOPS88_LICENSE.txt"]);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw Error("发布产物不允许软链接");
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);else files.push(relative(root, path));
  }
}
await walk(root);
for (const path of files) {
  const top = path.split("/")[0];
  if (!allowedRoot.has(path) && !/^workbox-[\w-]+\.js$/.test(path) && !["assets", "icon-assets", "author-media"].includes(top)) throw Error("发布包含未许可文件: " + path);
  if (top === "author-media" && !/^author-media\/[a-f0-9]{64}\.(mp4|mov)$/.test(path)) throw Error("媒体文件名异常: " + path);
  if (["assets", "icon-assets"].includes(top) && ![".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extname(path))) throw Error("发布包含源码或非运行文件: " + path);
}
const html = await read("index.html"), sw = await read("sw.js"), raw = await read("work.json"), work = JSON.parse(raw);
if (work.id !== "shoukun-good-weather" || work.updatedAt !== 1) throw Error("作品 ID 或存档 revision 改变");
const privateKeys = new Set(["authorNotes", "author-reserve", "memo-plan", "starObservation", "source_repository_credential"]);
function check(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) { if (privateKeys.has(key)) throw Error("运行数据包含作者私人字段: " + key);check(child); }
}
check(work);
if (/(?:sk-proj-|github_pat_)[A-Za-z0-9_-]{20,}/.test(raw)) throw Error("检测到疑似密钥，停止发布");
for (const media of new Set([...raw.matchAll(/\.\/author-media\/[a-f0-9]{64}\.(?:mp4|mov)/g)].map((m) => m[0]))) await stat(resolve(root, media));
const prefix = new URL("https://example.invalid/shoukun/");
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const path of references) {
  const url = new URL(path, prefix);
  if (url.origin !== prefix.origin || !url.pathname.startsWith(prefix.pathname)) throw Error("入口资源不兼容 Pages 子路径: " + path);
  await stat(resolve(root, url.pathname.slice(prefix.pathname.length)));
}
if (html.includes("/src/") || /(?:test-work|blank-work)\.json/.test(sw)) throw Error("正式页面包含开发预览产物");
const manifest = JSON.parse(await read("manifest.webmanifest"));
for (const path of [manifest.start_url || ".", manifest.scope || ".", ...manifest.icons.map((i) => i.src)]) if (!new URL(path, prefix).pathname.startsWith(prefix.pathname)) throw Error("PWA 路径越出 Pages 子目录");
const release = JSON.parse(await read("release.json"));
if (typeof release.build !== "string") throw Error("缺少版本更新标识");
console.log(`正式产物检查通过：${files.length} 个运行文件；作品 ID/revision 保持；入口及 PWA 兼容 /shoukun/；不含开发预览、源码、环境文件或存档。`);
