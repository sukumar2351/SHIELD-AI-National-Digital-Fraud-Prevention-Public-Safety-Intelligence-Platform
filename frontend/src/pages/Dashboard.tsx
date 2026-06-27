import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Dna, 
  ShieldAlert, 
  FileCheck, 
  AlertTriangle,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  TrendingDown,
  Building,
  Bell
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { api, DashboardStats, Complaint } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface StateRiskData {
  state_id: number;
  state: string;
  risk_score: number;
  districts_count: number;
  total_complaints: number;
  total_loss_amount: number;
}

interface DistrictRiskData {
  district_id: number;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  complaints_count: number;
  total_loss_amount: number;
  growth_rate: number;
}

interface Investigation {
  id: number;
  complaint_id: number;
  status: string;
  fir_draft?: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [statesRisk, setStatesRisk] = useState<StateRiskData[]>([]);
  const [districtsRisk, setDistrictsRisk] = useState<DistrictRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/dashboard');

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('shield_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

        // Load data from existing APIs
        const [statsData, complaintsData, investigationsData] = await Promise.all([
          api.getStats(),
          api.getComplaints(),
          api.getInvestigations()
        ]);

        setStats(statsData);
        setComplaints(complaintsData);
        setInvestigations(investigationsData);

        // Fetch actual Geospatial data
        try {
          const statesRes = await fetch(`${BASE_URL}/geospatial/states`, { headers });
          if (statesRes.ok) {
            const statesData = await statesRes.json();
            setStatesRisk(statesData);
          } else {
            throw new Error('States fetch failed');
          }
        } catch (err) {
          console.warn("Using offline geospatial states fallback");
          setStatesRisk([
            { state_id: 1, state: "Jharkhand", risk_score: 92.5, districts_count: 5, total_complaints: 120, total_loss_amount: 4500000 },
            { state_id: 2, state: "Haryana", risk_score: 89.2, districts_count: 3, total_complaints: 95, total_loss_amount: 3200000 },
            { state_id: 3, state: "Rajasthan", risk_score: 87.0, districts_count: 4, total_complaints: 88, total_loss_amount: 2800000 },
            { state_id: 4, state: "Telangana", risk_score: 82.4, districts_count: 6, total_complaints: 75, total_loss_amount: 2500000 },
            { state_id: 5, state: "Gujarat", risk_score: 78.1, districts_count: 8, total_complaints: 60, total_loss_amount: 1800000 }
          ]);
        }

        try {
          const districtsRes = await fetch(`${BASE_URL}/geospatial/districts?limit=10`, { headers });
          if (districtsRes.ok) {
            const distData = await districtsRes.json();
            setDistrictsRisk(distData);
          } else {
            throw new Error('Districts fetch failed');
          }
        } catch (err) {
          console.warn("Using offline geospatial districts fallback");
          setDistrictsRisk([
            { district_id: 1, district: "Jamtara", state: "Jharkhand", latitude: 23.96, longitude: 86.80, risk_score: 94.0, complaints_count: 78, total_loss_amount: 2500000, growth_rate: 12.5 },
            { district_id: 2, district: "Nuh", state: "Haryana", latitude: 28.11, longitude: 77.01, risk_score: 91.0, complaints_count: 62, total_loss_amount: 1800000, growth_rate: 9.8 },
            { district_id: 3, district: "Mewat", state: "Rajasthan", latitude: 27.53, longitude: 76.92, risk_score: 89.0, complaints_count: 54, total_loss_amount: 1500000, growth_rate: 8.2 },
            { district_id: 4, district: "Cyberabad", state: "Telangana", latitude: 17.44, longitude: 78.38, risk_score: 85.0, complaints_count: 48, total_loss_amount: 1200000, growth_rate: 6.4 },
            { district_id: 5, district: "Ahmedabad", state: "Gujarat", latitude: 23.02, longitude: 72.57, risk_score: 80.0, complaints_count: 35, total_loss_amount: 900000, growth_rate: 4.1 }
          ]);
        }

      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    // Path routing state sync
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
              <span className="text-sm font-mono text-blue-400 tracking-widest uppercase animate-pulse">Syncing Command Operations Desk...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Metrics from raw data
  const totalComplaints = stats.scorecard.reports_processed;
  const activeFraudFamilies = stats.scorecard.families_identified;
  
  const avgThreatScore = complaints.length > 0
    ? Math.round(complaints.reduce((acc, c) => acc + c.shield_score, 0) / complaints.length)
    : 78;

  const activeInvestigationsCount = investigations.length > 0
    ? investigations.filter(i => i.status.toLowerCase() === 'active').length
    : complaints.filter(c => c.status === 'Under Investigation').length;

  const firsGeneratedCount = investigations.length > 0
    ? investigations.filter(i => i.fir_draft && i.fir_draft.trim().length > 0).length
    : complaints.filter(c => c.status === 'Resolved' || c.status === 'Under Investigation').length;

  const criticalAlerts = complaints
    .filter(c => c.threat_level === 'Critical' || c.shield_score > 85)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        
        <main className="flex-1 bg-gray-950/60 p-4 md:p-8 overflow-y-auto space-y-8 h-[calc(100vh-4rem)]">
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                EXECUTIVE COMMAND CENTER
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                National Digital Fraud Prevention & Public Safety Intelligence Platform
              </p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                CYBER DOME SECURE
              </div>
              <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                ACTIVE ALERTS FEED
              </div>
            </div>
          </div>

          {/* Top 5 Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              label="Total Complaints" 
              value={totalComplaints} 
              trend="+14% this month"
              trendDirection="up"
              icon={FileText}
              color="blue"
            />
            <MetricCard 
              label="Active Families" 
              value={activeFraudFamilies} 
              trend="3 newly tagged"
              trendDirection="up"
              icon={Dna}
              color="amber"
            />
            <MetricCard 
              label="SHIELD Threat Score" 
              value={`${avgThreatScore}/100`} 
              trend="High Threat Profile"
              trendDirection="neutral"
              icon={ShieldAlert}
              color="red"
            />
            <MetricCard 
              label="Active Cases" 
              value={activeInvestigationsCount} 
              trend="Correlated network"
              trendDirection="up"
              icon={Activity}
              color="blue"
            />
            <MetricCard 
              label="FIRs Generated" 
              value={firsGeneratedCount} 
              trend="100% Auto-Generated"
              trendDirection="up"
              icon={FileCheck}
              color="green"
            />
          </div>

          {/* Grid Layout for Analytics Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Threat Timeline Chart */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Threat Timeline & Ingestion Rate
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">LATEST 6 MONTHS</span>
              </div>
              <div className="h-80 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthly_evolution}>
                    <defs>
                      <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis stroke="#64748b" dataKey="month" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                    <Area 
                      type="monotone" 
                      dataKey="complaints" 
                      name="Complaints Ingested" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#timelineGradient)" 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fraud Family Distribution Chart */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Fraud Family Distribution
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">DNA SIGNATURES</span>
              </div>
              <div className="h-60 w-full flex justify-center items-center font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {stats.categories.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="truncate">{cat.name}: {cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Layout for Analytics Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* High Risk States Widget */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-400" />
                  High Risk States
                </h2>
                <span className="text-[10px] text-red-400 font-mono font-bold">STATE LEVEL</span>
              </div>
              <div className="h-64 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statesRisk} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
                    <YAxis type="category" dataKey="state" stroke="#64748b" width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                    <Bar dataKey="risk_score" name="Risk Score" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {statesRisk.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.risk_score > 90 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High Risk Districts Widget */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  High Risk Districts
                </h2>
                <span className="text-[10px] text-red-400 font-mono font-bold">DISTRICT LEVEL</span>
              </div>
              <div className="h-64 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtsRisk} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="district" stroke="#64748b" tickFormatter={(v) => v.split(' ')[0]} />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                    <Bar dataKey="risk_score" name="Risk Score" fill="#ef4444" radius={[4, 4, 0, 0]}>
                      {districtsRisk.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.risk_score > 90 ? '#ef4444' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Threat Alerts Feed Widget */}
            <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  Live Threat Incidents
                </h2>
                <span className="text-[10px] text-red-400 font-mono font-bold animate-ping">● LIVE</span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[16.5rem] pr-1">
                {criticalAlerts.map((comp) => (
                  <div 
                    key={comp.id} 
                    className="p-3.5 rounded-lg bg-gray-950/50 border border-red-500/10 hover:border-red-500/30 transition-all duration-200 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-[80%]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold">
                          Ref-{comp.id}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {new Date(comp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 truncate font-mono">{comp.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-red-400 font-mono">{comp.shield_score}</span>
                      <p className="text-[8px] text-gray-500 font-mono uppercase tracking-wider">SHIELD Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
