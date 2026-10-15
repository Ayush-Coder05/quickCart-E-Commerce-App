import os
import uuid
import base64
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Directory to store uploaded images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class Base64UploadRequest(BaseModel):
    image: str
    filename: Optional[str] = None

@router.post("")
async def upload_file(request: Request, file: UploadFile = File(...)):
    try:
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        if ext.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            ext = ".jpg"

        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, unique_name)

        contents = await file.read()
        with open(dest_path, "wb") as f:
            f.write(contents)

        base_url = str(request.base_url).rstrip("/")
        full_url = f"{base_url}/uploads/{unique_name}"

        return {
            "success": True,
            "url": full_url,
            "filename": unique_name,
            "relativePath": f"/uploads/{unique_name}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/base64")
async def upload_base64(request: Request, req: Base64UploadRequest):
    try:
        data = req.image.strip()
        ext = ".jpg"
        if data.startswith("data:image/"):
            header, encoded = data.split(",", 1)
            if "png" in header:
                ext = ".png"
            elif "webp" in header:
                ext = ".webp"
            elif "gif" in header:
                ext = ".gif"
        else:
            encoded = data

        binary_data = base64.b64decode(encoded)
        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, unique_name)

        with open(dest_path, "wb") as f:
            f.write(binary_data)

        base_url = str(request.base_url).rstrip("/")
        full_url = f"{base_url}/uploads/{unique_name}"

        return {
            "success": True,
            "url": full_url,
            "filename": unique_name,
            "relativePath": f"/uploads/{unique_name}",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Base64 image upload failed: {str(e)}")
