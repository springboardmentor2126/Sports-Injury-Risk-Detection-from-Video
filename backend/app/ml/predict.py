import joblib
import pandas as pd
import os

BASE_DIR = os.path.dirname(__file__)

model = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
risk_encoder = joblib.load(os.path.join(BASE_DIR, "risk_encoder.pkl"))

FEATURE_ORDER = [
    "left_knee",
    "right_knee",
    "left_hip",
    "right_hip",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "symmetry",
    "age",
    "experience",
    "previous_injuries",
    "movement"
]


def predict_injury(features):

    df = pd.DataFrame([features])

    # Ensure the columns are in the exact same order
    df = df[FEATURE_ORDER]

    prediction = model.predict(df)[0]

    injury_risk = risk_encoder.inverse_transform([prediction])[0]

    return {
        "injury_risk": injury_risk
    }