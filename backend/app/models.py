import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Citizen")  # Citizen, Investigator, Police, Admin, Agency
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="citizen")
    investigations = relationship("Investigation", back_populates="investigator")
    audit_logs = relationship("AuditLog", back_populates="user")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen_name = Column(String, nullable=True)
    citizen_phone = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    audio_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String, default="Pending")  # Pending, Under Investigation, Resolved
    shield_score = Column(Integer, default=0)
    threat_level = Column(String, default="Safe")  # Safe, Low Risk, Medium Risk, High Risk, Critical
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    citizen = relationship("User", back_populates="complaints")
    investigations = relationship("Investigation", back_populates="complaint")
    
    # Relationships for DNA Engine
    fraud_dna = relationship("FraudDNA", back_populates="complaint", uselist=False)
    family_membership = relationship("FraudFamilyMembership", back_populates="complaint", uselist=False)


class FraudEntity(Base):
    __tablename__ = "fraud_entities"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False)  # Phone, UPI, Email, Website, Bank Account, District
    entity_value = Column(String, unique=True, index=True, nullable=False)
    risk_score = Column(Integer, default=0)
    reported_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class FraudFamily(Base):
    __tablename__ = "fraud_families"

    id = Column(Integer, primary_key=True, index=True)
    family_code = Column(String, unique=True, index=True, nullable=False)  # DIGITAL_ARREST_2026_001
    name = Column(String, nullable=False)
    main_scam_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    traits = Column(Text, nullable=True)  # Comma-separated list of traits
    risk_level = Column(String, default="Medium Risk")  # Low, Medium, High, Critical
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    memberships = relationship("FraudFamilyMembership", back_populates="family")


class FraudDNA(Base):
    __tablename__ = "fraud_dna"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True, nullable=False)
    
    # DNA Dimensions
    communication_dna = Column(String, nullable=True)  # Fake Police, Fake CBI, etc.
    financial_dna = Column(String, nullable=True)      # UPI Collection, Wallet, etc.
    behavioral_dna = Column(String, nullable=True)     # Urgency, Fear, Isolation
    language_dna = Column(String, nullable=True)        # Telugu, Hindi, English
    geo_dna = Column(String, nullable=True)             # Andhra Pradesh, Jharkhand
    
    risk_score = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="fraud_dna")
    signature = relationship("FraudSignature", back_populates="dna", uselist=False)
    membership = relationship("FraudFamilyMembership", back_populates="dna", uselist=False)


class FraudSignature(Base):
    __tablename__ = "fraud_signatures"

    id = Column(Integer, primary_key=True, index=True)
    dna_id = Column(Integer, ForeignKey("fraud_dna.id"), unique=True, nullable=False)
    signature_hash = Column(String, unique=True, index=True, nullable=False)  # Hash of text + indicators
    constructed_features = Column(Text, nullable=True)  # JSON metadata string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dna = relationship("FraudDNA", back_populates="signature")


class FraudFamilyMembership(Base):
    __tablename__ = "fraud_family_memberships"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("fraud_families.id"), nullable=False)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True, nullable=False)
    dna_id = Column(Integer, ForeignKey("fraud_dna.id"), unique=True, nullable=False)
    confidence = Column(Float, default=0.0)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    family = relationship("FraudFamily", back_populates="memberships")
    complaint = relationship("Complaint", back_populates="family_membership")
    dna = relationship("FraudDNA", back_populates="membership")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="Active")  # Active, Closed
    reasoning_logs = Column(Text, nullable=True)  # JSON representation of agent thoughts
    suspects = Column(Text, nullable=True)  # JSON list
    network_nodes = Column(Text, nullable=True)  # JSON network
    timeline = Column(Text, nullable=True)  # JSON list
    findings = Column(Text, nullable=True)
    fir_draft = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="investigations")
    investigator = relationship("User", back_populates="investigations")


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_type = Column(String, nullable=False)  # Phone, UPI, Email, Website, Victim, Fraudster, Complaint, Fraud Family, District
    node_label = Column(String, index=True, nullable=False)
    properties = Column(Text, nullable=True)  # JSON properties


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_node_type = Column(String, nullable=False)
    source_node_label = Column(String, nullable=False)
    target_node_type = Column(String, nullable=False)
    target_node_label = Column(String, nullable=False)
    relation_type = Column(String, nullable=False)  # CONNECTED_TO, LINKED_TO, REPORTED_BY, PART_OF_FAMILY, OWNS
    properties = Column(Text, nullable=True)  # JSON properties


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    risk_score = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    risk_score = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    state = relationship("State", back_populates="districts")
    hotspots = relationship("ThreatHotspot", back_populates="district")
    densities = relationship("FraudDensity", back_populates="district")
    spreads = relationship("FamilySpread", back_populates="district")


class ThreatHotspot(Base):
    __tablename__ = "threat_hotspots"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    intensity = Column(Float, default=0.0)
    growth_rate = Column(Float, default=0.0)
    status = Column(String, default="Emerging")  # Active, Emerging, Declining
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="hotspots")


class FraudDensity(Base):
    __tablename__ = "fraud_densities"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    complaints_count = Column(Integer, default=0)
    total_loss_amount = Column(Float, default=0.0)
    density_score = Column(Float, default=0.0)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="densities")


class FamilySpread(Base):
    __tablename__ = "family_spreads"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("fraud_families.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    active_complaints = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="spreads")
    family = relationship("FraudFamily")

