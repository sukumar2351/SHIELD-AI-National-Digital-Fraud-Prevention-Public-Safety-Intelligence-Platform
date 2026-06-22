import unittest
import os
import sys
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Setup path so tests can import from app
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database import Base, get_db
from app import models
from app.main import app
from app.services.geospatial_service import geospatial_service

# Global variable to share db session with FastAPI override
test_db_session = None

def override_get_db():
    yield test_db_session

app.dependency_overrides[get_db] = override_get_db

class TestGeospatialIntelligence(unittest.TestCase):
    def setUp(self):
        global test_db_session
        self.db_file = "test_geospatial_temp.db"
        if os.path.exists(self.db_file):
            try:
                os.remove(self.db_file)
            except:
                pass

        # Create temporary SQLite database for testing isolation
        self.engine = create_engine(f"sqlite:///{self.db_file}", connect_args={"check_same_thread": False})
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()
        test_db_session = self.db

        # 1. Populate mock database seed data
        self.user = models.User(
            username="test_officer",
            email="test.officer@shield.gov.in",
            hashed_password="hashed_pwd",
            role="Investigator"
        )
        self.db.add(self.user)

        self.family = models.FraudFamily(
            family_code="DIGITAL_ARREST_2026_001",
            name="CBI Custom Arrest Syndicate",
            main_scam_type="Digital Arrest Scam",
            description="Fake CBI police officers accusing victims",
            traits="Fake CBI, UPI Collection, Telugu, Jamtara, Urgency",
            risk_level="Critical"
        )
        self.db.add(self.family)
        self.db.commit()

        # Seed FraudEntity of type District
        self.entity_jamtara = models.FraudEntity(
            entity_type="District",
            entity_value="Jamtara (Jharkhand)",
            risk_score=94,
            reported_count=45
        )
        self.entity_nuh = models.FraudEntity(
            entity_type="District",
            entity_value="Nuh (Haryana)",
            risk_score=90,
            reported_count=32
        )
        self.db.add(self.entity_jamtara)
        self.db.add(self.entity_nuh)
        self.db.commit()

        # Seed Complaints linked to Jamtara
        self.complaint_1 = models.Complaint(
            citizen_name="Sukumar Reddy",
            description="Got call from fake CBI officer. Forced to pay Rs 35000 to verify account.",
            shield_score=94,
            threat_level="Critical",
            created_at=datetime.datetime.utcnow()
        )
        self.db.add(self.complaint_1)
        self.db.commit()

        # Add FraudDNA
        self.dna_1 = models.FraudDNA(
            complaint_id=self.complaint_1.id,
            communication_dna="Fake CBI",
            financial_dna="UPI Collection",
            behavioral_dna="Urgency, Fear",
            language_dna="Telugu",
            geo_dna="Jharkhand (Jamtara)",
            risk_score=94,
            confidence_score=0.94
        )
        self.db.add(self.dna_1)
        
        self.membership_1 = models.FraudFamilyMembership(
            family_id=self.family.id,
            complaint_id=self.complaint_1.id,
            dna_id=1,
            confidence=0.94
        )
        self.db.add(self.membership_1)
        self.db.commit()

        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        if os.path.exists(self.db_file):
            try:
                os.remove(self.db_file)
            except:
                pass

    def test_geospatial_seeding_and_sync(self):
        """
        Tests that sync_database_if_empty populates State and District tables correctly.
        """
        geospatial_service.sync_database_if_empty(self.db)

        # Check states count (Jharkhand and Haryana should exist)
        states = self.db.query(models.State).all()
        state_names = [s.name for s in states]
        self.assertIn("Jharkhand", state_names)
        self.assertIn("Haryana", state_names)

        # Check districts
        districts = self.db.query(models.District).all()
        district_names = [d.name for d in districts]
        self.assertIn("Jamtara", district_names)
        self.assertIn("Nuh", district_names)

        # Check coordinates mapped for Jamtara
        jamtara = self.db.query(models.District).filter(models.District.name == "Jamtara").first()
        self.assertEqual(jamtara.latitude, 23.9620)
        self.assertEqual(jamtara.longitude, 86.8029)

    def test_density_and_hotspot_calculations(self):
        """
        Tests that density score calculations map correctly to hotspots.
        """
        geospatial_service.sync_database_if_empty(self.db)
        
        # Jamtara should have 1 complaint and loss amount of 35000.0
        jamtara = self.db.query(models.District).filter(models.District.name == "Jamtara").first()
        density = self.db.query(models.FraudDensity).filter(models.FraudDensity.district_id == jamtara.id).first()
        
        self.assertIsNotNone(density)
        self.assertEqual(density.complaints_count, 1)
        self.assertEqual(density.total_loss_amount, 35000.0)
        # Score formula: count * 2.0 + (total_loss / 100000.0) -> 2.0 + 0.35 = 2.35
        self.assertEqual(density.density_score, 2.35)

        # Hotspot check
        hotspots = geospatial_service.detect_hotspots(self.db)
        # Jamtara has high risk_score (94), so it should be detected as a hotspot
        self.assertGreater(len(hotspots), 0)
        self.assertEqual(hotspots[0]["district"], "Jamtara")

    def test_rankings(self):
        """
        Tests that district and state risk rankings prioritize highest metrics.
        """
        geospatial_service.sync_database_if_empty(self.db)

        # Jamtara should rank higher than Nuh because it has 1 complaint
        ranked_districts = geospatial_service.rank_districts(self.db, limit=5)
        self.assertEqual(ranked_districts[0]["district"], "Jamtara")
        self.assertGreater(ranked_districts[0]["risk_score"], ranked_districts[1]["risk_score"])

        # State ranking check (Jharkhand should rank higher due to Jamtara)
        ranked_states = geospatial_service.rank_states(self.db)
        self.assertEqual(ranked_states[0]["state"], "Jharkhand")

    def test_family_spread(self):
        """
        Tests that the geographical spread maps to active districts.
        """
        geospatial_service.sync_database_if_empty(self.db)

        spread = geospatial_service.get_family_spread(self.db, self.family.id)
        self.assertEqual(spread["family_code"], "DIGITAL_ARREST_2026_001")
        self.assertEqual(spread["total_active_complaints"], 1)
        self.assertEqual(spread["spread"][0]["district"], "Jamtara")
        self.assertEqual(spread["spread"][0]["concentration_percentage"], 100.0)

    def test_endpoints(self):
        """
        Verifies API responses for geospatial GET routes.
        """
        geospatial_service.sync_database_if_empty(self.db)

        # 1. GET /api/v1/geospatial/overview
        response = self.client.get("/api/v1/geospatial/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_districts"], 2)
        self.assertEqual(data["total_states"], 2)
        self.assertEqual(data["top_high_risk_district"], "Jamtara")

        # 2. GET /api/v1/geospatial/hotspots
        response = self.client.get("/api/v1/geospatial/hotspots")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data), 0)
        self.assertEqual(data[0]["district"], "Jamtara")

        # 3. GET /api/v1/geospatial/districts
        response = self.client.get("/api/v1/geospatial/districts?limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["district"], "Jamtara")

        # 4. GET /api/v1/geospatial/states
        response = self.client.get("/api/v1/geospatial/states")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data[0]["state"], "Jharkhand")

        # 5. GET /api/v1/geospatial/family-spread/{id}
        response = self.client.get(f"/api/v1/geospatial/family-spread/{self.family.id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["family_code"], "DIGITAL_ARREST_2026_001")
        self.assertEqual(data["spread"][0]["district"], "Jamtara")

        # 6. GET /api/v1/geospatial/family-spread/999 (Not Found)
        response = self.client.get("/api/v1/geospatial/family-spread/999")
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
