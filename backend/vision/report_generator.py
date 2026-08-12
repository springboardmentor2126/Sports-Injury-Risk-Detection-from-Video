from datetime import datetime
import json


def generate_biomechanics_report(
    video_filename: str,
    frames_analyzed: int,
    summary: dict,
    quality_result: dict,
    risk_result: dict = None,
    anomalies: list = None,
    recommendations: dict = None,
    athlete_info: dict = None,
    ai_confidence: float = None
):
    report_id = f"RPT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    generated_at = datetime.utcnow().isoformat() + "Z"

    if ai_confidence is None:
        base_confidence = min(85 + (frames_analyzed / 10), 97) if frames_analyzed else 75
        ai_confidence = round(base_confidence, 1)

    overall_assessment = _build_overall_assessment(
        quality_result, risk_result, anomalies or []
    )

    report = {
        "report_id": report_id,
        "generated_at": generated_at,
        "video_filename": video_filename,
        "athlete": athlete_info,

        "analysis_details": {
            "frames_analyzed": frames_analyzed,
            "ai_confidence": ai_confidence,
            "analysis_date": generated_at[:10],
            "analysis_time": generated_at[11:19],
        },

        "overall_assessment": overall_assessment,

        "movement_quality": {
            "score": quality_result.get("movement_quality_score"),
            "label": quality_result.get("quality_label"),
            "interpretation": _interpret_quality(quality_result)
        },

        "injury_risk": {
            "score": risk_result.get("injury_risk_score") if risk_result else None,
            "category": risk_result.get("risk_category") if risk_result else None,
            "injury_probability": risk_result.get("injury_probability") if risk_result else None,
            "breakdown": risk_result.get("breakdown") if risk_result else None,
            "injury_categories": risk_result.get("injury_categories", []) if risk_result else [],
        },

        "ai_findings": {
            "anomalies_detected": len(anomalies or []),
            "findings": anomalies or [],
            "risk_factors": _extract_risk_factors(anomalies or [], summary),
        },

        "biomechanical_metrics": {
            "knee_angle": {
                "left_avg": summary.get("left_knee_angle", {}).get("average"),
                "right_avg": summary.get("right_knee_angle", {}).get("average"),
            },
            "hip_angle": {
                "left_avg": summary.get("left_hip_angle", {}).get("average"),
                "right_avg": summary.get("right_hip_angle", {}).get("average"),
            },
            "trunk_lean_avg": summary.get("trunk_lean", {}).get("average"),
            "knee_valgus_ratio_avg": summary.get("knee_valgus_ratio", {}).get("average"),
            "knee_symmetry_diff_avg": summary.get("knee_symmetry_diff", {}).get("average"),
            "hip_symmetry_diff_avg": summary.get("hip_symmetry_diff", {}).get("average"),
            "balance_offset_avg": summary.get("balance_offset", {}).get("average"),
        },

        "recommendations": recommendations or {},

        "performance_summary": _build_performance_summary(
            quality_result, risk_result, frames_analyzed, anomalies or []
        ),

        "full_summary_detail": summary,
    }

    return report


def _interpret_quality(quality_result: dict) -> str:
    label = quality_result.get("quality_label", "")
    score = quality_result.get("movement_quality_score", 0)
    if label == "Excellent":
        return (f"Movement quality score of {score}/100 is excellent. "
                "Biomechanical efficiency is high with minimal deviation from optimal patterns.")
    elif label == "Good":
        return (f"Movement quality score of {score}/100 is good. "
                "Minor deviations present but overall movement pattern is safe and efficient.")
    elif label == "Fair":
        return (f"Movement quality score of {score}/100 requires attention. "
                "Several biomechanical inefficiencies detected that increase injury risk.")
    else:
        return (f"Movement quality score of {score}/100 is below safe threshold. "
                "Immediate corrective intervention is strongly recommended.")


def _build_overall_assessment(quality_result: dict, risk_result: dict, anomalies: list) -> str:
    quality_label = quality_result.get("quality_label", "Fair")
    quality_score = quality_result.get("movement_quality_score", 0)
    risk_category = (risk_result or {}).get("risk_category", "Unknown")
    anomaly_count = len(anomalies)

    parts = [
        f"AI movement analysis identified {anomaly_count} biomechanical "
        f"{'concern' if anomaly_count == 1 else 'concerns'}.",
        f"Overall movement quality is rated {quality_label} ({quality_score}/100).",
        f"Injury risk classification: {risk_category}.",
    ]

    if anomaly_count == 0:
        parts.append(
            "No significant movement deviations detected. Continue current training programme."
        )
    elif risk_category in ("High Risk", "Critical Risk"):
        parts.append(
            "Immediate consultation with a sports physiotherapist is strongly recommended "
            "before returning to high-intensity training."
        )
    elif risk_category == "Moderate Risk":
        parts.append(
            "Corrective exercises and load management are advised to reduce injury risk "
            "over the coming weeks."
        )
    else:
        parts.append(
            "Preventive measures and continued monitoring are recommended to maintain "
            "current movement standards."
        )

    return " ".join(parts)


def _extract_risk_factors(anomalies: list, summary: dict) -> list:
    risk_factors = []

    for anomaly in anomalies:
        if anomaly.get("severity") in ("High", "Moderate"):
            risk_factors.append({
                "factor": anomaly["finding"],
                "area": anomaly.get("risk_area", ""),
                "severity": anomaly["severity"]
            })

    knee_valgus = summary.get("knee_valgus_ratio", {}).get("average", 1.0)
    if knee_valgus < 1.0 and not any(
        "Knee Valgus" in a["finding"] for a in anomalies
    ):
        risk_factors.append({
            "factor": "Reduced Knee-Ankle Alignment",
            "area": "Knee",
            "severity": "Low"
        })

    return risk_factors


def _build_performance_summary(
    quality_result: dict,
    risk_result: dict,
    frames_analyzed: int,
    anomalies: list
) -> dict:
    risk_score = (risk_result or {}).get("injury_risk_score", 0)
    quality_score = quality_result.get("movement_quality_score", 0)
    high_severity = sum(1 for a in anomalies if a.get("severity") == "High")
    moderate_severity = sum(1 for a in anomalies if a.get("severity") == "Moderate")

    return {
        "overall_score": round((quality_score + max(0, 100 - risk_score)) / 2, 1),
        "frames_assessed": frames_analyzed,
        "anomalies_detected": len(anomalies),
        "high_severity_findings": high_severity,
        "moderate_severity_findings": moderate_severity,
        "readiness_status": (
            "Cleared for Training" if risk_score < 25 else
            "Train with Caution" if risk_score < 50 else
            "Restricted Training" if risk_score < 75 else
            "Medical Review Required"
        )
    }