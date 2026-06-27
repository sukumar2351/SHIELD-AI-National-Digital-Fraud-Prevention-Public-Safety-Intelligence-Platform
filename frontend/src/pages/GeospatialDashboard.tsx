import React, { useEffect, useState } from 'react';
import { 
  Map, 
  MapPin, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Search, 
  Filter, 
  Compass, 
  RefreshCw, 
  ChevronRight,
  TrendingDown,
  Percent,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { api } from '../services/api';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MetricCard } from '../components/MetricCard';

interface OverviewStats {
  total_districts: number;
  total_states: number;
  active_hotspots_count: number;
  average_risk_score: number;
  top_high_risk_district: string;
  top_high_risk_state: string;
}

interface Hotspot {
  hotspot_id: number;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  intensity: number;
  growth_rate: number;
  status: string;
  complaints_count: number;
  total_loss_amount: number;
}

interface StateRisk {
  state_id: number;
  state: string;
  risk_score: number;
  districts_count: number;
  total_complaints: number;
  total_loss_amount: number;
}

interface DistrictRisk {
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

export const GeospatialDashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [statesRisk, setStatesRisk] = useState<StateRisk[]>([]);
  const [districtsRisk, setDistrictsRisk] = useState<DistrictRisk[]>([]);
  const [families, setFamilies] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/geospatial');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRisk | null>(null);
  const [selectedState, setSelectedState] = useState<string>('All');
  const [hoveredDistrict, setHoveredDistrict] = useState<any | null>(null);

