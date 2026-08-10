"""
injury_risk.py — Milestone 3: Injury Risk Prediction & Recommendations.

Turns Milestone 2's output (the per-clip biomechanics summary from
biomechanics.summarize(), optionally the raw per-frame FrameMetrics
list, plus the athlete's self-reported training_load/injury_history
text) into:

  1. a transparent, rule-based injury risk score (0-100) and category
     (Low / Moderate / High / Critical), plus a single "injury_type"
     label (the highest-scoring factor's label, or a "nothing flagged"
     message) -- matches injury_predictions.injury_type in models.py,
     which is a single VARCHAR, not a list.
  2. the specific contributing risk factors that drove that score
     (RiskFactor.key/label/points/detail) -- shaped to drop straight
     into injury_predictions.contributing_factors (a new JSON column,
     see the models.py diff) via dataclasses.asdict(), so a coach/
     physio sees *why*, not just a number, and it survives a reload.
  3. lightweight movement anomaly detection: frames whose knee valgus
     proxy is a statistical outlier *within that athlete's own clip*
     (NOT persisted -- recomputed on read from stored pose_data, same
     as biomechanics summaries already are in routers/video.py)
  4. a RecommendationPlan (posture_correction / exercise_plan /
     recovery_plan) -- deliberately shaped to match the real
     Recommendation table's three Text columns field-for-field
     (models.py has no generic "list of tips" column), built by
     bucketing each fired factor's recommendation lines into whichever
     of the three columns they belong to.

Why rule-based instead of a trained ML model (honesty note, same
spirit as biomechanics.py's proxy-accuracy notes): a supervised risk
model needs a labeled injury-OUTCOME dataset -- real athletes, real
subsequent-injury labels, at real volume. Human3.6M/SportsPose/COCO
(this project's datasets, see datasets/) are pose datasets, not injury
outcome datasets, and this project isn't collecting ground-truth
injury outcomes. Training "a model" on what's actually available would
mean fitting noise and dressing it up as a confident-looking
percentage -- worse than being honest about a heuristic. So this
engine is literature-informed thresholds on the 2D-proxy biomechanics
Milestone 2 already computes, combined with simple training-load /
injury-history modifiers from the athlete profile. Every threshold
below is a named, tunable constant for exactly that reason: if/when
real labeled outcome data exists, this module is the seam where a
trained model would slot in -- swap out what's inside assess_risk(),
keep the same RiskAssessment output contract so callers (routers,
frontend RiskGauge) don't need to change.

Scope note on knee_valgus_proxy: biomechanics.analyze_frame() only
computes it for the LEFT knee (see biomechanics.py's
knee_valgus_proxy=knee_valgus_proxy(kp, "left")). Every place this
module surfaces that number, it's labeled "left knee" rather than a
generic "knee" so a report doesn't quietly overstate what was measured
(the same "don't overstate" instinct as the rest of this codebase --
if you later extend biomechanics.py to compute the right knee too,
extend _biomechanics_factors() below to score both sides).

Note on injury_predictions.athlete_id vs. video_id: the ORIGINAL
models.py only linked InjuryPrediction -> AthleteProfile, with no way
to trace a prediction back to the specific clip it came from --
despite Database_Schema.md's own relationship diagram showing
Uploaded_Videos -> Pose_Data -> Injury_Predictions as a chain, and
UI_Wireframes.md's Screen 7 wanting a per-analysis "Injury Risk
Report". A nullable video_id FK was the minimal fix (see models.py),
same spirit as how status/error_message/annotated_video_path were
added to UploadedVideo post-hoc in Milestone 2 -- nullable so a future
non-video-triggered assessment (e.g. a manual profile-level review)
would still be valid.

Pure functions only, no DB/network access -- same pattern as
biomechanics.analyze_frame()/summarize(), so this is unit-testable
without a running app. The router (backend/app/routers/video.py) is
what maps RiskAssessment's fields onto crud.create_injury_prediction()/
crud.create_recommendation()'s actual DB writes.
"""

import statistics
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .biomechanics import FrameMetrics

# ---------------------------------------------------------------------------
# Thresholds -- literature-informed starting points, NOT clinical cutoffs.
# Recalibrate against real outcome data as soon as it exists.
# ---------------------------------------------------------------------------

KNEE_ROM_ASYMMETRY_MODERATE_DEG = 15.0
KNEE_ROM_ASYMMETRY_HIGH_DEG = 25.0

