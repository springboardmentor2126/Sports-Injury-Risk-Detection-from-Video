import numpy as np
import pandas as pd

np.random.seed(42)

NUM_SAMPLES = 1000

rows = []

for _ in range(NUM_SAMPLES):

    left_knee = np.random.uniform(100, 175)
    right_knee = left_knee + np.random.normal(0, 4)

    left_hip = np.random.uniform(130, 180)
    right_hip = left_hip + np.random.normal(0, 3)

    left_shoulder = np.random.uniform(120, 180)
    right_shoulder = left_shoulder + np.random.normal(0, 4)

    left_elbow = np.random.uniform(90, 170)
    right_elbow = left_elbow + np.random.normal(0, 4)

    symmetry = np.random.uniform(60,100)

    age = np.random.randint(16,40)

    experience = np.random.randint(0,20)

    previous_injuries = np.random.randint(0,4)

    score = 0

    if symmetry < 75:
        score += 2

    if left_knee < 120 or right_knee < 120:
        score += 2

    if abs(left_knee-right_knee) > 10:
        score += 2

    if abs(left_hip-right_hip) > 8:
        score += 1

    if previous_injuries >= 2:
        score += 2

    if experience < 2:
        score += 1

    if score <= 2:
        movement = "Excellent"
        risk = "LOW"

    elif score <=5:
        movement = "Good"
        risk = "MEDIUM"

    else:
        movement = "Poor"
        risk = "HIGH"

    rows.append({

        "left_knee":left_knee,
        "right_knee":right_knee,

        "left_hip":left_hip,
        "right_hip":right_hip,

        "left_shoulder":left_shoulder,
        "right_shoulder":right_shoulder,

        "left_elbow":left_elbow,
        "right_elbow":right_elbow,

        "symmetry":symmetry,

        "age":age,

        "experience":experience,

        "previous_injuries":previous_injuries,

        "movement":movement,

        "risk":risk

    })

df = pd.DataFrame(rows)

df.to_csv("backend/app/ml/training_dataset.csv",index=False)

print(df.head())

print()

print("Dataset Created Successfully")

print(len(df))