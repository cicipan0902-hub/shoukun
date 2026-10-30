import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chunkManifest, readParts, readPublishedWork } from "./chunkedAssets";
import { PublishedVideo } from "../media/PublishedVideo";
import { safeMedia } from "../schema";
const bytes = new TextEncoder().encode(JSON.stringify({ title: "蜡烛和🙂", id: "shoukun-good-weather", updatedAt: 1 }));
const paths = ["./runtime-data/" + "a".repeat(64) + ".txt", "./runtime-data/" + "b".repeat(64) + ".txt"];
const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
const manifest = { format: "foundphone-parts-v1", mime: "application/json", byteLength: bytes.length, sha256, parts: paths };
afterEach(() => vi.unstubAllGlobals());
function network() {
  vi.stubGlobal("fetch", vi.fn(async (path: string) => new Response(path === paths[0] ? bytes.slice(0, 12) : bytes.slice(12))));
}
describe("static published assets", () => {
  it("loads old ordinary work.json without changing IDs or save revision", async () => {
    const work = { id: "shoukun-good-weather", updatedAt: 1 };
    expect(await readPublishedWork(work)).toBe(work);
  });
  it("reassembles UTF-8 story fragments exactly and checks the content hash", async () => {
    network();
    expect(await readPublishedWork(manifest)).toEqual(JSON.parse(new TextDecoder().decode(bytes)));
    await expect(readParts({ ...manifest, sha256: "0".repeat(64) })).rejects.toThrow("校验失败");
  });
  it("rejects external paths, incomplete downloads, invalid manifests and cancelled loads", async () => {
    expect(() => chunkManifest({ ...manifest, parts: ["https://external.invalid/file"] })).toThrow();
    expect(() => chunkManifest({ ...manifest, parts: ["./runtime-data/../private.txt"] })).toThrow();
    network(); await expect(readParts({ ...manifest, byteLength: bytes.length + 1 })).rejects.toThrow("完整");
    const abort = new AbortController(); abort.abort(); await expect(readParts(manifest, abort.signal)).rejects.toThrow();
    await expect(readPublishedWork({ ...manifest, mime: "video/mp4" })).rejects.toThrow("剧情文件格式");
  });
  it("uses real native video for ordinary URLs and an explicit loading action for large published videos", () => {
    const src = "./author-media/" + "a".repeat(64) + ".mp4";
    expect(safeMedia(src + ".parts.json")).toBe(src + ".parts.json");
    expect(safeMedia(src + ".parts.json?token=bad")).toBe("");
    expect(renderToStaticMarkup(createElement(PublishedVideo, { src, controls: true }))).toContain("<video");
    const large = renderToStaticMarkup(createElement(PublishedVideo, { src: src + ".parts.json", controls: true }));
    expect(large).toContain("加载视频"); expect(large).not.toContain("<video");
  });
});