KNEE_VALGUS_MODERATE_PCT = 8.0
KNEE_VALGUS_HIGH_PCT = 15.0

TRUNK_LEAN_MODERATE_DEG = 20.0
TRUNK_LEAN_HIGH_DEG = 35.0

LOW_DETECTION_COVERAGE_RATIO = 0.5

# Upper-exclusive score bands, checked in order: score < boundary -> level.
# Anything at or above the last boundary (75) falls through to "Critical".
# Bands: [0, 25) Low, [25, 50) Moderate, [50, 75) High, [75, 100] Critical.
RISK_LEVEL_BOUNDARIES: list[tuple[float, str]] = [
    (25.0, "Low"),
    (50.0, "Moderate"),
    (75.0, "High"),
]

ANOMALY_Z_THRESHOLD = 2.0
ANOMALY_MIN_FRAMES = 5  # below this, a z-score isn't meaningful

# Point values per factor severity. Deliberately sized so that ONE
# high-severity biomechanics factor alone is enough to clear "Low" into
# "Moderate", and a realistic worst-case combination (multiple high-severity
# factors + a relevant injury history + high training load) can exceed 100
# and get clamped -- see the clamping test in test_injury_risk.py.
POINTS_ROM_ASYMMETRY_MODERATE = 12.0
POINTS_ROM_ASYMMETRY_HIGH = 28.0
POINTS_VALGUS_MODERATE = 12.0
POINTS_VALGUS_HIGH = 28.0
POINTS_TRUNK_LEAN_MODERATE = 8.0
POINTS_TRUNK_LEAN_HIGH = 18.0
POINTS_INJURY_HISTORY_RELEVANT = 18.0
POINTS_INJURY_HISTORY_GENERAL = 6.0
POINTS_TRAINING_LOAD_HIGH = 12.0
POINTS_TRAINING_LOAD_LOW = -6.0

TRAINING_LOAD_HIGH_MARKERS = ("high", "heavy", "intense", "overload", "increase")
TRAINING_LOAD_LOW_MARKERS = ("low", "light", "rest", "taper", "deload", "recovery")

# Lower-body/kinetic-chain markers -- this engine's biomechanics inputs are
# all lower-body (knee/hip/trunk), so a history hit here is weighted higher
# than a generic non-specific injury history.
LOWER_BODY_INJURY_MARKERS = (
    "knee", "acl", "mcl", "pcl", "meniscus", "hamstring", "ankle",
    "groin", "achilles", "shin", "quad", "calf", "hip",
)


DEFAULT_DISCLAIMER = (
    "Automated screening based on 2D single-camera biomechanics proxies "
    "and self-reported training/injury data -- not a clinical diagnosis. "
    "Use it to prioritize physiotherapist review, not to replace one."
)


@dataclass
class RiskFactor:
    key: str       # stable machine-readable id (used to look up recommendations)
    label: str     # short human-readable name
    points: float  # contribution to the 0-100 score (can be negative)
    detail: str    # plain-language explanation shown to the user


@dataclass
class RecommendationPlan:
    """Field-for-field match to models.Recommendation's 3 Text columns."""
    posture_correction: str
    exercise_plan: str
    recovery_plan: str


@dataclass
class RiskAssessment:
    score: float                     # 0-100, clamped -- maps to injury_predictions.risk_score
    level: str                       # Low / Moderate / High / Critical -- .risk_level
    injury_type: str                 # single label -- .injury_type (VARCHAR, not a list)
    factors: list[RiskFactor] = field(default_factory=list)          # -> .contributing_factors (JSON)
    recommendation: Optional[RecommendationPlan] = None               # -> recommendations row
    anomalous_frames: list[int] = field(default_factory=list)         # not persisted, recomputed on read
    disclaimer: str = DEFAULT_DISCLAIMER


def _level_for_score(score: float) -> str:
    for boundary, level in RISK_LEVEL_BOUNDARIES:
        if score < boundary:
            return level
    return "Critical"


def _training_load_factor(training_load: Optional[str]) -> Optional[RiskFactor]:
    if not training_load or not training_load.strip():
        return None
    text = training_load.lower()

    if any(marker in text for marker in TRAINING_LOAD_HIGH_MARKERS):
        return RiskFactor(
            key="training_load_high",
            label="Reported training load",
            points=POINTS_TRAINING_LOAD_HIGH,
            detail=(
                f"Athlete-reported training load ('{training_load}') reads as "
                "elevated -- high load is a well-established injury risk "
                "factor independent of movement quality."
            ),
        )
    if any(marker in text for marker in TRAINING_LOAD_LOW_MARKERS):
        return RiskFactor(
            key="training_load_low",
            label="Reported training load",
            points=POINTS_TRAINING_LOAD_LOW,
            detail=(
                f"Athlete-reported training load ('{training_load}') reads as "
                "low/recovery -- a mildly protective signal."
            ),
        )
    return None


