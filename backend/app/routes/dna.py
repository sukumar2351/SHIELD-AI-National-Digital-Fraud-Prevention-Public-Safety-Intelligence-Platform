from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
from app.database import get_db
from app import models, schemas, security
from app.services.ai_engine import ai_engine
from app.services.dna_engine import dna_engine

router = APIRouter()

@router.post("/analyze", response_model=schemas.DNAAnalysisResponse)
def analyze_scam_text(
    payload: schemas.DNAAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a mock scan payload to run entity extraction, construct DNA dimensions,
    and automatically assign a classified syndicate family.
    """
    text = payload.description
    if not text.strip():
        raise HTTPException(status_code=400, detail="Description text cannot be empty.")

    # 1. Deduce scam category
    text_lower = text.lower()
    scam_type = "UPI Payment Fraud"
    if "arrest" in text_lower or "cbi" in text_lower or "police" in text_lower:
        scam_type = "Digital Arrest Scam"
    elif "whatsapp" in text_lower:
        scam_type = "WhatsApp Impersonation"
    elif "sms" in text_lower or "smishing" in text_lower:
        scam_type = "SMS Smishing"
    elif "phishing" in text_lower or "email" in text_lower:
        scam_type = "Email Phishing"

    # 2. Extract Entities
    entities = ai_engine.extract_entities(text)
    
    # 3. Extract dimensions
    dims = dna_engine.extract_dna_dimensions(text, entities)
    
    # 4. Match family
    family, confidence = dna_engine.match_fraud_family(db, dims, scam_type)
    
    # 5. Generate signature
    signature = dna_engine.generate_signature(text, scam_type, entities, dims)

    # Convert traits to list
    traits_list = [t.strip() for t in family.traits.split(",") if t.strip()] if family.traits else []

    return {
        "scam_signature": signature,
        "confidence": confidence,
        "fraud_family": family.family_code,
        "traits": traits_list,
        "dimensions": dims
    }

@router.get("/family/{family_id}", response_model=schemas.FraudFamilyResponse)
def get_family_details(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    family = db.query(models.FraudFamily).filter(models.FraudFamily.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Fraud family not found.")
    return family

@router.get("/families", response_model=List[schemas.FraudFamilyResponse])
def get_all_families(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    families = db.query(models.FraudFamily).all()
    return families

@router.get("/similar/{complaint_id}", response_model=schemas.RelatedCaseResponse)
def get_similar_cases(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Source complaint reference not found.")
        
    similar_cases = dna_engine.find_similar_cases(db, complaint)
    return {
        "target_complaint_id": complaint_id,
        "similar_cases_count": len(similar_cases),
        "matches": similar_cases
    }

@router.get("/statistics", response_model=schemas.DNAStatisticsResponse)
def get_dna_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    total_analyzed = db.query(models.FraudDNA).count()
    
    # Calculate average confidence
    dnas = db.query(models.FraudDNA).all()
    avg_conf = 0.0
    if total_analyzed > 0:
        avg_conf = sum([d.confidence_score for d in dnas]) / total_analyzed
        
    # Calculate family distribution
    families = db.query(models.FraudFamilyMembership).all()
    family_dist = {}
    for m in families:
        f_code = m.family.family_code
        family_dist[f_code] = family_dist.get(f_code, 0) + 1
        
    # Dimension summaries
    comm_summary = {}
    fin_summary = {}
    lang_summary = {}
    geo_summary = {}
    
    for d in dnas:
        if d.communication_dna: comm_summary[d.communication_dna] = comm_summary.get(d.communication_dna, 0) + 1
        if d.financial_dna: fin_summary[d.financial_dna] = fin_summary.get(d.financial_dna, 0) + 1
        if d.language_dna: lang_summary[d.language_dna] = lang_summary.get(d.language_dna, 0) + 1
        if d.geo_dna: geo_summary[d.geo_dna] = geo_summary.get(d.geo_dna, 0) + 1
        
    return {
        "total_analyzed": total_analyzed,
        "confidence_average": round(avg_conf, 2),
        "family_distribution": family_dist,
        "dimension_summaries": {
            "communication": comm_summary,
            "financial": fin_summary,
            "language": lang_summary,
            "geo": geo_summary
        }
    }
