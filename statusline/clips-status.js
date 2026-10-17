// Claude Code status line: current folder, model, and how many clips are
// queued for the next prompt.
const path = require("path");
const queue = require("../lib/queue");

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let info = {};
  try {
    info = JSON.parse(input);
  } catch {}
  const parts = [];
  const dir = info.workspace?.current_dir || info.cwd;
  if (dir) parts.push(path.basename(dir));
  if (info.model?.display_name) parts.push(info.model.display_name);

  const clips = queue.read();
  if (clips.length > 0) {
    const text = clips[clips.length - 1].text.replace(/\s+/g, " ");
    const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    parts.push(`\x1b[33m📎 ${clips.length} clip${clips.length === 1 ? "" : "s"} queued\x1b[0m \x1b[2m"${preview}"\x1b[0m`);
  }
  process.stdout.write(parts.join(" · "));
});
