// Shared clip queue used by the native host, the prompt hook and the status line.
// Clips live in ~/.claude-inbox/queue.json (readable only by you).
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const DIR = process.env.CLAUDE_CLIP_DIR || path.join(os.homedir(), ".claude-inbox");
const QUEUE = path.join(DIR, "queue.json");
const HISTORY = path.join(DIR, "history.jsonl");

// Clips older than this are dropped instead of attached, so a forgotten clip
// doesn't sneak into an unrelated prompt hours later.
const TTL_MS = Number(process.env.CLAUDE_CLIP_TTL_HOURS || 4) * 60 * 60 * 1000;
const MAX_CLIP_CHARS = 20000;

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

function read() {
  try {
    const clips = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
    const now = Date.now();
    return Array.isArray(clips) ? clips.filter((c) => now - Date.parse(c.createdAt) < TTL_MS) : [];
  } catch {
    return [];
  }
}

// Write to a temp file and rename so readers never see a half-written queue.
function write(clips) {
  ensureDir();
  const tmp = `${QUEUE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clips, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, QUEUE);
}

function add(clip) {
  const text = String(clip.text || "").trim().slice(0, MAX_CLIP_CHARS);
  if (!text) throw new Error("Empty clip");
  const entry = {
    id: crypto.randomUUID(),
    text,
    note: clip.note || "",
    source: clip.source || "",
    sender: clip.sender || "",
    title: clip.title || "",
    url: clip.url || "",
    createdAt: new Date().toISOString(),
  };
  const clips = read();
  clips.push(entry);
  write(clips);
  return entry;
}

function update(id, fields) {
  const clips = read();
  const clip = clips.find((c) => c.id === id);
  if (!clip) throw new Error("Clip not found");
  if (typeof fields.text === "string") clip.text = fields.text.trim().slice(0, MAX_CLIP_CHARS);
  if (typeof fields.note === "string") clip.note = fields.note.trim();
  write(clips.filter((c) => c.text));
  return clip;
}

function remove(id) {
  write(read().filter((c) => c.id !== id));
}

function clear() {
  write([]);
}

// Empty the queue and return what was in it, logging the clips to history.
function take() {
  const clips = read();
  if (clips.length === 0) return [];
  write([]);
  try {
    const lines = clips.map((c) => JSON.stringify({ ...c, attachedAt: new Date().toISOString() }) + "\n");
    fs.appendFileSync(HISTORY, lines.join(""), { mode: 0o600 });
  } catch {}
  return clips;
}

module.exports = { DIR, QUEUE, read, add, update, remove, clear, take };
