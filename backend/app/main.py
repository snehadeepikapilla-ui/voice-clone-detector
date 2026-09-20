from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.detection import router as detection_router
from app.routes.health import router as health_router
from app.routes.websocket import router as websocket_router

app = FastAPI(title="Voice Clone Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(detection_router)
app.include_router(websocket_router)


@app.get("/")
def home():
    return {
        "message": "Voice Clone Detector API is running"
    }