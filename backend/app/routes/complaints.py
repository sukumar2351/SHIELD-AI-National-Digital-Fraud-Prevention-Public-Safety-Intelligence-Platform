from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import datetime
from app.database import get_db
from app import models, schemas, security
from app.services.ai_engine import ai_engine
from app.services.dna_engine import dna_engine
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/", response_model=List[schemas.ComplaintResponse])
def get_complaints(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    complaints = db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).offset(skip).limit(limit).all()
    return complaints

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes dashboard scorecard metrics.
    """
    total_complaints = db.query(models.Complaint).count()
    critical_threats = db.query(models.Complaint).filter(models.Complaint.threat_level == "Critical").count()
    high_threats = db.query(models.Complaint).filter(models.Complaint.threat_level == "High Risk").count()
    families_count = db.query(models.FraudFamily).count()
    resolved_count = db.query(models.Complaint).filter(models.Complaint.status == "Resolved").count()
    
    # Financial metrics heuristics
    prevented_frauds = int(total_complaints * 0.42)
    potential_saved = prevented_frauds * 35000  # Rs. 35,000 avg saved per scam
    investigation_success = 84.6  # 84.6% success rate
    
    # Category distribution
    categories = {}
    complaints = db.query(models.Complaint).all()
    for c in complaints:
        # Deduce type from description or associated DNA
        c_type = "Other Scam"
        if c.fraud_dna and c.fraud_dna.family:
            c_type = c.fraud_dna.family.main_scam_type
        categories[c_type] = categories.get(c_type, 0) + 1

    formatted_categories = [{"name": k, "value": v} for k, v in categories.items()]

    # High risk districts from entities
    districts = db.query(models.FraudEntity).filter(models.FraudEntity.entity_type == "District").order_by(models.FraudEntity.reported_count.desc()).limit(5).all()
    formatted_districts = [{"district": d.entity_value, "count": d.reported_count, "risk": d.risk_score} for d in districts]

    # Threats evolution month-by-month (Jan-Jun)
    months = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun"}
    monthly_stats = {m: {"month": months[m], "complaints": 0, "risk_score_avg": 0} for m in months}
    for c in complaints:
        m = c.created_at.month
        if m in monthly_stats:
            monthly_stats[m]["complaints"] += 1
            monthly_stats[m]["risk_score_avg"] += c.shield_score

    # Compute averages
    monthly_data = []
    for m in sorted(monthly_stats.keys()):
        count = monthly_stats[m]["complaints"]
        avg = round(monthly_stats[m]["risk_score_avg"] / count, 1) if count > 0 else 0
        monthly_data.append({
            "month": monthly_stats[m]["month"],
            "complaints": count,
            "risk_score_avg": avg
        })

    return {
        "scorecard": {
            "frauds_prevented": prevented_frauds,
            "money_saved": potential_saved,
            "alerts_generated": critical_threats + high_threats,
            "families_identified": families_count,
            "reports_processed": total_complaints,
            "success_rate": investigation_success
        },
        "categories": formatted_categories,
        "districts": formatted_districts,
        "monthly_evolution": monthly_data
    }

@router.post("/", response_model=schemas.ComplaintResponse)
def create_complaint(complaint_in: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    # 1. Classify type based on keywords
    text = complaint_in.description
    text_lower = text.lower()
    
    scam_type = "UPI Payment Fraud"
    if "arrest" in text_lower or "cbi" in text_lower or "police" in text_lower or "customs" in text_lower:
        scam_type = "Digital Arrest Scam"
    elif "whatsapp" in text_lower:
        scam_type = "WhatsApp Impersonation"
    elif "sms" in text_lower or "smishing" in text_lower:
        scam_type = "SMS Smishing"
    elif "phishing" in text_lower or "email" in text_lower or "click the link" in text_lower:
        scam_type = "Email Phishing"
    elif "voice" in text_lower or "clone" in text_lower or "husband" in text_lower or "daughter" in text_lower:
        scam_type = "AI Voice Clone scam"
    elif "custom" in text_lower or "cargo" in text_lower:
        scam_type = "Fake Custom Cargo"
    elif "stock" in text_lower or "invest" in text_lower:
        scam_type = "Investment Advisory Group"

    # 2. Entity Extraction
    entities = ai_engine.extract_entities(text)
    
    # Register entities in DB
    for p in entities["phones"]:
        ent = db.query(models.FraudEntity).filter(models.FraudEntity.entity_type == "Phone", models.FraudEntity.entity_value == p).first()
        if ent:
            ent.reported_count += 1
        else:
            db.add(models.FraudEntity(entity_type="Phone", entity_value=p, risk_score=random_risk(), reported_count=1))
            
    for u in entities["upis"]:
        ent = db.query(models.FraudEntity).filter(models.FraudEntity.entity_type == "UPI", models.FraudEntity.entity_value == u).first()
        if ent:
            ent.reported_count += 1
        else:
            db.add(models.FraudEntity(entity_type="UPI", entity_value=u, risk_score=random_risk(), reported_count=1))
    db.commit()

    # 3. Match / Classify Fraud DNA
    match_result = dna_engine.match_fraud_family(db, text, entities, scam_type)
    family = match_result["family"]
    dna_card = match_result["dna_card"]
    
    # Save DNA fingerprint
    dna = models.FraudDNA(
        fraud_family_id=family.id,
        scam_signature=dna_card["scam_signature"],
        threat_profile=dna_card["threat_profile"],
        modus_operandi=dna_card["modus_operandi"],
        language_pattern=dna_card["language_pattern"],
        payment_pattern=dna_card["payment_pattern"],
        victim_pattern=dna_card["victim_pattern"],
        confidence_score=dna_card["confidence_score"]
    )
    db.add(dna)
    db.commit()
    db.refresh(dna)

    # 4. Score risk
    shield_score = ai_engine.calculate_shield_score(text, has_audio=bool(complaint_in.audio_url))
    level = "Safe"
    if shield_score > 80:
        level = "Critical"
    elif shield_score > 60:
        level = "High Risk"
    elif shield_score > 40:
        level = "Medium Risk"
    elif shield_score > 20:
        level = "Low Risk"

    # 5. Create Complaint record
    complaint = models.Complaint(
        citizen_name=complaint_in.citizen_name or "Anonymous",
        citizen_phone=complaint_in.citizen_phone,
        description=text,
        audio_url=complaint_in.audio_url,
        image_url=complaint_in.image_url,
        status="Pending",
        shield_score=shield_score,
        threat_level=level,
        fraud_dna_id=dna.id
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # 6. Push to local Graph Database Fallback representation
    comp_node_label = f"Ref-{complaint.id}"
    
    # Add Nodes
    graph_service.add_node(db, "Complaint", comp_node_label, {"shield_score": shield_score, "level": level})
    graph_service.add_node(db, "Fraud Family", family.family_code, {"name": family.name, "scam_type": family.main_scam_type})
    
    if complaint_in.citizen_name:
        graph_service.add_node(db, "Victim", complaint_in.citizen_name)
        # Link Complaint to Victim
        graph_service.add_edge(db, "Complaint", comp_node_label, "Victim", complaint_in.citizen_name, "REPORTED_BY")
    
    # Link Complaint to Family
    graph_service.add_edge(db, "Complaint", comp_node_label, "Fraud Family", family.family_code, "PART_OF_FAMILY")

    for p in entities["phones"]:
        graph_service.add_node(db, "Phone", p)
        graph_service.add_edge(db, "Complaint", comp_node_label, "Phone", p, "LINKED_TO")
        graph_service.add_edge(db, "Phone", p, "Fraud Family", family.family_code, "CONNECTED_TO")

    for u in entities["upis"]:
        graph_service.add_node(db, "UPI", u)
        graph_service.add_edge(db, "Complaint", comp_node_label, "UPI", u, "LINKED_TO")
        graph_service.add_edge(db, "UPI", u, "Fraud Family", family.family_code, "CONNECTED_TO")

    return complaint

@router.get("/{complaint_id}", response_model=schemas.ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

def random_risk():
    import random
    return random.randint(40, 95)
