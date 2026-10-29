import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { aiConfigured, generateReply, requestSchema } from "./chat.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
const dist = resolve(root, "dist");
const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
const limits = new Map();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/chat/status") {
      if (req.method !== "GET")
        return json(res, 405, { error: "不支持此请求" });
      return json(res, 200, { configured: aiConfigured() });
    }
    if (url.pathname === "/api/chat") {
      if (req.method !== "POST")
        return json(res, 405, { error: "不支持此请求" });
      if (
        !req.headers.origin ||
        new URL(req.headers.origin).host !== req.headers.host
      )
        return json(res, 403, { error: "请从当前故事页面发起聊天" });
      if (!(req.headers["content-type"] || "").startsWith("application/json"))
        return json(res, 415, { error: "请求格式错误" });
      const now = Date.now(),
        ip = req.socket.remoteAddress;
      for (const [key, entry] of limits)
        if (now - entry.start > 60000) limits.delete(key);
      const quota = limits.get(ip) || { start: now, count: 0 };
      limits.set(ip, quota);
      if (++quota.count > 20)
        return json(res, 429, { error: "消息发得有些快，请稍等一分钟" });
      if (!aiConfigured())
        return json(res, 503, {
          error: "AI 日常聊天尚未连接，剧情选项可以照常体验",
        });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 32768)
          return json(res, 413, { error: "消息太长，请缩短后重试" });
      }
      let parsed;
      try {
        parsed = requestSchema.parse(JSON.parse(raw));
      } catch {
        return json(res, 400, { error: "请检查消息内容和长度" });
      }
      try {
        return json(res, 200, { reply: await generateReply(parsed) });
      } catch {
        return json(res, 502, {
          error: "暂时没有收到回复，请稍后重试。你的文字已保留。",
        });
      }
    }
    if (url.pathname.startsWith("/api/"))
      return json(res, 404, { error: "接口不存在" });
    if (!["GET", "HEAD"].includes(req.method))
      return json(res, 405, { error: "不支持此请求" });
    const path = resolve(
      dist,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!path.startsWith(dist + sep))
      return json(res, 404, { error: "文件不存在" });
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) return json(res, 404, { error: "文件不存在" });
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(path).pipe(res);
  } catch {
    if (!res.headersSent) json(res, 500, { error: "暂时无法处理请求" });
    else res.end();
  }
});
server.listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || "0.0.0.0",
  () =>
    console.log(
      `Campus story: http://localhost:${process.env.PORT || 4173}/ · AI ${aiConfigured() ? "configured" : "not configured"}`,
    ),
);
