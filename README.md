# 🏃 Sports Injury Risk Detection from Video

An AI-powered web application that analyzes athlete movement from uploaded sports videos to detect potential injury risks using computer vision, pose estimation, biomechanics analysis, and machine learning techniques.

---

# 📌 Project Overview

Sports injuries are one of the major challenges faced by athletes across different sports. This project assists athletes, coaches, physiotherapists, and sports scientists by analyzing athlete movement and body posture from uploaded videos.

The application combines **React**, **FastAPI**, **OpenCV**, and **MediaPipe Pose Estimation** to provide:

- Athlete authentication and profile management
- Sports video upload and processing
- Human pose estimation
- Skeleton tracking
- Biomechanics analysis
- Injury risk prediction
- Movement quality analysis
- Processed skeleton video generation
- Downloadable injury assessment reports
- Admin dashboard and analytics
- Password reset through email
- Access request and invitation management
- Asynchronous video processing

---

# 🎯 Objectives

- Detect athlete body posture from uploaded videos.
- Perform AI-based human pose estimation.
- Track body joint movements.
- Analyze biomechanics and movement quality.
- Detect movement abnormalities and asymmetry.
- Predict potential injury risks.
- Generate injury analysis reports.
- Provide athlete profile management.
- Provide centralized admin monitoring and analytics.
- Build a scalable sports analytics platform.

---

# 🚀 Milestone 1 Features

## ✅ Project Initialization

- Project setup
- Frontend and backend configuration
- GitHub repository management

## ✅ Authentication System

- User Registration
- User Login
- Role-based user interface

## ✅ Athlete Profile Management

- Athlete Information
- Sport Type
- Playing Position
- Age
- Height
- Weight
- Injury History
- Training Load

## ✅ Video Upload System

- Video Upload API
- Video Validation
- Video Processing
- Frame Extraction

## ✅ Pose Estimation

- MediaPipe Pose Integration
- Human Landmark Detection
- Joint Tracking

## ✅ Dataset Preparation

- Human3.6M
- MPII Human Pose
- COCO Keypoints
- SportsPose
- FIFA Injury Dataset (Reference)

---

# 🚀 Milestone 2 Features

## ✅ Skeleton Tracking

- Frame-by-frame pose landmark extraction
- Skeleton overlay generation
- Browser-compatible processed video generation

## ✅ Biomechanics Analysis

- Joint angle calculation
- Movement quality assessment
- Biomechanical deviation analysis

## ✅ Injury Risk Prediction

- Overall injury risk scoring
- Risk categorization
- Weighted injury risk factors
- Movement asymmetry detection

## ✅ Video Analysis

- Process uploaded sports videos
- Generate processed skeleton videos
- Detection rate calculation

## ✅ Injury Report Generation

- Athlete injury assessment
- Injury probability calculation
- Risk recommendations
- Downloadable PDF report generation

## ✅ Frontend Enhancements

- Updated Dashboard
- Enhanced Athlete Profile
- Improved Upload Workflow
- Results Visualization
- Processed Video Playback

---

# 🚀 Milestone 3 Features

## ✅ Admin Dashboard

- Dedicated administrator dashboard
- View registered athlete information
- Centralized athlete monitoring
- Athlete statistics and analytics
- Sports-wise athlete distribution
- Risk-level distribution
- Graphical data visualization
- Pie charts and analytical charts
- Overall platform statistics

## ✅ Advanced Authentication

- Secure user authentication
- Role-based access
- Forgot Password functionality
- Email-based password reset
- Reset password workflow
- Google authentication support

## ✅ Access Request & Invitation Management

- Athlete access request management
- Incoming access requests
- Outgoing access requests
- User invitation functionality
- Invitation acceptance workflow

## ✅ Asynchronous Video Processing

- Background video processing
- Video analysis continues independently after upload
- Processing status management
- Improved handling of long-running video analysis
- Results available after processing completion

## ✅ Advanced Analysis Services

- Centralized analysis service
- Movement anomaly detection
- Dashboard analytics service
- Video processing service
- Report service
- Authentication service

## ✅ Improved Results Dashboard

- Detailed injury risk results
- Movement analysis results
- Risk factor visualization
- Processed skeleton video
- Analysis status handling
- Downloadable injury assessment report

## ✅ Email Services

- Password reset email functionality
- Configurable SMTP email service
- Secure application password configuration
- Email-based account recovery

## ✅ Database Enhancements

- Athlete data management
- User authentication data
- Analysis records
- Access request management
- Admin-related data
- Analytics-related database support
- Database schema synchronization

---

# 🛠 Technology Stack

## Frontend

- React.js
- React Router
- Axios
- React Icons
- CSS3
- Recharts

## Backend

- FastAPI
- Python
- SQLAlchemy
- Pydantic
- PostgreSQL
- JWT Authentication

## AI & Computer Vision

- MediaPipe Pose
- OpenCV
- Pose Estimation
- Biomechanics Analysis
- Movement Quality Analysis
- Injury Risk Engine
- Anomaly Detection

## Email & Authentication

- SMTP
- Google Authentication
- JWT
- Password Reset Tokens

## Tools

