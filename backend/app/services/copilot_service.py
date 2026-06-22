import re
from typing import Dict, Any, List, Optional
from app import models
from app.database import SessionLocal
from app.services.dna_engine import dna_engine
from app.services.ai_engine import ai_engine

SAFETY_GUIDANCE = {
    "en": {
        "Critical": [
            "Hang up the call immediately. Do not stay on any active video/audio call.",
            "Do not transfer any money or share any bank details/OTP/UPI PIN.",
            "Report the phone number and UPI ID to the National Cyber Crime Portal (1930) or cybercrime.gov.in."
        ],
        "High Risk": [
            "Do not click on links sent by unknown contacts.",
            "Do not share personal details, Aadhar card, or passport copies.",
            "Block the sender and report spam on WhatsApp/SMS."
        ],
        "Medium Risk": [
            "Be cautious of unsolicited calls offering easy jobs or lottery prizes.",
            "Verify the caller's identity through official channels.",
            "Do not make any advance payments."
        ],
        "Low Risk": [
            "Keep your banking passwords and PINs updated.",
            "Do not share OTPs with anyone.",
            "Ignore spam links."
        ],
        "Safe": [
            "No immediate action needed. Continue following standard cybersecurity practices."
        ]
    },
    "hi": {
        "Critical": [
            "कॉल तुरंत काटें। किसी भी वीडियो या ऑडियो कॉल पर न रुकें।",
            "कोई भी पैसा ट्रांसफर न करें और बैंक क्रेडेंशियल, ओटीपी या यूपीआई पिन साझा न करें।",
            "1930 नंबर पर संपर्क करें या cybercrime.gov.in पर शिकायत दर्ज करें।"
        ],
        "High Risk": [
            "अपरिचित संपर्कों द्वारा भेजे गए किसी भी लिंक पर क्लिक न करें।",
            "व्यक्तिगत जानकारी जैसे आधार या पैन कार्ड साझा न करें।",
            "नंबर ब्लॉक करें और इसे व्हाट्सएप/एसएमएस पर स्पैम के रूप में रिपोर्ट करें।"
        ],
        "Medium Risk": [
            "नौकरी या लॉटरी के नाम पर आने वाली कॉल्स से सावधान रहें।",
            "आधिकारिक माध्यम से कॉलर की पहचान की पुष्टि करें।",
            "किसी भी प्रकार का एडवांस भुगतान न करें।"
        ],
        "Low Risk": [
            "अपने पासवर्ड और पिन समय-समय पर बदलते रहें।",
            "ओटीपी किसी के साथ साझा न करें।",
            "अवांछित संदेशों को अनदेखा करें।"
        ],
        "Safe": [
            "सुरक्षित। सामान्य साइबर सुरक्षा नियमों का पालन करते रहें।"
        ]
    },
    "te": {
        "Critical": [
            "ఫోన్ వెంటనే కట్ చేయండి. ఏ యాక్టివ్ వీడియో లేదా ఆడియో కాల్‌లోనూ ఉండకండి.",
            "డబ్బులు బదిలీ చేయవద్దు, ఓటీపీ లేదా యూపీఐ పిన్ పంచుకోవద్దు.",
            "వెంటనే 1930 నంబర్‌కు కాల్ చేయండి లేదా cybercrime.gov.in లో ఫిర్యాదు చేయండి."
        ],
        "High Risk": [
            "తెలియని నంబర్ల నుండి వచ్చే లింకులపై క్లిక్ చేయవద్దు.",
            "ఆధార్ లేదా బ్యాంక్ వివరాలు ఎవరికీ పంపవద్దు.",
            "నంబర్ బ్లాక్ చేయండి మరియు వాట్సాప్‌లో స్ప్యామ్‌గా రిపోర్ట్ చేయండి."
        ],
        "Medium Risk": [
            "పార్ట్ టైమ్ ఉద్యోగాలు లేదా లాటరీ ఆఫర్ల పట్ల జాగ్రత్తగా ఉండండి.",
            "వ్యక్తిగత వివరాలు పంపే ముందు నేరుగా ఫోన్ చేసి నిర్ధారించుకోండి.",
            "ఎటువంటి ముందస్తు చెల్లింపులు చేయవద్దు."
        ],
        "Low Risk": [
            "మీ బ్యాంకింగ్ పాస్‌వర్డ్‌లు తరచుగా మారుస్తూ ఉండండి.",
            "ఓటీపీ నంబర్లు ఎవరికీ చెప్పకండి.",
            "స్ప్యామ్ సందేశాలను నిర్లక్ష్యం చేయండి."
        ],
        "Safe": [
            "సురక్షితం. సాధారణ సైబర్ భద్రతా నియమాలను పాటించండి."
        ]
    },
    "ta": {
        "Critical": [
            "உடனடியாக அழைப்பை துண்டிக்கவும். வீடியோ அல்லது ஆடியோ காலில் தொடர வேண்டாம்.",
            "பணம் எதையும் அனுப்ப வேண்டாம் மற்றும் OTP அல்லது UPI PIN ஐ பகிர வேண்டாம்.",
            "சைபர் குற்ற உதவி எண் 1930 ஐ தொடர்பு கொள்ளவும் அல்லது cybercrime.gov.in இல் புகார் செய்யவும்."
        ],
        "High Risk": [
            "தெரியாத நபர்கள் அனுப்பும் லிங்க்குகளை கிளிக் செய்ய வேண்டாம்.",
            "ஆதார் அட்டை அல்லது தனிப்பட்ட விபரங்களை பகிர வேண்டாம்.",
            "எண்ணை பிளாக் செய்து ஸ்பேம் என புகாரளிக்கவும்."
        ],
        "Medium Risk": [
            "பகுதி நேர வேலை அல்லது லாட்டரி சலுகைகள் குறித்து எச்சரிக்கையாக இருக்கவும்.",
            "அதிகாரப்பூர்வ வழிகளில் அழைப்பாளரின் விபரங்களை உறுதிப்படுத்தவும்.",
            "முன்பணம் எதுவும் செலுத்த வேண்டாம்."
        ],
        "Low Risk": [
            "வங்கி கடவுச்சொற்களை அடிக்கடி மாற்றவும்.",
            "OTP எண்களை யாருக்கும் சொல்ல வேண்டாம்.",
            "தேவையற்ற செய்திகளை புறக்கணிக்கவும்."
        ],
        "Safe": [
            "பாதுகாப்பானது. வழக்கமான இணைய பாதுகாப்பு முறைகளைப் பின்பற்றவும்."
        ]
    },
    "kn": {
        "Critical": [
            "ತಕ್ಷಣ ಕರೆ ಕಡಿತಗೊಳಿಸಿ. ಯಾವುದೇ ವಿಡಿಯೋ ಅಥವಾ ಆಡಿಯೋ ಕರೆಯಲ್ಲಿ ಮುಂದುವರಿಯಬೇಡಿ.",
            "ಯಾವುದೇ ಹಣ ವರ್ಗಾಯಿಸಬೇಡಿ ಮತ್ತು ಒಟಿಪಿ ಅಥವಾ ಯುಪಿಐ ಪಿನ್ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
            "ಸೈಬರ್ ಸಹಾಯವಾಣಿ 1930 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ cybercrime.gov.in ನಲ್ಲಿ ದೂರು ನೀಡಿ."
        ],
        "High Risk": [
            "ಅಪರಿಚಿತ ಮೂಲಗಳಿಂದ ಬರುವ ಲಿಂಕ್‌ಗಳ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಬೇಡಿ.",
            "ವೈಯಕ್ತಿಕ ದಾಖಲೆಗಳನ್ನು (ಆಧಾರ್ ಇತ್ಯಾದಿ) ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
            "ಸಂಪರ್ಕವನ್ನು ಬ್ಲಾಕ್ ಮಾಡಿ ಮತ್ತು ಸ್ಪ್ಯಾಮ್ ಎಂದು ವರದಿ ಮಾಡಿ."
        ],
        "Medium Risk": [
            "ಅರೆಕಾಲಿಕ ಉದ್ಯೋಗಗಳು ಅಥವಾ ಲಾಟರಿ ಕೊಡುಗೆಗಳ ಬಗ್ಗೆ ಎಚ್ಚರದಿಂದಿರಿ.",
            "ಕರೆ ಮಾಡಿದವರ ಗುರುತನ್ನು ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
            "ಯಾವುದೇ ಮುಂಗಡ ಹಣ ಪಾವತಿಸಬೇಡಿ."
        ],
        "Low Risk": [
            "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಮತ್ತು ಪಿನ್‌ಗಳನ್ನು ಕಾಲಕಾಲಕ್ಕೆ ಬದಲಾಯಿಸಿ.",
            "ಒಟಿಪಿಯನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.",
            "ಸ್ಪ್ಯಾಮ್ ಸಂದೇಶಗಳನ್ನು ನಿರ್ಲಕ್ಷಿಸಿ."
        ],
        "Safe": [
            "ಸುರಕ್ಷಿತ. ಸಾಮಾನ್ಯ ಸೈಬರ್ ಸುರಕ್ಷತಾ ನಿಯಮಗಳನ್ನು ಅನುಸರಿಸಿ."
        ]
    },
    "ml": {
        "Critical": [
            "ഉടൻ കോൾ കട്ട് ചെയ്യുക. വീഡിയോ അല്ലെങ്കിൽ ഓഡിയോ കോളിൽ തുടരരുത്.",
            "പണം അയക്കുകയോ ഒടിപി, യുപിഐ പിൻ എന്നിവ പങ്കുവെക്കുകയോ ചെയ്യരുത്.",
            "സൈബർ ഹെൽപ്പ്‌ലൈൻ നമ്പറായ 1930ൽ വിളിക്കുകയോ cybercrime.gov.in സന്ദർശിക്കുകയോ ചെയ്യുക."
        ],
        "High Risk": [
            "അപരിചിതർ അയക്കുന്ന ലിങ്കുകളിൽ ക്ലിക്ക് ചെയ്യരുത്.",
            "ആധാർ കാർഡ് ഉൾപ്പെടെയുള്ള വ്യക്തിഗത വിവരങ്ങൾ കൈമാറരുത്.",
            "നമ്പർ ബ്ലോക്ക് ചെയ്ത് സ്പാം ആയി റിപ്പോർട്ട് ചെയ്യുക."
        ],
        "Medium Risk": [
            "ജോലി വാഗ്ദാനങ്ങൾ അല്ലെങ്കിൽ ലോട്ടറി സമ്മാനങ്ങൾ എന്നിവയിൽ ജാഗ്രത പാലിക്കുക.",
            "വിളിക്കുന്നയാളുടെ ഔദ്യോഗിക വിവരങ്ങൾ പരിശോധിക്കുക.",
            "യാതൊരു മുൻകൂർ പണവും നൽകരുത്."
        ],
        "Low Risk": [
            "ബാങ്കിംഗ് പാസ്‌വേഡുകൾ മാറ്റുക.",
            "ഒടിപി ആരുമായും പങ്കുവെക്കരുത്.",
            "സ്പാം സന്ദേശങ്ങൾ അവഗണിക്കുക."
        ],
        "Safe": [
            "സുരക്ഷിതം. പൊതുവായ സൈബർ സുരക്ഷാ മാനദണ്ഡങ്ങൾ പാലിക്കുക."
        ]
    }
}

