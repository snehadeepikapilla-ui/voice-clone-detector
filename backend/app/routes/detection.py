import os
import tempfile

from fastapi import APIRouter, UploadFile, File, HTTPException

from ai_engine.detector import detect_voice


router = APIRouter()


@router.post("/detect")
async def detect_audio(file: UploadFile = File(...)):

    allowed_extensions = [".wav", ".mp3", ".m4a", ".ogg"]

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format."
        )

    try:
        audio_data = await file.read()

        if not audio_data:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty."
            )

        # Temporary file
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            temp_file.write(audio_data)
            temp_path = temp_file.name

        # AI detection
        result = detect_voice(temp_path)

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {str(e)}"
        )

    finally:
        if "temp_path" in locals() and os.path.exists(temp_path):
            os.remove(temp_path)