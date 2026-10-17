// Adds or removes the Claude Clip hook and status line in Claude Code's settings.json,
// plus the /clips command file (which only exists so /clips shows up in autocomplete;
// the hook itself answers the command).
// Usage: node configure.js install|uninstall <node-path>
const fs = require("fs");
const os = require("os");
const path = require("path");

const [mode, nodePath = process.execPath] = process.argv.slice(2);
if (mode !== "install" && mode !== "uninstall") {
  console.error("Usage: node configure.js install|uninstall <node-path>");
  process.exit(1);
}
const root = path.resolve(__dirname, "..");
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const file = path.join(configDir, "settings.json");

// Claude Code runs these through Git Bash on Windows, where backslashes are
// escapes, so use forward slashes (which Windows and node accept too).
const slashes = (p) => (process.platform === "win32" ? p.replace(/\\/g, "/") : p);
const hookCommand = `"${slashes(nodePath)}" "${slashes(path.join(root, "hooks", "attach-clips.js"))}"`;
const statusCommand = `"${slashes(nodePath)}" "${slashes(path.join(root, "statusline", "clips-status.js"))}"`;
const commandSrc = path.join(root, "commands", "clips.md");
const commandDest = path.join(configDir, "commands", "clips.md");
const isOurCommand = () => fs.existsSync(commandDest) && fs.readFileSync(commandDest, "utf8").includes("Claude Clip hook");
const isOurs = (cmd = "") => cmd.includes("attach-clips.js") || cmd.includes("clips-status.js");

let settings = {};
if (fs.existsSync(file)) {
  try {
    settings = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`✗ ${file} isn't valid JSON (${err.message}). Fix it and run this again. Nothing was changed.`);
    process.exit(1);
  }
  // Back up only once, so the backup stays the settings from before Claude Clip
  // was first installed instead of being overwritten by later runs.
  const backup = `${file}.bak-claude-clip`;
  if (mode === "install" && !fs.existsSync(backup)) fs.copyFileSync(file, backup);
}

// Drop any earlier Claude Clip hook entries so installs don't stack up.
const groups = (settings.hooks?.UserPromptSubmit || [])
  .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isOurs(h.command)) }))
  .filter((g) => g.hooks.length > 0);

if (mode === "install") {
  groups.push({ hooks: [{ type: "command", command: hookCommand, timeout: 10 }] });
  settings.hooks = { ...settings.hooks, UserPromptSubmit: groups };
  if (!settings.statusLine || isOurs(settings.statusLine.command)) {
    settings.statusLine = { type: "command", command: statusCommand, refreshInterval: 2 };
  } else {
    console.log("! You already have a custom statusLine; left it alone. Clip count won't show in the status line.");
  }
  if (!fs.existsSync(commandDest) || isOurCommand()) {
    fs.mkdirSync(path.dirname(commandDest), { recursive: true });
    fs.copyFileSync(commandSrc, commandDest);
    console.log(`✓ Added /clips command (${commandDest})`);
  } else {
    console.log("! You already have your own /clips command; left it alone. /clips still works but won't autocomplete.");
  }
} else {
  if (groups.length > 0) settings.hooks.UserPromptSubmit = groups;
  else if (settings.hooks) delete settings.hooks.UserPromptSubmit;
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
  if (isOurs(settings.statusLine?.command)) delete settings.statusLine;
  if (isOurCommand()) fs.rmSync(commandDest);
}

fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
console.log(`✓ Updated ${file}`);
