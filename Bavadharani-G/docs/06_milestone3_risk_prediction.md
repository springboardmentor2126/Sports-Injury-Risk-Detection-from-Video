# Milestone 3 — Injury Risk Prediction & Recommendations

## What was built

| Task (from spec) | Implementation |
|---|---|
| Risk factor identification | Derived from Milestone 2's joint angles/asymmetry/trunk lean |
| Injury probability prediction | Per-category risk score (0-100): ACL, hamstring, ankle sprain, lower back, overuse |
| Risk trend monitoring | Dashboard endpoint tracks risk score across all of an athlete's videos (Milestone 4) |
| Personalized injury assessment | `POST /videos/{id}/risk-assessment` |
| Corrective recommendations | Rule-based mapping from risk factors to plain-language suggestions |

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/videos/{id}/risk-assessment` | Run the risk engine on a processed video's report |
| GET | `/videos/{id}/risk-assessment` | Fetch a previously computed assessment |

## How risk scoring works

Each injury category has its own rule, grounded in a specific,
documented sports-science pattern:

- **ACL risk** — driven by left/right knee angle asymmetry (uneven
  loading during landing/cutting is a well-documented ACL risk factor)
- **Hamstring risk** — driven by near-full knee extension (straight-leg
  high-speed movement is linked to hamstring strain)
- **Ankle sprain risk** — proxied by pose detection reliability during
  the clip (a rough signal; flagged as an area for a dedicated
  ankle/foot-angle feature in future work)
- **Lower back risk** — driven by excessive trunk lean from vertical
- **Overuse risk** — cannot be measured from a single video (needs
  training-load history across sessions); left at a low, honest
  baseline rather than fabricated

## Why rule-based, not a trained ML classifier

Same reasoning as Milestone 2: there's no accessible labeled dataset
mapping "this movement pattern led to this real injury" for a student
project to train on. Every threshold here traces to a specific,
statable biomechanical pattern (documented in `risk_engine.py`
docstrings) rather than a black box — this is the more defensible,
explainable choice for a project like this, and is explicitly called
out as a design decision rather than a shortfall.

## Weighted scoring — deviation from the original spec

The original spec's weighting (35% biomechanical deviations / 20%
historical injury factors / 20% movement asymmetry / 15% training
load / 10% fatigue) needs data this project doesn't collect yet:
athlete injury history integration, multi-session training load, and
fatigue tracking across a session. The current `overall_risk_score`
redistributes weight across what a single video CAN measure today
(documented explicitly in `risk_engine.py`), with the other factors
noted as a clear extension point.

## Testing performed

- Unit tests: clean movement (low risk), deliberately risky movement
  (high asymmetry + trunk lean — correctly flagged High Risk with
  matching factors), and missing/null data (handled without crashing)
- Full integration test: biomechanics report → risk assessment →
  dashboard aggregation, verified end-to-end with real data flowing
  through every layer
