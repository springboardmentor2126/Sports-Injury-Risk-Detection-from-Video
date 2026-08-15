"""
generate_synthetic_data.py
==========================
Generates a clinically-bounded synthetic dataset for XGBoost injury prediction.

Usage:
    cd backend
    python scripts/generate_synthetic_data.py

Output:
    datasets/synthetic/sport_injury_dataset.csv
"""
import sys, os, random
import numpy as np
import pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from app.ml.sport_profiles import SPORT_PROFILES, SportProfile, JointProfile

SAMPLES_PER_CLASS = 800
RANDOM_SEED       = 42
OUTPUT_DIR        = os.path.join(ROOT, "..", "datasets", "synthetic")
OUTPUT_FILE       = os.path.join(OUTPUT_DIR, "sport_injury_dataset.csv")

RISK_LEVELS = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)


def _sample(profile: JointProfile, level: str) -> float:
    params = {"low": profile.normal, "moderate": profile.moderate,
              "high": profile.high,  "critical": profile.critical}[level]
    mean, std = params
    return float(np.clip(np.random.normal(mean, std), profile.abs_min, profile.abs_max))


def _flags(sport: SportProfile, kf: float, tl: float, kv: float,
           sym: float, level: str) -> dict:
    rate = {"low": sport.flag_rate_normal, "moderate": sport.flag_rate_moderate,
            "high": sport.flag_rate_high,  "critical": sport.flag_rate_critical}[level]
    f_knee_hyperext = int(kf > 180.5 or (level in ("high","critical") and random.random() < rate))
    f_knee_valgus   = int(kv < 165.0 or (level in ("high","critical") and random.random() < rate*0.7))
    f_trunk_lean    = int(tl > 30.0  or (level in ("moderate","high","critical") and random.random() < rate*0.8))
    f_low_symmetry  = int(sym < 80.0 or (level in ("high","critical") and random.random() < rate*0.9))
    return {"flag_knee_hyperext": f_knee_hyperext, "flag_knee_valgus": f_knee_valgus,
            "flag_trunk_lean": f_trunk_lean, "flag_low_symmetry": f_low_symmetry}


def generate() -> pd.DataFrame:
    rows = []
    for sport_key, sport in SPORT_PROFILES.items():
        for level, risk_int in RISK_LEVELS.items():
            for _ in range(SAMPLES_PER_CLASS):
                kf  = _sample(sport.knee_flexion,     level)
                ha  = _sample(sport.hip_angle,         level)
                ea  = _sample(sport.elbow_angle,       level)
                sr  = _sample(sport.shoulder_rotation, level)
                tl  = _sample(sport.trunk_lean,        level)
                kv  = _sample(sport.knee_valgus_angle, level)
                sym = _sample(sport.symmetry,          level)
                flags = _flags(sport, kf, tl, kv, sym, level)
                rows.append({"sport_type": sport_key,
                             "knee_flexion": round(kf,2), "hip_angle": round(ha,2),
                             "elbow_angle": round(ea,2), "shoulder_rotation": round(sr,2),
                             "trunk_lean": round(tl,2), "knee_valgus_angle": round(kv,2),
                             "symmetry": round(sym,2), **flags,
                             "risk_level": risk_int, "risk_label": level})
    return pd.DataFrame(rows).sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)


def validate(df: pd.DataFrame) -> bool:
    ok = True
    print("\n  Anatomical Bounds Validation")
    print("  " + "-"*56)
    checks = [
        ("knee_flexion",      0.0,  185.0),
        ("hip_angle",         0.0,  185.0),
        ("elbow_angle",       0.0,  185.0),
        ("shoulder_rotation", 0.0,  185.0),
        ("trunk_lean",        0.0,   90.0),
        ("knee_valgus_angle", 100.0,185.0),
        ("symmetry",          0.0,  100.0),
    ]
    for col, lo, hi in checks:
        viol = int((df[col] < lo).sum() + (df[col] > hi).sum())
        st = "OK  " if viol == 0 else "FAIL"
        if viol > 0: ok = False
        print(f"  [{st}]  {col:<22}  "
              f"min={df[col].min():>7.2f}  max={df[col].max():>7.2f}  "
              f"bounds [{lo:.0f}, {hi:.0f}]  violations={viol}")

    print("\n  Class Balance per Sport")
    print("  " + "-"*56)
    for sport in sorted(df["sport_type"].unique()):
        counts = df[df["sport_type"]==sport]["risk_label"].value_counts().to_dict()
        print(f"  {sport:<22}  {counts}")
    return ok


if __name__ == "__main__":
    print("="*60)
    print("  SportGuard � Synthetic Injury Dataset Generator")
    print("="*60)
    total = len(SPORT_PROFILES) * len(RISK_LEVELS) * SAMPLES_PER_CLASS
    print(f"\n  Sports: {len(SPORT_PROFILES)}  |  Risk levels: {len(RISK_LEVELS)}  |  Samples/class: {SAMPLES_PER_CLASS}")
    print(f"  Expected total rows: {total:,}")

    print("\n  Generating dataset...")
    df = generate()
    print(f"  Generated: {len(df):,} rows x {len(df.columns)} columns")

    passed = validate(df)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n  Saved to: {os.path.abspath(OUTPUT_FILE)}")
    print("\n" + "="*60)
    if passed:
        print("  ALL BOUNDS CHECKS PASSED. Dataset is clean and ready.")
    else:
        print("  WARNING: Some violations detected. Review output above.")
    print("="*60)
