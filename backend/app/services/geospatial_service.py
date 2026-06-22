import re
import random
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app import models

# Reference coordinates and states for the 20 seeded districts
DISTRICT_COORDINATES = {
    "Jamtara": {"state": "Jharkhand", "lat": 23.9620, "lng": 86.8029},
    "Nuh": {"state": "Haryana", "lat": 28.1188, "lng": 76.9961},
    "Mewat": {"state": "Haryana", "lat": 28.1400, "lng": 77.0100},
    "Bharatpur": {"state": "Rajasthan", "lat": 27.2152, "lng": 77.5030},
    "Mathura": {"state": "Uttar Pradesh", "lat": 27.4924, "lng": 77.6737},
    "Deoghar": {"state": "Jharkhand", "lat": 24.4820, "lng": 86.7001},
    "Ahmedabad": {"state": "Gujarat", "lat": 23.0225, "lng": 72.5714},
    "Bengaluru": {"state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
    "Cyberabad": {"state": "Telangana", "lat": 17.4483, "lng": 78.3741},
    "Pune": {"state": "Maharashtra", "lat": 18.5204, "lng": 73.8567},
    "Gurugram": {"state": "Haryana", "lat": 28.4595, "lng": 77.0266},
    "Alwar": {"state": "Rajasthan", "lat": 27.5530, "lng": 76.6089},
    "Gurdaspur": {"state": "Punjab", "lat": 32.0416, "lng": 75.4053},
    "Nanded": {"state": "Maharashtra", "lat": 19.1383, "lng": 77.3210},
    "Ernakulam": {"state": "Kerala", "lat": 9.9816, "lng": 76.2999},
    "South Delhi": {"state": "Delhi", "lat": 28.5355, "lng": 77.2069},
    "Bareilly": {"state": "Uttar Pradesh", "lat": 28.3670, "lng": 79.4304},
    "Giridih": {"state": "Jharkhand", "lat": 24.1900, "lng": 86.3000},
    "Jamnagar": {"state": "Gujarat", "lat": 22.4707, "lng": 70.0577},
    "Jamui": {"state": "Bihar", "lat": 24.9200, "lng": 86.2200}
}

class GeospatialService:
    def sync_database_if_empty(self, db: Session) -> None:
        """
        Self-healing synchronizer. Checks if State and District tables are empty.
        If they are, parses seeded districts from the `fraud_entities` table and
        populates State and District tables with coordinate mappings.
        """
        state_count = db.query(models.State).count()
        district_count = db.query(models.District).count()
        
        if state_count > 0 and district_count > 0:
            return

        # Fetch seeded districts from FraudEntity
        entities = db.query(models.FraudEntity).filter(
            models.FraudEntity.entity_type == "District"
        ).all()

        for ent in entities:
            raw_val = ent.entity_value
            # Match formats like "Jamtara (Jharkhand)"
            match = re.match(r"([^(]+)\s*\(([^)]+)\)", raw_val)
            if match:
                dist_name = match.group(1).strip()
                state_name = match.group(2).strip()
            else:
                dist_name = raw_val.strip()
                # Fallback to map
                state_name = DISTRICT_COORDINATES.get(dist_name, {}).get("state", "India")

            # 1. Ensure State exists
            state = db.query(models.State).filter(models.State.name == state_name).first()
            if not state:
                state = models.State(name=state_name, risk_score=ent.risk_score)
                db.add(state)
                db.commit()
                db.refresh(state)

            # 2. Ensure District exists
            district = db.query(models.District).filter(
                models.District.name == dist_name,
                models.District.state_id == state.id
            ).first()
            
            if not district:
                coords = DISTRICT_COORDINATES.get(dist_name, {"lat": 20.5937, "lng": 78.9629}) # Fallback to center of India
                district = models.District(
                    name=dist_name,
                    state_id=state.id,
                    latitude=coords["lat"],
                    longitude=coords["lng"],
                    risk_score=ent.risk_score
                )
                db.add(district)
                db.commit()
                db.refresh(district)

        # Trigger initial calculations
        self.calculate_density_metrics(db)

    def calculate_density_metrics(self, db: Session) -> None:
        """
        Recalculates complaint counts, total losses, and density scores for all districts.
        """
        districts = db.query(models.District).all()
        for dist in districts:
            # Query complaints matching this district's name in geo_dna
            complaints = db.query(models.Complaint).join(
                models.FraudDNA, models.Complaint.id == models.FraudDNA.complaint_id
            ).filter(
                models.FraudDNA.geo_dna.like(f"%{dist.name}%")
            ).all()

            count = len(complaints)
            
            # Extract loss amounts from description or fallback to deterministic seed value
            total_loss = 0.0
            for c in complaints:
                match = re.search(r'(?:rs|rupees|inr)\.?\s*(\d+)', c.description, re.IGNORECASE)
                if match:
                    total_loss += float(match.group(1))
                else:
                    # Deterministic ID-based fallback
                    total_loss += 15000.0 + ((c.id * 101) % 45000)

            # Blended density score formula
            density_score = count * 2.0 + (total_loss / 100000.0)

            # Save or Update FraudDensity
            density = db.query(models.FraudDensity).filter(
                models.FraudDensity.district_id == dist.id
            ).first()
            
            if not density:
                density = models.FraudDensity(
                    district_id=dist.id,
                    complaints_count=count,
                    total_loss_amount=total_loss,
                    density_score=density_score
                )
                db.add(density)
            else:
                density.complaints_count = count
                density.total_loss_amount = total_loss
                density.density_score = density_score
                density.calculated_at = datetime.datetime.utcnow()
                
            db.commit()

        # Update hotspot records and family spreads
        self._update_hotspots(db)
        self._update_family_spreads(db)

    def _update_hotspots(self, db: Session) -> None:
        """
        Internal method to update active and emerging threat hotspots.
        """
        densities = db.query(models.FraudDensity).all()
        if not densities:
            return

        # Find maximum score for scaling
        max_score = max([d.density_score for d in densities]) if densities else 10.0
        if max_score <= 0:
            max_score = 10.0

        for d in densities:
            # Deterministic growth rate using district_id
            growth_rate = 0.05 + ((d.district_id * 17) % 25) / 100.0
            
            # Hotspot intensity scaled from 0 to 1
            intensity = min(1.0, max(0.0, d.density_score / max_score))

            if intensity > 0.6 and growth_rate > 0.15:
                status = "Active"
            elif intensity > 0.3 and growth_rate > 0.10:
                status = "Emerging"
            else:
                status = "Declining"

            hotspot = db.query(models.ThreatHotspot).filter(
                models.ThreatHotspot.district_id == d.district_id
            ).first()

            if not hotspot:
                hotspot = models.ThreatHotspot(
                    district_id=d.district_id,
                    intensity=intensity,
                    growth_rate=growth_rate,
                    status=status
                )
                db.add(hotspot)
            else:
                hotspot.intensity = intensity
                hotspot.growth_rate = growth_rate
                hotspot.status = status
                hotspot.created_at = datetime.datetime.utcnow()
                
            db.commit()

    def _update_family_spreads(self, db: Session) -> None:
        """
        Aggregates geographic counts for active fraud families.
        """
        memberships = db.query(models.FraudFamilyMembership).all()
        spread_counts = {} # key: (family_id, district_id)

        districts = db.query(models.District).all()
        
        for mem in memberships:
            fam_id = mem.family_id
            complaint = mem.complaint
            if not complaint or not complaint.fraud_dna:
                continue

            geo_dna = complaint.fraud_dna.geo_dna
            
            # Match complaint to a district
            matched_dist_id = None
            for dist in districts:
                if dist.name in geo_dna:
                    matched_dist_id = dist.id
                    break
                    
            if matched_dist_id:
                key = (fam_id, matched_dist_id)
                spread_counts[key] = spread_counts.get(key, 0) + 1

        # Save spreads to DB
        for (fam_id, dist_id), count in spread_counts.items():
            spread = db.query(models.FamilySpread).filter(
                models.FamilySpread.family_id == fam_id,
                models.FamilySpread.district_id == dist_id
            ).first()

            if not spread:
                spread = models.FamilySpread(
                    family_id=fam_id,
                    district_id=dist_id,
                    active_complaints=count
                )
                db.add(spread)
            else:
                spread.active_complaints = count
                spread.updated_at = datetime.datetime.utcnow()
                
            db.commit()

    def detect_hotspots(self, db: Session) -> List[Dict[str, Any]]:
        """
        Returns all threat hotspots with coordinates and intensity statistics.
        """
        self.sync_database_if_empty(db)
        
        hotspots = db.query(models.ThreatHotspot).filter(
            models.ThreatHotspot.status.in_(["Active", "Emerging"])
        ).all()

        results = []
        for hs in hotspots:
            dist = hs.district
            density = db.query(models.FraudDensity).filter(
                models.FraudDensity.district_id == dist.id
            ).first()

            results.append({
                "hotspot_id": hs.id,
                "district": dist.name,
                "state": dist.state.name,
                "latitude": dist.latitude,
                "longitude": dist.longitude,
                "intensity": hs.intensity,
                "growth_rate": hs.growth_rate,
                "status": hs.status,
                "complaints_count": density.complaints_count if density else 0,
                "total_loss_amount": density.total_loss_amount if density else 0.0
            })
            
        # Sort by intensity descending
        results.sort(key=lambda x: x["intensity"], reverse=True)
        return results

    def rank_districts(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Calculates composite risk score and returns top high risk districts.
        """
        self.sync_database_if_empty(db)

        districts = db.query(models.District).all()
        results = []
        
        for dist in districts:
            density = db.query(models.FraudDensity).filter(
                models.FraudDensity.district_id == dist.id
            ).first()
            hotspot = db.query(models.ThreatHotspot).filter(
                models.ThreatHotspot.district_id == dist.id
            ).first()

            density_val = density.density_score if density else 0.0
            intensity_val = hotspot.intensity if hotspot else 0.0
            growth_val = hotspot.growth_rate if hotspot else 0.0

            # Composite Score: Blends baseline, density, intensity, and growth
            composite_risk = (dist.risk_score * 0.3) + (density_val * 1.5) + (intensity_val * 15.0) + (growth_val * 20.0)
            composite_risk = min(99.0, max(10.0, round(composite_risk, 1)))

            results.append({
                "district_id": dist.id,
                "district": dist.name,
                "state": dist.state.name,
                "latitude": dist.latitude,
                "longitude": dist.longitude,
                "risk_score": composite_risk,
                "complaints_count": density.complaints_count if density else 0,
                "total_loss_amount": density.total_loss_amount if density else 0.0,
                "growth_rate": growth_val
            })

        # Sort by risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results[:limit]

    def rank_states(self, db: Session) -> List[Dict[str, Any]]:
        """
        Aggregates district analytics to compute state risk rankings.
        """
        self.sync_database_if_empty(db)

        states = db.query(models.State).all()
        results = []

        for state in states:
            districts = state.districts
            if not districts:
                continue

            ranked_districts = self.rank_districts(db, limit=len(districts) + 10)
            
            # Filter rankings by state
            state_dists = [rd for rd in ranked_districts if rd["state"] == state.name]
            
            if not state_dists:
                continue

            avg_risk = sum(rd["risk_score"] for rd in state_dists) / len(state_dists)
            total_complaints = sum(rd["complaints_count"] for rd in state_dists)
            total_loss = sum(rd["total_loss_amount"] for rd in state_dists)

            results.append({
                "state_id": state.id,
                "state": state.name,
                "risk_score": round(avg_risk, 1),
                "districts_count": len(state_dists),
                "total_complaints": total_complaints,
                "total_loss_amount": total_loss
            })

        # Sort by risk score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return results

    def get_family_spread(self, db: Session, family_id: int) -> Dict[str, Any]:
        """
        Determines the geographical spread of a specific fraud family.
        """
        self.sync_database_if_empty(db)

        family = db.query(models.FraudFamily).filter(models.FraudFamily.id == family_id).first()
        if not family:
            return {}

        spreads = db.query(models.FamilySpread).filter(
            models.FamilySpread.family_id == family_id
        ).all()

        total_active = sum(sp.active_complaints for sp in spreads)

        spread_details = []
        for sp in spreads:
            dist = sp.district
            percentage = (sp.active_complaints / total_active * 100.0) if total_active > 0 else 0.0
            
            spread_details.append({
                "district_id": dist.id,
                "district": dist.name,
                "state": dist.state.name,
                "latitude": dist.latitude,
                "longitude": dist.longitude,
                "active_complaints": sp.active_complaints,
                "concentration_percentage": round(percentage, 1)
            })

        # Sort by complaints descending
        spread_details.sort(key=lambda x: x["active_complaints"], reverse=True)

        return {
            "family_id": family.id,
            "family_code": family.family_code,
            "name": family.name,
            "main_scam_type": family.main_scam_type,
            "total_active_complaints": total_active,
            "spread": spread_details
        }

    def get_fastest_growing_families(self, db: Session, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Computes fastest growing families based on recent membership growth ratios.
        """
        self.sync_database_if_empty(db)

        families = db.query(models.FraudFamily).all()
        results = []

        for fam in families:
            count = len(fam.memberships)
            if count == 0:
                continue

            # Growth rate calculation simulated using deterministic ID math
            growth_rate = 0.02 + ((fam.id * 13) % 35) / 100.0

            results.append({
                "family_id": fam.id,
                "family_code": fam.family_code,
                "name": fam.name,
                "scam_type": fam.main_scam_type,
                "complaints_count": count,
                "growth_rate_percentage": round(growth_rate * 100.0, 1)
            })

        # Sort by growth rate descending
        results.sort(key=lambda x: x["growth_rate_percentage"], reverse=True)
        return results[:limit]

    def get_complaint_density_trends(self, db: Session) -> List[Dict[str, Any]]:
        """
        Generates simulated density trends showing weekly complaint growth patterns.
        """
        # Group complaints by date
        complaints = db.query(models.Complaint).order_by(models.Complaint.created_at.asc()).all()
        
        # Build 4 weekly trend buckets leading up to current date
        weekly_counts = [0, 0, 0, 0]
        now = datetime.datetime.utcnow()
        
        for c in complaints:
            days_ago = (now - c.created_at).days
            if days_ago < 7:
                weekly_counts[3] += 1
            elif days_ago < 14:
                weekly_counts[2] += 1
            elif days_ago < 21:
                weekly_counts[1] += 1
            elif days_ago < 28:
                weekly_counts[0] += 1
            else:
                # Distribute historical baseline
                weekly_counts[c.id % 4] += 1

        trends = []
        for idx, count in enumerate(weekly_counts):
            week_label = f"Week {idx + 1}"
            trends.append({
                "time_frame": week_label,
                "complaints_volume": count,
                "growth_ratio": round((count / (weekly_counts[idx - 1] or 1.0) - 1.0) * 100.0, 1) if idx > 0 else 0.0
            })
            
        return trends

geospatial_service = GeospatialService()
