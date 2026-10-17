// Injected into every frame on demand. Exposes capture() to read the current
// selection (with Google Chat sender details when available) and toast().
(() => {
  if (window.__claudeClip) return;

  function selectedText() {
    const el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT") && typeof el.selectionStart === "number") {
      const text = el.value.slice(el.selectionStart, el.selectionEnd);
      if (text.trim()) return text;
    }
    return String(window.getSelection() || "");
  }

  function sourceName() {
    const host = location.hostname;
    if (host === "chat.google.com") return "Google Chat";
    if (host === "mail.google.com") return "Gmail";
    return host;
  }

  // Best-effort: Google Chat marks sender names with a data-name attribute.
  // Find the nearest one that comes before the selection in the same message group.
  function chatSender() {
    if (!/(^|\.)(chat|mail)\.google\.com$/.test(location.hostname)) return "";
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    const start = sel.getRangeAt(0).startContainer;
    let node = start.nodeType === Node.ELEMENT_NODE ? start : start.parentElement;
    for (let depth = 0; node && depth < 30; depth++, node = node.parentElement) {
      const names = [...node.querySelectorAll("[data-name]")].filter(
        (el) => el.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (names.length > 0) return names[names.length - 1].getAttribute("data-name") || "";
    }
    return "";
  }

  function capture() {
    const text = selectedText().trim();
    if (!text) return null;
    return { text, source: sourceName(), sender: chatSender(), title: document.title, url: location.href };
  }

  function toast(message, ok = true) {
    document.getElementById("__claude-clip-toast")?.remove();
    const el = document.createElement("div");
    el.id = "__claude-clip-toast";
    el.textContent = message;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "2147483647",
      padding: "10px 14px",
      borderRadius: "8px",
      font: "500 13px/1.4 -apple-system, BlinkMacSystemFont, sans-serif",
      color: "#fff",
      background: ok ? "#1f2937" : "#b91c1c",
      boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      maxWidth: "360px",
      transition: "opacity .3s",
    });
    document.documentElement.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), 2200);
    setTimeout(() => el.remove(), 2600);
  }

  window.__claudeClip = { capture, toast };
})();
