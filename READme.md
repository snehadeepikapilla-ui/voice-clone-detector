# Voice Clone Detector

AI-powered voice analysis system for detecting potentially cloned or synthetic speech.

## Features

- Upload voice recordings for analysis
- AI-based voice classification
- AI clone probability score
- Risk level detection
- High / Medium / Low risk classification
- Live voice detection using WebSocket
- FastAPI backend
- React frontend
- Real-time audio analysis

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- WebSocket
- FFmpeg

### AI / Machine Learning
- Scikit-learn
- Random Forest Classifier
- Librosa
- NumPy
- Joblib

## How It Works

1. User uploads a voice recording or starts live detection.
2. Audio is processed.
3. Audio features are extracted.
4. The trained Random Forest model analyzes the features.
5. The system calculates an AI-generated voice probability.
6. The result and risk level are displayed.

## Detection Result

- Low Risk – Likely human voice
- Medium Risk – Suspicious voice
- High Risk – Potential AI-generated voice

## Running the Project

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload