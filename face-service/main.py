from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import base64
import numpy as np
import cv2
import logging
from insightface.app import FaceAnalysis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ArcFaceService")

app = FastAPI(
    title="EPM ArcFace Embedding Service",
    description="512-Dimensional Facial Embedding Extraction Microservice",
    version="1.0.0"
)

# Load ArcFace (buffalo_l = ResNet-50 + RetinaFace, 512D embeddings) once at startup
try:
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("ArcFace buffalo_l model loaded successfully.")
except Exception as init_err:
    logger.error(f"Failed to initialize ArcFace model: {init_err}")
    face_app = None


class EmbeddingRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG/PNG image")


class EmbeddingResponse(BaseModel):
    embedding: list[float] = []
    detected: bool = False
    message: str = ""


@app.get("/health")
def health():
    if face_app is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ArcFace model failed to initialize"
        )
    return {
        "status": "ok",
        "model": "ArcFace buffalo_l (512D)",
        "ready": True
    }


@app.post("/extract-embedding", response_model=EmbeddingResponse)
def extract_embedding(req: EmbeddingRequest):
    if face_app is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ArcFace model is not initialized"
        )

    try:
        raw = req.image
        if "," in raw:
            raw = raw.split(",", 1)[1]

        # Payload size validation (max ~10MB base64 string)
        if len(raw) > 15 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image payload exceeds maximum allowed size (10MB)"
            )

        # Decode base64 image to numpy array
        image_data = base64.b64decode(raw)
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return EmbeddingResponse(detected=False, message="Failed to decode image data")

        # Detect faces and extract ArcFace embeddings
        faces = face_app.get(img)

        if not faces:
            return EmbeddingResponse(detected=False, message="No face detected in the image")

        # Use the face with highest detection confidence score
        face = max(faces, key=lambda f: f.det_score)
        embedding = face.embedding.tolist()  # 512-dimensional vector

        logger.info(f"Face detected with confidence {face.det_score:.4f}, embedding dim={len(embedding)}")
        return EmbeddingResponse(embedding=embedding, detected=True, message="OK")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        return EmbeddingResponse(detected=False, message=f"Internal processing error: {str(e)}")
