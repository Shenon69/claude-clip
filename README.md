# Claude Clip

Select text anywhere in your browser, press **⌥⇧C** (Alt+Shift+C on Windows and Linux), and it attaches to the next prompt you send in Claude Code. No copy and paste.

Works on macOS, Linux and Windows, in Chrome, Edge, Brave, Arc, Vivaldi and Chromium.

```
Browser (any page) ──⌥⇧C──► extension ──native messaging──► host/host.js
                                                              │
                                                ~/.claude-inbox/queue.json
                                                              │
Claude Code: status line shows "📎 1 clip queued"  ◄──────────┤
You send a prompt ──► hooks/attach-clips.js adds the clips ◄──┘
                      as context, then empties the queue
```

## Install

```bash
./install.sh
```

On Windows, run it from **Git Bash** (which Claude Code on Windows already needs).

The installer registers the native host with every supported browser it finds. Then open your browser's extensions page (`chrome://extensions`, `edge://extensions`, `brave://extensions`, ...), turn on **Developer mode**, click **Load unpacked** and pick the `extension/` folder. Restart any running Claude Code sessions.

If you install a new browser, move this folder or change your Node version, run `./install.sh` again. Reloading the browser extension does not update the Claude Code side, so run it again after pulling changes too.

Not supported: browsers installed as a Snap or Flatpak on Linux (their sandbox blocks native messaging hosts), and running Claude Code inside WSL with the browser on Windows.

If you run Claude Code with a custom `CLAUDE_CONFIG_DIR`, run the installer with the same value, for example `CLAUDE_CONFIG_DIR="$HOME/.claude-personal" ./install.sh`. Otherwise it sets up `~/.claude` instead.

## Use

- **Send:** select text, then press ⌥⇧C (Alt+Shift+C) or right-click → *Send to Claude Code*.
- **Review:** click the toolbar icon to edit, annotate or remove queued clips.
- **Attach:** type your prompt in Claude Code as usual. Queued clips are included and the queue clears.
- **Manage from Claude Code:** `/clips` lists queued clips, `/clips clear` empties the queue and `/clips drop 2` removes one. These are handled by the hook, so they never reach the model or use tokens.

Clips older than 4 hours are dropped instead of attached. Change this with `CLAUDE_CLIP_TTL_HOURS`. No history is kept: once a clip is attached, cleared, dropped or expired, it's deleted from disk.

To change the shortcut, go to `chrome://extensions/shortcuts` (or your browser's equivalent).

## Uninstall

```bash
./uninstall.sh
```
