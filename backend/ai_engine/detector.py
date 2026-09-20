import os
import joblib

from ai_engine.feature_extractor import extract_features
from decision_engine.decision import make_decision


MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "models",
    "voice_detector.joblib"
)


if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        "Trained model not found. Run train_model.py first."
    )


model = joblib.load(MODEL_PATH)


def detect_voice(audio_path: str) -> dict:

    # 1. Extract audio features
    features = extract_features(audio_path)

    # 2. Create feature vector
    feature_vector = [[
        features["duration_seconds"],
        features["mfcc_mean"],
        features["mfcc_std"],
        features["spectral_centroid_mean"],
        features["spectral_centroid_std"],
        features["zero_crossing_rate_mean"],
        features["zero_crossing_rate_std"],
        features["spectral_bandwidth_mean"],
        features["rms_mean"],
    ]]

    # 3. AI model prediction
    probabilities = model.predict_proba(feature_vector)[0]

    ai_probability = float(probabilities[1] * 100)

    # 4. Send probability to Decision Engine
    decision = make_decision(ai_probability)

    # 5. Return complete result
    return {
        **decision,
        "features": features
    }