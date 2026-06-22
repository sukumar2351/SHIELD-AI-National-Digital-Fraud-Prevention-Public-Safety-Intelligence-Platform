import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquareCode, 
  Send, 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  BookOpen, 
  Activity, 
  Download, 
  ArrowRight,
  Flame,
  AlertTriangle,
  Scale,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MetricCard } from '../components/MetricCard';

interface ChatMessage {
  sender: 'citizen' | 'copilot';
  text: string;
  timestamp: string;
  riskAnalysis?: {
    shield_score: number;
    threat_level: string;
    fraud_family: string;
    risk_assessment: string;
    safety_guidance: string;
    immediate_actions: string;
  };
}

interface PreventionTip {
  category: string;
  tip: string;
  regional_translations: Record<string, string>;
}

export const CitizenCopilot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/copilot');
  
  const [activeAnalysis, setActiveAnalysis] = useState<any | null>(null);
  const [activeFamilyAwareness, setActiveFamilyAwareness] = useState<any | null>(null);
  const [preventionTips, setPreventionTips] = useState<PreventionTip[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const languagesList = [
    { code: 'English', label: 'English' },
    { code: 'Hindi', label: 'हिन्दी' },
    { code: 'Telugu', label: 'తెలుగు' },
    { code: 'Tamil', label: 'தமிழ்' },
    { code: 'Kannada', label: 'ಕನ್ನಡ' },
    { code: 'Malayalam', label: 'മലയാളం' }
  ];

  const quickActions = [
    { label: "🚨 Fake CBI customs call", text: "Received a WhatsApp call from someone claiming to be a CBI inspector. They showed an arrest memo and accused me of sending narcotics in a customs courier, forcing me onto Skype." },
    { label: "💳 QR code payment scam", text: "A buyer on OLX sent me a UPI QR code claiming I need to scan it and enter my UPI PIN to receive advance money for my furniture." },
    { label: "⚡ Electricity bill cut warning", text: "Got an SMS warning: 'Electricity power will be cut tonight at 9:30 PM due to unpaid dues. Contact support immediately at +919876543210.'" }
  ];

  // Fallbacks for sandbox developer mode
  const defaultTips: PreventionTip[] = [
    {
      category: "Digital Arrest",
      tip: "No police, CBI, or customs officer will ever place you under digital arrest or ask you to execute a financial transfer on a video call. Hang up immediately.",
      regional_translations: {
        "English": "No police, CBI, or customs officer will ever place you under digital arrest or ask you to execute a financial transfer on a video call. Hang up immediately.",
        "Hindi": "कोई भी पुलिस, सीबीआई या सीमा शुल्क अधिकारी आपको कभी भी डिजिटल अरेस्ट में नहीं रखेगा या वीडियो कॉल पर पैसे नहीं मांगेगा। तुरंत फोन काट दें।",
        "Telugu": "ఏ పోలీస్, సీబీఐ లేదా కస్టమ్స్ అధికారి కూడా మిమ్మల్ని డిజిటల్ అరెస్ట్ చేయరు లేదా వీడియో కాల్‌లో డబ్బులు అడగరు. వెంటనే ఫోన్ కట్ చేయండి."
      }
    },
    {
      category: "UPI Security",
      tip: "Entering your UPI PIN always debits funds from your bank. You NEVER need to enter your PIN to receive money.",
      regional_translations: {
        "English": "Entering your UPI PIN always debits funds from your bank. You NEVER need to enter your PIN to receive money.",
        "Hindi": "यूपीआई पिन डालने से हमेशा आपके खाते से पैसे कटते हैं। पैसे प्राप्त करने के लिए आपको कभी भी यूपीआई पिन डालने की आवश्यकता नहीं है।",
        "Telugu": "యూపీఐ పిన్ నమోదు చేస్తే మీ ఖాతా నుండి డబ్బులు కట్ అవుతాయి. డబ్బులు పొందడానికి పిన్ నమోదు చేయాల్సిన అవసరం లేదు."
      }
    }
  ];

  useEffect(() => {
    // Load initial welcome message
    setMessages([
      {
        sender: 'copilot',
        text: "Jai Hind! I am the SHIELD AI Citizen Copilot. Paste any suspicious call transcripts, text alerts, or billing warnings here. I will auto-detect the language, run a scam DNA pre-check, and outline immediate safety instructions.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Load prevention tips from API
    const loadTips = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/copilot/prevention-tips');
        if (res.ok) {
          const tipsData = await res.json();
          setPreventionTips(tipsData);
        } else {
          setPreventionTips(defaultTips);
        }
      } catch (e) {
        setPreventionTips(defaultTips);
      }
    };
    loadTips();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  // Submit Chat Message
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);

    const userMessage: ChatMessage = {
      sender: 'citizen',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    const token = localStorage.getItem('shield_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const BASE_URL = 'http://localhost:8000/api/v1';

    try {
      // 1. Trigger Risk analysis Pre-Check
      const analyzeRes = await fetch(`${BASE_URL}/copilot/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, language })
      });

      let analysisResult = null;
      if (analyzeRes.ok) {
        analysisResult = await analyzeRes.json();
        setActiveAnalysis(analysisResult);

        // Fetch simplified family awareness details if a family code was matched
        if (analysisResult.fraud_family && analysisResult.fraud_family !== "None") {
          try {
            // Find a family ID reference or use 1 for demo purposes
            const familyId = analysisResult.fraud_family.includes("ARREST") ? 1 : 2;
            const famRes = await fetch(`${BASE_URL}/copilot/family-awareness/${familyId}?language=${language}`, { headers });
            if (famRes.ok) {
              const famData = await famRes.json();
              setActiveFamilyAwareness(famData);
            }
          } catch (err) {
            setActiveFamilyAwareness(null);
          }
        }
      }

      // 2. Trigger Copilot Chat Reply
      const chatRes = await fetch(`${BASE_URL}/copilot/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, language })
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const copilotReply: ChatMessage = {
          sender: 'copilot',
          text: `${chatData.risk_assessment}\n\n**Modus Operandi:**\n${chatData.threat_explanation}\n\n**Immediate Safety Steps:**\n${chatData.safety_advice}\n\n**How to report:**\n${chatData.reporting_instructions}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          riskAnalysis: analysisResult
        };
        setMessages(prev => [...prev, copilotReply]);
      } else {
        throw new Error('Chat API failed');
      }

    } catch (e) {
      console.warn("Using offline copilot response mapping");
      // Fallback response parsing keywords
      const isArrest = text.toLowerCase().includes('arrest') || text.toLowerCase().includes('cbi') || text.toLowerCase().includes('police') || text.toLowerCase().includes('custom');
      const isQr = text.toLowerCase().includes('qr') || text.toLowerCase().includes('olx') || text.toLowerCase().includes('pin');
      
      let replyText = '';
      let score = 40;
      let level = 'Medium Risk';
      let family = 'Unknown Scammer Group';
      let guidance = 'Verify any official claims offline. Do not execute transfers.';
      let actions = 'Hang up. Block the contact. Call cyber helpline 1930.';

      if (isArrest) {
        score = 94;
        level = 'Critical';
        family = 'CBI Custom Arrest Syndicate';
        guidance = 'No CBI or police authority executes arrests via video calls (Skype/WhatsApp). Hang up immediately. Do not share identity files.';
        actions = 'Do not transfer verify funds. Ignore threats of custom cargo blocks. Disconnect Skype immediately.';
        replyText = "🚨 CRITICAL RISK: Potential 'Digital Arrest' Scammer Syndicate in progress.\n\nImmediate Action: Hang up the call immediately. No customs officer or CBI investigator will force you onto Skype or keep you under digital arrest to verify your funds. Call the National Cyber Crime Helpline at 1930.";
      } else if (isQr) {
        score = 88;
        level = 'High Risk';
        family = 'OLX UPI Refund Ring';
        guidance = 'Entering your UPI PIN always debits money. You never scan or enter your PIN to receive funds.';
        actions = 'Cancel the transaction. Do not enter your UPI PIN. Report the UPI ID to payment node.';
        replyText = "⚠️ HIGH RISK: UPI Receive Money QR Code scam detected.\n\nImmediate Action: Do not scan the QR code and do not enter your UPI PIN. UPI PIN is only required to pay money, never to receive it.";
      } else {
        replyText = "We advise high caution. Scammers often create artificial urgency. Never transfer funds or download support screen-sharing software (AnyDesk, TeamViewer) to clear complaints.";
      }

      const fallbackAnalysis = {
        shield_score: score,
        threat_level: level,
        fraud_family: family,
        risk_assessment: `Identified scam keywords pointing to ${family}.`,
        safety_guidance: guidance,
        immediate_actions: actions
      };

      setActiveAnalysis(fallbackAnalysis);

      setMessages(prev => [...prev, {
        sender: 'copilot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        riskAnalysis: fallbackAnalysis
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

        <main className="flex-1 bg-gray-950/60 p-8 flex flex-col space-y-6 h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-6 gap-4 shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono flex items-center gap-3">
                <MessageSquareCode className="w-8 h-8 text-blue-500 animate-pulse" />
                CITIZEN COPILOT
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                Multilingual AI Assistant, Real-Time Scam DNA analysis, & Prevention advice
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
                <Globe className="w-3.5 h-3.5" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent border-none text-blue-400 focus:outline-none cursor-pointer"
                >
                  {languagesList.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-gray-950 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Metrics header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            <MetricCard label="Citizen Queries Solved" value="1,842" icon={BookOpen} color="blue" />
            <MetricCard label="Languages Supported" value={6} icon={Globe} color="green" />
            <MetricCard label="Average Pre-Check Time" value="480ms" icon={Activity} color="blue" />
            <MetricCard label="Shield Interception rate" value="94.2%" icon={ShieldCheck} color="green" />
          </div>

          {/* Split Screen Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
            {/* Left Chat Screen */}
            <div className="flex-1 rounded-xl bg-gray-950/80 border border-blue-500/15 p-5 flex flex-col glass-panel max-h-[600px] overflow-hidden">
              <div className="border-b border-blue-500/10 pb-3 flex items-center justify-between shrink-0 font-mono">
                <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  SHIELD AI Core Assistant
                </span>
                <span className="text-[9px] text-green-400 animate-pulse font-bold">● SYSTEM ONLINE</span>
              </div>

              {/* Chat messages feed */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`p-4 rounded-xl max-w-[85%] font-mono text-xs leading-relaxed space-y-2 ${
                      msg.sender === 'citizen'
                        ? 'bg-blue-500/10 border border-blue-500/30 text-white rounded-br-none'
                        : 'bg-gray-900/50 border border-blue-500/5 text-gray-300 rounded-bl-none'
                    }`}>
                      <p className="white-space-pre-wrap">{msg.text}</p>
                      <span className="text-[8px] text-gray-500 block text-right mt-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-lg bg-gray-900/50 border border-blue-500/5 text-blue-400 font-mono text-[10px] animate-pulse">
                      Analyzing Scam DNA markers...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Actions overlay */}
              <div className="py-3 border-t border-blue-500/10 shrink-0 space-y-1.5">
                <span className="text-[9px] text-gray-500 font-mono uppercase block">Quick Simulation Prompts</span>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(act.text)}
                      className="px-2.5 py-1 rounded bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/10 hover:border-blue-500/30 text-blue-400 text-[10px] font-mono transition-colors text-left"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input panel */}
              <div className="pt-3 border-t border-blue-500/10 shrink-0 flex gap-2">
                <input
                  type="text"
                  placeholder="Paste scam email, message or phone transcript here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                  className="flex-1 px-4 py-2.5 bg-gray-950 border border-blue-500/20 rounded-lg text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => handleSendMessage(inputText)}
                  className="px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/25 text-blue-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Threat Advisory Panel */}
            <div className="w-full lg:w-[450px] space-y-6 flex flex-col justify-start max-h-[600px] overflow-hidden">
              
              {/* Risk Analysis Scorecard Panel */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md space-y-4 shrink-0">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Pre-Check Threat Indicators
                </h3>

                {activeAnalysis ? (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 bg-gray-950/60 border border-blue-500/5 rounded-lg">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block">SHIELD Threat Score</span>
                        <span className="text-red-400 text-lg font-bold">{activeAnalysis.shield_score}/100</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 uppercase block">Threat Level</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-block ${
                          activeAnalysis.threat_level === 'Critical' ? 'bg-red-500/15 border border-red-500/25 text-red-400' : 'bg-amber-500/15 border border-amber-500/25 text-amber-400'
                        }`}>
                          {activeAnalysis.threat_level}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">Matched DNA Family</span>
                      <span className="text-white font-bold block">{activeAnalysis.fraud_family}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">Advisory Guidance</span>
                      <p className="text-gray-300 p-2.5 bg-gray-950/40 rounded border border-blue-500/5 leading-relaxed text-[11px]">
                        {activeAnalysis.safety_guidance}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-gray-600 font-mono text-[10px] uppercase tracking-wider">
                    <Info className="w-6 h-6 mb-2" />
                    Input suspicious alert in chat to trigger real-time DNA pre-check gauges
                  </div>
                )}
              </div>

              {/* Fraud Family Awareness Panel */}
              {activeFamilyAwareness && (
                <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md space-y-3 shrink-0 font-mono text-xs">
                  <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    Syndicate Awareness
                  </h3>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase">Syndicate Code / Name</span>
                    <span className="text-white font-bold block">{activeFamilyAwareness.family_code} ({activeFamilyAwareness.name})</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase">Simplified Threat Explanation</span>
                    <p className="text-gray-300 text-[11px] leading-relaxed mt-0.5">{activeFamilyAwareness.user_explanation}</p>
                  </div>
                  <div className="flex justify-between text-[10px] border-t border-blue-500/10 pt-2 text-gray-500">
                    <span>AFFECTED NATIONWIDE:</span>
                    <span className="text-red-400 font-bold">{activeFamilyAwareness.victims_affected} cases</span>
                  </div>
                </div>
              )}

              {/* Cybersecurity Prevention Tips Panel (Scrollable list) */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md flex-1 flex flex-col space-y-3 overflow-hidden">
                <h3 className="text-xs font-mono text-gray-300 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Multi-lingual Safety Tips
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
                  {preventionTips.map((tip, idx) => (
                    <div key={idx} className="p-3 bg-gray-950/60 border border-blue-500/5 rounded-lg space-y-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold inline-block uppercase">
                        {tip.category}
                      </span>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        {tip.regional_translations[language] || tip.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CitizenCopilot;
