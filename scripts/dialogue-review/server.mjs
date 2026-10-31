import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { readReview, saveReview } from './model.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const token = randomBytes(24).toString('hex');
const port = Number(process.env.REVIEW_PORT || 4191), origin = `http://127.0.0.1:${port}`;
const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
let saving = false;
const server = createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 403, { error: '仅支持本机访问' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end((await readFile(new URL('./index.html', import.meta.url), 'utf8')).replace('__REVIEW_TOKEN__', token));
    }
    if (req.headers['x-review-token'] !== token) return send(res, 403, { error: '请从本地审阅页操作' });
    if (req.url === '/data' && req.method === 'GET') {
      const data = await readReview(root);
      return send(res, 200, { ...data, files: undefined, versions: Object.fromEntries(data.files.map(f => [f.file, f.version])) });
    }
    if (req.url === '/save' && req.method === 'POST') {
      if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return send(res, 403, { error: '请求来源无效' });
      if (saving) return send(res, 409, { error: '正在保存，请稍候' });
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 2_000_000) return send(res, 413, { error: '修改过多，请分批保存' }); }
      saving = true;
      try { return send(res, 200, await saveReview(root, JSON.parse(raw))); } finally { saving = false; }
    }
    send(res, 404, { error: '页面不存在' });
  } catch (error) { send(res, 400, { error: error.message }); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已占用，请打开已运行的审阅页，或设置 REVIEW_PORT。` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`台词审阅页：${origin}（仅本机；不会发布或修改玩家存档）`));
