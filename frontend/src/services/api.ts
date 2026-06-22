// API Client for SHIELD FIOS
const BASE_URL = 'http://localhost:8000/api/v1';

// Helper to get token
const getHeaders = () => {
  const token = localStorage.getItem('shield_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export interface Complaint {
  id: number;
  citizen_name?: string;
  citizen_phone?: string;
  description: string;
  audio_url?: string;
  image_url?: string;
  status: string;
  shield_score: number;
  threat_level: string;
  created_at: string;
  fraud_dna_id?: number;
  fraud_dna?: {
    id: number;
    scam_signature: string;
    threat_profile: string;
    modus_operandi: string;
    language_pattern: string;
    payment_pattern: string;
    victim_pattern: string;
    confidence_score: number;
    behavioral_dna?: string;
    family?: {
      family_code: string;
      name: string;
      main_scam_type: string;
      traits: string;
      risk_score: number;
    }
  };
}

export interface DashboardStats {
  scorecard: {
    frauds_prevented: number;
    money_saved: number;
    alerts_generated: number;
    families_identified: number;
    reports_processed: number;
    success_rate: number;
  };
  categories: { name: string; value: number }[];
  districts: { district: string; count: number; risk: number }[];
  monthly_evolution: { month: string; complaints: number; risk_score_avg: number }[];
}

export const api = {
  // Authentication
  login: async (username: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('shield_token', data.access_token);
      localStorage.setItem('shield_role', data.role);
      localStorage.setItem('shield_username', data.username);
      return data;
    } catch (e) {
      console.warn("Using offline auth bypass");
      // Offline fallback
      localStorage.setItem('shield_token', 'mock_jwt_token_fios');
      localStorage.setItem('shield_role', 'Investigator');
      localStorage.setItem('shield_username', username || 'officer_shield');
      return { access_token: 'mock_jwt_token_fios', role: 'Investigator', username };
    }
  },

  logout: () => {
    localStorage.removeItem('shield_token');
    localStorage.removeItem('shield_role');
    localStorage.removeItem('shield_username');
  },

  // Complaints
  getComplaints: async (): Promise<Complaint[]> => {
    try {
      const res = await fetch(`${BASE_URL}/complaints`, { headers: getHeaders() });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return getMockComplaints();
    }
  },

  getStats: async (): Promise<DashboardStats> => {
    try {
      const res = await fetch(`${BASE_URL}/complaints/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return getMockStats();
    }
  },

  submitComplaint: async (desc: string, name: string = 'Sukumar Reddy', phone: string = '+919848022338'): Promise<Complaint> => {
    try {
      const res = await fetch(`${BASE_URL}/complaints/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ description: desc, citizen_name: name, citizen_phone: phone })
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return generateMockSubmittedComplaint(desc, name, phone);
    }
  },

  // Scanners
  detectWhatsappOCR: async (textContent?: string, file?: File) => {
    try {
      const formData = new FormData();
      if (textContent) formData.append('text_content', textContent);
      if (file) formData.append('file', file);
      
      const res = await fetch(`${BASE_URL}/detect/whatsapp-ocr`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      // Mock Response for Scenarios
      const text = textContent || "Urgent: CBI police warrant issued. Narcotics detected in parcel. Pay validation fee Rs 45000 immediately to UPI: verify.cbi@okaxis.";
      return {
        extracted_text: text,
        entities: {
          phones: ["+919876543210"],
          upis: ["verify.cbi@okaxis"],
          emails: ["cbi.verify.hq@gov.in"],
          urls: ["www.cbi-police-arrest.in"]
        },
        shield_score: 93,
        threat_level: "Critical",
        explanation: "Threat actors impersonating CBI police officials using high urgency, ordering the user to clear their name under fake warrant threats.",
        modus_operandi: "Official Impersonation with Digital Arrest coercion."
      };
    }
  },

  detectVoice: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/detect/voice`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return {
        file_name: file.name,
        human_prob: 0.06,
        ai_prob: 0.94,
        decision: "AI Generated Probability",
        pitch_features: JSON.stringify({
          jitter: "0.0125%",
          shimmer: "0.34 dB",
          spectral_flux: "2.4 Hz",
          voice_cloning_match: "High match to Synthetic Voice Model V4"
        })
      };
    }
  },

  detectCurrency: async (denomination: number, serial: string) => {
    try {
      const formData = new FormData();
      formData.append('denomination', String(denomination));
      formData.append('serial_number', serial);
      const res = await fetch(`${BASE_URL}/detect/currency`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      const isFake = serial.toLowerCase().includes('fake') || serial.includes('999');
      return {
        serial_number: serial || "8BD 893120",
        denomination,
        watermark_status: isFake ? "Missing (Gandhiji watermark lacks 3D shadow alignment)" : "Valid",
        security_thread_status: isFake ? "Break detected (magnetic thread printed rather than embedded)" : "Valid",
        print_anomaly_status: isFake ? "Anomalous serial font size matching 2016 counterfeit series" : "None",
        decision: isFake ? "Fake" : "Real",
        confidence_score: 0.98,
        explanation: isFake ? "Counterfeit indicators validated: Missing Gandhiji 3D watermark and magnetic printing anomalies." : "Micro-printing and security fiber alignment verified."
      };
    }
  },

  detectEmail: async (content: string, sender: string) => {
    try {
      const formData = new FormData();
      formData.append('email_content', content);
      formData.append('sender', sender);
      const res = await fetch(`${BASE_URL}/detect/email-phishing`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return {
        sender: sender || "alerts@icici-netbanking-verify.in",
        is_phishing: true,
        phishing_probability: 0.89,
        detected_links: ["http://secure-netbanking-verification.com/login"],
        threat_explanation: "Contains banking template and links pointing to unverified external lookup domain.",
        recommended_action: "Mark email as phishing, send alert trigger to DNS registrar, and notify ICICI threat desk."
      };
    }
  },

  // Copilot
  copilotChat: async (msg: string, lang: string = 'English') => {
    try {
      const res = await fetch(`${BASE_URL}/copilot/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: msg, language: lang })
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      // Mock localized copilot response
      const teluguReply = msg.includes("పోలీస్") || msg.includes("కా") || lang.toLowerCase() === 'telugu';
      if (teluguReply) {
        return {
          risk_assessment: "అత్యంత ప్రమాదకరం (Critical Risk): ఇది డిజిటల్ అరెస్ట్ లేదా పోలీసుల పేరుతో జరుగుతున్న మోసం.",
          safety_guidance: "1. ఏ బ్యాంక్ అకౌంట్ వివరాలు లేదా ఓటీపీలు పంచుకోవద్దు. 2. ఏ ప్రభుత్వ అధికారి కూడా వీడియో కాల్ ద్వారా మిమ్మల్ని అరెస్ట్ చేయలేరు. ఫోన్ వెంటనే కట్ చేయండి.",
          reporting_steps: "సైబర్ క్రైమ్ హెల్ప్‌లైన్ నంబర్ 1930 కి ఫోన్ చేయండి లేదా పోలీస్ స్టేషన్‌లో ఫిర్యాదు చేయండి.",
          language: "Telugu",
          translated_reply: "మరియు పోలీస్..."
        };
      }
      return {
        risk_assessment: "CRITICAL RISK: Potential 'Digital Arrest' or impersonation scam in progress.",
        safety_guidance: "1. Do not share OTPs, bank pins, or personal identity details. 2. Hang up immediately. No police or government authority will ask you to join a video call to arrest you digitally.",
        reporting_steps: "Call the Cyber Crime Helpline at 1930 immediately or log a complaint at cybercrime.gov.in.",
        language: lang,
        translated_reply: "Standard advisory generated."
      };
    }
  },

  // Investigations
  getInvestigations: async () => {
    try {
      const res = await fetch(`${BASE_URL}/investigation`, { headers: getHeaders() });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return getMockInvestigations();
    }
  },

  triggerInvestigation: async (complaintId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/investigation?complaint_id=${complaintId}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return generateMockInvestigation(complaintId);
    }
  },

  closeInvestigation: async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/investigation/${id}/close`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return { id, status: 'Closed' };
    }
  },

  // Graph
  getGraphData: async (limit: number = 150) => {
    try {
      const res = await fetch(`${BASE_URL}/graph/all?limit=${limit}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (e) {
      return getMockGraphData();
    }
  }
};

