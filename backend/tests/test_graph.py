import unittest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path so tests can import from app
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database import Base
from app import models
from app.services.graph_service import graph_service

class TestGraphIntelligence(unittest.TestCase):
    def setUp(self):
        # Create in-memory SQLite database for test execution isolation
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_graph_creation_and_node_adding(self):
        """
        Tests that nodes can be added to the graph with correct properties.
        """
        properties = {"risk": 95, "name": "Fake Police Syndicate"}
        node = graph_service.add_node(self.db, "Fraud Family", "DIGITAL_ARREST_2026_001", properties)
        
        # Verify node properties
        self.assertIsNotNone(node.id)
        self.assertEqual(node.node_type, "Fraud Family")
        self.assertEqual(node.node_label, "DIGITAL_ARREST_2026_001")
        self.assertIn("risk", node.properties)

        # Check node exists in DB
        node_db = self.db.query(models.GraphNode).filter(models.GraphNode.id == node.id).first()
        self.assertIsNotNone(node_db)

    def test_relationship_creation_and_linking(self):
        """
        Tests that relationship edges link source and target nodes correctly.
        """
        edge = graph_service.add_edge(
            self.db,
            source_type="Complaint", source_label="Ref-101",
            target_type="Phone", target_label="+919876543210",
            relation_type="LINKED_TO",
            properties={"timestamp": "2026-06-22"}
        )

        self.assertIsNotNone(edge.id)
        self.assertEqual(edge.source_node_type, "Complaint")
        self.assertEqual(edge.source_node_label, "Ref-101")
        self.assertEqual(edge.target_node_type, "Phone")
        self.assertEqual(edge.target_node_label, "+919876543210")
        self.assertEqual(edge.relation_type, "LINKED_TO")

        # Verify both source and target nodes were auto-created
        src_node = self.db.query(models.GraphNode).filter(
            models.GraphNode.node_type == "Complaint", models.GraphNode.node_label == "Ref-101"
        ).first()
        tgt_node = self.db.query(models.GraphNode).filter(
            models.GraphNode.node_type == "Phone", models.GraphNode.node_label == "+919876543210"
        ).first()

        self.assertIsNotNone(src_node)
        self.assertIsNotNone(tgt_node)

    def test_cluster_discovery(self):
        """
        Tests that we can extract the complete sub-graph representing a specific Fraud Family.
        """
        # Create family, complaints, and phone links
        graph_service.add_edge(self.db, "Complaint", "Ref-101", "Fraud Family", "DIGITAL_ARREST_2026_001", "PART_OF_FAMILY")
        graph_service.add_edge(self.db, "Complaint", "Ref-101", "Phone", "+919876543210", "LINKED_TO")
        graph_service.add_edge(self.db, "Complaint", "Ref-102", "Fraud Family", "DIGITAL_ARREST_2026_001", "PART_OF_FAMILY")

        cluster = graph_service.get_cluster_by_id(self.db, "DIGITAL_ARREST_2026_001")
        
        # Verify sizes
        node_ids = [n["id"] for n in cluster["nodes"]]
        self.assertIn("Fraud Family:DIGITAL_ARREST_2026_001", node_ids)
        self.assertIn("Complaint:Ref-101", node_ids)
        self.assertIn("Complaint:Ref-102", node_ids)
        self.assertIn("Phone:+919876543210", node_ids)
        self.assertEqual(len(cluster["edges"]), 3)

    def test_network_expansion_bfs(self):
        """
        Tests that our BFS network expansion returns all connected entities up to depth R.
        """
        # Set up a chain: Complaint A -> Phone -> Fraudster -> UPI -> Complaint B
        graph_service.add_edge(self.db, "Complaint", "Ref-A", "Phone", "+919876543210", "LINKED_TO")
        graph_service.add_edge(self.db, "Fraudster", "Suspect-99", "Phone", "+919876543210", "OWNS")
        graph_service.add_edge(self.db, "Fraudster", "Suspect-99", "UPI", "mule@okaxis", "OWNS")
        graph_service.add_edge(self.db, "Complaint", "Ref-B", "UPI", "mule@okaxis", "LINKED_TO")

        # Expand from Complaint A with Radius 1 (Should get Complaint A and Phone)
        rad_1 = graph_service.get_network_expansion(self.db, "Complaint", "Ref-A", radius=1)
        node_ids_1 = [n["id"] for n in rad_1["nodes"]]
        self.assertIn("Complaint:Ref-A", node_ids_1)
        self.assertIn("Phone:+919876543210", node_ids_1)
        self.assertNotIn("Fraudster:Suspect-99", node_ids_1)

        # Expand from Complaint A with Radius 2 (Should get up to Fraudster)
        rad_2 = graph_service.get_network_expansion(self.db, "Complaint", "Ref-A", radius=2)
        node_ids_2 = [n["id"] for n in rad_2["nodes"]]
        self.assertIn("Complaint:Ref-A", node_ids_2)
        self.assertIn("Phone:+919876543210", node_ids_2)
        self.assertIn("Fraudster:Suspect-99", node_ids_2)
        self.assertNotIn("UPI:mule@okaxis", node_ids_2)

        # Expand from Complaint A with Radius 4 (Should reach Complaint B)
        rad_4 = graph_service.get_network_expansion(self.db, "Complaint", "Ref-A", radius=4)
        node_ids_4 = [n["id"] for n in rad_4["nodes"]]
        self.assertIn("Complaint:Ref-B", node_ids_4)
        self.assertIn("UPI:mule@okaxis", node_ids_4)

if __name__ == "__main__":
    unittest.main()
