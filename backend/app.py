import os
from typing import Literal, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import cohere
from pypdf import PdfReader
import io

load_dotenv()
PORT = int(os.getenv("PORT", "3001"))
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
if not COHERE_API_KEY:
    raise RuntimeError("Set COHERE_API_KEY in .env")
# keep model swappable via env if Cohere suggests a newer one later
COHERE_MODEL = os.getenv("COHERE_MODEL", "command")

app = FastAPI(title="PDF Summarizer API")

# CORS relaxed for local dev; tighten later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True,
)

co = cohere.Client(COHERE_API_KEY)

@app.get("/health")
def health():
    return {"ok": True}

# ---------- helpers ----------
def read_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    parts: List[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            parts.append("")
    text = "\n".join(parts).strip()
    # light cleanup to remove empty lines
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())

def chunk_text(s: str, max_chars: int = 7000) -> List[str]:
    return [s[i:i+max_chars] for i in range(0, len(s), max_chars)]

def build_prompt(text: str, mode: str) -> str:
    if mode == "keypoints":
        return (
            "Summarize the following text into only 5–8 crisp bullet points. "
            "Do not add any closing statements, commentary, or extra text. "
            "Only output the bullet points.\n\n---\n" + text
        )
    if mode == "eli5":
        return "Explain simply in ≤200 words. Include a tiny concrete example if helpful.\n\n---\n" + text
    # default
    return "Write a clear TL;DR (120–180 words) covering the central thesis, main arguments, and conclusions.\n\n---\n" + text

def summarize_large(text: str, mode: str = "tldr") -> str:
    pieces = chunk_text(text, 7000)
    partials: List[str] = []
    for piece in pieces:
        chat = co.chat(model=COHERE_MODEL, message=build_prompt(piece, mode))
        part = getattr(chat, "text", None) or chat.message.content[0].text
        partials.append(part.strip())

    if len(partials) == 1:
        return partials[0]

    stitched = "\n\n".join(f"- {p}" for p in partials)
    final_prompt = (
        "Combine these notes into one cohesive summary (150–200 words), "
        "avoiding repetition but preserving key details:\n\n" + stitched
    )
    chat = co.chat(model=COHERE_MODEL, message=final_prompt)
    return (getattr(chat, "text", None) or chat.message.content[0].text).strip()

# ---------- endpoint ----------
@app.post("/summarize")
async def summarize(
    file: UploadFile = File(...),
    mode: Literal["tldr","keypoints","eli5"] = Form("tldr")
):
    # accept PDFs; we’ll add DOCX/text later
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(400, detail="Please upload a PDF")

    data = await file.read()
    text = read_pdf_text(data)
    if not text:
        raise HTTPException(400, detail="Could not extract text from PDF")

    summary = summarize_large(text, mode)
    return {"mode": mode, "summary": summary}
