// Cloudflare export stays inside the repository; the original dist and source assets are untouched.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { preparePublicArtifact, inspectPublicArtifact } from "./lib/public-artifact.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const checked = spawnSync(process.execPath, [resolve(root, "scripts/check-runtime-artifact.mjs")], { cwd: root, stdio: "inherit" });
if (checked.status !== 0) process.exit(checked.status ?? 1);
const dist = resolve(root, "dist"), target = resolve(root, "dist-public");
const prepared = await preparePublicArtifact(dist, target);
const result = await inspectPublicArtifact(dist, target);
console.log(`Cloudflare 玩家发布产物已生成：${target}`);
console.log(`${result.chapters} 章 / ${result.files} 文件 / ${prepared.videos} 个大视频无损分片；所有文件低于 25 MiB；剧情和存档标识校验通过。`);
