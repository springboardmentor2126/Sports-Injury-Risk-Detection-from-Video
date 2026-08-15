# -*- coding: utf-8 -*-
"""
train_xgboost.py
================
Trains an XGBoost multi-class injury risk classifier on the synthetic dataset.

Usage:
    cd backend
    python scripts/train_xgboost.py

Outputs (saved to backend/app/ml/models/):
    xgboost_model.pkl   - Trained XGBoost classifier
    label_encoder.pkl   - Sport-type LabelEncoder (needed at inference time)
    feature_names.txt   - Column order used during training
"""

import sys, os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)
import xgboost as xgb

# Path setup
ROOT       = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH  = os.path.join(ROOT, "..", "datasets", "synthetic", "sport_injury_dataset.csv")
MODEL_DIR  = os.path.join(ROOT, "app", "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

RISK_NAMES = {0: "Low", 1: "Moderate", 2: "High", 3: "Critical"}
RANDOM_SEED = 42

print("=" * 62)
print("  SportGuard - XGBoost Injury Risk Model Training")
print("=" * 62)

# ── 1. Load dataset ───────────────────────────────────────────────
print("\n  Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"  Rows: {len(df):,}  |  Columns: {len(df.columns)}")
print(f"  Sports: {df['sport_type'].nunique()}  |  Risk classes: {df['risk_level'].nunique()}")

# ── 2. Feature engineering ────────────────────────────────────────
print("\n  Encoding features...")
le = LabelEncoder()
df["sport_encoded"] = le.fit_transform(df["sport_type"])

FEATURE_COLS = [
    "sport_encoded",
    "knee_flexion",
    "hip_angle",
    "elbow_angle",
    "shoulder_rotation",
    "trunk_lean",
    "knee_valgus_angle",
    "symmetry",
    "flag_knee_hyperext",
    "flag_knee_valgus",
    "flag_trunk_lean",
    "flag_low_symmetry",
]
TARGET_COL = "risk_level"

X = df[FEATURE_COLS].values
y = df[TARGET_COL].values
print(f"  Features: {len(FEATURE_COLS)} columns")

# ── 3. Train/test split ───────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=RANDOM_SEED, stratify=y
)
print(f"  Train samples: {len(X_train):,}  |  Test samples: {len(X_test):,}")

# ── 4. Train XGBoost ──────────────────────────────────────────────
print("\n  Training XGBoost classifier...")
model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.08,
    subsample=0.85,
    colsample_bytree=0.85,
    gamma=0.1,
    min_child_weight=3,
    objective="multi:softmax",
    num_class=4,
    eval_metric="mlogloss",
    random_state=RANDOM_SEED,
    n_jobs=-1,
)
model.fit(X_train, y_train, verbose=False)
print("  Training complete.")

# ── 5. Evaluation ─────────────────────────────────────────────────
print("\n  Evaluating on held-out test set (20%)...")
y_pred = model.predict(X_test)
acc    = accuracy_score(y_test, y_pred)

print(f"\n  Test Accuracy:  {acc * 100:.2f}%")
print(f"  Total samples:  {len(y_test):,}")
print(f"  Correct:        {int(acc * len(y_test)):,}")
print(f"  Incorrect:      {len(y_test) - int(acc * len(y_test)):,}")

print("\n  Per-class Report:")
print("  " + "-" * 58)
report = classification_report(
    y_test, y_pred,
    target_names=[RISK_NAMES[i] for i in range(4)],
    digits=3
)
for line in report.strip().split("\n"):
    print("  " + line)

# ── 6. Confusion matrix ───────────────────────────────────────────
print("\n  Confusion Matrix (rows=Actual, cols=Predicted):")
print("  " + "-" * 42)
cm = confusion_matrix(y_test, y_pred)
labels = [RISK_NAMES[i] for i in range(4)]
col_w = 11
header = "  " + " " * 12 + "".join(f"{l:>{col_w}}" for l in labels)
print(header)
for i, row in enumerate(cm):
    row_str = "  " + f"{labels[i]:<12}" + "".join(f"{v:>{col_w}}" for v in row)
    print(row_str)

# ── 7. Cross-validation ───────────────────────────────────────────
print("\n  5-Fold Cross-Validation (on full dataset)...")
cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy", n_jobs=-1)
print(f"  CV Accuracy: {cv_scores.mean()*100:.2f}% +/- {cv_scores.std()*100:.2f}%")
print(f"  Per-fold:    {' | '.join([f'{s*100:.1f}%' for s in cv_scores])}")

# ── 8. Feature importance ─────────────────────────────────────────
print("\n  Feature Importance (by weight):")
print("  " + "-" * 42)
importances = model.feature_importances_
ranked = sorted(zip(FEATURE_COLS, importances), key=lambda x: x[1], reverse=True)
for feat, imp in ranked:
    bar = "#" * int(imp * 80)
    print(f"  {feat:<25}  {imp:.4f}  {bar}")

# ── 9. Save model + encoder ───────────────────────────────────────
model_path   = os.path.join(MODEL_DIR, "xgboost_model.pkl")
encoder_path = os.path.join(MODEL_DIR, "label_encoder.pkl")
feats_path   = os.path.join(MODEL_DIR, "feature_names.txt")

with open(model_path,   "wb") as f: pickle.dump(model, f)
with open(encoder_path, "wb") as f: pickle.dump(le, f)
with open(feats_path,   "w")  as f: f.write("\n".join(FEATURE_COLS))

print(f"\n  Saved model    -> {model_path}")
print(f"  Saved encoder  -> {encoder_path}")
print(f"  Saved features -> {feats_path}")

print("\n" + "=" * 62)
if acc >= 0.90:
    print(f"  PASS - Accuracy {acc*100:.2f}% meets the >=90% threshold.")
else:
    print(f"  NOTE - Accuracy {acc*100:.2f}% is below 90%. Consider tuning.")
print("=" * 62)