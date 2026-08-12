import numpy as np


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle = np.arccos(np.clip(cosine, -1.0, 1.0))
    return round(float(np.degrees(angle)), 2)


def calculate_frame_metrics(landmarks: dict):
    def pt(name):
        return (landmarks[name]["x"], landmarks[name]["y"])

    left_knee_angle = calculate_angle(pt("left_hip"), pt("left_knee"), pt("left_ankle"))
    right_knee_angle = calculate_angle(pt("right_hip"), pt("right_knee"), pt("right_ankle"))
    left_hip_angle = calculate_angle(pt("left_shoulder"), pt("left_hip"), pt("left_knee"))
    right_hip_angle = calculate_angle(pt("right_shoulder"), pt("right_hip"), pt("right_knee"))

    shoulder_mid_x = (landmarks["left_shoulder"]["x"] + landmarks["right_shoulder"]["x"]) / 2
    hip_mid_x = (landmarks["left_hip"]["x"] + landmarks["right_hip"]["x"]) / 2
    trunk_lean = round(abs(shoulder_mid_x - hip_mid_x), 4)

    knee_gap = abs(landmarks["left_knee"]["x"] - landmarks["right_knee"]["x"])
    ankle_gap = abs(landmarks["left_ankle"]["x"] - landmarks["right_ankle"]["x"]) + 1e-8
    knee_valgus_ratio = round(knee_gap / ankle_gap, 4)

    knee_symmetry_diff = round(abs(left_knee_angle - right_knee_angle), 2)
    hip_symmetry_diff = round(abs(left_hip_angle - right_hip_angle), 2)

    ankle_mid_x = (landmarks["left_ankle"]["x"] + landmarks["right_ankle"]["x"]) / 2
    balance_offset = round(abs(shoulder_mid_x - ankle_mid_x), 4)

    shoulder_gap = abs(landmarks["left_shoulder"]["x"] - landmarks["right_shoulder"]["x"])
    hip_gap = abs(landmarks["left_hip"]["x"] - landmarks["right_hip"]["x"]) + 1e-8
    hip_stability_ratio = round(shoulder_gap / hip_gap, 4)

    return {
        "left_knee_angle": left_knee_angle,
        "right_knee_angle": right_knee_angle,
        "left_hip_angle": left_hip_angle,
        "right_hip_angle": right_hip_angle,
        "trunk_lean": trunk_lean,
        "knee_valgus_ratio": knee_valgus_ratio,
        "knee_symmetry_diff": knee_symmetry_diff,
        "hip_symmetry_diff": hip_symmetry_diff,
        "balance_offset": balance_offset,
        "hip_stability_ratio": hip_stability_ratio,
    }


def aggregate_metrics(per_frame_metrics: list):
    if not per_frame_metrics:
        return {}
    keys = per_frame_metrics[0].keys()
    summary = {}
    for key in keys:
        values = [m[key] for m in per_frame_metrics]
        summary[key] = {
            "average": round(float(np.mean(values)), 2),
            "max": round(float(np.max(values)), 2),
            "min": round(float(np.min(values)), 2),
            "std": round(float(np.std(values)), 2),
        }
    return summary


def calculate_movement_quality_score(summary: dict) -> dict:
    score = 100.0

    knee_symmetry_avg = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_symmetry_avg = summary.get("hip_symmetry_diff", {}).get("average", 0)
    trunk_lean_avg = summary.get("trunk_lean", {}).get("average", 0)
    balance_avg = summary.get("balance_offset", {}).get("average", 0)
    knee_valgus_avg = summary.get("knee_valgus_ratio", {}).get("average", 1.0)

    score -= min(knee_symmetry_avg * 1.5, 25)
    score -= min(hip_symmetry_avg * 1.5, 25)
    score -= min(trunk_lean_avg * 300, 20)
    score -= min(balance_avg * 300, 15)

    if knee_valgus_avg < 0.85:
        score -= 15
    elif knee_valgus_avg < 1.0:
        score -= 7

    score = max(0, round(score, 2))

    if score >= 85:
        quality_label = "Excellent"
    elif score >= 65:
        quality_label = "Good"
    elif score >= 45:
        quality_label = "Fair"
    else:
        quality_label = "Poor"

    return {"movement_quality_score": score, "quality_label": quality_label}


