import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Dna, 
  ShieldAlert, 
  FileCheck, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { api, DashboardStats, Complaint } from '../services/api';
import { MetricCard } from './MetricCard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await api.getStats();
        const complaintsData = await api.getComplaints();
        setStats(statsData);
        setComplaints(complaintsData);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex-1 bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin"></div>
          <span className="text-sm font-mono text-blue-400 tracking-widest uppercase">Syncing Command Systems...</span>
        </div>
      </div>
    );
  }

  // Blended average threat score calculation
  const avgThreatScore = complaints.length > 0
    ? Math.round(complaints.reduce((acc, c) => acc + c.shield_score, 0) / complaints.length)
    : 78;

  const activeInvestigations = complaints.filter(c => c.status === 'Under Investigation').length;
  const resolvedInvestigations = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="flex-1 bg-gray-950 p-8 overflow-y-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-blue-500/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wider font-mono">FIOS OPERATIONS CENTER</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">National Cyber Threat & Fraud Intelligence Dashboard</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          LIVE INTEL STREAMING
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Total Reports Ingested" 
          value={stats.scorecard.reports_processed} 
          trend="+12% from yesterday"
          trendDirection="up"
          icon={FileText}
          color="blue"
        />
        <MetricCard 
          label="Active Fraud Families" 
          value={stats.scorecard.families_identified} 
          trend="3 new groups flagged"
          trendDirection="up"
          icon={Dna}
          color="amber"
        />
        <MetricCard 
          label="SHIELD Threat Score" 
          value={`${avgThreatScore}/100`} 
          trend="Critical risk category"
          trendDirection="neutral"
          icon={ShieldAlert}
          color="red"
        />
        <MetricCard 
          label="FIRs Generated" 
          value={resolvedInvestigations + activeInvestigations} 
          trend="84.6% Auto-dispatch rate"
          trendDirection="up"
          icon={FileCheck}
          color="green"
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly evolution */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
          <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Monthly Fraud Ingestion & Threat Trends
          </h2>
          <div className="h-80 w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthly_evolution}>
                <defs>
                  <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis stroke="#64748b" dataKey="month" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                <Area type="monotone" dataKey="complaints" name="Reports" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComplaints)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories ratio */}
        <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
          <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Fraud Families Distribution
          </h2>
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
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono">
            {stats.categories.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-gray-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="truncate">{cat.name}: {cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* High Risk Districts */}
        <div className="p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-6">
          <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            High Risk Target Districts
          </h2>
          <div className="h-64 w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.districts}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis stroke="#64748b" dataKey="district" tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                <Bar dataKey="count" name="Report Count" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  {stats.districts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk > 90 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Threat Feed */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-gray-900/40 backdrop-blur-md border border-blue-500/10 space-y-4">
          <h2 className="text-sm font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Urgent Incident Ingestion Queue
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[17.5rem] pr-2">
            {complaints.slice(0, 5).map((comp) => (
              <div 
                key={comp.id} 
                className="p-4 rounded-lg bg-gray-950/50 border border-blue-500/5 hover:border-blue-500/20 transition-colors flex items-center justify-between"
              >
                <div className="space-y-1.5 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                      Ref-{comp.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      comp.threat_level === 'Critical' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}>
                      {comp.threat_level}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(comp.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 truncate font-mono">{comp.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white font-mono">{comp.shield_score}</span>
                  <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">SHIELD Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
