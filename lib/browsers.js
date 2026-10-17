// Registers or removes the native messaging host with every installed
// Chromium-based browser (Chrome, Edge, Brave, Arc, Vivaldi, Chromium) on
// macOS, Linux and Windows.
// Usage: node browsers.js install|uninstall <node-path>
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const [mode, nodePath = process.execPath] = process.argv.slice(2);
if (mode !== "install" && mode !== "uninstall") {
  console.error("Usage: node browsers.js install|uninstall <node-path>");
  process.exit(1);
}

const HOST_NAME = "com.claude.clip";
const EXTENSION_ID = "emifkioohjimifiidbhnbafokoaecppe"; // fixed by the "key" in extension/manifest.json
const root = path.resolve(__dirname, "..");
const home = os.homedir();
const isWindows = process.platform === "win32";

// Each browser's own data folder, used to tell whether it's installed. On macOS
// and Linux the host manifest goes in its NativeMessagingHosts subfolder; on
// Windows the browser finds it through the registry key instead.
const BROWSERS = {
  darwin: [
    ["Chrome", "Library/Application Support/Google/Chrome"],
    ["Chrome Beta", "Library/Application Support/Google/Chrome Beta"],
    ["Chrome Canary", "Library/Application Support/Google/Chrome Canary"],
    ["Chromium", "Library/Application Support/Chromium"],
    ["Edge", "Library/Application Support/Microsoft Edge"],
    ["Brave", "Library/Application Support/BraveSoftware/Brave-Browser"],
    ["Arc", "Library/Application Support/Arc/User Data"],
    ["Vivaldi", "Library/Application Support/Vivaldi"],
  ],
  linux: [
    ["Chrome", ".config/google-chrome"],
    ["Chrome Beta", ".config/google-chrome-beta"],
    ["Chromium", ".config/chromium"],
    ["Edge", ".config/microsoft-edge"],
    ["Brave", ".config/BraveSoftware/Brave-Browser"],
    ["Vivaldi", ".config/vivaldi"],
  ],
  win32: [
    ["Chrome", "AppData/Local/Google/Chrome/User Data", "Google\\Chrome"],
    ["Chromium", "AppData/Local/Chromium/User Data", "Chromium"],
    ["Edge", "AppData/Local/Microsoft/Edge/User Data", "Microsoft\\Edge"],
    ["Brave", "AppData/Local/BraveSoftware/Brave-Browser/User Data", "BraveSoftware\\Brave-Browser"],
    ["Vivaldi", "AppData/Local/Vivaldi/User Data", "Vivaldi"],
  ],
}[process.platform];

if (!BROWSERS) {
  console.error(`✗ ${process.platform} isn't supported. Claude Clip works on macOS, Linux and Windows.`);
  process.exit(1);
}

// Browsers start the host without your shell profile (so no nvm), so the
// launcher pins node's full path.
const launcher = path.join(root, "host", isWindows ? "run-host.bat" : "run-host.sh");
const winManifest = path.join(root, "host", `${HOST_NAME}.json`);
const regKey = (key) => `HKCU\\Software\\${key}\\NativeMessagingHosts\\${HOST_NAME}`;

function reg(args) {
  try {
    execFileSync("reg", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function install() {
  const hostJs = path.join(root, "host", "host.js");
  if (isWindows) {
    fs.writeFileSync(launcher, `@echo off\r\n"${nodePath}" "${hostJs}" %*\r\n`);
  } else {
    fs.writeFileSync(launcher, `#!/bin/bash\nexec "${nodePath}" "${hostJs}"\n`, { mode: 0o755 });
  }
  const manifest = JSON.stringify(
    {
      name: HOST_NAME,
      description: "Claude Clip queue",
      path: launcher,
      type: "stdio",
      allowed_origins: [`chrome-extension://${EXTENSION_ID}/`],
    },
    null,
    2
  );
  if (isWindows) fs.writeFileSync(winManifest, manifest);

  const installed = BROWSERS.filter(([, dir]) => fs.existsSync(path.join(home, dir)));
  for (const [name, dir, key] of installed) {
    if (isWindows) {
      if (reg(["add", regKey(key), "/ve", "/t", "REG_SZ", "/d", winManifest, "/f"])) {
        console.log(`✓ Registered native host with ${name}`);
      } else {
        console.log(`! Couldn't register the native host with ${name}`);
      }
    } else {
      const hostsDir = path.join(home, dir, "NativeMessagingHosts");
      fs.mkdirSync(hostsDir, { recursive: true });
      fs.writeFileSync(path.join(hostsDir, `${HOST_NAME}.json`), manifest + "\n");
      console.log(`✓ Registered native host with ${name} (${hostsDir})`);
    }
  }
  if (installed.length === 0) {
    console.log(`! No supported browser found. Install one (${BROWSERS.map(([n]) => n).join(", ")}) and run this again.`);
  }
}

// Removes the host from every known browser, installed or not, so nothing is
// left behind by a browser that was uninstalled in the meantime.
function uninstall() {
  for (const [name, dir, key] of BROWSERS) {
    if (isWindows) {
      if (reg(["delete", regKey(key), "/f"])) console.log(`✓ Removed native host from ${name}`);
      continue;
    }
    const file = path.join(home, dir, "NativeMessagingHosts", `${HOST_NAME}.json`);
    if (fs.existsSync(file)) {
      fs.rmSync(file);
      console.log(`✓ Removed native host from ${name}`);
    }
  }
  for (const file of [launcher, winManifest]) fs.rmSync(file, { force: true });
}

if (mode === "install") install();
else uninstall();
