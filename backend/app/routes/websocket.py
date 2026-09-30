import os
import tempfile
import subprocess

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ai_engine.detector import detect_voice
from decision_engine.decision import make_decision

router = APIRouter()


def convert_webm_to_wav(webm_path: str, wav_path: str):
    command = [
        "ffmpeg",
        "-y",
        "-i",
        webm_path,
        "-ar",
        "16000",
        "-ac",
        "1",
        wav_path,
    ]

    subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )


@router.websocket("/ws/detect")
async def live_voice_detection(websocket: WebSocket):
    await websocket.accept()

    audio_buffer = bytearray()
    chunk_count = 0

    try:
        while True:
            audio_chunk = await websocket.receive_bytes()

            audio_buffer.extend(audio_chunk)
            chunk_count += 1

            if chunk_count < 5:
                await websocket.send_json({
                    "message": f"Collecting live audio: {chunk_count}/5 seconds"
                })
                continue

            webm_path = None
            wav_path = None

            try:
                # Save WebM audio
                with tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=".webm"
                ) as webm_file:
                    webm_file.write(audio_buffer)
                    webm_path = webm_file.name

                # WAV file
                wav_file = tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=".wav"
                )
                wav_path = wav_file.name
                wav_file.close()

                # Convert WebM -> WAV
                convert_webm_to_wav(webm_path, wav_path)

                # Original model detection
                result = detect_voice(wav_path)

                # ---------------------------------------
                # LIVE-ONLY CALIBRATION
                # ---------------------------------------
                original_probability = result["ai_clone_probability"]

                # Reduce borderline live scores slightly
                calibrated_probability = max(
                    0,
                    min(
                        100,
                        original_probability - 15
                    )
                )

                # Recalculate risk/result using calibrated score
                decision = make_decision(calibrated_probability)

                # Send calibrated result
                await websocket.send_json({
                    **decision,
                    "ai_clone_probability": round(
                        calibrated_probability,
                        2
                    ),
                    "features": result["features"],
                    "message": "Live audio analyzed"
                })

            except subprocess.CalledProcessError as e:
                print("FFmpeg conversion error:")
                print(e)

                await websocket.send_json({
                    "message": "Audio conversion failed"
                })

            except Exception as e:
                print("Live detection error:")
                print(e)

                await websocket.send_json({
                    "message": "Unable to analyze live audio"
                })

            finally:
                if webm_path and os.path.exists(webm_path):
                    os.remove(webm_path)

                if wav_path and os.path.exists(wav_path):
                    os.remove(wav_path)

            # Reset for next 5-second chunk
            audio_buffer.clear()
            chunk_count = 0

    except WebSocketDisconnect:
        print("Live detection client disconnected")