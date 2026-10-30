import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { preparePublicArtifact, inspectPublicArtifact } from "./public-artifact.mjs";

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "phone-public-")), dist = join(root, "dist"), target = join(root, "dist-public");
  await mkdir(join(dist, "author-media"), { recursive: true });
  const bytes = Buffer.from("original-video-bytes".repeat(500));
  const file = createHash("sha256").update(bytes).digest("hex") + ".mp4";
  const work = { id: "shoukun-good-weather", updatedAt: 1, title: "校园游戏", variables: { "author.chapters": JSON.stringify([{ id: "chapter-10-pending", title: "留给自己的愿望" }]) }, data: { files: [{ media: "./author-media/" + file, body: "中文与🙂跨分片验证".repeat(300) }] } };
  await writeFile(join(dist, "work.json"), JSON.stringify(work));
  await writeFile(join(dist, "release.json"), JSON.stringify({ build: "fixture", commit: "known-commit" }));
  await writeFile(join(dist, "index.html"), '<div id="root"></div>');
  await writeFile(join(dist, "author-media", file), bytes);
  await writeFile(join(root, ".env"), "PRIVATE_LOCAL_ONLY=1");
  try { await run({ root, dist, target, work, bytes, file }); } finally { await rm(root, { recursive: true, force: true }); }
}
test("exports inside the repository and reassembles exact story/video bytes below the configured limit", () => fixture(async ({ dist, target, work }) => {
  const result = await preparePublicArtifact(dist, target, { limit: 4096, partSize: 512 });
  assert.equal(result.videos, 1);
  const checked = await inspectPublicArtifact(dist, target, { limit: 4096 });
  assert.equal(checked.workId, work.id); assert.equal(checked.revision, 1); assert.equal(checked.chapters, 1);
  assert.deepEqual(JSON.parse(await readFile(join(dist, "work.json"), "utf8")), work);
  await assert.rejects(readFile(join(target, ".env")));
  const headers = await readFile(join(target, "_headers"), "utf8");
  assert.match(headers, /\/release.json\n  Cache-Control: no-store/);
  assert.match(headers, /\/work.json\n  Cache-Control: no-store/);
  const release = JSON.parse(await readFile(join(target, "release.json"), "utf8"));
  assert.equal(release.commit, "known-commit"); assert.equal(release.platform, "cloudflare-pages");
}));
test("rejects missing or corrupted parts rather than publishing an incomplete game", () => fixture(async ({ dist, target }) => {
  await preparePublicArtifact(dist, target, { limit: 4096, partSize: 512 });
  const manifest = JSON.parse(await readFile(join(target, "work.json"), "utf8"));
  await writeFile(join(target, manifest.parts[0]), "corrupt");
  await assert.rejects(inspectPublicArtifact(dist, target, { limit: 4096 }), /校验失败/);
}));
test("keeps small story and video assets in their existing native format", () => fixture(async ({ dist, target, work }) => {
  await preparePublicArtifact(dist, target);
  const checked = await inspectPublicArtifact(dist, target);
  assert.equal(checked.videos, 0);
  assert.deepEqual(JSON.parse(await readFile(join(target, "work.json"), "utf8")), work);
}));
