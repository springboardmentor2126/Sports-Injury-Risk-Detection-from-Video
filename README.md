# 🏋️ KinetIQ — Sports Biomechanics & Injury Risk Detection

Welcome to **KinetIQ** (Sport Sentinel), an AI-powered sports biomechanics and injury risk detection platform. It allows athletes and coaches to analyze movement patterns from video uploads, track body joint positions using computer vision, visualize posture stability, and obtain custom rehabilitation plans.

---

## 🚀 Quick Start Guide

Follow these steps to run the application locally on your machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or higher recommended)
- `npm` (comes packaged with Node.js)

### 2. Installation
Extract the zip file, open your terminal, and navigate to the project directory:
```bash
# Install dependencies
npm install
```

### 3. Environment Setup
Copy the environment variables template and configure your keys:
```bash
# Copy the example env file
cp .env.example .env
```
Open the `.env` file in your editor and fill in your keys:
- **`AI_API_KEY`**: Your Google Gemini API Key (for pose analysis and AI coach chat).
- **Supabase Credentials**: Set up your Supabase project URL and keys to enable user auth and profile database operations.

### 4. Running the Development Server
Start the local server:
```bash
npm run dev
```
Once started, open your browser and navigate to **[http://localhost:5173](http://localhost:5173)**.

---

## 🛠️ Build & Scripts

The following scripts are available in `package.json`:

- **`npm run dev`**: Starts the Vite development server.
- **`npm run build`**: Compiles the application for production (using Nitro server preset).
- **`npm run preview`**: Previews the production build locally.
- **`npm run lint`**: Runs ESLint checks.
- **`npm run format`**: Automatically formats the codebase using Prettier.

---

## 📁 Key Files & Documentation
- [MILESTONE_1_SETUP.md](file:///MILESTONE_1_SETUP.md): Detailed database schema, Supabase authentication policies, and overall architecture.
- [MILESTONE_2_POSE_ESTIMATION.md](file:///MILESTONE_2_POSE_ESTIMATION.md): Deep-dive into the computer vision pose estimation engines and biomechanical calculations.
