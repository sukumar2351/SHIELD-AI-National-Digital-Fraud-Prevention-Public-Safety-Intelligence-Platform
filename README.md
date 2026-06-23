# SHIELD AI – National Digital Fraud Prevention & Public Safety Intelligence Platform

SHIELD AI is a state-of-the-art, national-level digital fraud prevention and public safety intelligence platform designed to detect, track, visualize, and mitigate digital financial fraud. It integrates multiple advanced telemetry streams, geospatial mapping, network graph visualization, and interactive AI copilot assistance to empower both law enforcement agencies and citizens.

---

## 🌟 Core Modules

### 1. 📊 Executive Dashboard (`/dashboard`)
Provides high-level intelligence and threat metrics across the nation:
- **Top Metrics**: Total Complaints, Active Fraud Families, SHIELD Threat Score, Active Investigations, FIRs Generated.
- **Analytics Widgets**: High-Risk States & Districts rankings, Threat Alerts, Fraud Family Distribution, and Threat Timelines.

### 2. 🧬 Fraud DNA (`/dna`)
Multi-dimensional analysis of fraud typologies using deep profiling:
- Profiles fraud families by Communication, Financial, Behavioral, Language, and Geo DNA.
- Interactive data visualizations (Pie, Bar, Area, and Trend charts) showing fraud behavior evolution.

### 3. 🕸️ Fraud Graph (`/graph`)
Network analysis mapping entity relationships:
- Interactive node-link visualization of fraud networks using **React Flow**.
- Trace complex relationships between Victims, Fraudsters, UPI IDs, and Phone Numbers.
- Features cluster filtering, node expansion, search capabilities, and connection highlighting.

### 4. ⚖️ Investigation Center (`/investigations`)
Workflow management system for law enforcement officers:
- Centralized queue of active cases with search, priority sorting, and threat level categorization.
- Real-time case timeline tracking.
- **Automated FIR (First Information Report) Generation** with instant preview and download capabilities.

### 5. 🗺️ Geospatial Dashboard (`/geospatial`)
Geographic visualization of threats across India:
- Interactive India Map showing state-level and district-level threat heatmaps.
- Analyze fraud family spread and local threat growth trends.
- Risk-ranking tables for localized intervention.

### 6. 🤖 Citizen Copilot (`/copilot`)
A multilingual conversational safety assistant for the public:
- Interactive chat interface for fraud verification and complaint pre-checking.
- Instant SHIELD Safety Score & Threat Level evaluations.
- Real-time safety recommendations and preventative tips customized to the threat.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Dark Navy & Electric Blue Glassmorphism theme)
- **Graphing**: React Flow
- **Analytics**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **ORM & Migrations**: SQLAlchemy & Alembic
- **Deployment**: Docker & Docker Compose, Nginx

---

## 📂 Project Structure

```
├── backend/                  # FastAPI Backend application
│   ├── app/                  # Main application package (models, schemas, routers, core)
│   ├── alembic/              # Database migration scripts
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Container definition for backend
│   └── .env.example          # Backend configuration template
├── frontend/                 # React Frontend application
│   ├── src/                  # React components, pages, hooks, and routing
│   ├── package.json          # Node dependencies & scripts
│   ├── Dockerfile            # Nginx-based production frontend container
│   └── vite.config.ts        # Vite build configuration
├── docker-compose.yml        # Multi-container local orchestration file
├── DEPLOYMENT_GUIDE.md       # Step-by-step production hosting guide
├── DEMO_RUNBOOK.md           # Step-by-step demo evaluation walkthrough
└── FINAL_DEPLOYMENT_CHECKLIST.md # Quality assurance check sheet
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Python 3.10+](https://www.python.org/) (for local manual run)
- [Node.js 18+](https://nodejs.org/) (for local manual run)

### Method 1: Quick Start with Docker (Recommended)
To spin up the entire platform (Database, FastAPI Backend, and Nginx-served Frontend) with a single command:

1. Clone this repository and navigate to the project directory:
   ```bash
   git clone https://github.com/sukumar2351/SHIELD-AI-National-Digital-Fraud-Prevention-Public-Safety-Intelligence-Platform.git
   cd "SHIELD AI – National Digital Fraud Prevention & Public Safety Intelligence Platform"
   ```
2. Start the services:
   ```bash
   docker-compose up --build
   ```
3. Open your browser:
   - **Frontend UI**: [http://localhost:80](http://localhost:80)
   - **Interactive API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Method 2: Manual Local Development

#### 1. Running the Backend
1. Navigate to the backend folder and create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up local configuration:
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Running the Frontend
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📜 Documentation Guides
For in-depth setup, demonstration flows, and deployment configurations, refer to:
* **[DEPLOYMENT_GUIDE.md](file:///DEPLOYMENT_GUIDE.md)**: Cloud hosting instructions, SSL certificates, Nginx configuration, and Docker-compose structure.
* **[DEMO_RUNBOOK.md](file:///DEMO_RUNBOOK.md)**: Click-by-click evaluation runbook highlighting features and pages for judges.
* **[FINAL_DEPLOYMENT_CHECKLIST.md](file:///FINAL_DEPLOYMENT_CHECKLIST.md)**: Steps to ensure production readiness, security compliance, and robust execution.

---

## 📄 License
This project is developed for the National Digital Fraud Prevention Hackathon. All rights reserved.
## 🛠️ developed by
👤 Sukumar — Lead Developer & AI Architect
👤 Shaik Mujeeb Basha — Backend & Data Engineering
👤 Bondada Tejendra — Frontend & UX Design
🏛 Nalanda degree collegre | Computer Science Department
