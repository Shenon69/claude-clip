#!/bin/bash
# Removes the native host registration and the Claude Code hook/status line.
# Queued clips in ~/.claude-inbox are left in place.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# Settings first: if settings.json is invalid this stops before removing anything.
node "$ROOT/lib/configure.js" uninstall
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.claude.clip.json"
rm -f "$ROOT/host/run-host.sh"
echo "✓ Removed Chrome native host"
echo "Remove the extension from chrome://extensions to finish."