- Git
- GitHub
- VS Code
- npm
- Uvicorn

---

# 📁 Project Structure

```text
Sports-Injury-Risk-Detection-from-Video
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── api
│   │   ├── components
│   │   ├── pages
│   │   └── styles
│   ├── package.json
│   └── package-lock.json
│
├── backend
│   ├── database
│   │   ├── crud.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   │
│   ├── routers
│   │   ├── auth.py
│   │   ├── athlete.py
│   │   ├── upload.py
│   │   ├── analysis.py
│   │   ├── report.py
│   │   ├── admin.py
│   │   ├── access_request.py
│   │   └── invite.py
│   │
│   ├── services
│   │   ├── auth_service.py
│   │   ├── email_service.py
│   │   ├── google_auth_service.py
│   │   ├── analysis_service.py
│   │   ├── anomaly_detection_service.py
│   │   ├── dashboard_service.py
│   │   ├── video_service.py
│   │   └── report_service.py
│   │
│   ├── utils
│   │   ├── biomechanics.py
│   │   ├── injury_risk_engine.py
│   │   ├── movement_quality.py
│   │   ├── pose_estimation.py
│   │   ├── report_generator.py
│   │   └── skeleton_tracking.py
│   │
│   ├── main.py
│   ├── requirements.txt
│   └── database schema files
│
├── database
├── datasets
├── docs
├── wireframes
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🚀 How to Run

## 1. Clone the Repository

```bash
git clone https://github.com/springboardmentor2126/Sports-Injury-Risk-Detection-from-Video.git
cd Sports-Injury-Risk-Detection-from-Video
```

---

## 2. Backend Setup

Open a terminal and navigate to the backend:

```bash
cd backend
```

Create a Python 3.11 virtual environment:

```bash
py -3.11 -m venv venv311
```

Activate the environment on Windows:

```bash
venv311\Scripts\activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Create a local `.env` file inside the `backend` folder and configure the required database, authentication, and email environment variables.

Start the FastAPI backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

`http://127.0.0.1:8000`

FastAPI API Documentation:

`http://127.0.0.1:8000/docs`

---

## 3. Frontend Setup

Open a second terminal and navigate to the frontend:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the React application:

```bash
npm start
```

Frontend runs at:

`http://localhost:3000`

---

# 📊 Current Progress

| Module | Status |
|---|---|
| Project Initialization | ✅ Completed |
| Authentication | ✅ Completed |
| Athlete Profile Management | ✅ Completed |
| Video Upload System | ✅ Completed |
| Pose Estimation | ✅ Completed |
| Skeleton Tracking | ✅ Completed |
| Biomechanics Analysis | ✅ Completed |
| Injury Risk Prediction | ✅ Completed |
| Processed Video Generation | ✅ Completed |
| PDF Report Generation | ✅ Completed |
| Results Dashboard | ✅ Completed |
| Admin Dashboard | ✅ Completed |
| Athlete Analytics | ✅ Completed |
| Risk Analytics & Visualization | ✅ Completed |
| Access Request Management | ✅ Completed |
| User Invitation System | ✅ Completed |
| Forgot Password | ✅ Completed |
| Email Password Reset | ✅ Completed |
| Asynchronous Video Processing | ✅ Completed |
| Movement Anomaly Detection | ✅ Completed |
| Dashboard Analytics Services | ✅ Completed |

---

# 📈 Milestone 3 Highlights

Milestone 3 focuses on transforming the application into a more complete sports injury analytics platform by introducing:

- Centralized administrator monitoring
- Athlete statistics and graphical analytics
- Sports-wise athlete visualization
- Risk-level visualization
- Improved authentication and password recovery
- Email-based password reset
- Access request management
- Invitation management
- Asynchronous video processing
- Movement anomaly detection
- Enhanced analysis services
- Improved dashboard and results experience
- Expanded database support

---

# 🔐 Security

Sensitive configuration values are stored locally in environment variables and are not committed to the repository.

The project `.gitignore` excludes:

- `.env` files
- Python virtual environments
- `node_modules`
- Uploaded videos
- Processed videos
- Generated reports
- Python cache files

---

# 🚀 Future Enhancements

- Real-time pose estimation
- Deep learning injury prediction models
- AI-powered recommendation system
- Performance analytics dashboard
- Coach dashboard
- Physiotherapist dashboard
- Sports scientist dashboard
- Multi-athlete comparison
- Cloud deployment
- Advanced biomechanics analytics

---

# 👩‍💻 Developed By

**Veera Naga Durga Garlanka**

**B.Tech – Computer Science and Engineering (AI & ML)**

**CMR College of Engineering & Technology**

---

# ⭐ Project Status

## ✅ Milestone 3 – Completed

The project currently includes the implementation of **Milestones 1, 2, and 3** of the **Sports Injury Risk Detection from Video** platform.

The application provides athlete authentication, athlete profile management, sports video upload and processing, AI-based pose estimation, skeleton tracking, biomechanics analysis, injury risk prediction, downloadable injury reports, administrator analytics, access management, password recovery, email services, and asynchronous video processing.

---

## 📄 License

This project was developed as part of the **Infosys Springboard Internship Program** for educational and research purposes.