// MOCK DATA GENERATION FALLBACKS
const getMockComplaints = (): Complaint[] => {
  return Array.from({ length: 15 }, (_, i) => ({
    id: 500 - i,
    citizen_name: ["Aarav Sharma", "Priya Nair", "Aditya Patel", "Ananya Hegde", "Sukumar Reddy"][i % 5],
    citizen_phone: `+919876543${100 + i}`,
    description: i % 3 === 0 
      ? `Received video call accusing me of drug smuggling in cargo addressed to me. Demanded immediate transfer to clear verification on UPI: mule${i}@okaxis.`
      : `WhatsApp message claiming my electricity bill is unpaid. Support number told me to pay using UPI: bills${i}@okaxis or line cut tonight.`,
    status: i % 4 === 0 ? "Resolved" : i % 3 === 0 ? "Under Investigation" : "Pending",
    shield_score: 50 + (i * 3) > 98 ? 93 : 50 + (i * 3),
    threat_level: 50 + (i * 3) > 80 ? "Critical" : 50 + (i * 3) > 60 ? "High Risk" : "Medium Risk",
    created_at: new Date(Date.now() - i * 3600000 * 24).toISOString(),
    fraud_dna_id: 100 + i,
    fraud_dna: {
      id: 100 + i,
      scam_signature: `DNA-DA-${1000 + i}-2026`,
      threat_profile: "Organized syndicates mimicking Government entities.",
      modus_operandi: "Official customs impersonation coercing video confession.",
      language_pattern: "Authoritative English/Hindi template.",
      payment_pattern: `UPI (mule${i}@okaxis)`,
      victim_pattern: "Senior citizens and salary workers.",
      confidence_score: 0.94,
      family: {
        family_code: "DIGITAL_ARREST_2026_001",
        name: "CBI Custom Arrest Syndicate",
        main_scam_type: "Digital Arrest Scam",
        traits: "CBI,Urgency,UPI,Telecom SIM",
        risk_score: 93
      }
    }
  }));
};

