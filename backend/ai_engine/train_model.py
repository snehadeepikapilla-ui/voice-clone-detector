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


# ==========================================
# PROJECT DIRECTORIES
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

AI_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "ai"
)

HUMAN_DIR = os.path.join(
    BASE_DIR,
    "dataset",
    "human"
)

MODEL_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "voice_detector.joblib"
)


# ==========================================
# DATA STORAGE
# ==========================================

X = []
y = []


# ==========================================
# PROCESS AUDIO FILES
# ==========================================

def process_folder(folder_path, label):

    if not os.path.exists(folder_path):
        raise FileNotFoundError(
            f"Folder not found: {folder_path}"
        )

    files = os.listdir(folder_path)

    print(f"\nProcessing folder: {folder_path}")

    count = 0

    for filename in files:

        if filename.lower().endswith(
            (".wav", ".mp3", ".m4a", ".ogg")
        ):

            file_path = os.path.join(
                folder_path,
                filename
            )

            try:

                features = extract_features(
                    file_path
                )

                feature_vector = [
                    features["duration_seconds"],
                    features["mfcc_mean"],
                    features["mfcc_std"],
                    features["spectral_centroid_mean"],
                    features["spectral_centroid_std"],
                    features["zero_crossing_rate_mean"],
                    features["zero_crossing_rate_std"],
                    features["spectral_bandwidth_mean"],
                    features["rms_mean"]
                ]

                X.append(feature_vector)
                y.append(label)

                count += 1

            except Exception as e:

                print(
                    f"Skipping {filename}: {e}"
                )

    print(
        f"Processed {count} audio files."
    )


# ==========================================
# LABELS
# Human = 0
# AI    = 1
# ==========================================

print("\n================================")
print("     VOICE DETECTION TRAINING")
print("================================")

process_folder(
    HUMAN_DIR,
    0
)

process_folder(
    AI_DIR,
    1
)


# ==========================================
# CHECK DATASET
# ==========================================

if len(X) < 4:

    raise ValueError(
        "Not enough audio files. "
        "Add more files to dataset/ai "
        "and dataset/human."
    )


X = np.array(X)
y = np.array(y)


print("\n================================")
print("DATASET INFORMATION")
print("================================")

print(
    f"Total samples : {len(X)}"
)

print(
    f"Human samples : {np.sum(y == 0)}"
)

print(
    f"AI samples    : {np.sum(y == 1)}"
)


# ==========================================
# TRAIN / TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(

    X,
    y,

    test_size=0.2,

    # Makes the split reproducible
    random_state=42,

    # Keeps human/AI ratio balanced
    stratify=y
)


print("\n================================")
print("TRAIN / TEST DATA")
print("================================")

print(
    f"Training samples : {len(X_train)}"
)

print(
    f"Testing samples  : {len(X_test)}"
)


# ==========================================
# RANDOM FOREST MODEL
# ==========================================

model = RandomForestClassifier(

    n_estimators=200,

    random_state=42,

    class_weight="balanced"
)


# ==========================================
# TRAIN MODEL
# ==========================================

print("\n================================")
print("TRAINING MODEL...")
print("================================")

model.fit(
    X_train,
    y_train
)


# ==========================================
# PREDICTIONS
# ==========================================

predictions = model.predict(
    X_test
)


# ==========================================
# MODEL PERFORMANCE
# ==========================================

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


# ==========================================
# DISPLAY RESULTS
# ==========================================

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


# ==========================================
# CONFUSION MATRIX
# ==========================================

print("\nConfusion Matrix:")

print(confusion)

print("\n")
print("Matrix format:")
print("[[True Human, False AI]")
print(" [False Human, True AI]]")


# ==========================================
# SAVE MODEL
# ==========================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    model,
    MODEL_PATH
)


print("\n================================")
print("MODEL SAVED")
print("================================")

print(
    f"Model saved to: {MODEL_PATH}"
)

print("================================")