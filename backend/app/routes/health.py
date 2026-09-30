from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "Backend is working"
    }
    import os

@router.get("/dataset-stats")
def dataset_stats():
    base_dir = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
    )

    ai_dir = os.path.join(base_dir, "dataset", "ai")
    human_dir = os.path.join(base_dir, "dataset", "human")

    audio_extensions = (".wav", ".mp3", ".m4a", ".ogg")

    ai_count = 0
    human_count = 0

    if os.path.exists(ai_dir):
        ai_count = sum(
            1
            for file in os.listdir(ai_dir)
            if file.lower().endswith(audio_extensions)
        )

    if os.path.exists(human_dir):
        human_count = sum(
            1
            for file in os.listdir(human_dir)
            if file.lower().endswith(audio_extensions)
        )

    return {
        "human_voices": human_count,
        "ai_voices": ai_count,
        "total": human_count + ai_count
    }







    