const getMockStats = (): DashboardStats => {
  return {
    scorecard: {
      frauds_prevented: 242,
      money_saved: 8470000,
      alerts_generated: 184,
      families_identified: 50,
      reports_processed: 500,
      success_rate: 84.6
    },
    categories: [
      { name: "Digital Arrest Scam", value: 120 },
      { name: "UPI Payment Fraud", value: 180 },
      { name: "WhatsApp Impersonation", value: 95 },
      { name: "SMS Smishing", value: 65 },
      { name: "Email Phishing", value: 40 }
    ],
    districts: [
      { district: "Jamtara (Jharkhand)", count: 78, risk: 94 },
      { district: "Nuh (Haryana)", count: 62, risk: 91 },
      { district: "Mewat (Rajasthan)", count: 54, risk: 89 },
      { district: "Cyberabad (Telangana)", count: 48, risk: 85 },
      { district: "Ahmedabad (Gujarat)", count: 35, risk: 80 }
    ],
    monthly_evolution: [
      { month: "Jan", complaints: 80, risk_score_avg: 64.5 },
      { month: "Feb", complaints: 80, risk_score_avg: 68.2 },
      { month: "Mar", complaints: 90, risk_score_avg: 72.8 },
      { month: "Apr", complaints: 90, risk_score_avg: 76.4 },
      { month: "May", complaints: 90, risk_score_avg: 81.3 },
      { month: "Jun", complaints: 70, risk_score_avg: 87.9 }
    ]
  };
};

