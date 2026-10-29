import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAuthorAssets, safeProjectPath } from "./author-assets.mjs";
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrWQAAAAASUVORK5CYII=",
  "base64",
);
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), "campus-assets-"));
  try {
    await mkdir(join(root, "assets"));
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const asset = (file, required = false) => ({ id: "test", file, required });
test("image import makes portable inline media without changing the source", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets/avatar.png"), pixel);
    const r = await loadAuthorAssets(root, {
      assets: [asset("assets/avatar.png")],
    });
    assert.match(r.media.test, /^data:image\/png;base64,/);
    assert.equal(r.report[0].status, "ready");
  }));
test("missing optional assets use placeholders but required assets fail", () =>
  fixture(async (root) => {
    const r = await loadAuthorAssets(root, {
      assets: [asset("assets/missing.png")],
    });
    assert.equal(r.media.test, "");
    assert.equal(r.report[0].status, "missing-using-placeholder");
    await assert.rejects(
      loadAuthorAssets(root, { assets: [asset("assets/missing.png", true)] }),
      /不可读/,
    );
  }));
test("rejects directory escape, remote URLs and symlink escape", () =>
  fixture(async (root) => {
    assert.throws(() => safeProjectPath(root, "../escape"));
    assert.throws(() => safeProjectPath(root, "https://example.com/photo.png"));
    await writeFile(join(root, "outside.png"), pixel);
    await symlink(join(root, "outside.png"), join(root, "assets/link.png"));
    await assert.rejects(
      loadAuthorAssets(root, { assets: [asset("assets/link.png")] }),
      /越界/,
    );
  }));
test("rejects HTML or fake image files and mismatched extensions", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets/fake.png"), "<script>alert(1)</script>");
    await writeFile(join(root, "assets/wrong.jpg"), pixel);
    await assert.rejects(
      loadAuthorAssets(root, { assets: [asset("assets/fake.png")] }),
      /格式/,
    );
    await assert.rejects(
      loadAuthorAssets(root, { assets: [asset("assets/wrong.jpg")] }),
      /格式/,
    );
  }));
test("MP4 uses a hashed local file, preserves source bytes and accepts uppercase extensions", () =>
  fixture(async (root) => {
    const video = Buffer.from("00000018667479706d7034320000000069736f6d6d703432", "hex");
    await writeFile(join(root, "assets/demo.MP4"), video);
    const r = await loadAuthorAssets(root, { assets: [asset("assets/demo.MP4")] });
    assert.match(r.media.test, /^\.\/author-media\/[a-f0-9]{64}\.mp4$/);
    assert.deepEqual(await readFile(join(root, "public", r.media.test)), video);
    assert.deepEqual(await readFile(join(root, "assets/demo.MP4")), video);
    const repeated = await loadAuthorAssets(root, { assets: [asset("assets/demo.MP4")] });
    assert.equal(repeated.media.test, r.media.test);
  }));
test("renaming an image to MP4 does not make a video", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets/fake.mp4"), pixel);
    await assert.rejects(loadAuthorAssets(root, { assets: [asset("assets/fake.mp4")] }), /格式/);
  }));
test("QuickTime recordings named MP4 keep their real container and original bytes", () =>
  fixture(async (root) => {
    const video = Buffer.from("00000014667479707174202000000000717420200000000866726565", "hex");
    await writeFile(join(root, "assets/recording.MP4"), video);
    const r = await loadAuthorAssets(root, { assets: [asset("assets/recording.MP4")] });
    assert.match(r.media.test, /^\.\/author-media\/[a-f0-9]{64}\.mov$/);
    assert.deepEqual(await readFile(join(root, "public", r.media.test)), video);
    assert.deepEqual(await readFile(join(root, "assets/recording.MP4")), video);
  }));
