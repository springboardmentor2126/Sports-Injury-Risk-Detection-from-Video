"""
download_datasets.py — Milestone 1 dataset setup for AI Sports Injury
Risk Detection.

Run this from the `datasets/` directory:

    python download_datasets.py --list          # see status of every dataset
    python download_datasets.py --get coco-val   # download the one that's open
    python download_datasets.py --get mpii       # download the one that's open
    python download_datasets.py --get all-open   # download everything that
                                                   # doesn't need registration

Why some datasets can't be auto-downloaded
-------------------------------------------
Human3.6M and SportsPose are access-gated by their original authors
(you have to register and, for Human3.6M, wait ~1 week for manual
approval). No script can bypass that — anyone who tells you otherwise
is lying or pointing you at a pirated mirror, which you should not use
for a graded internship project. This script prints the exact
registration steps for those instead of pretending to download them.

COCO Keypoints and MPII Human Pose are both genuinely open — no login
wall — so those two are downloaded for real.
"""

import argparse
import os
import sys
import urllib.request
import zipfile
import tarfile
from pathlib import Path

DATASETS_DIR = Path(__file__).resolve().parent


def _download(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"  already downloaded: {dest.name}")
        return

    print(f"  downloading {url}")

    def _progress(block_num, block_size, total_size):
        if total_size <= 0:
            return
        done = block_num * block_size
        pct = min(done * 100 / total_size, 100)
        sys.stdout.write(f"\r  {dest.name}: {pct:5.1f}%")
        sys.stdout.flush()

    urllib.request.urlretrieve(url, dest, _progress)
    print()


def _extract(archive: Path, target_dir: Path):
    target_dir.mkdir(parents=True, exist_ok=True)
    print(f"  extracting {archive.name} -> {target_dir}")
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(target_dir)
    elif archive.name.endswith(".tar.gz"):
        with tarfile.open(archive) as tf:
            tf.extractall(target_dir)


# ---------------------------------------------------------------------------
# COCO Keypoints — open, no registration
# ---------------------------------------------------------------------------

def get_coco_val(full: bool = False):
    """
    Downloads the COCO 2017 val split (5K images / ~1GB) plus the
    person_keypoints annotations. Pass full=True to also grab train2017
    (118K images / ~18GB) -- only do that once you actually need to train,
    not for Milestone 1 integration.
    """
    coco_dir = DATASETS_DIR / "coco"
    ann_zip = coco_dir / "annotations_trainval2017.zip"
    val_zip = coco_dir / "val2017.zip"

    _download(
        "http://images.cocodataset.org/annotations/annotations_trainval2017.zip",
        ann_zip,
    )
    _extract(ann_zip, coco_dir)

    _download("http://images.cocodataset.org/zips/val2017.zip", val_zip)
    _extract(val_zip, coco_dir)

    if full:
        train_zip = coco_dir / "train2017.zip"
        _download("http://images.cocodataset.org/zips/train2017.zip", train_zip)
        _extract(train_zip, coco_dir)

    keypoints_file = coco_dir / "annotations" / "person_keypoints_val2017.json"
    print(f"  Done. Keypoint annotations at: {keypoints_file}")


# ---------------------------------------------------------------------------
# MPII Human Pose — open, no registration
# ---------------------------------------------------------------------------

def get_mpii(images: bool = False):
    """
    Annotations are 12.5MB and always downloaded. Images are 12.9GB --
    pass images=True only when you're ready for that (Milestone 2/3
    training), not for a first Milestone 1 integration check.
    """
    mpii_dir = DATASETS_DIR / "mpii"
    ann_zip = mpii_dir / "mpii_human_pose_v1_u12_2.zip"

    _download(
        "https://datasets.d2.mpi-inf.mpg.de/andriluka14cvpr/mpii_human_pose_v1_u12_2.zip",
        ann_zip,
    )
    _extract(ann_zip, mpii_dir)

    if images:
        img_tar = mpii_dir / "mpii_human_pose_v1.tar.gz"
        _download(
            "https://datasets.d2.mpi-inf.mpg.de/andriluka14cvpr/mpii_human_pose_v1.tar.gz",
            img_tar,
        )
        _extract(img_tar, mpii_dir / "images")

    print(f"  Done. Annotations under: {mpii_dir}")


# ---------------------------------------------------------------------------
# Gated datasets — print instructions instead of pretending to download
# ---------------------------------------------------------------------------

def get_human36m():
    print(
        """
  Human3.6M requires an account + manual approval (~1 week) -- there is
  no way to script around this.

  1. Register at: http://vision.imar.ro/human3.6m/
  2. Wait for the approval email.
  3. Once approved, either:
       a) download manually from their site, or
       b) use a fetch helper once you have credentials, e.g.
          https://github.com/anibali/h36m-fetch
  4. Put the result under: datasets/human36m/

  Do this in parallel with Milestone 2 dev -- don't block on it.
"""
    )


def get_sportspose():
    print(
        """
  SportsPose is access-by-request (academic use only), not a public
  direct download.

  1. Read the paper / request access at:
     https://christianingwersen.github.io/SportsPose/
  2. The accompanying loader code (not the data) is public:
     git clone https://github.com/ChristianIngwersen/SportsPose.git
  3. Once access is granted, put the data under: datasets/sportspose/
"""
    )


def get_injury_reference():
    print(
        """
  There is no single official downloadable "FIFA Injury Dataset" file --
  FIFA's F-MARC injury research is published as papers/reports, not a
  raw dataset (see docs/Injury_Datasets_Notes.md for citations).

  For actual structured injury-history data to build risk-factor
  features (matches your PDF's "Injury trend analysis, Risk factor
  modeling" goal), the practical open substitute is the Transfermarkt
  injury-history data. Pull just that CSV via sparse checkout (avoids
  cloning their full 150MB+ datalake):

    git clone --filter=blob:none --sparse \\
        https://github.com/salimt/football-datasets.git tmp_football_data
    cd tmp_football_data
    git sparse-checkout set datalake/transfermarkt/player_injuries
    cp datalake/transfermarkt/player_injuries/player_injuries.csv \\
        ../injury_reference/
    cd .. && rm -rf tmp_football_data

  This is scraped from a commercial site (Transfermarkt) by a third
  party -- check that repo's license/ToS before using it beyond your
  own research/coursework.
"""
    )


DATASET_FNS = {
    "coco-val": lambda: get_coco_val(full=False),
    "coco-full": lambda: get_coco_val(full=True),
    "mpii": lambda: get_mpii(images=False),
    "mpii-full": lambda: get_mpii(images=True),
    "human36m": get_human36m,
    "sportspose": get_sportspose,
    "injury-reference": get_injury_reference,
}

OPEN_DATASETS = ["coco-val", "mpii"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="show dataset status")
    parser.add_argument("--get", choices=list(DATASET_FNS) + ["all-open"])
    args = parser.parse_args()

    if args.list or not args.get:
        print("\nDataset status:\n")
        print("  coco-val           OPEN        no registration (~1.2GB)")
        print("  mpii               OPEN        no registration (12.5MB annotations, +12.9GB images optional)")
        print("  human36m           GATED       requires registration + ~1 week approval")
        print("  sportspose         GATED       access-by-request, academic use only")
        print("  injury-reference   OPEN(3rd party)   scraped data, check source license")
        print("\nRun with --get <name> or --get all-open\n")
        return

    if args.get == "all-open":
        for name in OPEN_DATASETS:
            print(f"\n[{name}]")
            DATASET_FNS[name]()
        return

    print(f"\n[{args.get}]")
    DATASET_FNS[args.get]()


if __name__ == "__main__":
    main()