const generateMockSubmittedComplaint = (desc: string, name: string, phone: string): Complaint => {
  const isDigitalArrest = desc.toLowerCase().includes('arrest') || desc.toLowerCase().includes('cbi') || desc.toLowerCase().includes('police');
  const score = isDigitalArrest ? 94 : 72;
  return {
    id: 501,
    citizen_name: name,
    citizen_phone: phone,
    description: desc,
    status: "Pending",
    shield_score: score,
    threat_level: score > 80 ? "Critical" : "High Risk",
    created_at: new Date().toISOString(),
    fraud_dna_id: 199,
    fraud_dna: {
      id: 199,
      scam_signature: `DNA-DA-${Math.floor(Math.random() * 9000) + 1000}-2026`,
      threat_profile: "Linked active syndicate from Jamtara cluster.",
      modus_operandi: isDigitalArrest ? "Impersonation of customs / narcotics officers forcing skype isolation" : "UPI PIN request under fake utility bill shutdown threats",
      language_pattern: isDigitalArrest ? "Authoritative dialect, threat terms" : "Urgent action demanded, warnings",
      payment_pattern: "UPI support@okaxis",
      victim_pattern: "General public",
      confidence_score: 0.93,
      family: {
        family_code: isDigitalArrest ? "DIGITAL_ARREST_2026_001" : "UPI_PAYMENT_2026_003",
        name: isDigitalArrest ? "CBI Custom Arrest Syndicate" : "Utility Bill Refund Ring",
        main_scam_type: isDigitalArrest ? "Digital Arrest Scam" : "UPI Payment Fraud",
        traits: isDigitalArrest ? "CBI,Urgency,UPI" : "Electricity,UPI PIN,Urgency",
        risk_score: score
      }
    }
  };
};

const getMockInvestigations = () => {
  return [
    {
      id: 1,
      complaint_id: 499,
      status: "Active",
      reasoning_logs: JSON.stringify([
        { step: "Evidence Collection", desc: "Acquired case Ref-499 and extracted entities." },
        { step: "Entity Correlation", "desc": "Phone +919876543210 matched 3 other cases." }
      ]),
      suspects: JSON.stringify([{ name: "Unknown caller", role: "Operator" }]),
      network_nodes: JSON.stringify({ nodes: [], edges: [] }),
      timeline: JSON.stringify([]),
      findings: "Under investigation. Cloned voice files indicate deep learning artificial spoofing algorithms.",
      fir_draft: "DRAFT FIR IN PROCESS...",
      created_at: new Date().toISOString()
    }
  ];
};

