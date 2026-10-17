#!/bin/bash
# Removes the native host registration and the Claude Code hook/status line.
# Queued clips in ~/.claude-inbox are left in place.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use the node that install.sh pinned in run-host.sh, falling back to node on PATH.
NODE="$(sed -n 's/^exec "\([^"]*\)".*/\1/p' "$ROOT/host/run-host.sh" 2>/dev/null || true)"
[ -x "$NODE" ] || NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "node not found on PATH" >&2
  exit 1
fi

# Settings first: if settings.json is invalid this stops before removing anything.
"$NODE" "$ROOT/lib/configure.js" uninstall
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.claude.clip.json"
rm -f "$ROOT/host/run-host.sh"
echo "✓ Removed Chrome native host"
echo "Remove the extension from chrome://extensions to finish."
