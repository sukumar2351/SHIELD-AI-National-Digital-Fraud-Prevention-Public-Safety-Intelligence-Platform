import React, { useEffect, useState } from 'react';
import { 
  FileSearch, 
  Search, 
  Filter, 
  TrendingUp, 
  Activity, 
  FileText, 
  Download, 
  Clock, 
  Users, 
  ShieldCheck, 
  AlertTriangle,
  FileCheck,
  ChevronRight,
  RefreshCw,
  Scale
} from 'lucide-react';
import { api, Complaint } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MetricCard } from '../components/MetricCard';

interface InvestigationDossier {
  case_id: number;
  complaint_id: number;
  executive_summary: string;
  key_findings: string;
  connected_entities: any[];
  fraud_family: string;
  risk_assessment: {
    threat_level: string;
    priority: string;
    victim_impact_score: number;
    network_infrastructure_scale: number;
  };
  recommended_actions: string[];
  timelines: any[];
}

export const InvestigationCenter: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/investigations');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [threatFilter, setThreatFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [dossier, setDossier] = useState<InvestigationDossier | null>(null);
  const [firDraft, setFirDraft] = useState<string>('');
  const [legalMapping, setLegalMapping] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'reasoning' | 'fir'>('summary');
  const [analyzingCaseId, setAnalyzingCaseId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<string>('pdf');

  // Load complaints queue
  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
      if (data.length > 0 && !selectedComplaint) {
        // Auto-select first complaint
        setSelectedComplaint(data[0]);
      }
    } catch (e) {
      console.error("Failed to load cases", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  // Fetch dossier details when selected complaint changes
  useEffect(() => {
    if (!selectedComplaint) return;
    
    const fetchDossier = async () => {
      const token = localStorage.getItem('shield_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

      try {
        // In the database model, each complaint has a unique investigation if run
        // We'll query using the complaint ID mapped as case ID or lookup
        const res = await fetch(`${BASE_URL}/investigation/report/${selectedComplaint.id}`, { headers });
        if (res.ok) {
          const dossierData = await res.json();
          setDossier(dossierData);

          // Get compiled FIR
          const firRes = await fetch(`${BASE_URL}/fir/${selectedComplaint.id}`, { headers });
          if (firRes.ok) {
            const firData = await firRes.json();
            setFirDraft(firData.fir_draft);
            setLegalMapping(firData.legal_mapping);
          } else {
            setFirDraft('');
            setLegalMapping(null);
          }
        } else {
          // No dossier exists yet for this complaint
          setDossier(null);
          setFirDraft('');
          setLegalMapping(null);
        }
      } catch (err) {
        console.warn("Using offline dossier fallbacks");
        setDossier(null);
        setFirDraft('');
        setLegalMapping(null);
      }
    };
    fetchDossier();
  }, [selectedComplaint]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  // Trigger Autonomous Investigator AI Agent
  const handleTriggerAnalysis = async (complaintId: number) => {
    setAnalyzingCaseId(complaintId);
    const token = localStorage.getItem('shield_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

    try {
      const res = await fetch(`${BASE_URL}/investigation/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ complaint_id: complaintId })
      });
      if (res.ok) {
        // Auto compile FIR
        await fetch(`${BASE_URL}/fir/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ case_id: complaintId })
        });
        
        // Reload complaints & reset selection
        const updatedComplaints = await api.getComplaints();
        setComplaints(updatedComplaints);
        const matched = updatedComplaints.find(c => c.id === complaintId);
        if (matched) setSelectedComplaint(matched);
      }
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  // Trigger Browser Download for Exported FIR
  const handleExportFIR = () => {
    if (!selectedComplaint) return;
    const token = localStorage.getItem('shield_token');
    const authQuery = token ? `?format=${exportFormat}&token=${token}` : `?format=${exportFormat}`;
    const exportUrl = `https://backend-gray-alpha-78.vercel.app/api/v1/fir/${selectedComplaint.id}/export${authQuery}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', `FIR-CASE-${selectedComplaint.id}.${exportFormat}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering & Sorting Logic
  const filteredCases = complaints
    .filter(c => {
      const matchesSearch = 
        c.id.toString().includes(searchQuery) ||
        (c.citizen_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'All' || 
        (statusFilter === 'Active' && c.status === 'Under Investigation') ||
        (statusFilter === 'Resolved' && c.status === 'Resolved') ||
        (statusFilter === 'Pending' && c.status === 'Pending');

      const matchesThreat = 
        threatFilter === 'All' || c.threat_level === threatFilter;

      return matchesSearch && matchesStatus && matchesThreat;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'oldest') return a.id - b.id;
      if (sortBy === 'risk') return b.shield_score - a.shield_score;
      return 0;
    });

  // Scorecard aggregates
  const totalCases = complaints.length;
  const criticalThreats = complaints.filter(c => c.threat_level === 'Critical').length;
  const activeCases = complaints.filter(c => c.status === 'Under Investigation').length;
  const firsCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Under Investigation').length;

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
                <FileSearch className="w-8 h-8 text-blue-500 animate-pulse" />
                INVESTIGATION OPERATIONS DESK
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                Autonomous AI Investigation, Legal Mapping, and Auto-FIR Generation
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={loadComplaints}
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-mono text-xs flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                SYNC INGESTION QUEUE
              </button>
            </div>
          </div>

          {/* Metrics scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            <MetricCard label="Total Ingested Cases" value={totalCases} icon={FileText} color="blue" />
            <MetricCard label="Critical Threats" value={criticalThreats} icon={AlertTriangle} color="red" />
            <MetricCard label="Active Inquiries" value={activeCases} icon={Activity} color="amber" />
            <MetricCard label="FIRs Auto-Compiled" value={firsCount} icon={FileCheck} color="green" />
          </div>

          {/* Split screen content layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
            {/* Left Queue Panel */}
            <div className="flex-1 rounded-xl bg-gray-950/80 border border-blue-500/15 p-5 flex flex-col space-y-4 glass-panel max-h-[650px] overflow-hidden">
              <h2 className="text-xs font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Case Ingestion Queue ({filteredCases.length})
              </h2>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative col-span-2">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by ID, name, scam details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-blue-500/20 rounded-lg text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 bg-gray-950 border border-blue-500/20 rounded-lg text-[11px] font-mono text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Active">Under Investigation</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* Priority Sorting */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1.5 bg-gray-950 border border-blue-500/20 rounded-lg text-[11px] font-mono text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  <option value="newest">Newest Ingest</option>
                  <option value="oldest">Oldest Ingest</option>
                  <option value="risk">Highest Risk</option>
                </select>
              </div>

              {/* Ingest queue list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredCases.map((comp) => {
                  const isSelected = selectedComplaint?.id === comp.id;
                  const isAnalyzing = analyzingCaseId === comp.id;
                  return (
                    <div 
                      key={comp.id}
                      onClick={() => setSelectedComplaint(comp)}
                      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected 
                          ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                          : 'bg-gray-950/40 border-blue-500/5 hover:border-blue-500/20'
                      }`}
                    >
                      <div className="space-y-2 max-w-[70%]">
                        <div className="flex items-center gap-2 flex-wrap font-mono">
                          <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[10px] font-bold">
                            CASE-{comp.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            comp.threat_level === 'Critical' 
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                              : comp.threat_level === 'High Risk' 
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {comp.threat_level}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(comp.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2 font-mono">{comp.description}</p>
                      </div>

                      <div className="flex sm:flex-col items-end gap-2 shrink-0 justify-between sm:justify-start">
                        <div className="text-right">
                          <span className="text-sm font-bold text-white font-mono">{comp.shield_score}</span>
                          <p className="text-[8px] text-gray-500 font-mono uppercase tracking-wider">SHIELD Score</p>
                        </div>

                        {comp.status === 'Pending' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerAnalysis(comp.id);
                            }}
                            disabled={isAnalyzing}
                            className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-mono text-[9px] font-bold transition-all flex items-center gap-1"
                          >
                            {isAnalyzing ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Activity className="w-2.5 h-2.5 animate-pulse" />
                            )}
                            {isAnalyzing ? 'CORRELATING...' : 'TRIGGER AGENT'}
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] font-bold uppercase flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            ANALYZED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredCases.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500 font-mono text-xs uppercase tracking-wider">
                    <FileSearch className="w-8 h-8 text-gray-600 mb-2" />
                    No matching cases in docket queue
                  </div>
                )}
              </div>
            </div>

            {/* Right Detailed Dossier Panel */}
            <div className="w-full lg:w-[450px] rounded-xl bg-gray-950/80 border border-blue-500/15 p-5 flex flex-col glass-panel max-h-[650px] overflow-hidden">
              {selectedComplaint ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Selected Header */}
                  <div className="border-b border-blue-500/10 pb-4 shrink-0 font-mono">
                    <span className="text-[9px] text-gray-500 block uppercase">Currently inspecting dossier</span>
                    <h3 className="text-base font-bold text-white flex items-center justify-between">
                      <span>CASE-{selectedComplaint.id}: {selectedComplaint.citizen_name || 'Anonymous citizen'}</span>
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                    </h3>
                  </div>

                  {/* Tabs bar */}
                  <div className="flex border-b border-blue-500/10 text-[10px] font-mono shrink-0 select-none">
                    <button 
                      onClick={() => setActiveTab('summary')}
                      className={`flex-1 py-2.5 text-center border-b transition-colors ${activeTab === 'summary' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      SUMMARY
                    </button>
                    <button 
                      onClick={() => setActiveTab('timeline')}
                      className={`flex-1 py-2.5 text-center border-b transition-colors ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      TIMELINE
                    </button>
                    <button 
                      onClick={() => setActiveTab('reasoning')}
                      className={`flex-1 py-2.5 text-center border-b transition-colors ${activeTab === 'reasoning' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      AI PROCESS
                    </button>
                    <button 
                      onClick={() => setActiveTab('fir')}
                      className={`flex-1 py-2.5 text-center border-b transition-colors ${activeTab === 'fir' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                      FIR DRAFT
                    </button>
                  </div>

                  {/* Tab contents scroll view */}
                  <div className="flex-1 overflow-y-auto py-4">
                    {dossier ? (
                      <>
                        {/* Summary Tab */}
                        {activeTab === 'summary' && (
                          <div className="space-y-4 font-mono text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-500 block uppercase">Executive Case Summary</span>
                              <p className="p-3 rounded bg-gray-950/60 border border-blue-500/5 text-gray-300">{dossier.executive_summary}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-500 block uppercase">Core Findings & Target Identifiers</span>
                              <p className="p-3 rounded bg-gray-950/60 border border-blue-500/5 text-gray-300">{dossier.key_findings}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-gray-500 block uppercase">Dispatched Actions & Recommendations</span>
                              <ul className="p-3 rounded bg-gray-950/60 border border-blue-500/5 text-gray-300 list-disc pl-5 space-y-1.5">
                                {dossier.recommended_actions.map((act, i) => (
                                  <li key={i}>{act}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Timeline Tab */}
                        {activeTab === 'timeline' && (
                          <div className="space-y-4 font-mono text-xs pl-3 border-l border-blue-500/20 ml-2 py-2">
                            {dossier.timelines.map((item: any, i: number) => (
                              <div key={i} className="relative space-y-1">
                                <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10"></div>
                                <span className="text-[10px] text-blue-400 font-bold block">{item.time || 'Timestamp'}</span>
                                <p className="text-gray-300">{item.event || item.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* AI Process Reasoning Tab */}
                        {activeTab === 'reasoning' && (
                          <div className="space-y-4 font-mono text-xs">
                            <span className="text-[10px] text-gray-500 block uppercase">Investigator Agent Chain-of-Thought logs</span>
                            <div className="space-y-3">
                              {/* If suspects were found */}
                              {dossier.connected_entities && dossier.connected_entities.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] text-red-400 flex items-center gap-1 uppercase">
                                    <Users className="w-3.5 h-3.5" /> Correlated suspect profiles
                                  </span>
                                  <div className="space-y-2">
                                    {dossier.connected_entities.map((sus: any, i: number) => (
                                      <div key={i} className="p-3 bg-gray-950/70 border border-red-500/10 rounded-lg text-[10px]">
                                        <p className="text-white font-bold">{sus.name}</p>
                                        <p className="text-gray-400 text-[9px] uppercase tracking-wider mt-0.5">{sus.role}</p>
                                        {sus.phone && <p className="text-blue-400 mt-1">Phone: {sus.phone}</p>}
                                        {sus.upi && <p className="text-cyan-400">UPI: {sus.upi}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="p-3 rounded bg-gray-950/60 border border-blue-500/5 text-gray-300 leading-relaxed whitespace-pre-wrap">
                                [AI LOG] Analyzing narrative vectors...
                                [AI LOG] Correlating UPI and Phone nodes against active clusters...
                                [AI LOG] Fraud Family linked: {dossier.fraud_family}.
                                [AI LOG] Autopilot case file constructed. Dispatching NPCI network alerts.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* FIR Draft Tab */}
                        {activeTab === 'fir' && (
                          <div className="space-y-4 font-mono text-xs flex flex-col h-full overflow-hidden">
                            {legalMapping && (
                              <div className="p-3 bg-blue-950/20 border border-blue-500/15 rounded-lg flex items-center gap-3 shrink-0">
                                <Scale className="w-5 h-5 text-blue-400 shrink-0" />
                                <div className="text-[10px]">
                                  <span className="text-white font-bold block">Accused BNS / IT Sections mapped:</span>
                                  <span className="text-gray-400">
                                    {legalMapping.bns_sections || '318 BNS 2023'}, {legalMapping.it_sections || '66D IT Act 2000'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {firDraft ? (
                              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                                <textarea
                                  readOnly
                                  value={firDraft}
                                  className="flex-1 w-full p-3 bg-gray-950 border border-blue-500/10 rounded-lg text-[10px] font-mono text-gray-300 resize-none focus:outline-none min-h-[220px]"
                                />
                                <div className="flex items-center gap-3 shrink-0">
                                  <select 
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value)}
                                    className="px-2 py-1.5 bg-gray-950 border border-blue-500/20 rounded-lg text-[11px] text-white focus:outline-none"
                                  >
                                    <option value="pdf">PDF Format</option>
                                    <option value="docx">Word (.docx)</option>
                                    <option value="json">JSON Metadata</option>
                                  </select>
                                  <button
                                    onClick={handleExportFIR}
                                    className="flex-1 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-400 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    DOWNLOAD RECORD
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 text-gray-500 text-center uppercase tracking-wider py-10">
                                No compiled FIR docket draft. Trigger case analysis first.
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-60 flex flex-col items-center justify-center text-center p-4">
                        <FileSearch className="w-10 h-10 text-gray-600 mb-2" />
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block">No Active Case Dossier</span>
                        <p className="text-[10px] text-gray-600 font-mono mt-2">
                          Trigger the Autonomous AI Investigator Agent on this case in the queue to build the docket.
                        </p>
                        {selectedComplaint.status === 'Pending' && (
                          <button
                            onClick={() => handleTriggerAnalysis(selectedComplaint.id)}
                            className="mt-4 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-[11px] font-mono font-bold transition-all"
                          >
                            RUN AI INVESTIGATION NOW
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 font-mono">
                  <FileSearch className="w-10 h-10 text-gray-600 animate-pulse mb-3" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Select a case from the queue to load the digital dossier
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InvestigationCenter;