  // India Boundary Coordinate Projection Logic
  const minLng = 68.0;
  const maxLng = 98.0;
  const minLat = 7.0;
  const maxLat = 38.0;
  const mapWidth = 500;
  const mapHeight = 550;

  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    // Invert Y because SVG coordinates start from top-left (0,0)
    const y = mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight;
    return { x, y };
  };

  // Fallback structures for sandbox environments
  const fallbackOverview = {
    total_districts: 20,
    total_states: 12,
    active_hotspots_count: 5,
    average_risk_score: 83.4,
    top_high_risk_district: "Jamtara (Jharkhand)",
    top_high_risk_state: "Jharkhand"
  };

  const fallbackHotspots = [
    { hotspot_id: 1, district: "Jamtara", state: "Jharkhand", latitude: 23.96, longitude: 86.80, intensity: 94.0, growth_rate: 12.5, status: "Active", complaints_count: 78, total_loss_amount: 2500000 },
    { hotspot_id: 2, district: "Nuh", state: "Haryana", latitude: 28.11, longitude: 77.01, intensity: 91.0, growth_rate: 9.8, status: "Active", complaints_count: 62, total_loss_amount: 1800000 },
    { hotspot_id: 3, district: "Mewat", state: "Rajasthan", latitude: 27.53, longitude: 76.92, intensity: 89.0, growth_rate: 8.2, status: "Active", complaints_count: 54, total_loss_amount: 1500000 },
    { hotspot_id: 4, district: "Cyberabad", state: "Telangana", latitude: 17.44, longitude: 78.38, intensity: 85.0, growth_rate: 6.4, status: "Active", complaints_count: 48, total_loss_amount: 1200000 },
    { hotspot_id: 5, district: "Ahmedabad", state: "Gujarat", latitude: 23.02, longitude: 72.57, intensity: 80.0, growth_rate: 4.1, status: "Emerging", complaints_count: 35, total_loss_amount: 900000 }
  ];

  const fallbackStates = [
    { state_id: 1, state: "Jharkhand", risk_score: 92.5, districts_count: 5, total_complaints: 120, total_loss_amount: 4500000 },
    { state_id: 2, state: "Haryana", risk_score: 89.2, districts_count: 3, total_complaints: 95, total_loss_amount: 3200000 },
    { state_id: 3, state: "Rajasthan", risk_score: 87.0, districts_count: 4, total_complaints: 88, total_loss_amount: 2800000 },
    { state_id: 4, state: "Telangana", risk_score: 82.4, districts_count: 6, total_complaints: 75, total_loss_amount: 2500000 },
    { state_id: 5, state: "Gujarat", risk_score: 78.1, districts_count: 8, total_complaints: 60, total_loss_amount: 1800000 }
  ];

  const fallbackDistricts = [
    { district_id: 1, district: "Jamtara", state: "Jharkhand", latitude: 23.96, longitude: 86.80, risk_score: 94.0, complaints_count: 78, total_loss_amount: 2500000, growth_rate: 12.5 },
    { district_id: 2, district: "Nuh", state: "Haryana", latitude: 28.11, longitude: 77.01, risk_score: 91.0, complaints_count: 62, total_loss_amount: 1800000, growth_rate: 9.8 },
    { district_id: 3, district: "Mewat", state: "Rajasthan", latitude: 27.53, longitude: 76.92, risk_score: 89.0, complaints_count: 54, total_loss_amount: 1500000, growth_rate: 8.2 },
    { district_id: 4, district: "Cyberabad", state: "Telangana", latitude: 17.44, longitude: 78.38, risk_score: 85.0, complaints_count: 48, total_loss_amount: 1200000, growth_rate: 6.4 },
    { district_id: 5, district: "Ahmedabad", state: "Gujarat", latitude: 23.02, longitude: 72.57, risk_score: 80.0, complaints_count: 35, total_loss_amount: 900000, growth_rate: 4.1 },
    { district_id: 6, district: "Bengaluru", state: "Karnataka", latitude: 12.97, longitude: 77.59, risk_score: 75.0, complaints_count: 30, total_loss_amount: 800000, growth_rate: 3.5 },
    { district_id: 7, district: "Pune", state: "Maharashtra", latitude: 18.52, longitude: 73.85, risk_score: 72.0, complaints_count: 28, total_loss_amount: 750000, growth_rate: 2.8 }
  ];

  const loadGeospatialData = async () => {
    setLoading(true);
    const token = localStorage.getItem('shield_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

    try {
      // 1. Fetch Overview
      let ovData = null;
      try {
        const ovRes = await fetch(`${BASE_URL}/geospatial/overview`, { headers });
        if (ovRes.ok) ovData = await ovRes.json();
      } catch (e) {
        ovData = fallbackOverview;
      }
      setOverview(ovData);

      // 2. Fetch Hotspots
      let hsData = [];
      try {
        const hsRes = await fetch(`${BASE_URL}/geospatial/hotspots`, { headers });
        if (hsRes.ok) hsData = await hsRes.json();
      } catch (e) {
        hsData = fallbackHotspots;
      }
      setHotspots(hsData);

      // 3. Fetch States
      let stData = [];
      try {
        const stRes = await fetch(`${BASE_URL}/geospatial/states`, { headers });
        if (stRes.ok) stData = await stRes.json();
      } catch (e) {
        stData = fallbackStates;
      }
      setStatesRisk(stData);

      // 4. Fetch Districts
      let dsData = [];
      try {
        const dsRes = await fetch(`${BASE_URL}/geospatial/districts?limit=50`, { headers });
        if (dsRes.ok) dsData = await dsRes.json();
      } catch (e) {
        dsData = fallbackDistricts;
      }
      setDistrictsRisk(dsData);
      if (dsData.length > 0) {
        setSelectedDistrict(dsData[0]);
      }

      // 5. Fetch Fraud Families for filter
      try {
        const famRes = await fetch(`${BASE_URL}/dna/families`, { headers });
        if (famRes.ok) {
          const famData = await famRes.json();
          setFamilies(famData);
        }
      } catch (e) {
        setFamilies([
          { id: 1, family_code: "DIGITAL_ARREST_2026_001", name: "CBI Custom Arrest Syndicate" },
          { id: 2, family_code: "UPI_FRAUD_2026_003", name: "Utility Bill Refund Ring" }
        ]);
      }

    } catch (err) {
      console.error("Geospatial fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeospatialData();
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  // Filter Overlay Spread by Fraud Family ID
  const handleFamilyFilter = async (familyId: string) => {
    setSelectedFamily(familyId);
    if (!familyId) {
      // Reload normal districts
      loadGeospatialData();
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('shield_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

    try {
      const res = await fetch(`${BASE_URL}/geospatial/family-spread/${familyId}`, { headers });
      if (res.ok) {
        const spreadData = await res.json();
        
        // Map spread details back to district structures
        const mappedDistricts = spreadData.spread.map((item: any) => ({
          district_id: item.district_id,
          district: item.district,
          state: item.state,
          latitude: item.latitude,
          longitude: item.longitude,
          risk_score: Math.round(item.concentration_percentage * 100),
          complaints_count: item.active_complaints,
          total_loss_amount: item.active_complaints * 40000,
          growth_rate: 5.0
        }));

        setDistrictsRisk(mappedDistricts);
        if (mappedDistricts.length > 0) {
          setSelectedDistrict(mappedDistricts[0]);
        } else {
          setSelectedDistrict(null);
        }
      }
    } catch (e) {
      console.warn("Using offline mock family spread overlay");
      // Simulate filtering by code
      const filtered = districtsRisk.filter(d => d.risk_score > 80);
      setDistrictsRisk(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredDistrictsTable = districtsRisk.filter(d => {
    const matchesSearch = d.district.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === 'All' || d.state === selectedState;
    return matchesSearch && matchesState;
  });

  // Hotspot threat growth trend dataset
  const trendChartData = [
    { name: 'Wk 1', Jamtara: 45, Nuh: 30, Mewat: 25 },
    { name: 'Wk 2', Jamtara: 52, Nuh: 38, Mewat: 32 },
    { name: 'Wk 3', Jamtara: 59, Nuh: 42, Mewat: 39 },
    { name: 'Wk 4', Jamtara: 64, Nuh: 49, Mewat: 44 },
    { name: 'Wk 5', Jamtara: 70, Nuh: 55, Mewat: 50 },
    { name: 'Wk 6', Jamtara: selectedDistrict?.complaints_count || 78, Nuh: 62, Mewat: 54 }
  ];

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
                <Map className="w-8 h-8 text-blue-500 animate-pulse" />
                NATIONAL THREAT INTELLIGENCE MAP
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                Geospatial Cyber Hotspot Density & Syndicate Spread Analytics
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={loadGeospatialData}
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-mono text-xs flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                REFRESH GEOLOCATIONS
              </button>
            </div>
          </div>

          {/* Metric Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            <MetricCard label="Monitored Districts" value={overview?.total_districts || 20} icon={MapPin} color="blue" />
            <MetricCard label="Active Hotspots" value={overview?.active_hotspots_count || 5} icon={ShieldAlert} color="red" />
            <MetricCard label="Average Risk Score" value={`${overview?.average_risk_score || 83.4}/100`} icon={Percent} color="amber" />
            <MetricCard label="Highest Risk Zone" value={overview?.top_high_risk_district.split(' ')[0] || "Jamtara"} icon={TrendingUp} color="red" />
          </div>

          {/* Core Interactive Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[550px]">
            {/* SVG India Threat Map */}
            <div className="flex-1 rounded-xl bg-gray-950/80 border border-blue-500/15 p-5 relative overflow-hidden glass-panel min-h-[500px] flex flex-col items-center justify-center">
              {loading && (
                <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase">Plotting Threat coordinates...</span>
                  </div>
                </div>
              )}

              {/* Map Floating HUD Info */}
              <div className="absolute top-4 left-4 p-4 rounded-lg bg-gray-950/80 border border-blue-500/10 backdrop-blur-md z-10 font-mono space-y-2">
                <span className="text-[9px] text-gray-500 block uppercase">Cyber Threat Heat Index</span>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                  <span>Critical Risk (&gt;90)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span>High Risk (75-90)</span>
                </div>
              </div>

              {/* SVG Coordinate Grid Map */}
              <svg 
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                className="w-full max-w-[420px] aspect-[500/550] select-none text-white transition-all duration-300"
              >
                {/* Visual coordinate scanning background grid */}
                <defs>
                  <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Stylized outline projection path (approximate boundary visualization box) */}
                <path 
                  d="M 120 500 L 90 400 L 110 320 L 150 250 L 220 180 L 280 80 L 320 150 L 350 220 L 400 240 L 420 280 L 360 300 L 340 380 L 280 430 L 210 520 Z"
                  fill="rgba(59, 130, 246, 0.02)"
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Hotspot Radial Heat Pulsations & District dots */}
                {districtsRisk.map((ds) => {
                  const { x, y } = projectCoords(ds.latitude, ds.longitude);
                  const isSelected = selectedDistrict?.district === ds.district;
                  const isCritical = ds.risk_score > 90;
                  
                  return (
                    <g 
                      key={ds.district_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedDistrict(ds)}
                      onMouseEnter={() => setHoveredDistrict(ds)}
                      onMouseLeave={() => setHoveredDistrict(null)}
                    >
                      {/* Pulse Glow ring for critical threat zones */}
                      {isCritical && (
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={14} 
                          fill="rgba(239, 68, 68, 0.15)" 
                          className="animate-ping" 
                        />
                      )}
                      
                      {/* Outer boundary hover highlights */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isSelected ? 10 : 6} 
                        fill={isCritical ? '#ef4444' : '#f59e0b'} 
                        fillOpacity={isSelected ? 0.9 : 0.6}
                        stroke="#fff"
                        strokeWidth={isSelected ? 1.5 : 0}
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}

                {/* Hover Tooltip Overlay inside SVG */}
                {hoveredDistrict && (
                  <g transform={`translate(${projectCoords(hoveredDistrict.latitude, hoveredDistrict.longitude).x + 12}, ${projectCoords(hoveredDistrict.latitude, hoveredDistrict.longitude).y - 12})`}>
                    <rect 
                      width="130" 
                      height="50" 
                      rx="6" 
                      fill="#030712" 
                      stroke="rgba(59, 130, 246, 0.5)" 
                      strokeWidth="1"
                    />
                    <text x="8" y="18" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {hoveredDistrict.district}
                    </text>
                    <text x="8" y="32" fill="#64748b" fontSize="8" fontFamily="monospace">
                      Risk Index: {hoveredDistrict.risk_score}
                    </text>
                    <text x="8" y="42" fill="#3b82f6" fontSize="8" fontFamily="monospace">
                      Complaints: {hoveredDistrict.complaints_count}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Right Geospatial Insights Sidebar */}
            <div className="w-full lg:w-[460px] space-y-6 flex flex-col justify-start">
              
              {/* Family Filters Panel */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md space-y-4 shrink-0">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  Map Overlay Filters
                </h3>

                {/* Syndicate Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Filter Family Spread</label>
                  <select
                    value={selectedFamily}
                    onChange={(e) => handleFamilyFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950/70 border border-blue-500/20 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <option value="">-- View Overall Threat Map --</option>
                    {families.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        {fam.family_code} ({fam.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected District Details Profile */}
              {selectedDistrict && (
                <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md space-y-4 shrink-0">
                  <div className="border-b border-blue-500/10 pb-3 flex items-center justify-between font-mono">
                    <span className="text-[10px] text-gray-500 uppercase">Selected hotspot details</span>
                    <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                      ACTIVE THREAT PROFILE <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">District</span>
                      <span className="text-white font-bold block">{selectedDistrict.district}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">State</span>
                      <span className="text-white font-bold block">{selectedDistrict.state}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">Density Risk Score</span>
                      <span className="text-red-400 font-bold block">{selectedDistrict.risk_score}/100</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase">Weekly Growth</span>
                      <span className="text-emerald-400 font-bold block">+{selectedDistrict.growth_rate}%</span>
                    </div>
                    <div className="col-span-2 p-3 bg-gray-950/60 border border-blue-500/5 rounded-lg flex justify-between">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Complaints Count</span>
                        <span className="text-white font-bold text-sm">{selectedDistrict.complaints_count}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 block uppercase">Loss Ingest (Rs)</span>
                        <span className="text-amber-400 font-bold text-sm">
                          {selectedDistrict.total_loss_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Threat growth trend line chart */}
                  <div className="space-y-1.5 font-mono">
                    <span className="text-[9px] text-gray-500 block uppercase">Monthly Hotspot Growth rate</span>
                    <div className="h-28 w-full text-[9px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                          <XAxis stroke="#64748b" dataKey="name" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#090f1d', borderColor: '#3b82f6' }} />
                          <Line type="monotone" dataKey="Jamtara" stroke="#ef4444" strokeWidth={2} name="Weekly growth" dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Ranking Table */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md flex-1 flex flex-col space-y-4 max-h-[350px] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/10 pb-3 shrink-0">
                  <h3 className="text-xs font-mono text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    Hotspot Risk Ranking
                  </h3>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="px-2 py-1 bg-gray-950 border border-blue-500/20 rounded-lg text-[9px] font-mono text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="All">All States</option>
                    {statesRisk.map(s => (
                      <option key={s.state_id} value={s.state}>{s.state}</option>
                    ))}
                  </select>
                </div>

                {/* Local Search inside rankings */}
                <div className="relative shrink-0 font-mono">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search ranking index..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-gray-950 border border-blue-500/25 rounded text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Table container scroll */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-blue-500/10 text-gray-400">
                        <th className="pb-2">District</th>
                        <th className="pb-2">State</th>
                        <th className="pb-2 text-right">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-500/5 text-gray-300">
                      {filteredDistrictsTable.map((dist) => (
                        <tr 
                          key={dist.district_id} 
                          onClick={() => setSelectedDistrict(dist)}
                          className={`cursor-pointer transition-colors ${selectedDistrict?.district === dist.district ? 'bg-blue-500/10 text-white font-bold' : 'hover:bg-blue-500/5'}`}
                        >
                          <td className="py-2.5 pr-2 truncate max-w-[120px]">{dist.district}</td>
                          <td className="py-2.5 truncate max-w-[110px]">{dist.state}</td>
                          <td className="py-2.5 text-right font-bold">
                            <span className={dist.risk_score > 90 ? 'text-red-400' : dist.risk_score > 75 ? 'text-amber-400' : 'text-blue-400'}>
                              {dist.risk_score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GeospatialDashboard;
