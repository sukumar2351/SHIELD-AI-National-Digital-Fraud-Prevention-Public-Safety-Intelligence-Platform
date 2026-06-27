import os
import sys
import random
import hashlib
import json
import datetime
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, SessionLocal
from app import models

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shield_fios.db")

def create_tables(conn=None):
    # Base metadata create_all will automatically create tables matching SQLAlchemy definitions
    print("Dropping and recreating all tables via SQLAlchemy...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully via SQLAlchemy!")

def generate_data(conn=None):
    db = SessionLocal()
    try:
        print("Generating seed data...")
        now = datetime.datetime.utcnow()
        
        # 1. Seed Users
        hashed_pwd = "$2b$12$BNyi8mY2vsnrYBL7DThfeuTxnqOl.Dzh1I99mc51eEfUzfjHZcjke" # fios2026
        officer = models.User(
            username="officer_shield",
            email="hq.cybercell@shield.gov.in",
            hashed_password=hashed_pwd,
            role="Investigator",
            is_active=True,
            created_at=now
        )
        citizen = models.User(
            username="citizen_telugu",
            email="sukumar.citizen@gmail.com",
            hashed_password=hashed_pwd,
            role="Citizen",
            is_active=True,
            created_at=now
        )
        db.add(officer)
        db.add(citizen)
        db.commit()
        db.refresh(officer)
        db.refresh(citizen)
        
        # 2. Seed Districts as FraudEntity (for geospatial mapping)
        districts = [
            "Jamtara (Jharkhand)", "Nuh (Haryana)", "Mewat (Rajasthan)", "Bharatpur (Rajasthan)",
            "Mathura (Uttar Pradesh)", "Deoghar (Jharkhand)", "Ahmedabad (Gujarat)", "Bengaluru (Karnataka)",
            "Cyberabad (Telangana)", "Pune (Maharashtra)", "Gurugram (Haryana)", "Alwar (Rajasthan)",
            "Gurdaspur (Punjab)", "Nanded (Maharashtra)", "Ernakulam (Kerala)", "South Delhi (Delhi)",
            "Bareilly (Uttar Pradesh)", "Giridih (Jharkhand)", "Jamnagar (Gujarat)", "Jamui (Bihar)"
        ]
        for d in districts:
            ent = models.FraudEntity(
                entity_type="District",
                entity_value=d,
                risk_score=random.randint(70, 98),
                reported_count=random.randint(15, 80),
                created_at=now
            )
            db.add(ent)
            
        # 3. Seed 50 Fraud Families
        scam_types = [
            ("Digital Arrest Scam", "DIGITAL_ARREST"),
            ("UPI Payment Fraud", "UPI_FRAUD"),
            ("WhatsApp Impersonation", "WHATSAPP_SCAM"),
            ("SMS Smishing", "SMS_SCAM"),
            ("Email Phishing", "EMAIL_PHISHING"),
            ("AI Voice Clone scam", "VOICE_CLONE"),
            ("Fake Custom Cargo", "CUSTOMS_FRAUD"),
            ("Investment Advisory Group", "INVESTMENT_SCAM")
        ]
        
        families = []
        for i in range(1, 51):
            scam_type, prefix = random.choice(scam_types)
            family_code = f"{prefix}_2026_{i:03d}"
            langs = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam"]
            lang = random.choice(langs)
            
            traits = [
                scam_type,
                lang,
                random.choice(["UPI Collection", "Bank Account Transfer", "Crypto Layering"]),
                random.choice(["Urgency Manipulation", "Threat of Arrest", "Greed Offer"]),
                random.choice(["WhatsApp Follow-up", "Telegram Tasks", "Phone Harassment"])
            ]
            
            r_score = random.randint(55, 96)
            r_level = "Low Risk"
            if r_score > 80:
                r_level = "Critical"
            elif r_score > 60:
                r_level = "High Risk"
            elif r_score > 40:
                r_level = "Medium Risk"
                
            fam = models.FraudFamily(
                family_code=family_code,
                name=f"{scam_type} Syndicate Cluster {i:03d}",
                main_scam_type=scam_type,
                description=f"Sophisticated syndicate leveraging {lang} speech templates to execute {scam_type} campaigns.",
                traits=",".join(traits),
                risk_score=r_score,
                risk_level=r_level,
                created_at=now
            )
            db.add(fam)
            db.commit()
            db.refresh(fam)
            families.append(fam)
            
        # 4. Seed Entities (200 Phones, 150 UPIs, 100 Fraudsters)
        phones_set = set()
        while len(phones_set) < 200:
            phones_set.add(f"+91{random.randint(7000000000, 9999999999)}")
        phones = list(phones_set)

        upis_set = set()
        while len(upis_set) < 150:
            upis_set.add(f"refund.support{random.randint(100, 9999)}@okaxis")
        upis = list(upis_set)

        fraudsters_set = set()
        while len(fraudsters_set) < 100:
            fraudsters_set.add(f"Fraudster-{random.randint(1000, 9999)}")
        fraudsters = list(fraudsters_set)
        
        for p in phones:
            db.add(models.FraudEntity(entity_type="Phone", entity_value=p, risk_score=random.randint(40, 95), reported_count=random.randint(1, 12), created_at=now))
        for u in upis:
            db.add(models.FraudEntity(entity_type="UPI", entity_value=u, risk_score=random.randint(40, 98), reported_count=random.randint(1, 15), created_at=now))
        for fr in fraudsters:
            db.add(models.FraudEntity(entity_type="Fraudster", entity_value=fr, risk_score=random.randint(60, 98), reported_count=random.randint(2, 20), created_at=now))
            
        db.commit()
        
        # 5. Stories and Seeding 500 Complaints
        stories = {
            "Digital Arrest Scam": [
                "I received a call from +PHO claiming to be CBI officers. They showed a fake ID card and said a shipping box containing 500g of MDMA was detected under my Aadhaar card at customs. They kept me on video for 8 hours under digital arrest and forced me to transfer money to UPI: +UPI to verify my funds.",
                "A caller claiming to be from Telecom Ministry warned my SIM card would be blocked in 2 hours due to illegal advertising complaints in Mumbai. They redirected me to a CBI investigator who forced me onto Skype. Under threat of jail, I sent money to UPI: +UPI.",
                "Someone calling from customs authority at Mumbai airport said a courier addressed to me was intercepted with 5 passports and illegal foreign currency. They threatened me with CBI warrant and took UPI transfers: +UPI."
            ],
            "UPI Payment Fraud": [
                "A buyer on OLX claimed they wanted to purchase my old table. They sent me a UPI QR code claiming it was a 'receive money' scan. Once I scanned and entered my UPI PIN, Rs 25,000 was debited. They are using UPI: +UPI.",
                "I received a text alert about an unpaid electricity bill stating connection will be cut tonight. The support staff asked me to download a support app, which shared my screen. They withdrew money using UPI ID: +UPI.",
                "A call from lottery support stated I won a cash prize of Rs 5 Lakhs. They instructed me to pay a processing fee of Rs 12,000 using UPI: +UPI."
            ],
            "WhatsApp Impersonation": [
                "A WhatsApp message from +PHO used my son's profile photo. The sender claimed they had lost their phone, were in an emergency at a hospital, and needed Rs 40,000 immediately sent to UPI: +UPI. I sent it before calling him.",
                "My daughter's profile picture sent me a WhatsApp text saying they broke their phone and need tuition fees paid immediately to UPI: +UPI. It was a scam.",
                "A WhatsApp friend requested urgent help saying they were stuck in transit and needed flight reservation fees. They provided UPI: +UPI."
            ],
            "SMS Smishing": [
                "I received an SMS claiming my banking account will be suspended unless I verify my PAN details by clicking a link pointing to a fake bank terminal. They stole my credentials and withdrew funds.",
                "An SMS claiming I was selected for a high-paying part-time job. I was redirected to Telegram and told to execute tasks, leading to loss of Rs 80,000.",
                "Received a text: 'Your package is on hold at postal hub. Pay Rs 25 redelivery charge to verify.' The site was a phishing terminal."
            ],
            "Email Phishing": [
                "An email purporting to be from Income Tax Department stating a refund of Rs 18,500 is approved. Clicked the link and entered my net banking credentials. The site redirected to a dummy portal.",
                "Received email from Hr-support regarding mandatory employee policy updates. Steered me to a fake Microsoft login screen where credentials were stolen.",
                "Phishing email claiming suspicious login from Russia. Urged me to change my password immediately on a copycat banking URL."
            ],
            "AI Voice Clone scam": [
                "I received a call from +PHO. The voice was exactly my husband's voice, sobbing and saying he was arrested by police in a road accident. The caller took the phone and demanded Rs 50,000 to settle. I paid via UPI: +UPI.",
                "A cloned voice of my daughter called saying she was held hostage by kidnappers demanding urgent money sent to UPI: +UPI. The voice matched perfectly.",
                "My father's voice called me asking for urgent transfer of money. It turned out to be an AI cloning tool."
            ],
            "Fake Custom Cargo": [
                "An online friend from UK sent a gift parcel containing expensive jewellery and iPhones. I got a call from customs at Delhi airport asking to pay custom clearance fee of Rs 1,12,000. Funds sent to UPI: +UPI.",
                "A parcel scam accusing me of receiving gold bars illegally in cargo. Demanded custom penalties paid to UPI: +UPI."
            ],
            "Investment Advisory Group": [
                "I was added to a WhatsApp stock advisory group. They recommended a VIP IPO app. I deposited Rs 4,00,000. The app showed massive profits, but when I tried to withdraw, they demanded 20% tax. UPI used: +UPI."
            ]
        }
        
        citizen_names = [
            "Aarav Sharma", "Sukumar Reddy", "Priya Nair", "Aditya Patel", "Ananya Hegde",
            "Vikram Singh", "Deepika Rao", "Sandeep Krishnan", "Karthik Raja", "Sneha Menon",
            "Rohan Das", "Kavitha Iyer", "Pranav Joshi", "Meera Nair", "Rahul Verma"
        ]
        
        complaints_created = []
        
        for i in range(1, 501):
            if i <= 80: month = 1
            elif i <= 160: month = 2
            elif i <= 250: month = 3
            elif i <= 340: month = 4
            elif i <= 430: month = 5
            else: month = 6
                
            day = random.randint(1, 28)
            created_at_dt = datetime.datetime(2026, month, day, random.randint(8, 22), random.randint(0, 59))
            
            fam = random.choice(families)
            scam_type = fam.main_scam_type
            templates = stories.get(scam_type, ["Generic fraud event."])
            raw_story = random.choice(templates)
            
            pho = random.choice(phones)
            upi = random.choice(upis)
            story = raw_story.replace("+PHO", pho).replace("+UPI", upi)
            story = f"{story} (Ref: #{i})"
            
            score = random.randint(30, 98)
            level = "Low Risk"
            if score > 80: level = "Critical"
            elif score > 60: level = "High Risk"
            elif score > 40: level = "Medium Risk"
            
            cit_name = random.choice(citizen_names)
            cit_phone = f"+91{random.randint(6000000000, 8999999999)}"
            
            complaint = models.Complaint(
                citizen_id=citizen.id if i % 10 == 0 else None,
                citizen_name=cit_name,
                citizen_phone=cit_phone,
                description=story,
                status=random.choice(["Pending", "Under Investigation", "Resolved"]),
                shield_score=score,
                threat_level=level,
                created_at=created_at_dt
            )
            db.add(complaint)
            db.commit()
            db.refresh(complaint)
            
            lang = fam.traits.split(",")[1] if len(fam.traits.split(",")) > 1 else "English"
            geo = "Andhra Pradesh"
            if "Jamtara" in story or "Jharkhand" in story: geo = "Jharkhand"
            elif "Mewat" in story or "Nuh" in story or "Haryana" in story: geo = "Haryana"
            
            dna = models.FraudDNA(
                complaint_id=complaint.id,
                communication_dna=fam.main_scam_type,
                financial_dna=f"UPI Collection: {upi}",
                behavioral_dna="Urgency, Fear",
                language_dna=lang,
                geo_dna=geo,
                risk_score=score,
                confidence_score=round(random.uniform(0.75, 0.98), 2),
                created_at=created_at_dt
            )
            db.add(dna)
            db.commit()
            db.refresh(dna)
            
            prefix_words = scam_type.upper().split()
            prefix = prefix_words[0][:2]
            if len(prefix_words) >= 2:
                prefix = f"{prefix_words[0][0]}{prefix_words[1][0]}"
            sign_hash = f"DNA-{prefix}-{hashlib.sha256(story.encode()).hexdigest()[:8].upper()}-2026"
            
            signature = models.FraudSignature(
                dna_id=dna.id,
                signature_hash=sign_hash,
                constructed_features=json.dumps({"story_length": len(story), "has_phone": True, "has_upi": True}),
                created_at=created_at_dt
            )
            db.add(signature)
            
            membership = models.FraudFamilyMembership(
                family_id=fam.id,
                complaint_id=complaint.id,
                dna_id=dna.id,
                confidence=round(random.uniform(0.75, 0.98), 2),
                joined_at=created_at_dt
            )
            db.add(membership)
            
            complaints_created.append((complaint.id, pho, upi, fam.family_code, created_at_dt, cit_name, score, level))
            
        db.commit()
        print("500 complaints and DNA fingerprints successfully seeded via ORM.")

        # 5.5 Seed Investigations
        print("Seeding investigations...")
        for comp_id in range(1, 21):
            suspects = [
                {"type": "Phone", "value": f"+91{random.randint(7000000000, 9999999999)}", "role": "Burner Line"},
                {"type": "UPI ID", "value": f"suspect{random.randint(100, 999)}@okaxis", "role": "Mule Collector"}
            ]
            timeline = [
                {"timestamp": (now - datetime.timedelta(days=2)).isoformat(), "event": "Citizen Complaint Registered"},
                {"timestamp": (now - datetime.timedelta(days=1)).isoformat(), "event": "AI DNA Profiling Completed"},
                {"timestamp": now.isoformat(), "event": "Investigation Opened"}
            ]
            network_nodes = {
                "nodes": [
                    {"id": f"Ref-{comp_id}", "type": "Complaint"},
                    {"id": "SuspectPhone", "type": "Phone"}
                ]
            }
            inv = models.Investigation(
                complaint_id=comp_id,
                investigator_id=officer.id,
                status="Active",
                reasoning_logs=json.dumps(["Initial suspect link discovered.", "Scam modus mapped."]),
                suspects=json.dumps(suspects),
                network_nodes=json.dumps(network_nodes),
                timeline=json.dumps(timeline),
                findings="Suspect nodes located in Jamtara hub, transaction flow traced to mule accounts.",
                fir_draft=f"FIRST INFORMATION REPORT\n\nUnder Section 154 CrPC / BNS.\nComplainant: Ref-{comp_id}\nSections: BNS 318(4), IT Act 66D\nDetails: Fake customs agent impersonation scam.",
                created_at=now
            )
            db.add(inv)
        db.commit()
        print("Investigation dockets successfully seeded.")
        
        # 6. Graph nodes & edges seeding
        node_set = set()
        
        def add_node(ntype, nlabel, properties=None):
            key = f"{ntype}:{nlabel}"
            if key not in node_set:
                db.add(models.GraphNode(node_type=ntype, node_label=nlabel, properties=json.dumps(properties or {})))
                node_set.add(key)
                
        for f in families:
            add_node("Fraud Family", f.family_code, {"scam_type": f.main_scam_type})
        for d in districts:
            add_node("District", d, {"risk": random.randint(70, 95)})
        for fr in fraudsters:
            add_node("Fraudster", fr, {"alias": f"Suspect {fr}"})
        for p in phones[:150]:
            add_node("Phone", p)
        for u in upis[:120]:
            add_node("UPI", u)
            
        db.commit()
        
        edge_count = 0
        def add_edge(stype, slabel, ttype, tlabel, rtype, properties=None):
            nonlocal edge_count
            db.add(models.GraphEdge(
                source_node_type=stype,
                source_node_label=slabel,
                target_node_type=ttype,
                target_node_label=tlabel,
                relation_type=rtype,
                properties=json.dumps(properties or {})
            ))
            edge_count += 1
            
        for idx, (comp_id, pho, upi, fam_code, c_at, cit_name, score, level) in enumerate(complaints_created):
            comp_label = f"Ref-{comp_id}"
            add_node("Complaint", comp_label, {"shield_score": score, "level": level, "date": c_at.isoformat()})
            add_node("Victim", cit_name)
            
            add_edge("Complaint", comp_label, "Victim", cit_name, "REPORTED_BY")
            add_edge("Complaint", comp_label, "Fraud Family", fam_code, "PART_OF_FAMILY")
            
            if pho in phones[:150]:
                add_edge("Complaint", comp_label, "Phone", pho, "LINKED_TO")
                add_edge("Phone", pho, "Fraud Family", fam_code, "CONNECTED_TO")
            if upi in upis[:120]:
                add_edge("Complaint", comp_label, "UPI", upi, "LINKED_TO")
                add_edge("UPI", upi, "Fraud Family", fam_code, "CONNECTED_TO")
                
            if idx % 5 == 0:
                fraudster = fraudsters[idx % len(fraudsters)]
                add_edge("Fraudster", fraudster, "Phone", pho, "OWNS")
                add_edge("Fraudster", fraudster, "UPI", upi, "OWNS")
                dist = districts[idx % len(districts)]
                add_edge("Fraud Family", fam_code, "District", dist, "LINKED_TO")
                
        while edge_count < 1000:
            src = random.choice(fraudsters)
            tgt = random.choice(phones[:150])
            add_edge("Fraudster", src, "Phone", tgt, "OWNS")
            
        db.commit()
        print(f"Graph Seeding finished. Seeded {edge_count} relationships.")
        
    finally:
        db.close()

def generate_seed_data():
    try:
        create_tables()
        generate_data()
        print("Database successfully generated and seeded via ORM startup!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        raise e

if __name__ == "__main__":
    print(f"Opening local database connection to: {DB_PATH}")
    generate_seed_data()
    print("Database successfully generated and seeded!")