def _injury_history_factor(injury_history: Optional[str]) -> Optional[RiskFactor]:
    if not injury_history or not injury_history.strip():
        return None
    text = injury_history.lower()

    if any(marker in text for marker in LOWER_BODY_INJURY_MARKERS):
        return RiskFactor(
            key="injury_history_relevant",
            label="Prior lower-body injury",
            points=POINTS_INJURY_HISTORY_RELEVANT,
            detail=(
                f"Reported history ('{injury_history}') mentions a prior "
                "lower-body injury -- re-injury risk to the same region is "
                "one of the most consistently reported risk factors in the "
                "literature, and this engine's biomechanics inputs are all "
                "lower-body."
            ),
        )
    return RiskFactor(
        key="injury_history_general",
        label="Prior injury history (non-specific)",
        points=POINTS_INJURY_HISTORY_GENERAL,
        detail=(
            f"Athlete has a reported injury history ('{injury_history}') not "
            "obviously tied to the lower-body chain this engine analyzes."
        ),
    )


def _biomechanics_factors(summary: dict) -> list[RiskFactor]:
    factors: list[RiskFactor] = []

    asym = summary.get("knee_rom_asymmetry")
    if asym is not None:
        if asym >= KNEE_ROM_ASYMMETRY_HIGH_DEG:
            factors.append(RiskFactor(
                key="knee_rom_asymmetry",
                label="Knee ROM asymmetry",
                points=POINTS_ROM_ASYMMETRY_HIGH,
                detail=(
                    f"{asym:.1f}\u00b0 difference between left/right knee "
                    f"range of motion over the clip (>"
                    f"{KNEE_ROM_ASYMMETRY_HIGH_DEG:.0f}\u00b0 threshold) -- "
                    "one side moving through a meaningfully smaller range "
                    "can indicate guarding, restricted mobility, or an "
                    "unresolved prior injury."
                ),
            ))
        elif asym >= KNEE_ROM_ASYMMETRY_MODERATE_DEG:
            factors.append(RiskFactor(
                key="knee_rom_asymmetry",
                label="Knee ROM asymmetry",
                points=POINTS_ROM_ASYMMETRY_MODERATE,
                detail=(
                    f"{asym:.1f}\u00b0 left/right knee ROM difference over "
                    f"the clip -- above the {KNEE_ROM_ASYMMETRY_MODERATE_DEG:.0f}"
                    "\u00b0 watch threshold."
                ),
            ))

    valgus = summary.get("peak_knee_valgus_proxy")
    if valgus is not None:
        magnitude = abs(valgus)
        if magnitude >= KNEE_VALGUS_HIGH_PCT:
            factors.append(RiskFactor(
                key="knee_valgus",
                label="Left knee valgus proxy",
                points=POINTS_VALGUS_HIGH,
                detail=(
                    f"Peak left-knee medial-collapse proxy of {valgus:+.1f}% "
                    f"of leg length (>{KNEE_VALGUS_HIGH_PCT:.0f}% threshold) "
                    "-- this pattern (knee caving inward) is associated with "
                    "ACL and patellofemoral injury risk during landing/"
                    "cutting. 2D single-camera proxy, left knee only -- "
                    "directional signal, not a clinical valgus measurement."
                ),
            ))
        elif magnitude >= KNEE_VALGUS_MODERATE_PCT:
            factors.append(RiskFactor(
                key="knee_valgus",
                label="Left knee valgus proxy",
                points=POINTS_VALGUS_MODERATE,
                detail=(
                    f"Peak left-knee valgus proxy of {valgus:+.1f}% of leg "
                    f"length -- above the {KNEE_VALGUS_MODERATE_PCT:.0f}% "
                    "watch threshold."
                ),
            ))

    trunk = summary.get("avg_trunk_lean_deg")
    if trunk is not None:
        if trunk >= TRUNK_LEAN_HIGH_DEG:
            factors.append(RiskFactor(
                key="trunk_lean",
                label="Excess trunk lean",
                points=POINTS_TRUNK_LEAN_HIGH,
                detail=(
                    f"Average trunk lean of {trunk:.1f}\u00b0 off vertical "
                    f"(>{TRUNK_LEAN_HIGH_DEG:.0f}\u00b0) -- excessive forward "
                    "lean under load is linked to altered hip/knee loading "
                    "patterns."
                ),
            ))
        elif trunk >= TRUNK_LEAN_MODERATE_DEG:
            factors.append(RiskFactor(
                key="trunk_lean",
                label="Elevated trunk lean",
                points=POINTS_TRUNK_LEAN_MODERATE,
                detail=(
                    f"Average trunk lean of {trunk:.1f}\u00b0 off vertical -- "
                    f"above the {TRUNK_LEAN_MODERATE_DEG:.0f}\u00b0 watch "
                    "threshold."
                ),
            ))

    frames_analyzed = summary.get("frames_analyzed") or 0
    frames_with_detection = summary.get("frames_with_detection") or 0
    detection_ratio = (frames_with_detection / frames_analyzed) if frames_analyzed else 0.0
    if frames_analyzed and detection_ratio < LOW_DETECTION_COVERAGE_RATIO:
        factors.append(RiskFactor(
            key="low_detection_confidence",
            label="Low pose-detection coverage",
            points=0.0,  # informational -- doesn't move the score, just context
            detail=(
                f"Pose was only detected in {detection_ratio:.0%} of analyzed "
                "frames -- treat this assessment as low-confidence; consider "
                "re-recording with clearer framing/lighting/camera distance."
            ),
        ))

    return factors


