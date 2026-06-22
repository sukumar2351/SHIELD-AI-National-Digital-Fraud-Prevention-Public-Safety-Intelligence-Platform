import unittest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path so tests can import from app
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database import Base
from app import models
from app.services.dna_engine import dna_engine
from app.services.ai_engine import ai_engine

class TestDNAEngine(unittest.TestCase):
    def setUp(self):
        # Create in-memory SQLite database for test execution isolation
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()
        
        # Populate minimal seed data for matching tests
        self.family = models.FraudFamily(
            family_code="DIGITAL_ARREST_2026_001",
            name="CBI Custom Arrest Syndicate",
            main_scam_type="Digital Arrest Scam",
            description="Fake CBI police officers intimidating victims",
            traits="Fake CBI, UPI Collection, Telugu, Andhra Pradesh, Urgency",
            risk_level="Critical"
        )
        self.db.add(self.family)
        self.db.commit()
        self.db.refresh(self.family)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_dna_dimension_extraction(self):
        """
        Test that dimensions (Comm, Fin, Behav, Lang, Geo) are correctly extracted from a text payload.
        """
        text = "నమస్కారం, I am CBI officer Shinde calling from Delhi Customs. You have an illegal parcel of drugs. Pay Rs 45000 immediately to verify or face jail."
        entities = {"phones": ["+919876543210"], "upis": ["verify@okaxis"], "emails": [], "urls": []}
        
        dims = dna_engine.extract_dna_dimensions(text, entities)
        
        self.assertEqual(dims["communication_dna"], "Fake CBI")
        self.assertEqual(dims["financial_dna"], "UPI Collection")
        self.assertIn("Urgency", dims["behavioral_dna"])
        self.assertIn("Fear", dims["behavioral_dna"])
        self.assertEqual(dims["language_dna"], "Telugu")
        self.assertIn(dims["geo_dna"], ["Andhra Pradesh", "Telangana"])

    def test_signature_generation(self):
        """
        Test that signature generator constructs a formatted hash-prefix string.
        """
        text = "Some fraud scam text"
        scam_type = "Digital Arrest Scam"
        entities = {"phones": ["+919876543210"], "upis": ["mule@okaxis"]}
        dims = {
            "communication_dna": "Fake Police",
            "financial_dna": "UPI Collection",
            "behavioral_dna": "Urgency",
            "language_dna": "Hindi",
            "geo_dna": "Haryana (Mewat)"
        }
        
        signature = dna_engine.generate_signature(text, scam_type, entities, dims)
        
        # Verify structure prefix: DNA-[Prefix]-[Hash]-2026
        self.assertTrue(signature.startswith("DNA-DAS-"))
        self.assertTrue(signature.endswith("-2026"))
        self.assertEqual(len(signature), 21)  # DNA-(3) + DAS(3) + HASH(8) + 2026(4) + 3 dashes = 21 characters

    def test_family_assignment_and_confidence(self):
        """
        Test that incoming dimensions correctly match existing families,
        and assign correct confidence scores.
        """
        # Exact match traits
        dims = {
            "communication_dna": "Fake CBI",
            "financial_dna": "UPI Collection",
            "behavioral_dna": "Urgency, Fear",
            "language_dna": "Telugu",
            "geo_dna": "Andhra Pradesh"
        }
        scam_type = "Digital Arrest Scam"
        
        family, confidence = dna_engine.match_fraud_family(self.db, dims, scam_type)
        
        self.assertEqual(family.family_code, "DIGITAL_ARREST_2026_001")
        self.assertGreaterEqual(confidence, 0.90)  # High matching traits

    def test_similarity_scoring_and_relations(self):
        """
        Test that related cases are correctly correlated based on shared entities and DNA indicators.
        """
        # Create Complaint A
        complaint_a = models.Complaint(
            citizen_name="Sukumar Reddy",
            description="CBI officer drug threat with UPI verify@okaxis (Ref: #1)",
            shield_score=94,
            threat_level="Critical"
        )
        self.db.add(complaint_a)
        self.db.commit()
        self.db.refresh(complaint_a)
        
        # Set DNA for Complaint A
        dna_a = models.FraudDNA(
            complaint_id=complaint_a.id,
            communication_dna="Fake CBI",
            financial_dna="UPI Collection",
            geo_dna="Andhra Pradesh",
            language_dna="Telugu",
            risk_score=94,
            confidence_score=0.94
        )
        self.db.add(dna_a)
        
        membership_a = models.FraudFamilyMembership(
            family_id=self.family.id,
            complaint_id=complaint_a.id,
            dna_id=1,
            confidence=0.94
        )
        self.db.add(membership_a)
        self.db.commit()
        
        # Create Complaint B (Similar)
        complaint_b = models.Complaint(
            citizen_name="Aarav Sharma",
            description="Another CBI scam case using UPI verify@okaxis (Ref: #2)",
            shield_score=90,
            threat_level="Critical"
        )
        self.db.add(complaint_b)
        self.db.commit()
        self.db.refresh(complaint_b)
        
        # Set DNA for Complaint B
        dna_b = models.FraudDNA(
            complaint_id=complaint_b.id,
            communication_dna="Fake CBI",
            financial_dna="UPI Collection",
            geo_dna="Andhra Pradesh",
            language_dna="Telugu",
            risk_score=90,
            confidence_score=0.90
        )
        self.db.add(dna_b)
        
        membership_b = models.FraudFamilyMembership(
            family_id=self.family.id,
            complaint_id=complaint_b.id,
            dna_id=2,
            confidence=0.90
        )
        self.db.add(membership_b)
        self.db.commit()
        
        # Run similarity query from Complaint A
        similar = dna_engine.find_similar_cases(self.db, complaint_a)
        
        self.assertEqual(len(similar), 1)
        self.assertEqual(similar[0]["complaint_id"], complaint_b.id)
        self.assertGreaterEqual(similar[0]["similarity_score"], 80)
        self.assertIn("Same Fraud Family Cluster", similar[0]["reasons"])
        self.assertIn("Matching UPI: verify@okaxis", similar[0]["reasons"])

if __name__ == "__main__":
    unittest.main()
