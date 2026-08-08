import re

def predict_injury_risks(biomechanics_summary, athlete_profile=None):
    """
    Predicts specific injury category risk percentages (0-100%) and details.
    """
    profile = athlete_profile or {}
    injury_history = str(profile.get("injury_history", "")).lower()
    training_load = str(profile.get("training_load", "")).lower()

    # Retrieve biomechanical metrics
    symmetry = biomechanics_summary.get("symmetry", {})
    rom = biomechanics_summary.get("range_of_motion", {})
    trunk_lean = biomechanics_summary.get("trunk_lean", 0.0)
    peak_metrics = biomechanics_summary.get("peak_metrics", {})
    
    valgus_details = biomechanics_summary.get("valgus_details", {})
    left_valgus_pct = valgus_details.get("left_valgus_percentage", 0.0)
    right_valgus_pct = valgus_details.get("right_valgus_percentage", 0.0)
    max_valgus_dev = max(
        peak_metrics.get("max_left_knee_valgus_dev", 0.0),
        peak_metrics.get("max_right_knee_valgus_dev", 0.0)
    )

    # 1. ACL Risk
    acl_prob = 10.0
    acl_reasons = []
    if left_valgus_pct > 15.0 or right_valgus_pct > 15.0:
        acl_prob += 35.0
        acl_reasons.append("Knee valgus (inward collapse) detected during movement.")
    if max_valgus_dev > 0.12:
        acl_prob += 15.0
        acl_reasons.append(f"High peak knee-to-ankle medial displacement ({max_valgus_dev:.3f}).")
    knee_sym = symmetry.get("knee", {}).get("difference", 0.0)
    if knee_sym > 10.0:
        acl_prob += 15.0
        acl_reasons.append(f"Knee asymmetry is elevated ({knee_sym:.1f}° difference).")
    if "acl" in injury_history or "knee" in injury_history or "meniscus" in injury_history:
        acl_prob += 20.0
        acl_reasons.append("Athlete has historical knee or ligament issues.")
    if "high" in training_load or "heavy" in training_load:
        acl_prob += 5.0
    acl_prob = min(95.0, acl_prob)

    # 2. Hamstring Strain Risk
    ham_prob = 10.0
    ham_reasons = []
    # Check for knee overextension (angle > 175)
    left_knee_max = rom.get("left_knee", {}).get("max", 0.0)
    right_knee_max = rom.get("right_knee", {}).get("max", 0.0)
    if left_knee_max > 175.0 or right_knee_max > 175.0:
        ham_prob += 35.0
        ham_reasons.append("Knee overextension (angle > 175°) during terminal extension.")
    hip_sym = symmetry.get("hip", {}).get("difference", 0.0)
    if hip_sym > 12.0:
        ham_prob += 20.0
        ham_reasons.append(f"High hip symmetry discrepancy ({hip_sym:.1f}° difference).")
    if "hamstring" in injury_history or "pull" in injury_history or "strain" in injury_history:
        ham_prob += 25.0
        ham_reasons.append("History of hamstring strains or soft tissue pulls.")
    if "high" in training_load or "heavy" in training_load:
        ham_prob += 10.0
    ham_prob = min(95.0, ham_prob)

    # 3. Ankle Sprain Risk
    ankle_prob = 10.0
    ankle_reasons = []
    # High asymmetry and valgus rate affects ankles
    if left_valgus_pct > 20.0 or right_valgus_pct > 20.0:
        ankle_prob += 20.0
        ankle_reasons.append("Unstable landing/valgus mechanics create ankle inversion risk.")
    knee_sym = symmetry.get("knee", {}).get("difference", 0.0)
    if knee_sym > 12.0:
        ankle_prob += 20.0
        ankle_reasons.append("Uneven landing loading pattern affects ankles.")
    if "ankle" in injury_history or "sprain" in injury_history or "twist" in injury_history:
        ankle_prob += 35.0
        ankle_reasons.append("History of recurring lateral ankle sprains.")
    if "high" in training_load or "heavy" in training_load:
        ankle_prob += 10.0
    ankle_prob = min(95.0, ankle_prob)

    # 4. Shoulder Injury Risk
    shoulder_prob = 10.0
    shoulder_reasons = []
    # Shoulder/elbow ROM or asymmetry
    elbow_rom_l = rom.get("left_elbow", {}).get("rom", 0.0)
    elbow_rom_r = rom.get("right_elbow", {}).get("rom", 0.0)
    if elbow_rom_l < 50.0 or elbow_rom_r < 50.0:
        shoulder_prob += 30.0
        shoulder_reasons.append("Restricted elbow/shoulder range of motion.")
    elbow_sym = symmetry.get("elbow", {}).get("difference", 0.0)
    if elbow_sym > 15.0:
        shoulder_prob += 20.0
        shoulder_reasons.append(f"Elevated upper body asymmetry ({elbow_sym:.1f}° difference).")
    if "shoulder" in injury_history or "rotator" in injury_history or "dislocation" in injury_history:
        shoulder_prob += 30.0
        shoulder_reasons.append("Historical shoulder/rotator cuff injuries.")
    shoulder_prob = min(95.0, shoulder_prob)

    # 5. Lower Back Injury Risk
    back_prob = 10.0
    back_reasons = []
    max_lean = peak_metrics.get("max_trunk_lean", 0.0)
    if trunk_lean > 8.0 or max_lean > 15.0:
        back_prob += 35.0
        back_reasons.append(f"Excessive average torso lean ({trunk_lean:.1f}°) or peak tilt ({max_lean:.1f}°).")
    hip_sym = symmetry.get("hip", {}).get("difference", 0.0)
    if hip_sym > 10.0:
        back_prob += 15.0
        back_reasons.append(f"Pelvic/hip asymmetry ({hip_sym:.1f}°) leading to unilateral back load.")
    if "back" in injury_history or "spine" in injury_history or "lbr" in injury_history or "sciatica" in injury_history:
        back_prob += 30.0
        back_reasons.append("Athlete has history of lower back stiffness or sciatica.")
    if "high" in training_load or "heavy" in training_load:
        back_prob += 10.0
    back_prob = min(95.0, back_prob)

    # 6. Overuse Injury Risk
    overuse_prob = 10.0
    overuse_reasons = []
    if "high" in training_load or "heavy" in training_load:
        overuse_prob += 40.0
        overuse_reasons.append(f"High training volume/load ({profile.get('training_load', 'N/A')}).")
    elif "medium" in training_load or "moderate" in training_load:
        overuse_prob += 20.0
        overuse_reasons.append("Moderate training volume with minimal recovery buffers.")
    
    # Check fatigue based on multiple restricted range of motions
    restricted_count = sum(1 for j in rom.values() if j.get("status") == "Restricted")
    if restricted_count >= 2:
        overuse_prob += 25.0
        overuse_reasons.append(f"Generalized stiffness: {restricted_count} joints showing restricted ROM.")
        
    if len(injury_history.strip()) > 3:
        overuse_prob += 15.0
        overuse_reasons.append("Unhealed micro-tears/recurrent injury patterns.")
    overuse_prob = min(95.0, overuse_prob)

    return {
        "ACL": {"probability": round(acl_prob, 1), "risk_level": get_risk_label(acl_prob), "reasons": acl_reasons if acl_reasons else ["No major biomechanical risk"]},
        "Hamstring": {"probability": round(ham_prob, 1), "risk_level": get_risk_label(ham_prob), "reasons": ham_reasons if ham_reasons else ["No major biomechanical risk"]},
        "Ankle": {"probability": round(ankle_prob, 1), "risk_level": get_risk_label(ankle_prob), "reasons": ankle_reasons if ankle_reasons else ["No major biomechanical risk"]},
        "Shoulder": {"probability": round(shoulder_prob, 1), "risk_level": get_risk_label(shoulder_prob), "reasons": shoulder_reasons if shoulder_reasons else ["No major biomechanical risk"]},
        "LowerBack": {"probability": round(back_prob, 1), "risk_level": get_risk_label(back_prob), "reasons": back_reasons if back_reasons else ["No major biomechanical risk"]},
        "Overuse": {"probability": round(overuse_prob, 1), "risk_level": get_risk_label(overuse_prob), "reasons": overuse_reasons if overuse_reasons else ["No major biomechanical risk"]}
    }

