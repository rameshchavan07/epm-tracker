from fastapi import FastAPI
from pydantic import BaseModel
import base64
import numpy as np
import cv2
import logging
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ArcFace Embedding Service")

# Load ArcFace (buffalo_l = ResNet-50 + RetinaFace, 512D embeddings) once at startup
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))
logger.info("ArcFace buffalo_l model loaded successfully.")


class EmbeddingRequest(BaseModel):
    image: str  # base64 encoded JPEG (no data URI prefix needed)


class EmbeddingResponse(BaseModel):
    embedding: list[float] = []
    detected: bool = False
    message: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "model": "ArcFace buffalo_l (512D)"}


@app.post("/extract-embedding", response_model=EmbeddingResponse)
def extract_embedding(req: EmbeddingRequest):
    try:
        # Strip data URI prefix if present
        raw = req.image
        if "," in raw:
            raw = raw.split(",", 1)[1]

        # Decode base64 image to numpy array
        image_data = base64.b64decode(raw)
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return EmbeddingResponse(detected=False, message="Failed to decode image")

        # Detect faces and extract ArcFace embeddings
        faces = face_app.get(img)

        if not faces:
            return EmbeddingResponse(detected=False, message="No face detected in the image")

        # Use the face with highest detection confidence score
        face = max(faces, key=lambda f: f.det_score)
        embedding = face.embedding.tolist()  # 512-dimensional vector

        logger.info(f"Face detected with confidence {face.det_score:.4f}, embedding dim={len(embedding)}")
        return EmbeddingResponse(embedding=embedding, detected=True, message="OK")

    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        return EmbeddingResponse(detected=False, message=str(e))
