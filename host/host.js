// Chrome native messaging host. Chrome starts this process for each message
// from the extension, sends one length-prefixed JSON message on stdin and
// reads one length-prefixed JSON reply from stdout.
const queue = require("../lib/queue");

function reply(msg) {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
}

function handle(msg) {
  switch (msg.action) {
    case "add":
      return { ok: true, clip: queue.add(msg.clip || {}), count: queue.read().length };
    case "list":
      return { ok: true, clips: queue.read() };
    case "update":
      return { ok: true, clip: queue.update(msg.id, msg.fields || {}) };
    case "remove":
      queue.remove(msg.id);
      return { ok: true };
    case "clear":
      queue.clear();
      return { ok: true };
    case "ping":
      return { ok: true, dir: queue.DIR };
    default:
      return { ok: false, error: `Unknown action: ${msg.action}` };
  }
}

let input = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  input = Buffer.concat([input, chunk]);
  if (input.length < 4) return;
  const len = input.readUInt32LE(0);
  if (input.length < 4 + len) return;
  try {
    reply(handle(JSON.parse(input.subarray(4, 4 + len).toString("utf8"))));
  } catch (err) {
    reply({ ok: false, error: err.message });
  }
  process.exit(0);
});
