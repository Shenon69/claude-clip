# Claude Clip

Select text anywhere in Chrome, press **⌥⇧C**, and it attaches to the next prompt you send in Claude Code. No copy and paste.

```
Chrome (any page) ──⌥⇧C──► extension ──native messaging──► host/host.js
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

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `extension/` folder. Restart any running Claude Code sessions.

If you move this folder or change your Node version, run `./install.sh` again. Reloading the Chrome extension does not update the Claude Code side, so run it again after pulling changes too.

If you run Claude Code with a custom `CLAUDE_CONFIG_DIR`, run the installer with the same value, for example `CLAUDE_CONFIG_DIR="$HOME/.claude-personal" ./install.sh`. Otherwise it sets up `~/.claude` instead.

## Use

- **Send:** select text, then press ⌥⇧C or right-click → *Send to Claude Code*.
- **Review:** click the toolbar icon to edit, annotate or remove queued clips.
- **Attach:** type your prompt in Claude Code as usual. Queued clips are included and the queue clears.
- **Manage from Claude Code:** `/clips` lists queued clips, `/clips clear` empties the queue and `/clips drop 2` removes one. These are handled by the hook, so they never reach the model or use tokens.

Clips older than 4 hours are dropped instead of attached. Change this with `CLAUDE_CLIP_TTL_HOURS`. Attached clips are logged to `~/.claude-inbox/history.jsonl`.

To change the shortcut, go to `chrome://extensions/shortcuts`.

## Uninstall

```bash
./uninstall.sh
```
