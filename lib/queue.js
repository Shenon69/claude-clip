// Shared clip queue used by the native host, the prompt hook and the status line.
// Clips live in ~/.claude-inbox/queue.json (readable only by you). Nothing else
// keeps a copy: once a clip is attached, cleared, dropped or expired, it's gone.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const DIR = process.env.CLAUDE_CLIP_DIR || path.join(os.homedir(), ".claude-inbox");
const QUEUE = path.join(DIR, "queue.json");
const LOCK = `${QUEUE}.lock`;

// Clips older than this are dropped instead of attached, so a forgotten clip
// doesn't sneak into an unrelated prompt hours later.
const TTL_MS = Number(process.env.CLAUDE_CLIP_TTL_HOURS || 4) * 60 * 60 * 1000;
const MAX_CLIP_CHARS = 20000;

// Every change holds the lock for a few milliseconds. A lock older than
// LOCK_STALE_MS was left by a crashed process and is taken over.
const LOCK_WAIT_MS = 3000;
const LOCK_STALE_MS = 5000;

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Runs fn while holding an exclusive lock file, so the host, hook and status
// line can't overwrite each other's changes to the queue.
function withLock(fn) {
  ensureDir();
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.closeSync(fs.openSync(LOCK, "wx", 0o600));
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    try {
      if (Date.now() - fs.statSync(LOCK).mtimeMs > LOCK_STALE_MS) {
        fs.rmSync(LOCK, { force: true });
        continue;
      }
    } catch {}
    if (Date.now() > deadline) throw new Error("Clip queue is busy, try again");
    sleep(10);
  }
  try {
    return fn();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}

function load() {
  try {
    const clips = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
    return Array.isArray(clips) ? clips : [];
  } catch {
    return [];
  }
}

const isLive = (c) => Date.now() - Date.parse(c.createdAt) < TTL_MS;

// Write to a temp file and rename so readers never see a half-written queue.
// Only call this while holding the lock.
function write(clips) {
  const tmp = `${QUEUE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clips, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, QUEUE);
}

// Returns the live clips. Expired ones are also deleted from disk, not just hidden.
function read() {
  const clips = load();
  const live = clips.filter(isLive);
  if (live.length < clips.length) {
    try {
      withLock(() => write(load().filter(isLive)));
    } catch {}
  }
  return live;
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
  return withLock(() => {
    const clips = load().filter(isLive);
    clips.push(entry);
    write(clips);
    return entry;
  });
}

function update(id, fields) {
  return withLock(() => {
    const clips = load().filter(isLive);
    const clip = clips.find((c) => c.id === id);
    if (!clip) throw new Error("Clip not found");
    if (typeof fields.text === "string") clip.text = fields.text.trim().slice(0, MAX_CLIP_CHARS);
    if (typeof fields.note === "string") clip.note = fields.note.trim();
    write(clips.filter((c) => c.text));
    return clip;
  });
}

function remove(id) {
  withLock(() => write(load().filter((c) => isLive(c) && c.id !== id)));
}

function clear() {
  withLock(() => write([]));
}

// Empty the queue and return what was in it.
function take() {
  return withLock(() => {
    const all = load();
    if (all.length > 0) write([]);
    return all.filter(isLive);
  });
}

module.exports = { DIR, QUEUE, read, add, update, remove, clear, take };
