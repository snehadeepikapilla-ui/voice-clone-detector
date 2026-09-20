import librosa
import numpy as np


def extract_features(audio_path: str) -> dict:
    """
    Extract important audio features from a voice recording.
    """

    # Load audio at 16 kHz
    y, sr = librosa.load(audio_path, sr=16000, mono=True)

    if len(y) == 0:
        raise ValueError("Audio file is empty.")

    # Duration
    duration = len(y) / sr

    # MFCC
    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=13
    )

    # Spectral Centroid
    spectral_centroid = librosa.feature.spectral_centroid(
        y=y,
        sr=sr
    )

    # Zero Crossing Rate
    zero_crossing_rate = librosa.feature.zero_crossing_rate(y)

    # Spectral Bandwidth
    spectral_bandwidth = librosa.feature.spectral_bandwidth(
        y=y,
        sr=sr
    )

    # RMS Energy
    rms = librosa.feature.rms(y=y)

    # Return features
    return {
        "duration_seconds": float(duration),

        "mfcc_mean": float(np.mean(mfcc)),
        "mfcc_std": float(np.std(mfcc)),

        "spectral_centroid_mean": float(
            np.mean(spectral_centroid)
        ),
        "spectral_centroid_std": float(
            np.std(spectral_centroid)
        ),

        "zero_crossing_rate_mean": float(
            np.mean(zero_crossing_rate)
        ),
        "zero_crossing_rate_std": float(
            np.std(zero_crossing_rate)
        ),

        "spectral_bandwidth_mean": float(
            np.mean(spectral_bandwidth)
        ),

        "rms_mean": float(np.mean(rms))
    }