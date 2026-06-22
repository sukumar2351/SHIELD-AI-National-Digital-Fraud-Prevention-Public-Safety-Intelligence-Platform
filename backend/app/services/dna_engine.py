import hashlib
import json
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app import models, schemas
from app.services.ai_engine import ai_engine

class DNAEngine:
    def extract_dna_dimensions(self, text: str, entities: Dict[str, List[str]]) -> Dict[str, str]:
        """
        Extracts the 5 dimensions of Fraud DNA based on NLP heuristics and keywords.
        """
        text_lower = text.lower()
        
        # 1. Communication DNA
        comm_dna = "Impersonation Scammer"
        if "cbi" in text_lower or "central bureau" in text_lower:
            comm_dna = "Fake CBI"
        elif "police" in text_lower or "thana" in text_lower or "cop" in text_lower or "dgp" in text_lower:
            comm_dna = "Fake Police"
        elif "rbi" in text_lower or "reserve bank" in text_lower:
            comm_dna = "Fake RBI"
        elif "custom" in text_lower or "airport" in text_lower or "cargo" in text_lower or "courier" in text_lower:
            comm_dna = "Fake Customs"
        elif "electricity" in text_lower or "bill" in text_lower:
            comm_dna = "Fake Utility Support"
            
        # 2. Financial DNA
        fin_dna = "Mule Account Transfer"
        if len(entities.get("upis", [])) > 0 or "@" in text_lower:
            fin_dna = "UPI Collection"
        elif "wallet" in text_lower or "paytm" in text_lower or "phonepe" in text_lower or "gpay" in text_lower:
            fin_dna = "Wallet Transfer"
        elif "gift" in text_lower or "amazon card" in text_lower or "voucher" in text_lower:
            fin_dna = "Gift Card Scam"
        elif "bitcoin" in text_lower or "crypto" in text_lower or "usdt" in text_lower:
            fin_dna = "Crypto Layering"
            
        # 3. Behavioral DNA
        behav_traits = []
        if "immediately" in text_lower or "now" in text_lower or "hurry" in text_lower or "quick" in text_lower or "minutes" in text_lower:
            behav_traits.append("Urgency")
        if "arrest" in text_lower or "jail" in text_lower or "drugs" in text_lower or "illegal" in text_lower or "court" in text_lower:
            behav_traits.append("Fear")
        if "don't hang up" in text_lower or "skype" in text_lower or "video call" in text_lower or "isolate" in text_lower or "silent" in text_lower:
            behav_traits.append("Isolation")
        if "officer" in text_lower or "warrant" in text_lower or "authority" in text_lower or "verify" in text_lower:
            behav_traits.append("Authority Pressure")
            
        behav_dna = ", ".join(behav_traits) if behav_traits else "Urgency Manipulation"
        
        # 4. Language DNA
        lang_dna = "English"
        if "మరియు" in text or "పోలీస్" in text or "నాకు" in text or "నమస్కారం" in text:
            lang_dna = "Telugu"
        elif "नमस्ते" in text or "थाना" in text or "कॉल" in text:
            lang_dna = "Hindi"
        elif "வணக்கம்" in text:
            lang_dna = "Tamil"
        elif "ನಮಸ್ಕಾರ" in text:
            lang_dna = "Kannada"
        elif "പോലീസ്" in text:
            lang_dna = "Malayalam"
            
        # 5. Geo DNA
        geo_dna = "Jharkhand (Jamtara)"
        geo_mapping = {
            "jamtara": "Jharkhand (Jamtara)",
            "nuh": "Haryana (Mewat)",
            "mewat": "Haryana (Mewat)",
            "bharatpur": "Rajasthan",
            "cyberabad": "Telangana",
            "hyderabad": "Telangana",
            "andhra": "Andhra Pradesh",
            "bengaluru": "Karnataka",
            "bangalore": "Karnataka",
            "ahmedabad": "Gujarat"
        }
        found_geo = False
        for kw, loc in geo_mapping.items():
            if kw in text_lower:
                geo_dna = loc
                found_geo = True
                break
        if not found_geo:
            # Heuristic default based on Language/traits
            if lang_dna == "Telugu":
                geo_dna = random.choice(["Andhra Pradesh", "Telangana"])
            elif lang_dna == "Tamil":
                geo_dna = "Tamil Nadu"
            elif lang_dna == "Kannada":
                geo_dna = "Karnataka"
            elif lang_dna == "Malayalam":
                geo_dna = "Kerala"
            else:
                geo_dna = random.choice(["Jharkhand (Jamtara)", "Haryana (Mewat)", "Rajasthan", "Gujarat"])

        return {
            "communication_dna": comm_dna,
            "financial_dna": fin_dna,
            "behavioral_dna": behav_dna,
            "language_dna": lang_dna,
            "geo_dna": geo_dna
        }

    def generate_signature(self, text: str, scam_type: str, entities: Dict[str, List[str]], dimensions: Dict[str, str]) -> str:
        """
        Generates a unique SHA-256 signature hash from text, type, and DNA dimensions.
        Returns a formatted string like DNA-FAMILY-XXXX-2026.
        """
        norm_text = text.strip().lower()
        phones = sorted(entities.get("phones", []))
        upis = sorted(entities.get("upis", []))
        
        sig_input = f"{scam_type.upper()}|{dimensions['communication_dna']}|{dimensions['financial_dna']}|{dimensions['language_dna']}|{dimensions['geo_dna']}|{phones}|{upis}"
        sig_hash = hashlib.sha256(sig_input.encode()).hexdigest().upper()
        
        # Determine family prefix
        words = scam_type.upper().split()
        prefix = "".join([w[0] for w in words])[:3]
        if not prefix:
            prefix = "SCAM"
            
        return f"DNA-{prefix}-{sig_hash[:8]}-2026"

    def match_fraud_family(self, db: Session, dimensions: Dict[str, str], scam_type: str) -> tuple:
        """
        Cross-checks database families to match the dimensions.
        Returns (FraudFamily, confidence_score). If no match, auto-creates a new family.
        """
        families = db.query(models.FraudFamily).all()
        matched_family = None
        best_matches = 0
        
        # Dimensions checklist
        comm = dimensions["communication_dna"].lower()
        fin = dimensions["financial_dna"].lower()
        lang = dimensions["language_dna"].lower()
        geo = dimensions["geo_dna"].lower()

        for f in families:
            traits_lower = f.traits.lower() if f.traits else ""
            matches = 0
            if comm in traits_lower: matches += 1
            if fin in traits_lower: matches += 1
            if lang in traits_lower: matches += 1
            if geo in traits_lower: matches += 1
            if scam_type.lower() in f.main_scam_type.lower(): matches += 2
            
            if matches >= 3 and matches > best_matches:
                matched_family = f
                best_matches = matches
                
        if matched_family:
            confidence = min(0.70 + (best_matches * 0.05), 0.98)
            return matched_family, confidence
            
        # Fallback: Create new family cluster
        count = db.query(models.FraudFamily).count() + 1
        family_code = f"{scam_type.upper().replace(' ', '_')[:12]}_2026_{count:03d}"
        
        traits = [
            dimensions["communication_dna"],
            dimensions["financial_dna"],
            dimensions["language_dna"],
            dimensions["geo_dna"]
        ]
        
        new_family = models.FraudFamily(
            family_code=family_code,
            name=f"{scam_type} Syndicate Cluster {count:03d}",
            main_scam_type=scam_type,
            description=f"Auto-generated fraud cluster tracking {dimensions['communication_dna']} scams routed through {dimensions['geo_dna']}.",
            traits=", ".join(traits),
            risk_level="High Risk" if scam_type in ["Digital Arrest Scam", "AI Voice Clone scam"] else "Medium Risk"
        )
        db.add(new_family)
        db.commit()
        db.refresh(new_family)
        
        return new_family, 0.93

    def find_similar_cases(self, db: Session, complaint: models.Complaint) -> List[Dict[str, Any]]:
        """
        Finds database complaints that share similar entities or DNA values.
        """
        entities = ai_engine.extract_entities(complaint.description)
        phones = entities["phones"]
        upis = entities["upis"]
        
        query = db.query(models.Complaint).filter(models.Complaint.id != complaint.id)
        
        # Score similarity
        matches = []
        for other in query.all():
            score = 0
            reasons = []
            
            # 1. Family check
            if complaint.family_membership and other.family_membership:
                if complaint.family_membership.family_id == other.family_membership.family_id:
                    score += 35
                    reasons.append("Same Fraud Family Cluster")
                    
            # 2. DNA check
            if complaint.fraud_dna and other.fraud_dna:
                if complaint.fraud_dna.communication_dna == other.fraud_dna.communication_dna:
                    score += 15
                    reasons.append("Identical Communication Modus")
                if complaint.fraud_dna.financial_dna == other.fraud_dna.financial_dna:
                    score += 15
                    reasons.append("Identical Payment Gateway Type")
                if complaint.fraud_dna.geo_dna == other.fraud_dna.geo_dna:
                    score += 10
                    reasons.append("Identical Geo-Origin")
                    
            # 3. Entity check
            other_entities = ai_engine.extract_entities(other.description)
            for p in phones:
                if p in other_entities["phones"]:
                    score += 30
                    reasons.append(f"Matching Phone: {p}")
            for u in upis:
                if u in other_entities["upis"]:
                    score += 30
                    reasons.append(f"Matching UPI: {u}")
                    
            if score >= 25:
                matches.append({
                    "complaint_id": other.id,
                    "citizen_name": other.citizen_name or "Anonymous",
                    "shield_score": other.shield_score,
                    "similarity_score": min(score, 100),
                    "reasons": reasons
                })
                
        # Sort by score descending
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matches

dna_engine = DNAEngine()
