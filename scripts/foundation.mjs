import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
const commands = {
  dev: "dev",
  build: "build",
  validate: "story:validate",
  test: "story:test",
};
if (!Object.hasOwn(commands, mode) || !process.env.npm_execpath) {
  console.error(
    "请使用 npm run foundation:dev / foundation:build / foundation:validate / foundation:test",
  );
  process.exit(1);
}
const prepared = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("./prepare-campus.mjs", import.meta.url))],
  { stdio: "inherit" },
);
if (prepared.status !== 0) process.exit(prepared.status ?? 1);
// Reuse upstream commands and compiler; only select this fork's story file.
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "run", commands[mode]],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, STORY_FILE: "work/campus/story.json" },
    stdio: "inherit",
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
