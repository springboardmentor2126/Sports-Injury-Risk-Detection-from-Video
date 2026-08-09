# Sports Injury Risk Detection from Video

An internship project scaffold for building a sports injury risk detection platform incrementally.

## Milestone 1

This milestone includes:

- React frontend scaffolded with Vite
- FastAPI backend starter application
- React Router-based navigation
- Login page connected to backend credential validation
- Athlete Profile page with local state and validation placeholders
- Clean modular folder structure for future expansion

## Project Structure

```text
frontend/
backend/
datasets/
docs/
docker/

## Python version and setup

This project requires Python 3.11. MediaPipe wheels compatible with the codebase are built for Python 3.11; using Python 3.13 can cause `mediapipe` to import but not expose `mediapipe.solutions`.

Setup a Python 3.11 virtual environment (Windows):

- Install Python 3.11 from https://www.python.org/downloads/release/python-311/ if not already installed.
- From PowerShell, create and activate a venv using the 3.11 launcher:

```powershell
py -3.11 -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -U pip
pip install -r backend/requirements.txt
```

- To verify MediaPipe is correctly installed and exposes `solutions`, run the verification script added to the project root:

```powershell
py -3.11 verify_mediapipe.py
```

If the verification reports `hasattr(mediapipe, 'solutions')` as `False`, reinstall Python 3.11 and the `mediapipe` wheel for your platform.