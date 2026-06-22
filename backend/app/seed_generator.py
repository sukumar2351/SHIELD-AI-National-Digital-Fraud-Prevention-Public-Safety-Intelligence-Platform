import sqlite3
import random
import hashlib
import json
import datetime
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shield_fios.db")

def create_tables(conn):
    cursor = conn.cursor()
    
    # 1. Drop existing tables
    tables = [
        "users", "complaints", "fraud_entities", "fraud_families", "fraud_dna",
        "investigations", "graph_nodes", "graph_edges", "audit_logs"
    ]
    for table in tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table}")
        
    # 2. Create tables matching SQLAlchemy definitions
    cursor.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT
    )""")

    cursor.execute("""
    CREATE TABLE complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        citizen_id INTEGER,
        citizen_name TEXT,
        citizen_phone TEXT,
        description TEXT NOT NULL,
        audio_url TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'Pending',
        shield_score INTEGER DEFAULT 0,
        threat_level TEXT DEFAULT 'Safe',
        created_at TEXT,
        fraud_dna_id INTEGER,
        FOREIGN KEY (citizen_id) REFERENCES users (id),
        FOREIGN KEY (fraud_dna_id) REFERENCES fraud_dna (id)
    )""")

    cursor.execute("""
    CREATE TABLE fraud_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_value TEXT UNIQUE NOT NULL,
        risk_score INTEGER DEFAULT 0,
        reported_count INTEGER DEFAULT 1,
        created_at TEXT
    )""")

    cursor.execute("""
    CREATE TABLE fraud_families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        main_scam_type TEXT NOT NULL,
        description TEXT,
        traits TEXT,
        risk_score INTEGER DEFAULT 0,
        created_at TEXT
    )""")

    cursor.execute("""
    CREATE TABLE fraud_dna (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fraud_family_id INTEGER,
        scam_signature TEXT UNIQUE NOT NULL,
        threat_profile TEXT,
        modus_operandi TEXT,
        language_pattern TEXT,
        payment_pattern TEXT,
        victim_pattern TEXT,
        confidence_score REAL DEFAULT 0.0,
        created_at TEXT,
        FOREIGN KEY (fraud_family_id) REFERENCES fraud_families (id)
    )""")

    cursor.execute("""
    CREATE TABLE investigations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        investigator_id INTEGER,
        status TEXT DEFAULT 'Active',
        reasoning_logs TEXT,
        suspects TEXT,
        network_nodes TEXT,
        timeline TEXT,
        findings TEXT,
        fir_draft TEXT,
        created_at TEXT,
        FOREIGN KEY (complaint_id) REFERENCES complaints (id),
        FOREIGN KEY (investigator_id) REFERENCES users (id)
    )""")

    cursor.execute("""
    CREATE TABLE graph_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_type TEXT NOT NULL,
        node_label TEXT NOT NULL,
        properties TEXT
    )""")

    cursor.execute("""
    CREATE TABLE graph_edges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_node_type TEXT NOT NULL,
        source_node_label TEXT NOT NULL,
        target_node_type TEXT NOT NULL,
        target_node_label TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        properties TEXT
    )""")



    cursor.execute("""
    CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        ip_address TEXT,
        details TEXT,
        timestamp TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )""")
    
    conn.commit()

def generate_data(conn):
    cursor = conn.cursor()
    now_str = datetime.datetime.utcnow().isoformat()
    
    # 1. Seed Users (passwords hashed using '$2b$12$' mock structure, we use the correct bcrypt hashes)
    # Hashed value for password 'fios2026' is standard crypt context:
    hashed_pwd = "$2b$12$K89p0TWhNlWd/2X0x/j8mO3p0h/2mN6F9e8rQ8tQ5yH2nF8tQ2y2q"
    cursor.execute("INSERT INTO users (username, email, hashed_password, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                   ("officer_shield", "hq.cybercell@shield.gov.in", hashed_pwd, "Investigator", 1, now_str))
    
    cursor.execute("INSERT INTO users (username, email, hashed_password, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                   ("citizen_telugu", "sukumar.citizen@gmail.com", hashed_pwd, "Citizen", 1, now_str))
    
    # 2. Seed 20 Districts
    districts = [
        "Jamtara (Jharkhand)", "Nuh (Haryana)", "Mewat (Rajasthan)", "Bharatpur (Rajasthan)",
        "Mathura (Uttar Pradesh)", "Deoghar (Jharkhand)", "Ahmedabad (Gujarat)", "Bengaluru (Karnataka)",
        "Cyberabad (Telangana)", "Pune (Maharashtra)", "Gurugram (Haryana)", "Alwar (Rajasthan)",
        "Gurdaspur (Punjab)", "Nanded (Maharashtra)", "Ernakulam (Kerala)", "South Delhi (Delhi)",
        "Bareilly (Uttar Pradesh)", "Giridih (Jharkhand)", "Jamnagar (Gujarat)", "Jamui (Bihar)"
    ]
    for d in districts:
        cursor.execute("INSERT INTO fraud_entities (entity_type, entity_value, risk_score, reported_count, created_at) VALUES (?, ?, ?, ?, ?)",
                       ("District", d, random.randint(70, 98), random.randint(15, 80), now_str))

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
        
        cursor.execute("INSERT INTO fraud_families (family_code, name, main_scam_type, description, traits, risk_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (family_code, f"{scam_type} Syndicate Cluster {i:03d}", scam_type,
                        f"Sophisticated syndicate leveraging {lang} speech templates to execute {scam_type} campaigns.",
                        ",".join(traits), random.randint(55, 96), now_str))
        families.append((i, family_code, scam_type, lang, traits))
    
    # 4. Seed Entities (200 Phones, 150 UPIs, 100 Fraudsters)
    phones = [f"+91{random.randint(7000000000, 9999999999)}" for _ in range(200)]
    upis = [f"refund.support{random.randint(100, 999)}@okaxis" for _ in range(150)]
    fraudsters = [f"Fraudster-{random.randint(1000, 9999)}" for _ in range(100)]

    for p in phones:
        cursor.execute("INSERT OR IGNORE INTO fraud_entities (entity_type, entity_value, risk_score, reported_count, created_at) VALUES (?, ?, ?, ?, ?)",
                       ("Phone", p, random.randint(40, 95), random.randint(1, 12), now_str))
    for u in upis:
        cursor.execute("INSERT OR IGNORE INTO fraud_entities (entity_type, entity_value, risk_score, reported_count, created_at) VALUES (?, ?, ?, ?, ?)",
                       ("UPI", u, random.randint(40, 98), random.randint(1, 15), now_str))
    for fr in fraudsters:
        cursor.execute("INSERT OR IGNORE INTO fraud_entities (entity_type, entity_value, risk_score, reported_count, created_at) VALUES (?, ?, ?, ?, ?)",
                       ("Fraudster", fr, random.randint(60, 98), random.randint(2, 20), now_str))

    # 5. Seed 500 Complaints with believable scam narratives
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
        if i <= 80:
            month = 1
        elif i <= 160:
            month = 2
        elif i <= 250:
            month = 3
        elif i <= 340:
            month = 4
        elif i <= 430:
            month = 5
        else:
            month = 6
            
        day = random.randint(1, 28)
        created_at = datetime.datetime(2026, month, day, random.randint(8, 22), random.randint(0, 59)).isoformat()
        
        fam_idx, fam_code, scam_type, lang, traits = random.choice(families)
        templates = stories.get(scam_type, ["Fraud incident reported."])
        raw_story = random.choice(templates)
        
        pho = random.choice(phones)
        upi = random.choice(upis)
        story = raw_story.replace("+PHO", pho).replace("+UPI", upi)
        story = f"{story} (Ref: #{i})"
        
        score = random.randint(30, 98)
        level = "Low Risk"
        if score > 80:
            level = "Critical"
        elif score > 60:
            level = "High Risk"
        elif score > 40:
            level = "Medium Risk"
            
        sign = f"DNA-{prefix_code(scam_type)}-{hashlib.sha256(story.encode()).hexdigest()[:8].upper()}-2026"
        
        # Insert DNA record
        cursor.execute("""
        INSERT INTO fraud_dna (fraud_family_id, scam_signature, threat_profile, modus_operandi, language_pattern, payment_pattern, victim_pattern, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (fam_idx, sign, f"National syndicate cluster utilizing {lang} templates.", story[:120], f"{lang} templates", f"UPI ID: {upi}", "Targets general public", round(random.uniform(0.75, 0.98), 2), created_at))
        
        dna_id = cursor.lastrowid
        
        cit_name = random.choice(citizen_names)
        cit_phone = f"+91{random.randint(6000000000, 8999999999)}"
        
        # Insert Complaint
        cursor.execute("""
        INSERT INTO complaints (citizen_id, citizen_name, citizen_phone, description, audio_url, image_url, status, shield_score, threat_level, created_at, fraud_dna_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (2 if i % 10 == 0 else None, cit_name, cit_phone, story, None, None, random.choice(["Pending", "Under Investigation", "Resolved"]), score, level, created_at, dna_id))
        
        comp_id = cursor.lastrowid
        complaints_created.append((comp_id, pho, upi, fam_code, created_at, cit_name, score, level))

    print("500 complaints and DNA fingerprints successfully generated in SQLite.")

    # 6. Seed Graph Nodes and Relationships (1000 relations)
    print("Generating Graph nodes and relationship edges...")
    
    # Track node insertions to avoid duplicates
    node_set = set()
    
    def add_graph_node(ntype, nlabel, properties=None):
        key = f"{ntype}:{nlabel}"
        if key not in node_set:
            cursor.execute("INSERT INTO graph_nodes (node_type, node_label, properties) VALUES (?, ?, ?)",
                           (ntype, nlabel, json.dumps(properties or {})))
            node_set.add(key)
            
    # Add family and district nodes
    for _, f_code, s_type, _, _ in families:
        add_graph_node("Fraud Family", f_code, {"scam_type": s_type})
        
    for d in districts:
        add_graph_node("District", d, {"risk": random.randint(70, 95)})
        
    for fr in fraudsters:
        add_graph_node("Fraudster", fr, {"alias": f"Suspect {fr}"})

    for p in phones[:150]:
        add_graph_node("Phone", p)
    for u in upis[:120]:
        add_graph_node("UPI", u)

    edge_count = 0
    # Function to add graph edge
    def add_graph_edge(stype, slabel, ttype, tlabel, rtype, properties=None):
        nonlocal edge_count
        cursor.execute("""
        INSERT INTO graph_edges (source_node_type, source_node_label, target_node_type, target_node_label, relation_type, properties)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (stype, slabel, ttype, tlabel, rtype, json.dumps(properties or {})))
        edge_count += 1

    # Link complaints and indicators
    for idx, (comp_id, pho, upi, fam_code, c_at, cit_name, score, level) in enumerate(complaints_created):
        comp_label = f"Ref-{comp_id}"
        add_graph_node("Complaint", comp_label, {"shield_score": score, "level": level, "date": c_at})
        add_graph_node("Victim", cit_name)
        
        # Link 1: Complaint reported by victim
        add_graph_edge("Complaint", comp_label, "Victim", cit_name, "REPORTED_BY")
        # Link 2: Complaint part of family
        add_graph_edge("Complaint", comp_label, "Fraud Family", fam_code, "PART_OF_FAMILY")
        
        # Link 3: Complaint linked to phone
        if pho in phones[:150]:
            add_graph_edge("Complaint", comp_label, "Phone", pho, "LINKED_TO")
            add_graph_edge("Phone", pho, "Fraud Family", fam_code, "CONNECTED_TO")
            
        # Link 4: Complaint linked to UPI
        if upi in upis[:120]:
            add_graph_edge("Complaint", comp_label, "UPI", upi, "LINKED_TO")
            add_graph_edge("UPI", upi, "Fraud Family", fam_code, "CONNECTED_TO")

        # Periodical relations
        if idx % 5 == 0:
            fraudster = fraudsters[idx % len(fraudsters)]
            add_graph_edge("Fraudster", fraudster, "Phone", pho, "OWNS")
            add_graph_edge("Fraudster", fraudster, "UPI", upi, "OWNS")
            
            dist = districts[idx % len(districts)]
            add_graph_edge("Fraud Family", fam_code, "District", dist, "LINKED_TO")

    # Keep adding random edges until we hit 1000 relations
    while edge_count < 1000:
        src = random.choice(fraudsters)
        tgt = random.choice(phones[:150])
        add_graph_edge("Fraudster", src, "Phone", tgt, "OWNS")

    conn.commit()
    print(f"Graph Seeding finished. Seeded {edge_count} relationships.")

def prefix_code(scam_type: str) -> str:
    words = scam_type.upper().split()
    if len(words) >= 2:
        return f"{words[0][0]}{words[1][0]}"
    return words[0][:2]

if __name__ == "__main__":
    print(f"Opening local database connection to: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    try:
        create_tables(conn)
        generate_data(conn)
        print("Database successfully generated and seeded!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        conn.close()
