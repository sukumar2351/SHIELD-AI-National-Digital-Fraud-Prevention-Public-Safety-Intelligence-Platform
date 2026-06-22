from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.database import get_db
from app.services.geospatial_service import geospatial_service

router = APIRouter()

# Pydantic schemas for response validation
class GeospatialOverviewResponse(BaseModel):
    total_districts: int
    total_states: int
    active_hotspots_count: int
    average_risk_score: float
    top_high_risk_district: str
    top_high_risk_state: str

class HotspotResponse(BaseModel):
    hotspot_id: int
    district: str
    state: str
    latitude: float
    longitude: float
    intensity: float
    growth_rate: float
    status: str
    complaints_count: int
    total_loss_amount: float

class DistrictRiskResponse(BaseModel):
    district_id: int
    district: str
    state: str
    latitude: float
    longitude: float
    risk_score: float
    complaints_count: int
    total_loss_amount: float
    growth_rate: float

class StateRiskResponse(BaseModel):
    state_id: int
    state: str
    risk_score: float
    districts_count: int
    total_complaints: int
    total_loss_amount: float

class FamilySpreadDetail(BaseModel):
    district_id: int
    district: str
    state: str
    latitude: float
    longitude: float
    active_complaints: int
    concentration_percentage: float

class FamilySpreadResponse(BaseModel):
    family_id: int
    family_code: str
    name: str
    main_scam_type: str
    total_active_complaints: int
    spread: List[FamilySpreadDetail]

@router.get("/overview", response_model=GeospatialOverviewResponse)
def get_geospatial_overview(db: Session = Depends(get_db)):
    """
    GET /api/v1/geospatial/overview
    Returns aggregate stats (districts, states count, hotspots count, and average risk).
    """
    geospatial_service.sync_database_if_empty(db)
    
    districts = geospatial_service.rank_districts(db, limit=100)
    states = geospatial_service.rank_states(db)
    hotspots = geospatial_service.detect_hotspots(db)

    total_dist = len(districts)
    total_st = len(states)
    active_hs = len(hotspots)
    
    avg_risk = sum(d["risk_score"] for d in districts) / total_dist if total_dist > 0 else 0.0
    top_dist = districts[0]["district"] if districts else "None"
    top_st = states[0]["state"] if states else "None"

    return {
        "total_districts": total_dist,
        "total_states": total_st,
        "active_hotspots_count": active_hs,
        "average_risk_score": round(avg_risk, 1),
        "top_high_risk_district": top_dist,
        "top_high_risk_state": top_st
    }

@router.get("/hotspots", response_model=List[HotspotResponse])
def get_hotspots(db: Session = Depends(get_db)):
    """
    GET /api/v1/geospatial/hotspots
    Returns all districts classified as Active or Emerging hotspots.
    """
    return geospatial_service.detect_hotspots(db)

@router.get("/districts", response_model=List[DistrictRiskResponse])
def get_districts(
    limit: int = Query(20, description="Limit number of districts returned"),
    db: Session = Depends(get_db)
):
    """
    GET /api/v1/geospatial/districts
    Returns a ranked list of all districts with their composite risk scores.
    """
    return geospatial_service.rank_districts(db, limit=limit)

@router.get("/states", response_model=List[StateRiskResponse])
def get_states(db: Session = Depends(get_db)):
    """
    GET /api/v1/geospatial/states
    Returns a ranked list of states with aggregated risk and complaints counts.
    """
    return geospatial_service.rank_states(db)

@router.get("/family-spread/{family_id}", response_model=FamilySpreadResponse)
def get_family_spread(family_id: int, db: Session = Depends(get_db)):
    """
    GET /api/v1/geospatial/family-spread/{family_id}
    Returns details on the geographical distribution of a fraud family syndicate.
    """
    spread = geospatial_service.get_family_spread(db, family_id)
    if not spread:
        raise HTTPException(status_code=404, detail="Fraud family ID reference not found.")
    return spread
