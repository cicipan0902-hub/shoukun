/** Static, content-addressed parts keep every Pages upload below its file limit. */
export type ChunkManifest = {
  format: "foundphone-parts-v1";
  mime: "application/json" | "video/mp4" | "video/quicktime";
  byteLength: number;
  sha256: string;
  parts: string[];
};
export function chunkManifest(value: unknown): ChunkManifest {
  const m = value as Partial<ChunkManifest> | null;
  if (!m || m.format !== "foundphone-parts-v1" || !["application/json", "video/mp4", "video/quicktime"].includes(String(m.mime)) ||
    !Number.isSafeInteger(m.byteLength) || m.byteLength! <= 0 || m.byteLength! > 256 * 1024 * 1024 ||
    !/^[a-f0-9]{64}$/.test(String(m.sha256)) || !Array.isArray(m.parts) || !m.parts.length || m.parts.length > 64 ||
    !m.parts.every(p => typeof p === "string" && /^\.\/runtime-data\/[a-f0-9]{64}\.(bin|txt)$/.test(p)))
    throw Error("发布资源清单无效，请刷新后重试。");
  return m as ChunkManifest;
}
export async function readParts(value: unknown, signal?: AbortSignal, progress?: (loaded: number, total: number) => void): Promise<Uint8Array> {
  const m = chunkManifest(value), bytes = new Uint8Array(m.byteLength);
  let loaded = 0;
  for (const file of m.parts) {
    signal?.throwIfAborted();
    const r = await fetch(file, { signal, cache: "force-cache" });
    if (!r.ok) throw Error("资源加载失败，请检查网络后重试。");
    const part = new Uint8Array(await r.arrayBuffer());
    if (!part.length || part.length > 8 * 1024 * 1024 || loaded + part.length > bytes.length) throw Error("资源内容不完整，请重试。");
    bytes.set(part, loaded); loaded += part.length;
    progress?.(loaded, bytes.length);
  }
  if (loaded !== bytes.length) throw Error("资源尚未下载完整，请重试。");
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== m.sha256) throw Error("资源校验失败，请刷新后重试。");
  }
  return bytes;
}
export async function readPublishedWork(value: unknown, signal?: AbortSignal): Promise<unknown> {
  if (value && typeof value === "object" && "format" in value && value.format === "foundphone-parts-v1") {
    const m = chunkManifest(value);
    if (m.mime !== "application/json") throw Error("剧情文件格式不正确。");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readParts(m, signal)));
  }
  return value; // Existing GitHub Pages / local work.json and all save IDs stay unchanged.
}
