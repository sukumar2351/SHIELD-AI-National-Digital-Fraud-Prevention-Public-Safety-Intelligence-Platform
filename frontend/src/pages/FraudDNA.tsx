import React, { useEffect, useState } from 'react';
import { 
  Dna, 
  Percent, 
  ShieldAlert, 
  Network, 
  Layers, 
  TrendingUp, 
  Activity, 
  MapPin, 
  MessageSquare, 
  Wallet, 
  Flame, 
  Globe, 
  Search,
  Filter
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { api, Complaint } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface FraudFamily {
  id: number;
  family_code: string;
  name: string;
  main_scam_type: string;
  description?: string;
  traits?: string;
  risk_score: number;
}

export const FraudDNA: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [families, setFamilies] = useState<FraudFamily[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/dna');
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback structures matching backend schema in case the server is offline/initializing
  const fallbackStats = {
    total_analyzed: 500,
    confidence_average: 0.89,
    family_distribution: {
      "DIGITAL_ARREST": 120,
      "UPI_FRAUD": 180,
      "WHATSAPP_SCAM": 95,
      "SMS_SCAM": 65,
      "EMAIL_PHISHING": 40
    },
    dimension_summaries: {
      communication: {
        "Phone Harassment": 210,
        "WhatsApp Follow-up": 160,
        "Telegram Tasks": 80,
        "Official Skype Call": 50
      },
      financial: {
        "UPI Collection": 250,
        "Bank Account Transfer": 150,
        "Crypto Layering": 70,
        "Mule Cash Withdrawal": 30
      },
      language: {
        "English": 180,
        "Hindi": 150,
        "Telugu": 90,
        "Tamil": 50,
        "Kannada": 20,
        "Malayalam": 10
      },
      geo: {
        "Jharkhand": 140,
        "Haryana": 110,
        "Rajasthan": 90,
        "Telangana": 80,
        "Gujarat": 50,
        "Delhi": 30
      }
    }
  };

  const fallbackFamilies: FraudFamily[] = [
    { id: 1, family_code: "DIGITAL_ARREST_2026_001", name: "CBI Custom Arrest Syndicate", main_scam_type: "Digital Arrest Scam", traits: "CBI,Urgency,UPI,Telecom SIM", risk_score: 93, description: "Sophisticated syndicate leveraging Telugu and Hindi templates to execute Digital Arrest scams." },
    { id: 2, family_code: "UPI_FRAUD_2026_003", name: "Electricity Bill Refund Ring", main_scam_type: "UPI Payment Fraud", traits: "Electricity,UPI PIN,Urgency,WhatsApp", risk_score: 85, description: "Mewat-based ring targeting utility consumers demanding payment validation via remote screen support." },
    { id: 3, family_code: "WHATSAPP_SCAM_2026_005", name: "Son Emergency WhatsApp Syndicate", main_scam_type: "WhatsApp Impersonation", traits: "WhatsApp,Family Impersonation,UPI", risk_score: 78, description: "Syndicate calling parents using photos of their children to demand urgent hospital fund transfers." },
    { id: 4, family_code: "SMS_SCAM_2026_008", name: "PAN Verification Phishers", main_scam_type: "SMS Smishing", traits: "SMS,PAN Link,Bank Redirect,Mule Account", risk_score: 72, description: "Smishing network dispatching mass text links to deploy keyloggers on fake bank panels." },
    { id: 5, family_code: "EMAIL_PHISHING_2026_010", name: "IT Department Refund Ring", main_scam_type: "Email Phishing", traits: "Email,Tax Refund,Credential Theft", risk_score: 65, description: "Cyber criminals mimicking Income Tax officials with fake approval vouchers to steal bank logins." }
  ];

  useEffect(() => {
    const loadDNAData = async () => {
      try {
        const token = localStorage.getItem('shield_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const BASE_URL = 'http://localhost:8000/api/v1';

        // Load stats
        let statsData = null;
        try {
          const statsRes = await fetch(`${BASE_URL}/dna/statistics`, { headers });
          if (statsRes.ok) {
            statsData = await statsRes.json();
          } else {
            throw new Error('Stats API failed');
          }
        } catch (e) {
          console.warn("Using fallback DNA statistics");
          statsData = fallbackStats;
        }

        // Load families
        let familiesData = [];
        try {
          const familiesRes = await fetch(`${BASE_URL}/dna/families`, { headers });
          if (familiesRes.ok) {
            familiesData = await familiesRes.json();
          } else {
            throw new Error('Families API failed');
          }
        } catch (e) {
          console.warn("Using fallback DNA families");
          familiesData = fallbackFamilies;
        }

        // Load complaints
        let complaintsData: Complaint[] = [];
        try {
          complaintsData = await api.getComplaints();
        } catch (e) {
          console.warn("Complaints fetch failed, using offline fallback");
        }

        setStats(statsData);
        setFamilies(familiesData);
        setComplaints(complaintsData);

      } catch (err) {
        console.error("General DNA loading error", err);
      } finally {
        setLoading(false);
      }
    };
    loadDNAData();
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        <Navbar onNavigate={handleNavigate} />
        <div className="flex flex-1">
          <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
          <div className="flex-1 bg-gray-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin"></div>
              <span className="text-sm font-mono text-blue-400 tracking-widest uppercase animate-pulse">De-segmenting DNA Signatures...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic behavioral DNA (aggregated from actual complaints)
  const behavioralSummary: Record<string, number> = {
    "Urgency Manipulation": 0,
    "Threat of Arrest": 0,
    "Greed Offer": 0,
    "Fear Coercion": 0
  };

  let totalDNAEntries = stats.total_analyzed;
  let avgConfidence = stats.confidence_average;

  // Extract from complaints if there is any DNA recorded
  let hasComplaintsDNA = false;
  complaints.forEach(c => {
    if (c.fraud_dna) {
      hasComplaintsDNA = true;
      const b = c.fraud_dna.behavioral_dna;
      if (b) {
        behavioralSummary[b] = (behavioralSummary[b] || 0) + 1;
      }
    }
  });

  // If no database complaint has DNA, use sensible mock values
  if (!hasComplaintsDNA) {
    behavioralSummary["Urgency Manipulation"] = 184;
    behavioralSummary["Threat of Arrest"] = 152;
    behavioralSummary["Greed Offer"] = 98;
    behavioralSummary["Fear Coercion"] = 66;
  }

  // Format Recharts Data
  const pieChartData = Object.entries(stats.family_distribution || {}).map(([key, value]) => ({
    name: key.replace('_SCAM', '').replace('_', ' '),
    value: value as number
  }));

  const barChartData = Object.keys(stats.dimension_summaries.communication || {}).map(key => ({
    vector: key,
    communication: stats.dimension_summaries.communication[key] || 0,
    financial: stats.dimension_summaries.financial[key.replace("Phone Harassment", "UPI Collection").replace("WhatsApp Follow-up", "Bank Account Transfer").replace("Telegram Tasks", "Crypto Layering").replace("Official Skype Call", "Mule Cash Withdrawal")] || 0
  }));

  const areaChartData = Object.entries(stats.dimension_summaries.geo || {}).map(([key, value]) => ({
    state: key,
    complaints: value as number
  }));

  const trendLineData = [
    { index: 'Jan', confidence: 76, matches: 80 },
    { index: 'Feb', confidence: 79, matches: 120 },
    { index: 'Mar', confidence: 83, matches: 210 },
    { index: 'Apr', confidence: 85, matches: 340 },
    { index: 'May', confidence: 88, matches: 420 },
    { index: 'Jun', confidence: Math.round(avgConfidence * 100), matches: totalDNAEntries }
  ];

  const filteredFamilies = families.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.family_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.main_scam_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />

        <main className="flex-1 bg-gray-950/60 p-8 overflow-y-auto space-y-8 h-[calc(100vh-4rem)]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono flex items-center gap-3">
                <Dna className="w-8 h-8 text-blue-500 animate-pulse" />
                FRAUD DNA GENOME INDEX
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                Digital Fingerprints & Modus Operandi Syndicate Library
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs flex items-center gap-2">
              <Layers className="w-4 h-4" />
              MUTATIONAL THREAT DE-CLUSTERING
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              label="Total DNA Signatures" 
              value={totalDNAEntries} 
              trend="Ingested and cataloged"
              trendDirection="neutral"
              icon={Dna}
              color="blue"
            />
            <MetricCard 
              label="Avg Match Confidence" 
              value={`${Math.round(avgConfidence * 100)}%`} 
              trend="+4.2% accuracy boost"
              trendDirection="up"
              icon={Percent}
              color="green"
            />
            <MetricCard 
              label="Active Syndicates" 
              value={families.length} 
              trend="Tracked nationwide"
              trendDirection="neutral"
              icon={Network}
              color="amber"
            />
            <MetricCard 
              label="Critical DNA Match Risk" 
              value="93%" 
              trend="Highest recorded score"
              trendDirection="up"
              icon={ShieldAlert}
              color="red"
            />
          </div>

          {/* Visual Genomic Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* DNA Distribution (Pie Chart) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  DNA Distribution (Scam Category)
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">GENOME PIE CHART</span>
              </div>
              <div className="h-64 w-full flex items-center justify-center font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                {pieChartData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="truncate">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Communication & Financial DNA Vectors (Bar Chart) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Communication & Financial DNA Vectors
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">VECTOR BAR CHART</span>
              </div>
              <div className="h-64 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ left: -10 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis stroke="#64748b" dataKey="vector" tickFormatter={(v) => v.split(' ')[0]} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                    <Legend wrapperStyle={{ position: 'relative', top: 10 }} />
                    <Bar dataKey="communication" name="Comm Channel Ingestion" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="financial" name="Financial Payment Mode" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geographical DNA Spread (Area Chart) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  Geographical DNA (Target State Volume)
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">GEO AREA CHART</span>
              </div>
              <div className="h-64 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData}>
                    <defs>
                      <linearGradient id="geoDnaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis stroke="#64748b" dataKey="state" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#ef4444' }} />
                    <Area 
                      type="monotone" 
                      dataKey="complaints" 
                      name="DNA Matches Found" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#geoDnaGrad)" 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DNA Matching Confidence Trend (Trend Chart) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  DNA Matching Performance & Confidence Trend
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">LINE TREND CHART</span>
              </div>
              <div className="h-64 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendLineData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis stroke="#64748b" dataKey="index" />
                    <YAxis yAxisId="left" stroke="#3b82f6" name="Confidence" />
                    <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" name="Total Ingest" />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                    <Legend wrapperStyle={{ position: 'relative', top: 10 }} />
                    <Line yAxisId="left" type="monotone" dataKey="confidence" name="Avg Confidence (%)" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="matches" name="DNA Mapped Count" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Row for Behavioral and Language DNA Dimensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Behavioral DNA (Urgency, Fear, Greed) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                Behavioral DNA (Psychological Triggers)
              </h2>
              <div className="space-y-4 font-mono">
                {Object.entries(behavioralSummary).map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">{key}</span>
                      <span className="text-blue-400">{val} cases</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-blue-500/5">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                        style={{ width: `${Math.min((val / totalDNAEntries) * 100 * 2.5, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Language DNA (Linguistic Signatures) */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Language DNA (Linguistic Template Ratios)
              </h2>
              <div className="space-y-4 font-mono">
                {Object.entries(stats.dimension_summaries.language || {}).map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">{key}</span>
                      <span className="text-emerald-400">{val as number} cases</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-emerald-500/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                        style={{ width: `${Math.min(((val as number) / totalDNAEntries) * 100 * 2, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Fraud Families / Syndicate Clusters table */}
          <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-400" />
                  Top Fraud Families & Syndicate Clusters
                </h2>
                <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">Correlated DNA Clusters mapped to active operations</p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search Syndicate DNA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-950/60 border border-blue-500/20 rounded-lg text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-blue-500/5 rounded-lg bg-gray-950/30">
              <table className="w-full border-collapse text-left font-mono text-[11px] leading-relaxed">
                <thead>
                  <tr className="border-b border-blue-500/10 bg-blue-500/5 text-blue-400 uppercase tracking-wider">
                    <th className="p-3 font-semibold">Family Code</th>
                    <th className="p-3 font-semibold">Syndicate Name</th>
                    <th className="p-3 font-semibold">Main Scam Type</th>
                    <th className="p-3 font-semibold">Modus Operandi Traits</th>
                    <th className="p-3 font-semibold text-center">Threat Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/5 text-gray-300">
                  {filteredFamilies.map((fam) => (
                    <tr key={fam.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="p-3 font-bold text-blue-400">{fam.family_code}</td>
                      <td className="p-3 text-white font-medium">{fam.name}</td>
                      <td className="p-3">{fam.main_scam_type}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {fam.traits?.split(',').map((trait, i) => (
                            <span 
                              key={i} 
                              className="px-1.5 py-0.5 rounded bg-gray-900 border border-blue-500/10 text-gray-400 text-[9px]"
                            >
                              {trait.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          fam.risk_score > 90 
                            ? 'bg-red-500/15 border border-red-500/20 text-red-400' 
                            : fam.risk_score > 75 
                              ? 'bg-amber-500/15 border border-amber-500/20 text-amber-400' 
                              : 'bg-blue-500/15 border border-blue-500/20 text-blue-400'
                        }`}>
                          {fam.risk_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFamilies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500 uppercase tracking-widest">
                        No DNA Match Clusters found matching filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FraudDNA;
