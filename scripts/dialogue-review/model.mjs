import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const load = async (root, file) => { const raw = await readFile(resolve(root, file), 'utf8'); return { file, raw, data: JSON.parse(raw), version: hash(raw) }; };
const chapterOf = (value, fallback = '') => (String(value).match(/(?:ch|chapter-)(\d{2})/) || String(fallback).match(/chapter-(\d{2})/))?.[1] || 'other';
export async function readReview(root) {
  const project = (await load(root, 'stories/foundation/project.json')).data;
  const paths = [...new Set([project.sourceFile, project.extensionsFile, ...(project.additionalExtensionsFiles || []), project.interactionsFile].filter(Boolean))];
  const files = await Promise.all(paths.map(file => load(root, file)));
  const cast = (await load(root, project.charactersFile)).data;
  const names = { owner: '女主（玩家）' };
  for (const c of cast) if (c.storyId !== 'owner') names[c.storyId] = c.wechat?.nickname || c.nickname || c.name;
  const rows = [], messages = new Map(), chats = new Map();
  const add = (file, path, value, meta) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const row = { key: JSON.stringify([file.file, path]), file: file.file, path, text: value, ...meta };
    rows.push(row); return row;
  };
  for (const file of files) {
    (file.data.chats || []).forEach((chat, ci) => {
      chats.set(chat.id, chat);
      (chat.messages || []).forEach((m, mi) => {
        if (chat.app !== 'wechat') return;
        const row = add(file, ['chats', ci, 'messages', mi, 'body'], m.body, { id: m.id, speaker: m.senderId || 'owner', chapter: chapterOf(m.id, file.file), chatId: chat.id, chat: chat.title, kind: '消息', media: !!m.media });
        if (row) messages.set(m.id, row);
      });
    });
    (file.data.content?.notes || []).forEach((note, ni) => add(file, ['content', 'notes', ni, 'body'], note.body, { id: note.id, speaker: 'owner', chapter: chapterOf(note.id, file.file), chatId: 'memo-' + note.id, chat: note.title, kind: '备忘录', context: '独立记录，不属于微信对话' }));
  }
  // Explicitly attributed Moments text. Do not expose other authors' comments as this speaker.
  for (const file of files) (file.data.content?.wechat || []).forEach((post, pi) => {
    if (post.kind !== 'post' || post.folder !== '朋友圈') return;
    const speaker = Object.keys(names).find(id => names[id] === post.sender);
    const base = { chapter: chapterOf(post.id, file.file), chatId: 'moment-' + post.id, chat: '朋友圈 · ' + post.id };
    if (speaker) for (const field of ['title', 'body']) add(file, ['content', 'wechat', pi, field], post[field], { ...base, id: post.id + ':' + field, speaker, kind: '朋友圈', context: (post.hidden ? '原为隐藏动态；保持原解锁条件。' : '可见性仍受好友及剧情条件控制。') + (field === 'title' ? ' 标题；如与正文相同，请一并核对。' : ' 正文。') });
    (post.comments || []).forEach((comment, ci) => {
      if (typeof comment !== 'string') return;
      const colon = comment.indexOf('：');
      if (colon < 0) return;
      const prefix = comment.slice(0, colon), speaker = Object.keys(names).find(id => prefix === names[id] || prefix.startsWith(names[id] + '回复'));
      if (!speaker) return;
      const quote = comment.slice(colon + 1);
      add(file, ['content', 'wechat', pi, 'comments', ci], quote, { ...base, id: post.id + ':comment-' + ci, speaker, kind: '朋友圈', context: comment, prefix: comment.slice(0, colon + 1) });
    });
  });
  // Only author-attributed excerpts; never guess the speaker of an anonymous scene quote.
  const targetFile = 'docs/author-only/characters/zhuzhixin-review-targets.json';
  let targets = [];
  try { targets = JSON.parse(await readFile(resolve(root, targetFile), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const target of targets) {
    const file = files.find(f => f.file === target.file);
    if (!file || !Array.isArray(target.path) || !names[target.speaker]) throw Error('现场台词归属配置无效');
    let text = file.data;
    for (const key of target.path) text = text?.[key];
    if (typeof text !== 'string' || !target.open || !target.close || text.split(target.open).length !== 2 || text.split(target.close).length !== 2) throw Error('现场原句已变化，请核对作者归属配置：' + target.id);
    const start = text.indexOf(target.open) + target.open.length, end = text.indexOf(target.close, start);
    if (end <= start) throw Error('现场台词边界无效');
    const quote = text.slice(start, end);
    add(file, target.path, quote, { id: target.id, speaker: target.speaker, chapter: target.chapter, chatId: 'scene-' + target.id, chat: target.title, kind: '现场台词', context: text, excerpt: quote, open: target.open, close: target.close });
  }
  const ordered = [], used = new Set();
  const push = (row, context = '') => { if (!row || used.has(row.key)) return; used.add(row.key); ordered.push({ ...row, context: context || row.context || '' }); };
  for (const file of files) (file.data.flows || []).forEach((flow, fi) => {
    const chat = chats.get(flow.chatId);
    if (chat?.app !== 'wechat') return;
    const base = { speaker: 'owner', chapter: chapterOf(flow.id), chatId: flow.chatId, chat: chat.title };
    const walk = (steps, path, context = '') => (steps || []).forEach((step, si) => {
      const sp = [...path, si];
      if (step.message) push(messages.get(step.message), context);
      if (step.options) {
        const prompt = step.prompt || step.choice || '玩家选择';
        step.options.forEach((option, oi) => {
          const branch = `${prompt} → ${option.text}`;
          const row = add(file, [...sp, 'options', oi, 'text'], option.text, { ...base, id: option.id, kind: '玩家选项' });
          push(row, context ? `${context} / ${branch}` : branch);
          walk(option.replies, [...sp, 'options', oi, 'replies'], branch);
        });
      }
    });
    walk(flow.steps, ['flows', fi, 'steps'], '对话段：' + flow.id);
  });
  // Chapter one uses engine choices rather than reusable flows. Expose both labels and bubble text.
  for (const file of files) {
    const events = file.data.events || [];
    for (const choice of events.filter(e => e.type === 'choice')) for (const next of choice.next || []) {
      const ei = events.findIndex(e => e.id === next), event = events[ei];
      if (!event) continue;
      const target = (event.actions || []).map(a => messages.get(a.key)).find(Boolean);
      if (!target) continue;
      push(add(file, ['events', ei, 'label'], event.label, { id: event.id, speaker: 'owner', chapter: target.chapter, chatId: target.chatId, chat: target.chat, kind: '玩家选项', context: `${choice.label}（菜单文字；如需同步气泡，请同时修改对应玩家消息）` }));
    }
  }
  rows.forEach(row => push(row));
  return { files, rows: ordered.sort((a, b) => a.chapter.localeCompare(b.chapter)), names, chapters: project.chapters.map((c, i) => ({ id: String(i + 1).padStart(2, '0'), title: `第${i + 1}章 · ${c.title}` })) };
}
export async function saveReview(root, request) {
  if (!request || !Array.isArray(request.changes) || !request.changes.length || request.changes.length > 3000) throw Error('没有有效修改');
  const current = await readReview(root), byKey = new Map(current.rows.map(r => [r.key, r]));
  const grouped = new Map(), seen = new Set();
  for (const change of request.changes) {
    const row = byKey.get(change.key);
    if (!row || seen.has(change.key) || typeof change.text !== 'string' || !change.text.trim() || change.text.length > 12000) throw Error('修改内容无效，只允许编辑现有文字');
    seen.add(change.key);
    const file = current.files.find(f => f.file === row.file);
    if (request.versions?.[file.file] !== file.version) throw Error('原文件已在其他地方修改。请导出草稿，再重新读取原文件，避免覆盖');
    if (row.text !== change.original) throw Error('原台词已经改变，请重新读取');
    if (row.excerpt && (change.text.includes(row.open) || change.text.includes(row.close))) throw Error('请保留现场引号边界，只编辑引号内台词');
    if (row.text === change.text) continue;
    grouped.set(file.file, file);
    let parent = file.data;
    for (const key of row.path.slice(0, -1)) parent = parent[key];
    if (row.excerpt) parent[row.path.at(-1)] = parent[row.path.at(-1)].replace(row.excerpt, change.text);
    else parent[row.path.at(-1)] = (row.prefix || '') + change.text;
  }
  if (!grouped.size) return { count: 0 };
  const folder = `work/dialogue-review-backups/${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(16).slice(2, 8)}`;
  await mkdir(resolve(root, folder), { recursive: true });
  // Preflight every file before writing any; backups are local and never bundled.
  for (const file of grouped.values()) {
    if (hash(await readFile(resolve(root, file.file), 'utf8')) !== file.version) throw Error('文件已发生变化，请重新读取后再保存');
    await writeFile(resolve(root, folder, file.file.split('/').at(-1)), file.raw, { flag: 'wx' });
  }
  const written = [];
  try {
    for (const file of grouped.values()) {
      const path = resolve(root, file.file), temp = path + '.review-tmp';
      await writeFile(temp, JSON.stringify(file.data, null, 2) + '\n');
      await rename(temp, path); written.push(file);
    }
  } catch (error) {
    for (const file of written) await writeFile(resolve(root, file.file), file.raw);
    throw error;
  }
  return { count: request.changes.filter(c => c.text !== c.original).length, files: [...grouped.keys()], backup: folder };
}