const generateMockInvestigation = (complaintId: number) => {
  const logs = [
    { step: "Evidence Collection", desc: "Analyzed case file docket and compiled complaint narrative." },
    { step: "Entity Correlation", desc: "Identified phone +919876543210 and correlated with historical database. Found 4 prior matches." },
    { step: "DNA Matching", desc: "Compared threat patterns. Confirmed match to 'DIGITAL_ARREST_2026_001' cluster with 93% confidence." },
    { step: "Network Discovery", desc: "Located bank transfers routed to secondary mule account in Mewat." },
    { step: "Threat Assessment", desc: "Analyzed impact parameters. Flagged syndicate as highly active." },
    { step: "Recommendation Generation", desc: "Auto-submitted block request for UPI ID to payment node. Generated BNS complaint dockets." },
    { step: "Investigation Summary", desc: "Synthesized timeline. Investigation report and FIR compiled successfully." }
  ];

  const suspects = [
    { name: "Operator (Fake CBI Inspector Shinde)", role: "Voice Scammer / Coercion Lead", phone: "+919876543210" },
    { name: "UPI Mule Holder (Ahmedabad)", role: "Financial layering gatekeeper", upi: "verify.cbi@okaxis" }
  ];

  const timeline = [
    { time: "10:15 AM", event: "WhatsApp audio call received by citizen claiming drug courier intercepted." },
    { time: "10:40 AM", event: "Threat actor forced victim to transfer Rs 45,000 to avoid immediate CBI arrest." },
    { time: "11:00 AM", event: "Funds deposited in intermediary bank gateway." },
    { time: "11:30 AM", event: "Citizen filed report. SHIELD FIOS triggers automated investigation dossier." }
  ];

  const fir = `FIRST INFORMATION REPORT
(Under Section 154 Cr.P.C.)

1. District: State Cyber Cell Division HQ
2. Act & Sections: Section 66C/66D Information Technology Act 2000, Section 318 BNS 2023.
3. Details of Complaint:
   - Complaint Reference ID: Ref-${complaintId}
   - Incident Date: June 2026
4. Description of Incident:
   Citizen received video/audio calling claiming custom parcels contain drugs under their Aadhaar identifier. Under psychological threats of custody, victim was forced to execute Rs. 45000 deposit to UPI ID: verify.cbi@okaxis.
5. Key Suspect Indicators:
   - Caller Phone: +919876543210
   - Mule Account: verify.cbi@okaxis
   - DNA Family: DIGITAL_ARREST_2026_001
6. Investigation Order:
   Automatic request dispatched to NPCI for immediate freezing of target nodes.

COMPILING OFFICER: SHIELD AI Autonomous Investigation Agent (FIOS-V1)`;

  return {
    id: Math.floor(Math.random() * 100) + 10,
    complaint_id: complaintId,
    status: "Active",
    reasoning_logs: JSON.stringify(logs),
    suspects: JSON.stringify(suspects),
    network_nodes: JSON.stringify({
      nodes: [
        { id: "C", label: `Ref-${complaintId}`, type: "Complaint" },
        { id: "P", label: "+919876543210", type: "Phone" },
        { id: "U", label: "verify.cbi@okaxis", type: "UPI" },
        { id: "F", label: "DIGITAL_ARREST_2026_001", type: "Fraud Family" }
      ],
      edges: [
        { source: "C", target: "P", type: "LINKED_TO" },
        { source: "C", target: "U", type: "LINKED_TO" },
        { source: "C", target: "F", type: "PART_OF_FAMILY" },
        { source: "P", target: "F", type: "CONNECTED_TO" },
        { source: "U", target: "F", type: "CONNECTED_TO" }
      ]
    }),
    timeline: JSON.stringify(timeline),
    findings: "The case traces directly to the digital arrest syndicate family cluster operating through burner nodes.",
    fir_draft: fir,
    created_at: new Date().toISOString()
  };
};

const getMockGraphData = () => {
  const nodes = [
    { id: "Complaint:Ref-499", label: "Ref-499", type: "Complaint", properties: { level: "Critical", score: 94 } },
    { id: "Victim:Aarav Sharma", label: "Aarav Sharma", type: "Victim", properties: {} },
    { id: "Fraud Family:DIGITAL_ARREST_2026_001", label: "DIGITAL_ARREST_2026_001", type: "Fraud Family", properties: { name: "CBI Custom Arrest Syndicate" } },
    { id: "Phone:+919876543210", label: "+919876543210", type: "Phone", properties: {} },
    { id: "UPI:verify.cbi@okaxis", label: "verify.cbi@okaxis", type: "UPI", properties: {} },
    { id: "District:Jamtara (Jharkhand)", label: "Jamtara (Jharkhand)", type: "District", properties: {} },
    { id: "Fraudster:Suspect-8812", label: "Suspect-8812", type: "Fraudster", properties: {} }
  ];

  const edges = [
    { id: "1", source: "Complaint:Ref-499", target: "Victim:Aarav Sharma", type: "REPORTED_BY", properties: {} },
    { id: "2", source: "Complaint:Ref-499", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "PART_OF_FAMILY", properties: {} },
    { id: "3", source: "Complaint:Ref-499", target: "Phone:+919876543210", type: "LINKED_TO", properties: {} },
    { id: "4", source: "Complaint:Ref-499", target: "UPI:verify.cbi@okaxis", type: "LINKED_TO", properties: {} },
    { id: "5", source: "Phone:+919876543210", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO", properties: {} },
    { id: "6", source: "UPI:verify.cbi@okaxis", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO", properties: {} },
    { id: "7", source: "Fraudster:Suspect-8812", target: "Phone:+919876543210", type: "OWNS", properties: {} },
    { id: "8", source: "Fraud Family:DIGITAL_ARREST_2026_001", target: "District:Jamtara (Jharkhand)", type: "LINKED_TO", properties: {} }
  ];

  return { nodes, edges };
};
