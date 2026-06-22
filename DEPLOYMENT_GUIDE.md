# SHIELD AI - Deployment & Operations Guide

This guide details the production deployment, configuration, and environment setup for **SHIELD AI - National Digital Fraud Prevention & Public Safety Intelligence Platform**.

---

## 1. Prerequisites

Before deploying the platform, ensure the following tools are installed:
- **Node.js**: v18.0.0 or higher (Vite requires v18+)
- **Python**: v3.11.x (FastAPI and SQLite/PostgreSQL connectors)
- **Docker & Docker Compose**: For containerized orchestration
- **Git**: For version control cloning

---

## 2. Environment Variables

Create a `.env` file in the `backend/` directory (see `backend/.env.example` as a template):

```ini
# SHIELD FIOS Core Settings
PROJECT_NAME="SHIELD FIOS"
API_V1_STR="/api/v1"
DEBUG=False

# Authentication (JWT Secret Hex)
JWT_SECRET="9d36fa89cde8a5f0b5d92e85a21bcfe83c61d5ab68e1a1716ea6c87df7e7e8b6"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Connection (SQLite or PostgreSQL)
# Local SQLite default:
DATABASE_URL="sqlite:///./shield_fios.db"
# Docker PostgreSQL default:
# DATABASE_URL="postgresql://shield_admin:shield_fios_secure_pwd@db:5432/shield_fios"
```

---

## 3. Local Deployment Setup

### 3.1 Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *The database `shield_fios.db` will automatically seed with mock complaints and DNA signatures on startup if empty.*

### 3.2 Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Open browser to `http://localhost:5173` to explore the interactive dashboard.*

---

## 4. Docker Compose Local Deployment

Deploy the entire stack (Postgres Database, FastAPI backend, Nginx-served Vite Frontend) using Docker:

1. Build and run containers in the root folder:
   ```bash
   docker-compose up --build -d
   ```
2. Services will be mapped on the following ports:
   - **Frontend UI**: `http://localhost:3000`
   - **Backend API**: `http://localhost:8000`
   - **PostgreSQL Database**: `localhost:5432`

---

## 5. Production Cloud Deployment Targets

### 5.1 Railway Deployment (Recommended)
1. **Database**: Provision a PostgreSQL database on Railway.
2. **Backend**:
   - Link your Git repository.
   - Set the Root Directory to `/backend`.
   - Add env variables: `DATABASE_URL` (use Railway's PG connection string), `JWT_SECRET`, `ALGORITHM`, `DEBUG=False`.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Frontend**:
   - Link your Git repository.
   - Set the Root Directory to `/frontend`.
   - Build Command: `npm run build`
   - Deploy as a static site using the `/dist` directory.

### 5.2 Render Deployment
1. **Web Service (Backend)**:
   - Deploy `/backend` subdirectory from your repository.
   - Runtime: `Python`.
   - Build Command: `pip install -r requirements.txt`.
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
   - Set Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `DEBUG=False`.
2. **Static Site (Frontend)**:
   - Deploy `/frontend` subdirectory from your repository.
   - Build Command: `npm run build`.
   - Publish Directory: `dist`.

### 5.3 VPS Ubuntu Server Setup
1. **Install requirements**:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv nodejs npm nginx -y
   ```
2. **Configure Nginx**:
   Write config to `/etc/nginx/sites-available/shield` to serve Vite `/dist` assets and reverse-proxy backend `/api` requests to `localhost:8000`:
   ```nginx
   server {
       listen 80;
       server_name shield-fios.gov.in;

       location / {
           root /var/www/shield/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
3. **Link & restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/shield /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```
4. **Manage backend process** with `pm2` or `systemd` to run uvicorn in the background.

---

## 6. Troubleshooting & Diagnostics

- **Vite Build Error / TypeScript Warnings**:
  If typescript warnings block production build compile, ensure `tsconfig.json` has `"noUnusedLocals": false` and `"noUnusedParameters": false` to allow building.
- **SQLite Database Locked**:
  On slow servers, SQLite write collisions can occur. Add `?timeout=20` to the SQLite DATABASE_URL (e.g. `sqlite:///./shield_fios.db?timeout=20`) to prevent transaction locks.
- **CORS Blocked Errors**:
  If the frontend runs on a separate hostname/port, ensure `backend/app/main.py` CORS middleware lists the frontend origin or allows wildcard `allow_origins=["*"]` during local/hackathon evaluations.
