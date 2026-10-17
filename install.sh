#!/bin/bash
# Installs Claude Clip: the Chrome native messaging host, plus the Claude Code
# prompt hook and status line. Safe to run again.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_ID="emifkioohjimifiidbhnbafokoaecppe"   # fixed by the "key" in extension/manifest.json
HOST_NAME="com.claude.clip"
HOSTS_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

# Chrome starts the host without your shell profile (so no nvm), so pin node's full path.
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "node not found on PATH" >&2
  exit 1
fi

cat > "$ROOT/host/run-host.sh" <<EOF
#!/bin/bash
exec "$NODE" "$ROOT/host/host.js"
EOF
chmod +x "$ROOT/host/run-host.sh"

mkdir -p "$HOSTS_DIR"
cat > "$HOSTS_DIR/$HOST_NAME.json" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Claude Clip queue",
  "path": "$ROOT/host/run-host.sh",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
EOF
echo "✓ Registered Chrome native host ($HOSTS_DIR/$HOST_NAME.json)"

"$NODE" "$ROOT/lib/configure.js" install "$NODE"

cat <<EOF

Next steps:
  1. Open chrome://extensions, turn on Developer mode, click "Load unpacked"
     and choose: $ROOT/extension
  2. Restart any running Claude Code sessions so they pick up the hook.
  3. Select text on any page and press ⌥⇧C (Alt+Shift+C).
EOF