# Each top-level key here matches a RiskFactor.key above. Each factor maps
# to a dict of {column_name: [lines...]} -- lines get bucketed straight into
# the matching Recommendation column (posture_correction / exercise_plan /
# recovery_plan). A factor can contribute to more than one column, or to
# none (e.g. "low_detection_confidence" intentionally has no entry -- it's
# informational only, not something to "recommend" a fix for).
RECOMMENDATIONS: dict[str, dict[str, list[str]]] = {
    "knee_rom_asymmetry": {
        "exercise_plan": [
            "Unilateral strength work (single-leg squats, step-ups) on the "
            "restricted side to close the ROM gap.",
            "Mobility screen (ankle dorsiflexion, hip flexion/extension) on "
            "the restricted side -- ROM limits often start upstream of the "
            "knee.",
        ],
    },
    "knee_valgus": {
        "posture_correction": [
            "Landing/cutting coaching cue: 'knees over toes' on "
            "deceleration and landing drills.",
        ],
        "exercise_plan": [
            "Glute medius / hip abductor activation work (banded lateral "
            "walks, clamshells) -- weak hip abductors are a common driver "
            "of dynamic knee valgus.",
        ],
    },
    "trunk_lean": {
        "posture_correction": [
            "Cue a taller, more upright trunk position during loaded "
            "movement (landing, cutting, deceleration).",
        ],
        "exercise_plan": [
            "Core / anti-flexion stability work (dead bugs, planks, "
            "Pallof press) to support a more upright trunk position under "
            "load.",
        ],
    },
    "injury_history_relevant": {
        "recovery_plan": [
            "Flag for physiotherapist review before increasing load -- "
            "prior injury to this region warrants a closer look than an "
            "automated screen alone.",
        ],
    },
    "training_load_high": {
        "recovery_plan": [
            "Consider a planned deload; review recent training load trend "
            "with the coach.",
        ],
    },
}

# Shown when a given column has no factor-driven lines -- keeps the field
# from just being an empty string, which reads as "forgot to fill this in"
# rather than "nothing to flag here".
DEFAULT_BUCKET_TEXT = {
    "posture_correction": "No specific posture corrections indicated from this clip.",
    "exercise_plan": "No specific corrective exercises indicated -- maintain the current training routine.",
    "recovery_plan": "No recovery/load flags from this assessment.",
}


def _build_recommendation_plan(factors: list[RiskFactor]) -> RecommendationPlan:
    buckets: dict[str, list[str]] = {"posture_correction": [], "exercise_plan": [], "recovery_plan": []}
    seen: dict[str, set[str]] = {name: set() for name in buckets}

    for f in factors:
        for bucket_name, lines in RECOMMENDATIONS.get(f.key, {}).items():
            for line in lines:
                if line not in seen[bucket_name]:
                    seen[bucket_name].add(line)
                    buckets[bucket_name].append(line)

    return RecommendationPlan(
        posture_correction="\n".join(buckets["posture_correction"]) or DEFAULT_BUCKET_TEXT["posture_correction"],
        exercise_plan="\n".join(buckets["exercise_plan"]) or DEFAULT_BUCKET_TEXT["exercise_plan"],
        recovery_plan="\n".join(buckets["recovery_plan"]) or DEFAULT_BUCKET_TEXT["recovery_plan"],
    )


