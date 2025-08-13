// Talk to your FastAPI backend
const BASE = "http://127.0.0.1:3001"; // change if your backend runs elsewhere

export async function summarizeFile(file, { mode = "tldr", title = "" } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mode", mode);
  if (title) fd.append("title", title); // optional

  const r = await fetch(`${BASE}/summarize`, { method: "POST", body: fd });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Summarize failed");
  }
  return r.json(); // -> { mode, summary }
}
