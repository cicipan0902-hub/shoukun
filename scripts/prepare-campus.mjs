import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createServer } from "vite";
import { safeProjectPath, loadAuthorAssets } from "./lib/author-assets.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const read = async (file) =>
  JSON.parse(await readFile(safeProjectPath(root, file), "utf8"));
const server = await createServer({
  root,
  configFile: false,
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { projectSchema, assetsSchema } = await server.ssrLoadModule(
    "/src/authoring/schema.ts",
  );
  const project = projectSchema.parse(
    await read(process.env.CAMPUS_PROJECT || "stories/foundation/project.json"),
  );
  const assets = assetsSchema.parse(await read(project.assetsFile));
  const { media, report } = await loadAuthorAssets(root, assets);
  const { compileProject, mergeExtensions } = await server.ssrLoadModule(
    "/src/authoring/compile.ts",
  );
  const result = compileProject(
    await read(project.sourceFile),
    project,
    await read(project.charactersFile),
    assets,
    mergeExtensions(
      await Promise.all(
        [project.extensionsFile, ...project.additionalExtensionsFiles].map(
          read,
        ),
      ),
    ),
    media,
    project.interactionsFile ? await read(project.interactionsFile) : undefined,
  );
  const { testStory } = await server.ssrLoadModule(
    "/src/story-engine/testStory.ts",
  );
  const errors = testStory(result.story, result.work);
  if (errors.length) throw Error(errors.join("\n"));
  await mkdir(resolve(root, "work/campus"), { recursive: true });
  await writeFile(
    resolve(root, "work/campus/story.json"),
    JSON.stringify(result.story, null, 2) + "\n",
  );
  await writeFile(
    resolve(root, "work/campus/asset-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `创作配置通过：${result.cast.length} 人物 / ${project.chapters.length} 章节 / ${project.minigames.length} 小游戏 / ${report.filter((a) => a.status === "ready").length} 已导入素材。`,
  );
  for (const a of report.filter(
    (a) => a.status === "missing-using-placeholder",
  ))
    console.warn(`缺失素材，已使用默认头像或占位：${a.id}: ${a.file}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await server.close();
}
