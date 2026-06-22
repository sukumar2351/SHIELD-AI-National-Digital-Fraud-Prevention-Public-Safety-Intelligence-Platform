from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import io
import json
from app.database import get_db
from app import models, schemas, security
from app.services.investigator_agent import investigator_agent

router = APIRouter()



# We define small pydantic models locally since they are specific to this route
from pydantic import BaseModel
class ComplaintIdPayload(BaseModel):
    complaint_id: int

class CaseIdPayload(BaseModel):
    case_id: int

@router.post("/investigation/analyze", response_model=schemas.InvestigationResponse)
def trigger_case_investigation(
    payload: ComplaintIdPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Triggers the Autonomous Investigation Agent workflow for the specified complaint.
    Returns the Case ID and reasoning logs.
    """
    # Verify complaint exists
    complaint = db.query(models.Complaint).filter(models.Complaint.id == payload.complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    try:
        investigation = investigator_agent.conduct_investigation(db, payload.complaint_id, current_user.id)
        return investigation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/investigation/{case_id}", response_model=schemas.InvestigationResponse)
def get_case_details(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Returns primary metrics of the investigation case.
    """
    investigation = db.query(models.Investigation).filter(models.Investigation.id == case_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation case docket not found.")
    return investigation

@router.get("/investigation/report/{case_id}")
def get_case_report(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Returns the comprehensive Investigation Report including Executive Summary and Risk Assessment.
    """
    investigation = db.query(models.Investigation).filter(models.Investigation.id == case_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation case docket not found.")

    comp = investigation.complaint
    scam_type = "UPI Payment Fraud"
    if comp.fraud_dna and comp.fraud_dna.family:
        scam_type = comp.fraud_dna.family.main_scam_type

    # Format suspects and timelines
    suspects_list = []
    if investigation.suspects:
        try: suspects_list = json.loads(investigation.suspects)
        except: pass
        
    timeline_list = []
    if investigation.timeline:
        try: timeline_list = json.loads(investigation.timeline)
        except: pass

    # Format graph nodes
    network_nodes_count = 0
    if investigation.network_nodes:
        try:
            nodes_data = json.loads(investigation.network_nodes)
            network_nodes_count = len(nodes_data.get("nodes", []))
        except:
            pass

    return {
        "case_id": investigation.id,
        "complaint_id": comp.id,
        "executive_summary": f"This case dossier tracks a {scam_type} target campaign filed on {comp.created_at.strftime('%Y-%m-%d')}.",
        "key_findings": investigation.findings or "Evidence points to organized syndicate rings.",
        "connected_entities": suspects_list,
        "fraud_family": comp.fraud_dna.family.name if (comp.fraud_dna and comp.fraud_dna.family) else "Unknown Syndicate",
        "risk_assessment": {
            "threat_level": comp.threat_level,
            "priority": "Critical" if comp.threat_level == "Critical" else "High" if comp.threat_level == "High Risk" else "Medium",
            "victim_impact_score": min(comp.shield_score + 10, 100),
            "network_infrastructure_scale": network_nodes_count
        },
        "recommended_actions": [
            "Dispense NPCI block request for linked financial nodes.",
            "Dispatch telecommunication block requests for burner eSIM targets.",
            "Export drafted First Information Report (FIR) to state cyber crime units."
        ],
        "timelines": timeline_list
    }

@router.post("/fir/generate")
def compile_fir(
    payload: CaseIdPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Compiles or updates the FIR draft text for the given Investigation Case ID.
    """
    investigation = db.query(models.Investigation).filter(models.Investigation.id == payload.case_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation case docket not found.")

    comp = investigation.complaint
    scam_type = comp.fraud_dna.family.main_scam_type if (comp.fraud_dna and comp.fraud_dna.family) else "UPI Payment Fraud"
    legal = investigator_agent.map_legal_sections(scam_type)

    return {
        "case_id": investigation.id,
        "complaint_id": comp.id,
        "status": "FIR Compiled",
        "fir_draft": investigation.fir_draft,
        "legal_mapping": {
            "bns_sections": legal["bns_sections"],
            "it_sections": legal["it_sections"]
        }
    }

@router.get("/fir/{case_id}")
def get_compiled_fir(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Retrieves the compiled FIR draft and legal references for the given Investigation Case ID.
    """
    investigation = db.query(models.Investigation).filter(models.Investigation.id == case_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation case docket not found.")

    comp = investigation.complaint
    scam_type = comp.fraud_dna.family.main_scam_type if (comp.fraud_dna and comp.fraud_dna.family) else "UPI Payment Fraud"
    legal = investigator_agent.map_legal_sections(scam_type)

    return {
        "fir_draft": investigation.fir_draft,
        "legal_mapping": {
            "bns_sections": legal["bns_sections"],
            "it_sections": legal["it_sections"]
        }
    }

@router.get("/fir/{case_id}/export")
def export_fir_document(
    case_id: int,
    format: str = Query("json", description="Export format: json, pdf, docx"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Generates and downloads the FIR document in JSON, PDF (plain text format), or DOCX (MS Word text format) exports.
    """
    investigation = db.query(models.Investigation).filter(models.Investigation.id == case_id).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation case docket not found.")

    # JSON export
    if format == "json":
        data = {
            "case_id": investigation.id,
            "fir_text": investigation.fir_draft,
            "timestamp": datetime.datetime.now().isoformat()
        }
        bio = io.BytesIO(json.dumps(data, indent=2).encode())
        return StreamingResponse(
            bio,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=FIR-CASE-{case_id}.json"}
        )

    # PDF or DOCX plain text format download
    filename = f"FIR-CASE-{case_id}.pdf" if format == "pdf" else f"FIR-CASE-{case_id}.docx"
    media = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    # Construct download content bytes
    content = f"""==================================================
SHIELD FIOS OFFICIAL RECORD - LEGAL TRANSCRIPT
==================================================
EXPORT FORMAT: {format.upper()}
DATE COMPILED: {datetime.datetime.now().strftime('%Y-%m-%d')}

{investigation.fir_draft}
"""
    bio = io.BytesIO(content.encode())
    return StreamingResponse(
        bio,
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