def get_risk_label(prob):
    if prob < 30.0:
        return "Low"
    elif prob < 60.0:
        return "Moderate"
    elif prob < 80.0:
        return "High"
    return "Critical"

def calculate_weighted_risk_score(biomechanics_summary, athlete_profile=None):
    """
    Computes weighted score:
    - Biomechanical Deviations (35%)
    - Historical Injury Factors (20%)
    - Movement Asymmetry (20%)
    - Training Load Indicators (15%)
    - Fatigue Indicators (10%)
    """
    profile = athlete_profile or {}
    injury_history = str(profile.get("injury_history", "")).lower()
    training_load = str(profile.get("training_load", "")).lower()

    # 1. Biomechanical Deviations (35%)
    bio_score = 0.0
    valgus_details = biomechanics_summary.get("valgus_details", {})
    left_valgus_pct = valgus_details.get("left_valgus_percentage", 0.0)
    right_valgus_pct = valgus_details.get("right_valgus_percentage", 0.0)
    if left_valgus_pct > 15.0 or right_valgus_pct > 15.0:
        bio_score += 40.0
    
    trunk_lean = biomechanics_summary.get("trunk_lean", 0.0)
    peak_metrics = biomechanics_summary.get("peak_metrics", {})
    max_lean = peak_metrics.get("max_trunk_lean", 0.0)
    if trunk_lean > 8.0 or max_lean > 15.0:
        bio_score += 30.0
        
    rom = biomechanics_summary.get("range_of_motion", {})
    restricted_count = sum(1 for j in rom.values() if j.get("status") == "Restricted")
    bio_score += restricted_count * 15.0
    bio_score = min(100.0, bio_score)

    # 2. Historical Injury Factors (20%)
    history_score = 0.0
    if len(injury_history.strip()) > 3:
        if any(kw in injury_history for kw in ["acl", "tear", "surgery", "fracture", "rupture", "meniscus"]):
            history_score = 100.0
        elif any(kw in injury_history for kw in ["sprain", "strain", "pull", "pain", "sore", "injury"]):
            history_score = 50.0
        else:
            history_score = 25.0

    # 3. Movement Asymmetry (20%)
    symmetry = biomechanics_summary.get("symmetry", {})
    avg_diff = 0.0
    if symmetry:
        avg_diff = sum(j.get("difference", 0.0) for j in symmetry.values()) / len(symmetry)
    asymmetry_score = min(100.0, avg_diff * 6.0)

    # 4. Training Load Indicators (15%)
    load_score = 0.0
    if "high" in training_load or "heavy" in training_load or "elite" in training_load or "daily" in training_load:
        load_score = 100.0
    elif "medium" in training_load or "moderate" in training_load or "3-5" in training_load:
        load_score = 50.0
    elif "low" in training_load or "light" in training_load:
        load_score = 20.0

    # 5. Fatigue Indicators (10%)
    fatigue_score = 20.0
    if load_score == 100.0:
        fatigue_score += 40.0
    elif load_score == 50.0:
        fatigue_score += 20.0
        
    if history_score > 0.0:
        fatigue_score += 20.0
    fatigue_score = min(100.0, fatigue_score)

    # Weighted calculation
    weighted_score = (
        (bio_score * 0.35) +
        (history_score * 0.20) +
        (asymmetry_score * 0.20) +
        (load_score * 0.15) +
        (fatigue_score * 0.10)
    )
    
    overall_score = round(weighted_score, 1)
    
    return {
        "overall_score": overall_score,
        "risk_level": get_risk_label(overall_score),
        "breakdown": {
            "biomechanical_deviations": round(bio_score, 1),
            "historical_factors": round(history_score, 1),
            "movement_asymmetry": round(asymmetry_score, 1),
            "training_load": round(load_score, 1),
            "fatigue": round(fatigue_score, 1)
        }
    }

