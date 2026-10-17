#!/bin/bash
# Installs Claude Clip: the native messaging host for every installed
# Chromium-based browser, plus the Claude Code prompt hook and status line.
# Works on macOS, Linux and Windows (run it from Git Bash). Safe to run again.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Browsers start the host without your shell profile (so no nvm), so pin node's full path.
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "node not found on PATH" >&2
  exit 1
fi

# In Git Bash, hand node Windows-style paths (C:/...) instead of /c/...
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    NODE="$(cygpath -m "$NODE")"
    if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then export CLAUDE_CONFIG_DIR="$(cygpath -m "$CLAUDE_CONFIG_DIR")"; fi
    ;;
esac

# Update Claude Code's settings first: if settings.json is invalid this stops
# before anything else is installed.
"$NODE" "$ROOT/lib/configure.js" install "$NODE"
"$NODE" "$ROOT/lib/browsers.js" install "$NODE"

cat <<EOF

Next steps:
  1. Open your browser's extensions page (chrome://extensions, edge://extensions,
     brave://extensions, ...), turn on Developer mode, click "Load unpacked"
     and choose: $ROOT/extension
  2. Restart any running Claude Code sessions so they pick up the hook.
  3. Select text on any page and press Alt+Shift+C (⌥⇧C on a Mac).
EOF
