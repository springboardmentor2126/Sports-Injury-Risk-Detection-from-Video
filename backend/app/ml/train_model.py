import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

# ----------------------------
# Load Dataset
# ----------------------------

df = pd.read_csv("backend/app/ml/training_dataset.csv")

# ----------------------------
# Encode Labels
# ----------------------------

movement_encoder = LabelEncoder()
risk_encoder = LabelEncoder()

df["movement"] = movement_encoder.fit_transform(df["movement"])
df["risk"] = risk_encoder.fit_transform(df["risk"])

# ----------------------------
# Features
# ----------------------------

X = df.drop(columns=["risk"])

y = df["risk"]

# ----------------------------
# Train/Test Split
# ----------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# ----------------------------
# Random Forest
# ----------------------------

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=10,
    random_state=42
)

model.fit(X_train, y_train)

# ----------------------------
# Evaluation
# ----------------------------

prediction = model.predict(X_test)

accuracy = accuracy_score(y_test, prediction)

print("\n===================================")
print("Model Accuracy :", round(accuracy * 100, 2), "%")
print("===================================\n")

print(classification_report(y_test, prediction))

# ----------------------------
# Save Model
# ----------------------------

joblib.dump(model, "backend/app/ml/model.pkl")

joblib.dump(risk_encoder,
            "backend/app/ml/risk_encoder.pkl")

joblib.dump(movement_encoder,
            "backend/app/ml/movement_encoder.pkl")

print("\nModel Saved Successfully")