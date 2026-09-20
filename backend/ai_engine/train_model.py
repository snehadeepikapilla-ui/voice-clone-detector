import os
import joblib
import numpy as np

from feature_extractor import extract_features
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

AI_DIR = os.path.join(BASE_DIR, "dataset", "ai")
HUMAN_DIR = os.path.join(BASE_DIR, "dataset", "human")

MODEL_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "voice_detector.joblib"
)

X = []
y = []


def process_folder(folder_path, label):
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return

    for filename in os.listdir(folder_path):

        if filename.lower().endswith(
            (".wav", ".mp3", ".m4a", ".ogg")
        ):

            file_path = os.path.join(
                folder_path,
                filename
            )

            try:
                features = extract_features(file_path)

                feature_vector = [
                    features["duration_seconds"],
                    features["mfcc_mean"],
                    features["mfcc_std"],
                    features["spectral_centroid_mean"],
                    features["spectral_centroid_std"],
                    features["zero_crossing_rate_mean"],
                    features["zero_crossing_rate_std"],
                    features["spectral_bandwidth_mean"],
                    features["rms_mean"],
                ]

                X.append(feature_vector)
                y.append(label)

                print(f"Processed: {filename}")

            except Exception as e:
                print(f"Skipped {filename}: {e}")


# -----------------------------------
# Labels
# Human = 0
# AI = 1
# -----------------------------------

process_folder(HUMAN_DIR, 0)
process_folder(AI_DIR, 1)


# -----------------------------------
# Check dataset
# -----------------------------------

if len(X) < 4:
    raise ValueError(
        "Not enough audio files. "
        "Add more files to dataset/ai and dataset/human."
    )


X = np.array(X)
y = np.array(y)


# -----------------------------------
# Train/Test Split
# -----------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# -----------------------------------
# Random Forest Model
# -----------------------------------

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)


# -----------------------------------
# Train
# -----------------------------------

model.fit(X_train, y_train)


# -----------------------------------
# Predictions
# -----------------------------------

predictions = model.predict(X_test)


# -----------------------------------
# Evaluation Metrics
# -----------------------------------

accuracy = accuracy_score(
    y_test,
    predictions
)

precision = precision_score(
    y_test,
    predictions,
    zero_division=0
)

recall = recall_score(
    y_test,
    predictions,
    zero_division=0
)

f1 = f1_score(
    y_test,
    predictions,
    zero_division=0
)

confusion = confusion_matrix(
    y_test,
    predictions
)


# -----------------------------------
# Display Results
# -----------------------------------

print("\n================================")
print("       MODEL PERFORMANCE")
print("================================")

print(
    f"Accuracy  : {accuracy * 100:.2f}%"
)

print(
    f"Precision : {precision * 100:.2f}%"
)

print(
    f"Recall    : {recall * 100:.2f}%"
)

print(
    f"F1 Score  : {f1 * 100:.2f}%"
)

print("================================")

print("\nConfusion Matrix:")
print(confusion)

print("\n================================")


# -----------------------------------
# Save Model
# -----------------------------------

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    model,
    MODEL_PATH
)

print(
    f"Model saved to: {MODEL_PATH}"
)