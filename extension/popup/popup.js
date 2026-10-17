const HOST = "com.claude.clip";
const list = document.getElementById("clips");
const empty = document.getElementById("empty");
const clearBtn = document.getElementById("clear");
const errorEl = document.getElementById("error");

function callHost(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST, message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!response?.ok) reject(new Error(response?.error || "No response from host"));
      else resolve(response);
    });
  });
}

function showError(err) {
  errorEl.hidden = false;
  errorEl.textContent = /not found/i.test(err.message)
    ? "Native host not installed. Run install.sh in the claude-clip folder."
    : err.message;
}

function renderClip(clip) {
  const li = document.createElement("li");

  const meta = document.createElement("div");
  meta.className = "meta";
  const label = document.createElement("span");
  const time = new Date(clip.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  label.textContent = [clip.source, clip.sender, time].filter(Boolean).join(" · ");
  label.title = clip.url;
  const remove = document.createElement("button");
  remove.className = "remove";
  remove.textContent = "Remove";
  remove.onclick = () => callHost({ action: "remove", id: clip.id }).then(load, showError);
  meta.append(label, remove);

  const text = document.createElement("textarea");
  text.value = clip.text;
  text.onchange = () => callHost({ action: "update", id: clip.id, fields: { text: text.value } }).then(load, showError);

  const note = document.createElement("input");
  note.placeholder = "Add a note for Claude (optional)";
  note.value = clip.note || "";
  note.onchange = () => callHost({ action: "update", id: clip.id, fields: { note: note.value } }).catch(showError);

  li.append(meta, text, note);
  return li;
}

async function load() {
  try {
    const { clips } = await callHost({ action: "list" });
    list.replaceChildren(...clips.map(renderClip));
    empty.hidden = clips.length > 0;
    clearBtn.hidden = clips.length === 0;
  } catch (err) {
    showError(err);
  }
}

clearBtn.onclick = () => callHost({ action: "clear" }).then(load, showError);
load();
