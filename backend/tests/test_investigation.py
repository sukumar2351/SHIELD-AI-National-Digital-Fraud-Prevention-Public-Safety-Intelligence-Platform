import unittest
import os
import sys
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path so tests can import from app
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database import Base
from app import models
from app.services.investigator_agent import investigator_agent
from app.services.dna_engine import dna_engine

class TestInvestigationAgent(unittest.TestCase):
    def setUp(self):
        # Create in-memory SQLite database for test execution isolation
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()
        
        # Populate minimal seed data
        self.family = models.FraudFamily(
            family_code="DIGITAL_ARREST_2026_001",
            name="CBI Custom Arrest Syndicate",
            main_scam_type="Digital Arrest Scam",
            description="Fake CBI police officers accusing victims",
            traits="Fake CBI, UPI Collection, Telugu, Andhra Pradesh, Urgency",
            risk_level="Critical"
        )
        self.db.add(self.family)
        
        # Create Complaint
        self.complaint = models.Complaint(
            citizen_name="Sukumar Reddy",
            citizen_phone="+919848022338",
            description="Got call from fake CBI officer using phone +919876543210 accusing me of drug cargo. Forced me to pay 45000 to UPI cbi.verify@okaxis.",
            shield_score=94,
            threat_level="Critical"
        )
        self.db.add(self.complaint)
        self.db.commit()
        self.db.refresh(self.family)
        self.db.refresh(self.complaint)

        # Set up DNA and Family Membership
        self.dna = models.FraudDNA(
            complaint_id=self.complaint.id,
            communication_dna="Fake CBI",
            financial_dna="UPI Collection",
            behavioral_dna="Urgency, Fear, Isolation",
            language_dna="Telugu",
            geo_dna="Andhra Pradesh",
            risk_score=94,
            confidence_score=0.94
        )
        self.db.add(self.dna)
        
        self.membership = models.FraudFamilyMembership(
            family_id=self.family.id,
            complaint_id=self.complaint.id,
            dna_id=1,
            confidence=0.94
        )
        self.db.add(self.membership)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_investigation_workflow_trigger(self):
        """
        Tests that triggering an investigation compiles all stages successfully and registers it.
        """
        case = investigator_agent.conduct_investigation(self.db, self.complaint.id)
        
        self.assertIsNotNone(case.id)
        self.assertEqual(case.complaint_id, self.complaint.id)
        self.assertEqual(case.status, "Active")
        self.assertEqual(self.complaint.status, "Under Investigation")
        
        # Verify reasoning logs contain all 8 stages
        logs = json.loads(case.reasoning_logs)
        stages = [log["step"] for log in logs]
        self.assertIn("Evidence Collection", stages)
        self.assertIn("Entity Extraction", stages)
        self.assertIn("Fraud DNA Analysis", stages)
        self.assertIn("Graph Network Expansion", stages)
        self.assertIn("Threat Assessment", stages)
        self.assertIn("Recommendation Generation", stages)
        self.assertIn("Investigation Summary", stages)

    def test_threat_assessment_calculations(self):
        """
        Tests that threat metrics (Victim Impact, Priority) are correctly calculated.
        """
        case = investigator_agent.conduct_investigation(self.db, self.complaint.id)
        
        # Priority level should map to Critical due to Critical threat level
        logs = json.loads(case.reasoning_logs)
        behav_log = next(log for log in logs if log["step"] == "Threat Assessment")
        self.assertIn("Priority=Critical", behav_log["desc"])
        self.assertIn("Victim Impact=100", behav_log["desc"])

    def test_timeline_generation(self):
        """
        Tests that structured timelines (Incident, Victim, Network, etc.) are compiled.
        """
        case = investigator_agent.conduct_investigation(self.db, self.complaint.id)
        timeline = json.loads(case.timeline)
        
        types = [t["timeline_type"] for t in timeline]
        self.assertIn("Incident", types)
        self.assertIn("Victim", types)
        self.assertIn("Network", types)

    def test_legal_mapping(self):
        """
        Tests that the legal mapper correctly aligns BNS and IT Act sections to scam categories.
        """
        legal_arrest = investigator_agent.map_legal_sections("Digital Arrest Scam")
        self.assertIn("Section 204 (Impersonating a public servant)", legal_arrest["bns_sections"])
        self.assertIn("Section 66D (Cheating by personation using computer resource)", legal_arrest["it_sections"])

        legal_phishing = investigator_agent.map_legal_sections("Email Phishing")
        self.assertIn("Section 319 (Cheating by personation)", legal_phishing["bns_sections"])

    def test_fir_draft_compilation(self):
        """
        Tests that the compiled FIR draft text contains the required legal sections and suspects.
        """
        case = investigator_agent.conduct_investigation(self.db, self.complaint.id)
        
        self.assertIsNotNone(case.fir_draft)
        self.assertIn("FIRST INFORMATION REPORT", case.fir_draft)
        self.assertIn("Section 204", case.fir_draft)
        self.assertIn("DIGITAL_ARREST_2026_001", case.fir_draft)
        self.assertIn("+919876543210", case.fir_draft)
        self.assertIn("cbi.verify@okaxis", case.fir_draft)

if __name__ == "__main__":
    unittest.main()