def generate_corrective_recommendations(injury_risks):
    """
    Generates personalized exercises based on predicted high injury categories.
    """
    recs = []
    
    # 1. ACL
    if injury_risks["ACL"]["probability"] >= 40.0:
        recs.append({
            "category": "ACL Stability & Landing Mechanics",
            "exercises": [
                "Single-Leg Squats (3 sets of 8 reps per leg) - Focuses on knee tracking.",
                "Bosu Ball Single-Leg Balances (3 sets of 45 seconds) - Stabilizes knee joint.",
                "Deceleration Jump Landings (2 sets of 10 jumps) - Focuses on soft knee landings without inward collapse."
            ],
            "frequency": "3-4 times a week"
        })
        
    # 2. Hamstring
    if injury_risks["Hamstring"]["probability"] >= 40.0:
        recs.append({
            "category": "Eccentric Hamstring Strengthening",
            "exercises": [
                "Nordic Hamstring Curls (3 sets of 5 slow eccentrics) - Enhances eccentric muscle strength.",
                "Romanian Deadlifts (4 sets of 8 reps) - Emphasizes hip hinge and hamstring loading.",
                "Glute Bridges with Hamstring Walkouts (3 sets of 10 reps) - Integrates glute-hamstring chain."
            ],
            "frequency": "2-3 times a week"
        })
        
    # 3. Ankle
    if injury_risks["Ankle"]["probability"] >= 40.0:
        recs.append({
            "category": "Ankle Mobility & Proprioception",
            "exercises": [
                "Wobble Board Balance Exercises (3 sets of 1 minute) - Retrains ankle reflexes.",
                "Deficit Calf Raises (3 sets of 15 reps) - Strengthens calf and Achilles tendons.",
                "Band-Resisted Ankle Inversion/Eversion (3 sets of 12 reps) - Builds stabilizer strength."
            ],
            "frequency": "Daily"
        })
        
    # 4. Shoulder
    if injury_risks["Shoulder"]["probability"] >= 40.0:
        recs.append({
            "category": "Rotator Cuff & Scapular Stability",
            "exercises": [
                "Band Face Pulls (3 sets of 15 reps) - Activates rear deltoids and upper back.",
                "Cable External Rotations (3 sets of 12 reps) - Strengthens infraspinatus/teres minor.",
                "Scapular Wall Slides (3 sets of 10 slow reps) - Improves overhead mobility."
            ],
            "frequency": "3 times a week"
        })
        
    # 5. Lower Back
    if injury_risks["LowerBack"]["probability"] >= 40.0:
        recs.append({
            "category": "Core Bracing & Lumbar Support",
            "exercises": [
                "Bird-Dog Holds (3 sets of 10 reps with 5s hold) - Stabilizes spine.",
                "Plank to Side-Plank Transitions (3 sets of 45 seconds) - Builds lateral core stability.",
                "Deadbugs (3 sets of 12 reps) - Reinforces posterior pelvic tilt and back contact."
            ],
            "frequency": "Daily"
        })
        
    # 6. Overuse
    if injury_risks["Overuse"]["probability"] >= 40.0:
        recs.append({
            "category": "Load Modification & Recovery Planning",
            "exercises": [
                "Active Recovery/Yoga Sessions (1-2 sessions per week) - Enhances blood flow and joint mobility.",
                "Foam Rolling and Deep Tissue Massage (15 mins post-workout) - Releases tight myofascial triggers.",
                "Deload Week - Reduce overall weekly training volume by 30% to allow tissue rebuilding."
            ],
            "frequency": "Post-training"
        })

    # Fallback default recommendations if everything is low risk
    if not recs:
        recs.append({
            "category": "General Performance Maintenance",
            "exercises": [
                "Dynamic Warm-up (Arm circles, leg swings, hip circles) - 10 mins pre-workout.",
                "Goblet Squats with pause (3 sets of 10 reps) - Promotes correct joint trackings.",
                "Plank holds (3 sets of 60 seconds) - Sustains baseline core stabilization."
            ],
            "frequency": "Pre-workout"
        })
        
    return recs
