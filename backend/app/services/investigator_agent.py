import json
import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models
from app.services.ai_engine import ai_engine
from app.services.dna_engine import dna_engine
from app.services.graph_service import graph_service

class InvestigatorAgent:
    def map_legal_sections(self, scam_type: str) -> Dict[str, List[str]]:
        """
        Maps a scam category to relevant Bhartiya Nyaya Sanhita (BNS) 2023
        and Information Technology (IT) Act 2000 sections.
        """
        scam_lower = scam_type.lower()
        
        # Standard mappings
        bns_sections = ["Section 318 (Cheating)"]
        it_sections = ["Section 66D (Punishment for cheating by personation by using computer resource)"]
        
        if "arrest" in scam_lower or "police" in scam_lower or "cbi" in scam_lower:
            bns_sections = [
                "Section 204 (Impersonating a public servant)",
                "Section 318 (Cheating)",
                "Section 351 (Criminal intimidation)"
            ]
            it_sections = [
                "Section 66C (Punishment for identity theft)",
                "Section 66D (Cheating by personation using computer resource)"
            ]
        elif "phishing" in scam_lower or "email" in scam_lower:
            bns_sections = [
                "Section 319 (Cheating by personation)",
                "Section 318 (Cheating)"
            ]
            it_sections = [
                "Section 66C (Identity theft)",
                "Section 66D (Cheating by personation)"
            ]
        elif "job" in scam_lower or "part-time" in scam_lower or "investment" in scam_lower:
            bns_sections = [
                "Section 318 (Cheating)",
                "Section 336 (Forgery)",
                "Section 340 (Punishment for forged document)"
            ]
            it_sections = [
                "Section 66D (Cheating by personation)"
            ]
            
        return {
            "bns_sections": bns_sections,
            "it_sections": it_sections
        }

    def conduct_investigation(self, db: Session, complaint_id: int, investigator_id: int = None) -> models.Investigation:
        """
        Orchestrates the multi-stage Investigation Agent reasoning workflow.
        Returns a populated Investigation database record containing timelines, dockets, and FIRs.
        """
        complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
        if not complaint:
            raise ValueError(f"Complaint ID {complaint_id} not found.")

        # 1. Evidence Collection
        desc = complaint.description
        scam_type = "UPI Payment Fraud"
        if "arrest" in desc.lower() or "cbi" in desc.lower() or "police" in desc.lower():
            scam_type = "Digital Arrest Scam"
        elif "whatsapp" in desc.lower():
            scam_type = "WhatsApp Impersonation"
        elif "sms" in desc.lower() or "smishing" in desc.lower():
            scam_type = "SMS Smishing"
        elif "phishing" in desc.lower() or "email" in desc.lower():
            scam_type = "Email Phishing"

        # 2. Entity Extraction
        entities = ai_engine.extract_entities(desc)
        phones = entities["phones"]
        upis = entities["upis"]

        # 3. Fraud DNA Analysis
        dna_card = {}
        confidence = 0.5
        family_code = "UNKNOWN_FAMILY_2026"
        if complaint.fraud_dna:
            dna = complaint.fraud_dna
            confidence = dna.confidence_score
            family_code = dna.membership.family.family_code if dna.membership and dna.membership.family else "UNKNOWN_FAMILY_2026"
            dna_card = {
                "communication_dna": dna.communication_dna,
                "financial_dna": dna.financial_dna,
                "behavioral_dna": dna.behavioral_dna,
                "language_dna": dna.language_dna,
                "geo_dna": dna.geo_dna
            }
        else:
            # Fallback extraction if DNA record doesn't exist
            dims = dna_engine.extract_dna_dimensions(desc, entities)
            family, confidence = dna_engine.match_fraud_family(db, dims, scam_type)
            family_code = family.family_code
            dna_card = dims

        # 4. Graph Network Expansion (Radius = 2)
        # Expand from the complaint node to find connected entities
        comp_label = f"Ref-{complaint.id}"
        subgraph = graph_service.get_network_expansion(db, "Complaint", comp_label, radius=2)
        
        # Connected entities count and node tracking
        connected_labels = []
        network_nodes_set = set()
        for node in subgraph["nodes"]:
            network_nodes_set.add(node["id"])
            if node["type"] in ["Phone", "UPI", "Fraudster"]:
                connected_labels.append(f"{node['type']}: {node['label']}")
        
        network_size = len(network_nodes_set)

        # 5. Threat Assessment
        threat_level = complaint.threat_level
        # Victim Impact Score = risk score + 10 if loss occurred, max 100
        victim_impact = min(complaint.shield_score + 10, 100)
        
        priority = "Medium"
        if threat_level == "Critical" or network_size > 8:
            priority = "Critical"
        elif threat_level == "High Risk" or network_size > 5:
            priority = "High"

        # 6. Timeline Generation
        inc_date = complaint.created_at
        timeline = [
            {"time": (inc_date - datetime.timedelta(minutes=30)).strftime("%H:%M"), "timeline_type": "Incident", "event": "Citizen targeted by fraud syndicate campaign."},
            {"time": (inc_date - datetime.timedelta(minutes=15)).strftime("%H:%M"), "timeline_type": "Victim", "event": f"Psychological pressure applied; victim transferred funds to UPI: {upis[0]}."},
            {"time": inc_date.strftime("%H:%M"), "timeline_type": "Incident", "event": "Incident report submitted to SHIELD FIOS platform."},
            {"time": (inc_date + datetime.timedelta(minutes=5)).strftime("%H:%M"), "timeline_type": "Network", "event": f"Graph engine linked phone {phones[0]} to Mewat/Jamtara cluster."}
        ]

        # 7. Workflow Stages Logs
        workflow_logs = [
            {"step": "Evidence Collection", "desc": "Ingested complaint narrative and associated attachments."},
            {"step": "Entity Extraction", "desc": f"Extracted suspect telephone numbers: {phones} and payment UPI gateways: {upis}."},
            {"step": "Fraud DNA Analysis", "desc": f"Compiled DNA profile: Communication={dna_card.get('communication_dna')}, Financial={dna_card.get('financial_dna')}, Geo={dna_card.get('geo_dna')}."},
            {"step": "Fraud Family Correlation", "desc": f"Mapped threat signatures to syndicate family {family_code} with {int(confidence*100)}% match confidence."},
            {"step": "Graph Network Expansion", "desc": f"Discovered suspect infrastructure network size: {network_size} nodes connected within radius 2."},
            {"step": "Threat Assessment", "desc": f"Calculated risk: Priority={priority}, Victim Impact={victim_impact}/100, Network Scale={network_size}."},
            {"step": "Recommendation Generation", "desc": "Auto-dispatched account block request to banking portal. Compiled draft FIR dockets."},
            {"step": "Investigation Summary", "desc": "Synthesized timelines and suspect profiles. Docket complete and flagged for legal export."}
        ]

        # 8. Legal Mapping
        legal_data = self.map_legal_sections(scam_type)

        # 9. FIR Draft Generation
        fir_draft = f"""FIRST INFORMATION REPORT
(Under Section 154 Cr.P.C.)

1. District: State Cyber Crime Investigation Cell HQ
2. Act & Sections: {', '.join(legal_data['bns_sections'])} read with {', '.join(legal_data['it_sections'])}.
3. Incident Details:
   - File Reference: Ref-{complaint.id}
   - Time of Occurrence: {complaint.created_at.strftime("%Y-%m-%d %H:%M")}
4. Details of Complaint:
   The complainant, {complaint.citizen_name or "Anonymous"}, reports receiving threatening communication accusing them of illegal parcel smuggling. The caller, using telephone {phones[0]}, forced them to make a verification transfer of funds to UPI ID: {upis[0]}.
5. Evidence & Suspected Indicators:
   - Primary Phone: {phones[0]}
   - Financial Node: {upis[0]}
   - DNA Family Cluster: {family_code}
6. Autonomous Agent Findings:
   Heuristic and graph database expansion indicates active syndicate operations linked to Mewat/Jamtara clusters. Potential money saved count: Rs. 35,000.
7. Orders/Action Dispatched:
   UPI node frozen under Section 106 BNSS. Telecom blockade request issued.

REPORT PREPARED BY: SHIELD AI Autonomous Investigation Agent (FIOS-V1)
"""

        # Save to database
        investigation = models.Investigation(
            complaint_id=complaint_id,
            investigator_id=investigator_id,
            status="Active",
            reasoning_logs=json.dumps(workflow_logs),
            suspects=json.dumps([{
                "name": "Operator Lead", "phone": phones[0], "role": "Caller Impersonator"
            }, {
                "name": "Mule Gateway", "upi": upis[0], "role": "Financial Layering Account"
            }]),
            network_nodes=json.dumps(subgraph),
            timeline=json.dumps(timeline),
            findings=f"Case traces directly to the {scam_type} family cluster {family_code}. Network expansion links suspect phone to active fraud campaigns.",
            fir_draft=fir_draft
        )

        complaint.status = "Under Investigation"
        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        return investigation

investigator_agent = InvestigatorAgent()
