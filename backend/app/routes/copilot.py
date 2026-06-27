from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.database import get_db
from app.services.copilot_service import copilot_service

router = APIRouter()

# Pydantic schemas for requests and responses
class CopilotChatRequest(BaseModel):
    message: str
    language: Optional[str] = None

class CopilotChatResponse(BaseModel):
    risk_assessment: str
    threat_explanation: str
    safety_advice: str
    reporting_instructions: str
    immediate_actions: str
    language: str

class CopilotAnalyzeRequest(BaseModel):
    text: str
    language: Optional[str] = None

class CopilotAnalyzeResponse(BaseModel):
    shield_score: int
    threat_level: str
    fraud_family: str
    risk_assessment: str
    safety_guidance: str
    immediate_actions: str

class CopilotFamilyAwarenessResponse(BaseModel):
    family_code: str
    name: str
    description: str
    victims_affected: int
    risk_level: str
    user_explanation: str

class PreventionTip(BaseModel):
    category: str
    tip: str
    regional_translations: Dict[str, str]

@router.post("/chat", response_model=CopilotChatResponse)
def copilot_chat(
    payload: CopilotChatRequest,
    db: Session = Depends(get_db)
):
    """
    POST /copilot/chat
    Process a chat message from a citizen and return multi-stage safety guidance.
    Auto-detects language if not supplied by the client.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be blank.")
        
    guidance = copilot_service.build_chat_response(
        complaint_text=payload.message,
        language=payload.language,
        db=db
    )
    return guidance

@router.post("/analyze", response_model=CopilotAnalyzeResponse)
def copilot_analyze(
    payload: CopilotAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """
    POST /copilot/analyze
    Analyzes potential scam complaints, matches them to Fraud DNA signature profiles,
    and returns threat level, matched fraud family, and safety recommendations.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text content cannot be blank.")
        
    analysis = copilot_service.analyze_risk(
        text=payload.text,
        db=db,
        language=payload.language
    )
    return analysis

@router.get("/family-awareness/{family_id}", response_model=CopilotFamilyAwarenessResponse)
def get_family_awareness(
    family_id: int,
    language: Optional[str] = "English",
    db: Session = Depends(get_db)
):
    family = db.query(models.FraudFamily).filter(models.FraudFamily.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Fraud family ID reference not found.")
        
    victims_affected = db.query(models.FraudFamilyMembership).filter(models.FraudFamilyMembership.family_id == family_id).count()
    
    family_dict = {
        "name": family.name,
        "main_scam_type": family.main_scam_type,
        "family_code": family.family_code
    }
    explanation = copilot_service.explain_fraud_family(family_dict, language)
    
    return {
        "family_code": family.family_code,
        "name": family.name,
        "description": family.description or "",
        "victims_affected": victims_affected,
        "risk_level": family.risk_level,
        "user_explanation": explanation
    }

@router.get("/prevention-tips", response_model=List[PreventionTip])
def get_prevention_tips(language: Optional[str] = "en"):
    """
    GET /copilot/prevention-tips
    Returns cybersecurity safety prevention tips with multi-language regional translations.
    """
    tips = copilot_service.generate_prevention_tips(language or "en")
    # Convert plain strings to PreventionTip-compatible dicts
    result = []
    for i, tip in enumerate(tips):
        result.append({
            "category": ["Digital Arrest", "UPI Security", "Phishing"][i % 3],
            "tip": tip,
            "regional_translations": {language or "en": tip}
        })
    return result