PREVENTION_TIPS = {
    "en": [
        "Never share your UPI PIN or scan a QR code to receive money. UPI PIN is only for debiting money.",
        "Government agencies like CBI or Police will never order a 'digital arrest' or demand verification transfers.",
        "Always verify requests for emergency money from friends or relatives by calling them on a known number."
    ],
    "hi": [
        "पैसे प्राप्त करने के लिए कभी भी अपना यूपीआई पिन दर्ज न करें और न ही क्यूआर कोड स्कैन करें।",
        "सीबीआई या पुलिस जैसी सरकारी एजेंसियां कभी भी 'डिजिटल अरेस्ट' का आदेश नहीं देती हैं।",
        "रिश्तेदारों के नाम पर आने वाली मदद की अपीलों को पैसे भेजने से पहले अवश्य जांच लें।"
    ],
    "te": [
        "డబ్బులు స్వీకరించడానికి ఎప్పుడూ యూపీఐ పిన్ నమోదు చేయవద్దు లేదా క్యూఆర్ కోడ్ స్కాన్ చేయవద్దు.",
        "సీబీఐ లేదా పోలీస్ వంటి ప్రభుత్వ సంస్థలు ఎప్పుడూ డిజిటల్ అరెస్ట్ చేయమని ఆదేశించవు.",
        "బంధువులు లేదా స్నేహితుల పేరుతో అత్యవసరంగా డబ్బులు అడిగితే ఫోన్ చేసి నిర్ధారించుకోండి."
    ],
    "ta": [
        "பணத்தைப் பெறுவதற்கு ஒருபோதும் உங்கள் UPI PIN ஐ உள்ளிடவோ அல்லது QR குறியீட்டை ஸ்கேன் செய்யவோ வேண்டாம்.",
        "சிபிஐ அல்லது போலீஸ் போன்ற அரசு அமைப்புகள் ஒருபோதும் 'டிஜிட்டல் கைது' செய்ய உத்தரவிடாது.",
        "உறவினர்கள் பெயரில் வரும் அவசர உதவி கோரிக்கைகளை பணம் அனுப்பும் முன் சரிபார்க்கவும்."
    ],
    "kn": [
        "ಹಣ ಸ್ವೀಕರಿಸಲು ಯುಪಿಐ ಪಿನ್ ನಮೂದಿಸಬೇಡಿ ಅಥವಾ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಬೇಡಿ.",
        "ಸಿಬಿಐ ಅಥವಾ ಪೊಲೀಸ್ ಇಲಾಖೆಗಳು ಯಾವುದೇ 'ಡಿಜಿಟಲ್ ಬಂಧನ'ಕ್ಕೆ ಆದೇಶಿಸುವುದಿಲ್ಲ.",
        "ಸಂಬಂಧಿಕರ ಹೆಸರಿನಲ್ಲಿ ಬರುವ ಹಣದ ತುರ್ತು ವಿನಂತಿಗಳನ್ನು ದೃಢೀಕರಿಸಿ."
    ],
    "ml": [
        "പണം ലഭിക്കുന്നതിനായി ഒരിക്കലും യുപിഐ പിൻ എന്റർ ചെയ്യുകയോ ക്യുആർ കോഡ് സ്കാൻ ചെയ്യുകയോ ചെയ്യരുത്.",
        "പോലീസോ സിബിഐയോ ഒരിക്കലും 'ഡിജിറ്റൽ അറസ്റ്റ്' ഓർഡർ ചെയ്യുകയോ പണം ആവശ്യപ്പെടുകയോ ഇല്ല.",
        "സുഹൃത്തുക്കളോ ബന്ധുക്കളോ പണം ആവശ്യപ്പെട്ടാൽ നേരിട്ട് വിളിച്ച് ഉറപ്പുവരുത്തുക."
    ]
}

