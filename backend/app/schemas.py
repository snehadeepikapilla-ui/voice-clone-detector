from pydantic import BaseModel


class AudioFeatures(BaseModel):
    duration_seconds: float
    mfcc_mean: float
    spectral_centroid_mean: float
    zero_crossing_rate_mean: float


class DetectionResponse(BaseModel):
    result: str
    ai_clone_probability: int
    risk_level: str
    recommended_action: str
    features: AudioFeatures