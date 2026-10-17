const HOST = "com.claude.clip";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-selection",
    title: "Send to Claude Code",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "send-selection") sendSelection(tab, info.frameId);
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "send-selection") return;
  tab ??= (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (tab) sendSelection(tab);
});

function callHost(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST, message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!response?.ok) reject(new Error(response?.error || "No response from host"));
      else resolve(response);
    });
  });
}

async function toast(tabId, message, ok = true) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: (m, o) => window.__claudeClip?.toast(m, o),
      args: [message, ok],
    });
  } catch {}
}

async function sendSelection(tab, preferredFrameId) {
  let results;
  try {
    // Inject into every frame: Google Chat inside Gmail lives in an iframe.
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["content.js"] });
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => window.__claudeClip?.capture(),
    });
  } catch {
    return; // chrome:// pages, the Web Store, etc. can't be scripted
  }

  const found = results.filter((r) => r.result);
  const hit = found.find((r) => r.frameId === preferredFrameId) || found[0];
  if (!hit) return toast(tab.id, "Select some text first", false);

  // Prefer the tab's URL and title: an iframe's own are less useful.
  const clip = { ...hit.result, url: tab.url || hit.result.url, title: tab.title || hit.result.title };
  try {
    const { count } = await callHost({ action: "add", clip });
    toast(tab.id, `📎 Queued for Claude Code (${count} waiting)`);
  } catch (err) {
    const missing = /native messaging host not found/i.test(err.message);
    toast(tab.id, missing ? "Claude Clip host not installed. Run install.sh" : `Claude Clip: ${err.message}`, false);
  }
}
