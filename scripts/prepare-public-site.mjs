// Only built player files are exported. No author notes, source media or credentials.
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const target = resolve(root, "../campus-public-site");
const dist = resolve(root, "dist");
await readFile(resolve(dist, "release.json"));
const sourceFiles = await readdir(dist);
if (!sourceFiles.includes("index.html") || !sourceFiles.includes("work.json")) throw Error("请先运行 npm run author:build");
await mkdir(target, { recursive: true });
await rm(resolve(target, "dist"), { recursive: true, force: true });
await cp(dist, resolve(target, "dist"), { recursive: true });
await writeFile(resolve(target, ".gitignore"), ".DS_Store\n.sites-runtime/\n.sites-checkout/\n*.tar.gz\n");
await writeFile(resolve(target, "README.md"), "# 校园群像手机发布副本\n\n这里只保存可运行的玩家页面。编辑原项目后运行 npm run public:prepare，再通过当前 Sites 项目的发布流程更新。保持 .openai/hosting.json 的 project_id 不变，网址不变。不要把作者笔记、原素材、环境文件或玩家存档复制到这里。\n");
console.log("发布副本已准备：" + target);
