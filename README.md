# Sports Injury Risk Detection from Video

An AI-powered platform that analyzes athlete movement videos to identify unusual movement patterns and biomechanical factors that may be associated with injury risk.

The project uses computer vision, pose estimation, biomechanics analysis, and data-driven risk assessment to turn movement videos into useful reports for athletes, coaches, physiotherapists, and sports scientists.

> **Note:** The system provides a non-clinical, heuristic assessment based on simplified 2D pose-estimation metrics. It is not a medical diagnosis and should not replace evaluation by a qualified healthcare professional.

## What the Project Does

The application allows users to:

- Create and manage athlete profiles
- Upload movement videos for analysis
- Detect human body landmarks from video
- Calculate basic biomechanical measurements
- Analyze movement quality and symmetry
- Identify unusual movement patterns
- Estimate injury-related risk factors
- Generate recommendations based on detected movement issues
- View individual and combined athlete reports
- Export reports as PDF files
- Manage access using user roles and permissions

## Main Concepts

### Computer Vision

The system processes movement videos using computer vision techniques. Video frames are analyzed to identify the athlete and extract useful information about body movement.

### Pose Estimation

MediaPipe Pose is used to detect body landmarks such as the hips, knees, ankles, shoulders, and other joints.

The detected landmarks are used as the foundation for the biomechanical analysis.

### Biomechanical Analysis

The project calculates movement-related measurements from pose landmarks, including:

- Knee angles
- Knee valgus
- Hip stability
- Trunk lean
- Landing mechanics
- Stride length
- Joint alignment
- Balance
- Movement symmetry

These measurements help describe how an athlete is moving rather than simply looking at the video visually.

### Movement Quality Scoring

The system combines biomechanical measurements into a movement quality score from 0 to 100.

The result is also grouped into risk categories:

- Low
- Moderate
- High
- Critical

The score is intended to make the analysis easier to understand while still allowing users to inspect the individual measurements behind it.

### Injury Risk Assessment

The platform combines different movement and athlete-related factors to estimate overall injury risk.

The current risk model considers:

- Biomechanical deviations
- Previous injury factors
- Movement asymmetry
- Training load
- Fatigue indicators

The system also provides category-based indicators for areas such as:

- ACL
- Hamstring
- Ankle sprain
- Shoulder
- Lower back
- Overuse

These are risk indicators, not clinical injury probabilities.

### Anomaly Detection

The system can compare a recent movement video with an athlete's previous results.

For example, a noticeable drop in movement quality or an increase in knee valgus can be flagged as a possible movement anomaly.

This helps identify changes in technique or possible fatigue over time.

### Recommendations

A rule-based recommendation system uses the detected risk factors to provide practical suggestions.

Recommendations can fall into areas such as:

- Exercise
- Mobility
- Strengthening
- Recovery
- Training modification

For example, elevated hip or knee-related risk may lead to strengthening or mobility suggestions.

### Athlete Reports

The application supports individual video reports as well as combined reports based on multiple completed videos.

Reports can include:

- Movement quality score
- Risk category
- Biomechanical measurements
- Metric breakdowns
- Movement anomalies
- Injury-related risk indicators
- Recommendations

PDF reports can also be generated for sharing or record keeping.

## Application Structure

```text
injury-risk-platform/
├── backend/
│   └── app/
│       ├── main.py
│       ├── models.py
│       ├── schemas.py
│       ├── auth.py
│       ├── database.py
│       ├── pose_analysis.py
│       ├── risk_engine.py
│       ├── uploads/
│       └── routers/
│           ├── auth.py
│           ├── athletes.py
│           └── videos.py
├── frontend/
│   └── src/
│       ├── pages/
│       ├── context/
│       ├── components/
│       └── api.js
└── docs/
    ├── ARCHITECTURE.md
    ├── WIREFRAMES.md
    └── DATASETS.md
```

## Tech Stack

### Backend

- Python
- FastAPI
- SQLAlchemy
- SQLite
- JWT authentication
- Password hashing

### Computer Vision and Analysis

- MediaPipe Pose
- OpenCV
- NumPy

### Frontend

- React
- Vite
- React Router
- Recharts
- Lucide React

### Reporting

- PDF report generation using `fpdf2`

## Authentication and Roles

The application uses JWT-based authentication and role-based access control.

Supported roles include:

| Role | View Athletes | Create/Edit Athletes | Delete Athletes |
|---|:---:|:---:|:---:|
| Athlete | Own profile | No | No |
| Coach | All | Yes | No |
| Physiotherapist | All | Yes | No |
| Sports Scientist | All | Yes | No |
| Admin | All | Yes | Yes |

Athletes can manage their own profile and upload their own movement videos. Staff members can manage athletes according to their assigned permissions.

## Running the Project

### Backend

```bash
cd backend

python3 -m venv venv
source venv/bin/activate
# Windows:
# venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

Swagger API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

A local SQLite database is created automatically when the application starts.

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

## Basic Workflow

1. Create an account and log in.
2. Create or complete an athlete profile.
3. Upload a short movement video.
4. Select the relevant activity type.
5. The backend processes the video and extracts pose landmarks.
6. Biomechanical metrics are calculated from the detected landmarks.
7. The system generates movement quality and risk information.
8. Results are displayed through the frontend.
9. Reports can be reviewed or exported as PDF.

For better pose detection, the video should be reasonably well lit and the athlete's full body should remain visible.

## Frontend Design

The interface follows a visual style inspired by a biomechanics laboratory rather than a generic dashboard.

The design includes:

- Clean data-focused layouts
- Instrument-style scores and measurements
- Responsive pages
- Animated data visualizations
- Clear risk indicators
- Accessible typography
- Reduced-motion support

The main styling variables are maintained in `frontend/src/styles.css`, making it easier to change the overall visual design from one place.

## Future Improvements

Some areas that can be explored as the project develops include:

- More advanced pose estimation
- Better biomechanical models
- Larger and more diverse training datasets
- Machine-learning-based risk prediction
- More detailed athlete trend analysis
- Notifications and alerts
- Team-level dashboards
- Rehabilitation tracking
- Excel report export
- Docker support
- Cloud deployment
- More extensive testing

## Important Disclaimer

This project is intended for research, learning, and sports-analysis purposes.

The injury risk results are based on the measurements and rules implemented in the application. They should not be interpreted as a medical diagnosis or as a guarantee that an injury will or will not occur.

For medical decisions, athletes should consult a qualified physiotherapist, sports medicine professional, or physician.
