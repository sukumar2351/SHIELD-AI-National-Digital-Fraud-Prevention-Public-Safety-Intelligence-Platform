from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from app.config import settings
from app.database import get_db, engine, Base
from app.routes import auth, complaints, detection, graph, investigation, copilot, dna, geospatial
from app import models

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SHIELD FIOS - National Fraud Intelligence Operating System (AI & Graph Intelligence)",
    version="1.0.0"
)

# CORS Configuration
# Allow all origins for seamless hackathon development and local serving
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(complaints.router, prefix=f"{settings.API_V1_STR}/complaints", tags=["Complaints"])
app.include_router(dna.router, prefix=f"{settings.API_V1_STR}/dna", tags=["Fraud DNA Engine"])
app.include_router(detection.router, prefix=f"{settings.API_V1_STR}/detect", tags=["Scam Detection"])
app.include_router(graph.router, prefix=f"{settings.API_V1_STR}/graph", tags=["Fraud Graph"])
app.include_router(investigation.router, prefix=f"{settings.API_V1_STR}", tags=["Investigation & FIR"])
app.include_router(copilot.router, prefix=f"{settings.API_V1_STR}/copilot", tags=["Citizen Copilot"])
app.include_router(geospatial.router, prefix=f"{settings.API_V1_STR}/geospatial", tags=["Geospatial Intelligence"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SHIELD FIOS Core Engine",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.on_event("startup")
def startup_populate():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed if database is completely empty
    db = next(get_db())
    try:
        user_count = db.query(models.User).count()
        if user_count == 0:
            print("Database empty. Auto-triggering seed generator...")
            from app.seed_generator import generate_seed_data
            generate_seed_data()
        else:
            print(f"Database already initialized with {user_count} users. Skipping seeding.")
    except Exception as e:
        print(f"Error on startup database verification: {e}")
    finally:
        db.close()
