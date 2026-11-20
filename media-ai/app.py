import os, tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
from faster_whisper import WhisperModel

app = FastAPI(title="Konstruxio Media AI", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
_model = None
def whisper():
    global _model
    if _model is None:
        _model = WhisperModel(os.getenv("WHISPER_MODEL", "small"), device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))
    return _model

@app.get("/health")
def health(): return {"status":"ok", "ocr":"tesseract", "speech":"faster-whisper"}

@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    data = await file.read()
    if not data or len(data) > 12 * 1024 * 1024: raise HTTPException(400, "Image must be under 12 MB")
    try:
        import io
        image = Image.open(io.BytesIO(data)).convert("RGB")
        text = pytesseract.image_to_string(image, lang="eng+deu+fra+spa+hin")
        return {"text":text, "engine":"tesseract"}
    except Exception as exc: raise HTTPException(422, f"OCR could not process image: {exc}")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("en")):
    data = await file.read()
    if not data or len(data) > 25 * 1024 * 1024: raise HTTPException(400, "Audio must be under 25 MB")
    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data); path=tmp.name
        segments, info = whisper().transcribe(path, language=language if language != "auto" else None, vad_filter=True)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text":text, "language":info.language, "language_probability":info.language_probability, "engine":"faster-whisper", "model":os.getenv("WHISPER_MODEL", "small")}
    except Exception as exc: raise HTTPException(502, f"Speech recognition failed: {exc}")
    finally:
        if path and os.path.exists(path): os.unlink(path)
