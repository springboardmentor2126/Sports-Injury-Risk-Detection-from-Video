# Datasets — Milestone 1

## Status at a glance

| Dataset | Access | What this repo gives you |
|---|---|---|
| **COCO Keypoints** | Open, no registration | `download_datasets.py --get coco-val` |
| **MPII Human Pose** | Open, no registration | `download_datasets.py --get mpii` |
| **Human3.6M** | Gated — register + ~1 week approval | Instructions only (`--get human36m`) |
| **SportsPose** | Gated — access-by-request | Instructions only (`--get sportspose`) |
| **FIFA "Injury Dataset"** | Not a real downloadable file (see below) | Reference notes + open substitute |
| **Synthetic sample** | Included right now, no download | `sample/sample_pose_annotations.json` |

## Quick start (works right now, no download needed)

```bash
cd datasets
python tests/test_pose_loader.py
```

This runs `pose_dataset_loader.py` against a small hand-built
COCO-format sample (`sample/sample_pose_annotations.json` — two poses,
squat and standing) and calculates real joint angles from it. This is
what proves the loader code that Milestone 2 will depend on already
works, without needing a multi-GB dataset downloaded first.

## Downloading the real, open datasets

```bash
python download_datasets.py --list        # see status of everything
python download_datasets.py --get coco-val # ~1.2GB
python download_datasets.py --get mpii     # 12.5MB annotations only by default
```

## About the gated ones

**Human3.6M** and **SportsPose** are not publicly downloadable — their
own maintainers require registration (Human3.6M takes about a week for
approval). This isn't something a script can work around. Run
`python download_datasets.py --get human36m` (or `sportspose`) to print
the exact registration steps. Do this in parallel with other Milestone 2
work rather than blocking on it.

**"FIFA Injury Dataset"**: there's no single official downloadable file
with this name — FIFA's F-MARC injury research is published as papers
and reports, not raw data. For actual structured injury-history rows to
build risk-factor features from (which is what the project spec is
really after — "injury trend analysis, risk factor modeling"), the
practical open substitute is Transfermarkt's scraped injury-history
data. `python download_datasets.py --get injury-reference` prints how
to pull just that CSV. It's third-party scraped data — check the source
repo's license/terms before using it beyond coursework.

## Files in this folder

- `download_datasets.py` — downloads the two open datasets for real;
  prints registration steps for the gated ones.
- `pose_dataset_loader.py` — parses COCO-format keypoint JSON (the
  format both COCO and typical MediaPipe/YOLOv8 pose output use) and
  calculates joint angles from it. This is real Milestone 2 groundwork,
  not just a dataset-fetching script.
- `sample/sample_pose_annotations.json` — synthetic 2-pose sample for
  testing the loader today.
- `tests/test_pose_loader.py` — smoke test proving the loader works.
