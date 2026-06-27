from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[str] = "Citizen"

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    google_id: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

# Fraud Family Schemas
class FraudFamilyResponse(BaseModel):
    id: int
    family_code: str
    name: str
    main_scam_type: str
    description: Optional[str] = None
    traits: Optional[str] = None
    risk_level: str
    risk_score: int
    created_at: datetime

    class Config:
        from_attributes = True

# Fraud Signature Schemas
class FraudSignatureResponse(BaseModel):
    id: int
    dna_id: int
    signature_hash: str
    constructed_features: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Fraud Family Membership Schemas
class FraudFamilyMembershipResponse(BaseModel):
    id: int
    family_id: int
    complaint_id: int
    dna_id: int
    confidence: float
    joined_at: datetime
    family: Optional[FraudFamilyResponse] = None

    class Config:
        from_attributes = True

# Fraud DNA Schemas
class FraudDNAResponse(BaseModel):
    id: int
    complaint_id: int
    communication_dna: Optional[str] = None
    financial_dna: Optional[str] = None
    behavioral_dna: Optional[str] = None
    language_dna: Optional[str] = None
    geo_dna: Optional[str] = None
    risk_score: int
    confidence_score: float
    created_at: datetime
    signature: Optional[FraudSignatureResponse] = None
    membership: Optional[FraudFamilyMembershipResponse] = None

    class Config:
        from_attributes = True

# Complaint Schemas
class ComplaintCreate(BaseModel):
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    description: str
    audio_url: Optional[str] = None
    image_url: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None
    description: str
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    shield_score: int
    threat_level: str
    created_at: datetime
    fraud_dna: Optional[FraudDNAResponse] = None
    family_membership: Optional[FraudFamilyMembershipResponse] = None

    class Config:
        from_attributes = True

# Fraud Entity Schemas
class FraudEntityResponse(BaseModel):
    id: int
    entity_type: str
    entity_value: str
    risk_score: int
    reported_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# DNA Specific Requests/Responses
class DNAAnalysisRequest(BaseModel):
    description: str
    citizen_name: Optional[str] = None
    citizen_phone: Optional[str] = None

class DNAAnalysisResponse(BaseModel):
    scam_signature: str
    confidence: float
    fraud_family: str
    traits: List[str]
    dimensions: Dict[str, str]

class RelatedCaseResponse(BaseModel):
    target_complaint_id: int
    similar_cases_count: int
    matches: List[Dict[str, Any]]

class DNAStatisticsResponse(BaseModel):
    total_analyzed: int
    confidence_average: float
    family_distribution: Dict[str, int]
    dimension_summaries: Dict[str, Dict[str, int]]

# Investigation Schemas
class InvestigationResponse(BaseModel):
    id: int
    complaint_id: int
    investigator_id: Optional[int] = None
    status: str
    reasoning_logs: Optional[str] = None
    suspects: Optional[str] = None
    network_nodes: Optional[str] = None
    timeline: Optional[str] = None
    findings: Optional[str] = None
    fir_draft: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Graph Schemas
class GraphNodeResponse(BaseModel):
    id: int
    node_type: str
    node_label: str
    properties: Optional[str] = None

    class Config:
        from_attributes = True

class GraphEdgeResponse(BaseModel):
    id: int
    source_node_type: str
    source_node_label: str
    target_node_type: str
    target_node_label: str
    relation_type: str
    properties: Optional[str] = None

    class Config:
        from_attributes = True

class GraphDataResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

# Multilingual Copilot Schemas
class CopilotRequest(BaseModel):
    message: str
    language: Optional[str] = "English"

class CopilotResponse(BaseModel):
    risk_assessment: str
    safety_guidance: str
    reporting_steps: str
    language: str
    translated_reply: str

class GoogleLoginRequest(BaseModel):
    id_token: str