def _primary_injury_type(factors: list[RiskFactor]) -> str:
    """
    injury_predictions.injury_type is a single VARCHAR, not a list -- so
    this picks ONE label to store there: whichever actually-scoring factor
    (points > 0) contributed the most points. Ties keep the first one
    encountered (biomechanics factors are evaluated before training-load/
    injury-history modifiers, so a movement-quality issue wins a tie over
    a profile-level one). Purely informational factors (points == 0, e.g.
    low detection confidence) never become the headline injury_type.
    """
    scoring_factors = [f for f in factors if f.points > 0]
    if not scoring_factors:
        return "No significant risk factors detected"
    return max(scoring_factors, key=lambda f: f.points).label


def detect_anomalous_frames(
    frames: "Optional[list[FrameMetrics]]",
    z_threshold: float = ANOMALY_Z_THRESHOLD,
) -> list[int]:
    """
    Lightweight WITHIN-CLIP anomaly detection: flags frame numbers whose
    knee_valgus_proxy is a statistical outlier (|z-score| > z_threshold)
    relative to the rest of THIS clip.

    Deliberately simple and deliberately scoped this way:
    - within-clip, not cross-athlete -- everyone's baseline movement
      differs, so "unusual for you, in this clip" is a fair question;
      "unusual compared to other people" is not, without a much bigger
      normative dataset this project doesn't have.
    - statistical outlier detection, not a trained anomaly model -- same
      "don't overclaim" reasoning as the rest of this module.

    Returns an empty list (rather than raising) if there's too little
    data for a z-score to mean anything.
    """
    if not frames:
        return []

    pairs = [(f.frame_number, f.knee_valgus_proxy) for f in frames if f.knee_valgus_proxy is not None]
    if len(pairs) < ANOMALY_MIN_FRAMES:
        return []

    values = [v for _, v in pairs]
    mean = statistics.mean(values)
    stdev = statistics.pstdev(values)
    if stdev == 0:
        return []

    return [
        frame_number for frame_number, v in pairs
        if abs((v - mean) / stdev) > z_threshold
    ]


def assess_risk(
    biomechanics_summary: dict,
    frames: "Optional[list[FrameMetrics]]" = None,
    injury_history: Optional[str] = None,
    training_load: Optional[str] = None,
) -> RiskAssessment:
    """
    Combines Milestone 2's biomechanics summary (+ optionally the raw
    per-frame metrics, for anomaly detection) with athlete-profile
    context (AthleteBase.injury_history / .training_load in schemas.py
    -- both free-text fields today) into a Milestone 3 risk assessment.

    Returns a RiskAssessment whose fields line up 1:1 with what the
    router needs to persist: score/level/injury_type -> the 3 scalar
    columns on injury_predictions, factors -> its contributing_factors
    JSON column (via dataclasses.asdict), recommendation -> the 3 Text
    columns on the linked recommendations row.

    biomechanics_summary: the dict shape returned by
        biomechanics.summarize() (frames_analyzed, frames_with_detection,
        avg_left_knee_angle, avg_right_knee_angle, avg_trunk_lean_deg,
        left_knee_rom, right_knee_rom, knee_rom_asymmetry,
        peak_knee_valgus_proxy).
    frames: the raw list[FrameMetrics] for the clip, if available --
        only used for anomaly detection; omit and you still get a full
        score/level/injury_type/recommendation, just an empty
        anomalous_frames list.
    """
    factors = _biomechanics_factors(biomechanics_summary)

    training_factor = _training_load_factor(training_load)
    if training_factor:
        factors.append(training_factor)

    history_factor = _injury_history_factor(injury_history)
    if history_factor:
        factors.append(history_factor)

    raw_score = sum(f.points for f in factors)
    score = max(0.0, min(100.0, raw_score))
    level = _level_for_score(score)

    return RiskAssessment(
        score=round(score, 1),
        level=level,
        injury_type=_primary_injury_type(factors),
        factors=factors,
        recommendation=_build_recommendation_plan(factors),
        anomalous_frames=detect_anomalous_frames(frames),
    )

