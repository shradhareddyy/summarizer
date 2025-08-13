import { useEffect, useState } from "react";
import { summarizeFile } from "./api";

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mode, setMode] = useState("tldr");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  // create a local preview for the chosen PDF
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSummarize() {
    if (!file) { setError("Please choose a PDF first."); return; }
    setError("");
    setSummary("");
    setLoading(true);
    try {
      const res = await summarizeFile(file, { mode, title });
      setSummary(res.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 12 }}>PDF Summarizer</h1>

      {/* Controls */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Optional title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
          >
            <option value="tldr">TL;DR</option>
            <option value="keypoints">Key points</option>
            <option value="eli5">Explain simply</option>
          </select>
          <button
            onClick={handleSummarize}
            disabled={loading}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd" }}
          >
            {loading ? "Summarizing…" : "Summarize"}
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}

      {/* Two-column: PDF preview | Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minHeight: 400 }}>
          <h2 style={{ marginTop: 0 }}>Preview</h2>
          {!previewUrl && <div style={{ color: "#666" }}>Choose a PDF to preview.</div>}
          {previewUrl && (
            <object data={previewUrl} type="application/pdf" width="100%" height="600px">
              <p>
                Your browser can’t preview this PDF.{" "}
                <a href={previewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
              </p>
            </object>
          )}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minHeight: 400 }}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          {!summary && <div style={{ color: "#666" }}>Click “Summarize” to see the result.</div>}
          {summary && <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{summary}</div>}
        </div>
      </div>
    </div>
  );
}