class CopilotService:
    def _normalize_lang(self, language: str) -> str:
        lang = language.lower().strip()
        if lang in ["en", "english"]:
            return "en"
        if lang in ["hi", "hindi"]:
            return "hi"
        if lang in ["te", "telugu"]:
            return "te"
        if lang in ["ta", "tamil"]:
            return "ta"
        if lang in ["kn", "kannada"]:
            return "kn"
        if lang in ["ml", "malayalam"]:
            return "ml"
        return "en"

    def detect_language(self, text: str) -> str:
        """
        Uses script block ranges to return language codes (en, hi, te, ta, kn, ml).
        """
        if not text:
            return "en"
        if re.search(r'[\u0c00-\u0c7f]', text):
            return "te"
        if re.search(r'[\u0900-\u097f]', text):
            return "hi"
        if re.search(r'[\u0b80-\u0bff]', text):
            return "ta"
        if re.search(r'[\u0c80-\u0cff]', text):
            return "kn"
        if re.search(r'[\u0d00-\u0d7f]', text):
            return "ml"
        return "en"

    def analyze_risk(self, text: str, fraud_dna: dict, shield_score: int) -> dict:
        """
        Calculates threat level, looks up associated fraud family from DNA profile,
        and aggregates citizen advisory recommendations.
        """
        # Determine threat level
        if shield_score >= 80:
            threat_level = "Critical"
        elif shield_score >= 60:
            threat_level = "High Risk"
        elif shield_score >= 40:
            threat_level = "Medium Risk"
        elif shield_score >= 20:
            threat_level = "Low Risk"
        else:
            threat_level = "Safe"

        # Resolve Fraud Family from existing engines/databases
        fraud_family = fraud_dna.get("family") or fraud_dna.get("family_name") or fraud_dna.get("family_code")
        
        if not fraud_family:
            db = SessionLocal()
            try:
                # Deduce scam category
                text_lower = text.lower()
                scam_type = "Digital Fraud Campaign"
                if any(w in text_lower for w in ["arrest", "police", "cbi", "customs"]):
                    scam_type = "Digital Arrest Scam"
                elif any(w in text_lower for w in ["whatsapp", "telegram", "job", "relative"]):
                    scam_type = "WhatsApp Impersonation"
                elif any(w in text_lower for w in ["upi", "pin", "qr"]):
                    scam_type = "UPI Payment Fraud"

                family, confidence = dna_engine.match_fraud_family(db, fraud_dna, scam_type)
                if family:
                    fraud_family = f"{family.name} ({family.family_code})"
            except Exception:
                pass
            finally:
                db.close()

        if not fraud_family:
            fraud_family = "Digital Fraud Syndicate Cluster"

        # Retrieve safety guidance based on detected language
        lang_code = self.detect_language(text)
        guidance_steps = self.generate_safety_guidance(lang_code, threat_level)
        risk_assessment = guidance_steps[0] if guidance_steps else "Suspicious fraud pattern detected."
        recommendation = " ".join(guidance_steps[1:]) if len(guidance_steps) > 1 else (guidance_steps[0] if guidance_steps else "Hang up and report immediately.")

        return {
            "shield_score": shield_score,
            "threat_level": threat_level,
            "fraud_family": fraud_family,
            "risk_assessment": risk_assessment,
            "recommendation": recommendation
        }

    def generate_safety_guidance(self, language: str, threat_level: str) -> List[str]:
        """
        Generates localized safety guidance. Returns list of safety steps.
        """
        norm_lang = self._normalize_lang(language)
        
        # Normalize threat level case-insensitively
        norm_threat = "Safe"
        for key in ["Critical", "High Risk", "Medium Risk", "Low Risk", "Safe"]:
            if key.lower() == threat_level.lower():
                norm_threat = key
                break

        lang_guidance = SAFETY_GUIDANCE.get(norm_lang, SAFETY_GUIDANCE["en"])
        return lang_guidance.get(norm_threat, lang_guidance["Safe"])

    def generate_prevention_tips(self, language: str) -> List[str]:
        """
        Generates fraud prevention tips in the target language.
        """
        norm_lang = self._normalize_lang(language)
        return PREVENTION_TIPS.get(norm_lang, PREVENTION_TIPS["en"])

    def explain_fraud_family(self, fraud_family: dict, language: str) -> str:
        """
        Generates a citizen-friendly explanation of a fraud family syndicate.
        """
        norm_lang = self._normalize_lang(language)
        
        family_name = fraud_family.get("name") or fraud_family.get("family_name") or "Digital Arrest"
        scam_type = fraud_family.get("main_scam_type") or fraud_family.get("scam_type") or "Digital Arrest"
        
        # Mapping localized descriptions
        explanations = {
            "en": f"This complaint belongs to the {family_name} ({scam_type}) family. Similar scams have affected multiple victims. Never transfer money to unknown accounts claiming to be police or government officials.",
            "hi": f"यह शिकायत {family_name} ({scam_type}) परिवार से संबंधित है। इसी तरह के घोटालों ने कई पीड़ितों को प्रभावित किया है। पुलिस या सरकारी अधिकारियों का दावा करने वाले अज्ञात खातों में कभी भी पैसा ट्रांसफर न करें।",
            "te": f"ఈ ఫిర్యాదు {family_name} ({scam_type}) ముఠాకు చెందినది. ఇటువంటి మోసాల వల్ల పలువురు బాధితులు నష్టపోయారు. తాము పోలీసులమని చెప్పుకునే తెలియని వ్యక్తుల ఖాతాలకు ఎప్పుడూ డబ్బులు పంపవద్దు.",
            "ta": f"இந்த புகார் {family_name} ({scam_type}) குடும்பத்தைச் சேர்ந்தது. இதேபோன்ற மோசடிகள் பல பாதிக்கப்பட்டவர்களைப் பாதித்துள்ளன. காவல்துறை அதிகாரிகள் என்று கூறும் அடையாளம் தெரியாத கணக்குகளுக்கு ஒருபோதும் பணத்தை மாற்ற வேண்டாம்.",
            "kn": f"ಈ ದೂರು {family_name} ({scam_type}) ಗುಂಪಿಗೆ ಸೇರಿದ್ದಾಗಿದೆ. ಇಂತಹ ವಂಚನೆಗಳಿಂದ ಹಲವಾರು ಸಂತ್ರಸ್ತರು ನಷ್ಟ ಅನುಭವಿಸಿದ್ದಾರೆ. ತಾవు ಪೊಲೀಸ್ ಅಧಿಕಾರಿಗಳೆಂದು ಹೇಳಿಕೊಳ್ಳುವ ಅಪರಿಚಿತ ಖಾತೆಗಳಿಗೆ ಹಣ ವರ್ಗಾಯಿಸಬೇಡಿ.",
            "ml": f"ഈ പരാതി {family_name} ({scam_type}) തട്ടിപ്പ് വിഭാഗത്തിൽപ്പെട്ടതാണ്. സമാനമായ തട്ടിപ്പുകൾ നിരവധി പേരെ ബാധിച്ചിട്ടുണ്ട്. പോലീസ് ഉദ്യോഗസ്ഥരെന്ന് അവകാശപ്പെടുന്ന അജ്ഞാത അക്കൗണ്ടുകളിലേക്ക് ഒരിക്കലും പണം കൈമാറരുത്."
        }

        return explanations.get(norm_lang, explanations["en"])

copilot_service = CopilotService()
