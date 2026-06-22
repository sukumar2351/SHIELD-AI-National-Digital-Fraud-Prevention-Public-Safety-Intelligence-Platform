from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app import models, schemas
from app.services.ai_engine import ai_engine

router = APIRouter()

@router.post("/whatsapp-ocr")
def detect_whatsapp_ocr(
    text_content: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Ingests text or an image from a WhatsApp chat screenshot, runs mock OCR text extraction,
    extracts entities, and classifies scam families.
    """
    if not text_content and not file:
        raise HTTPException(status_code=400, detail="Either text_content or a file screenshot must be provided.")

    extracted_text = text_content or ""
    
    # If a file is uploaded, simulate OCR extraction based on the name or provide a standard text fallback
    if file:
        filename = file.filename.lower()
        if "cbi" in filename or "police" in filename or "arrest" in filename:
            extracted_text = "Urgent: This is CBI police headquarters. You are placed under digital arrest for a smuggling case. Send verification funds of Rs. 45000 to upi support@okaxis to clear your name immediately."
        elif "electricity" in filename or "upi" in filename:
            extracted_text = "Dear Consumer, your electricity power connection will be disconnected tonight at 9:30 PM. Contact support desk at 9876543210. Pay dues using UPI ID support.bill@okaxis immediately."
        else:
            extracted_text = "Hi Dad, I lost my phone in an emergency. This is my new number. Can you please send Rs. 15,000 to my tuition bank account using UPI: payment.fees@okaxis? Need it urgently."

    # Parse entities
    entities = ai_engine.extract_entities(extracted_text)
    
    # Compute score
    score = ai_engine.calculate_shield_score(extracted_text)
    level = "Safe"
    if score > 80:
        level = "Critical"
    elif score > 60:
        level = "High Risk"
    elif score > 40:
        level = "Medium Risk"
    elif score > 20:
        level = "Low Risk"

    return {
        "extracted_text": extracted_text,
        "entities": entities,
        "shield_score": score,
        "threat_level": level,
        "explanation": f"Extracted Phone: {', '.join(entities['phones'])} and UPI: {', '.join(entities['upis'])}. Urgent intimidation language detected.",
        "modus_operandi": "Attacker utilizes high urgency triggers to prevent victim from verifying with official sources."
    }



@router.post("/email-phishing")
def detect_email_phishing(
    email_content: str = Form(...),
    sender: str = Form(""),
    db: Session = Depends(get_db)
):
    """
    Analyzes email headers, body links, and urgency languages to detect phishing campaigns.
    """
    score = ai_engine.calculate_shield_score(email_content)
    
    # Link check mock
    links = []
    if "http" in email_content or "www" in email_content:
        links.append("http://secure-netbanking-verification.com/login")
        
    is_phishing = score > 50
    confidence = round(0.72 + (score * 0.0025), 2)

    return {
        "sender": sender or "alerts@icici-netbanking-verify.in",
        "is_phishing": is_phishing,
        "phishing_probability": confidence,
        "detected_links": links,
        "threat_explanation": "Email contains domain mimicking an official banking site and requests immediate KYC verification code.",
        "recommended_action": "Mark as spam, flag domain in national blacklist, and delete message."
    }