def detect_movement_anomalies(summary: dict) -> list:
    anomalies = []

    knee_valgus = summary.get("knee_valgus_ratio", {}).get("average", 1.0)
    if knee_valgus < 0.8:
        anomalies.append({
            "finding": "Knee Valgus Detected",
            "severity": "High",
            "detail": "Knees are collapsing inward significantly during movement. "
                      "This places excessive stress on the ACL and medial knee structures.",
            "risk_area": "ACL / Medial Knee"
        })
    elif knee_valgus < 1.0:
        anomalies.append({
            "finding": "Mild Knee Valgus",
            "severity": "Moderate",
            "detail": "Slight inward knee movement observed. Monitor and address with "
                      "hip abductor strengthening.",
            "risk_area": "ACL / Medial Knee"
        })

    hip_stability = summary.get("hip_stability_ratio", {}).get("average", 1.0)
    hip_std = summary.get("hip_symmetry_diff", {}).get("std", 0)
    if hip_stability < 0.7 or hip_std > 10:
        anomalies.append({
            "finding": "Hip Instability",
            "severity": "Moderate",
            "detail": "Hip control is inconsistent across movement frames. "
                      "Indicates weakness in hip stabilizers and gluteal muscles.",
            "risk_area": "Hip / Lower Back"
        })

    trunk_lean = summary.get("trunk_lean", {}).get("average", 0)
    if trunk_lean > 0.1:
        anomalies.append({
            "finding": "Excessive Trunk Lean",
            "severity": "High",
            "detail": "Significant forward or lateral trunk lean detected. "
                      "This increases spinal loading and alters lower limb mechanics.",
            "risk_area": "Lower Back / Hip"
        })
    elif trunk_lean > 0.06:
        anomalies.append({
            "finding": "Moderate Trunk Lean",
            "severity": "Low",
            "detail": "Mild trunk lean present. Core stability exercises recommended.",
            "risk_area": "Lower Back"
        })

    balance = summary.get("balance_offset", {}).get("average", 0)
    if balance > 0.08:
        anomalies.append({
            "finding": "Balance Instability",
            "severity": "Moderate",
            "detail": "Centre of mass is consistently shifted away from base of support. "
                      "Proprioception and single-leg balance training advised.",
            "risk_area": "Ankle / Knee"
        })

    knee_sym = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_sym = summary.get("hip_symmetry_diff", {}).get("average", 0)
    if knee_sym > 15 or hip_sym > 15:
        anomalies.append({
            "finding": "Movement Symmetry Imbalance",
            "severity": "High",
            "detail": f"Left-right asymmetry detected: knee difference {knee_sym}°, "
                      f"hip difference {hip_sym}°. This uneven loading pattern is a "
                      "primary risk factor for overuse and acute injuries.",
            "risk_area": "Bilateral Lower Limb"
        })
    elif knee_sym > 8 or hip_sym > 8:
        anomalies.append({
            "finding": "Mild Symmetry Imbalance",
            "severity": "Low",
            "detail": "Minor left-right differences detected. Continue monitoring.",
            "risk_area": "Lower Limb"
        })

    left_knee = summary.get("left_knee_angle", {}).get("average", 160)
    right_knee = summary.get("right_knee_angle", {}).get("average", 160)
    avg_knee = (left_knee + right_knee) / 2
    if avg_knee < 100:
        anomalies.append({
            "finding": "Deep Knee Flexion Under Load",
            "severity": "Moderate",
            "detail": f"Average knee angle of {avg_knee}° indicates deep flexion. "
                      "Verify this is intentional (e.g. squat). If uncontrolled, "
                      "patellar tendon and ACL stress is elevated.",
            "risk_area": "Patellar Tendon / ACL"
        })

    return anomalies