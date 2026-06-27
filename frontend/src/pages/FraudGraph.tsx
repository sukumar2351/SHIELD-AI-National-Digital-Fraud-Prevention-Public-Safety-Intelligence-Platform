import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  Edge,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Network, 
  Search, 
  Filter, 
  RefreshCw, 
  Compass, 
  ShieldAlert, 
  Share2, 
  UserMinus, 
  Maximize2,
  Lock,
  Phone,
  CreditCard,
  MapPin,
  FileText,
  UserCheck
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { MetricCard } from '../components/MetricCard';

// Node Style Helper matching governmental grid graphics
const getNodeStyle = (type: string) => {
  const base = {
    background: 'rgba(9, 15, 29, 0.85)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '11px',
    borderRadius: '8px',
    padding: '8px 12px',
    minWidth: '120px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    transition: 'all 0.2s ease-in-out',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  };
  
  switch (type) {
    case 'Complaint':
      return { ...base, border: '1px solid rgba(239, 68, 68, 0.6)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)' };
    case 'Fraud Family':
      return { ...base, border: '1px solid rgba(139, 92, 246, 0.6)', boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)' };
    case 'Victim':
      return { ...base, border: '1px solid rgba(16, 185, 129, 0.6)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)' };
    case 'Phone':
      return { ...base, border: '1px solid rgba(59, 130, 246, 0.6)', boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)' };
    case 'UPI':
      return { ...base, border: '1px solid rgba(6, 182, 212, 0.6)', boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' };
    case 'District':
      return { ...base, border: '1px solid rgba(245, 158, 11, 0.6)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)' };
    case 'Fraudster':
      return { ...base, border: '1px solid rgba(220, 38, 38, 0.8)', boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)', fontWeight: 'bold' };
    default:
      return base;
  }
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'Complaint': return <FileText className="w-3.5 h-3.5 text-red-400 inline mr-1.5" />;
    case 'Fraud Family': return <Network className="w-3.5 h-3.5 text-purple-400 inline mr-1.5" />;
    case 'Victim': return <UserCheck className="w-3.5 h-3.5 text-green-400 inline mr-1.5" />;
    case 'Phone': return <Phone className="w-3.5 h-3.5 text-blue-400 inline mr-1.5" />;
    case 'UPI': return <CreditCard className="w-3.5 h-3.5 text-cyan-400 inline mr-1.5" />;
    case 'District': return <MapPin className="w-3.5 h-3.5 text-amber-400 inline mr-1.5" />;
    case 'Fraudster': return <UserMinus className="w-3.5 h-3.5 text-red-500 inline mr-1.5 animate-pulse" />;
    default: return <Compass className="w-3.5 h-3.5 text-gray-400 inline mr-1.5" />;
  }
};

export const FraudGraph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/graph');
  
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');

  // Fallback structures for local/offline developer mode
  const fallbackGraphData = {
    nodes: [
      { id: "Complaint:Ref-499", label: "Ref-499", type: "Complaint", properties: { level: "Critical", score: 94, desc: "Accused of smuggling drugs in customized custom parcel. Rs 45k extorted." } },
      { id: "Complaint:Ref-498", label: "Ref-498", type: "Complaint", properties: { level: "Critical", score: 90, desc: "WhatsApp call impersonating Telecom SIM blockers." } },
      { id: "Complaint:Ref-497", label: "Ref-497", type: "Complaint", properties: { level: "High Risk", score: 78, desc: "Electricity bill shut down warning, extorted via UPI." } },
      { id: "Victim:Aarav Sharma", label: "Aarav Sharma", type: "Victim", properties: { phone: "+919876543100" } },
      { id: "Victim:Priya Nair", label: "Priya Nair", type: "Victim", properties: { phone: "+919876543101" } },
      { id: "Fraud Family:DIGITAL_ARREST_2026_001", label: "DIGITAL_ARREST_2026_001", type: "Fraud Family", properties: { name: "CBI Custom Arrest Syndicate" } },
      { id: "Fraud Family:UPI_FRAUD_2026_003", label: "UPI_FRAUD_2026_003", type: "Fraud Family", properties: { name: "Utility Bill Refund Ring" } },
      { id: "Phone:+919876543210", label: "+919876543210", type: "Phone", properties: { carrier: "Jio", risk: 85 } },
      { id: "Phone:+919162856577", label: "+919162856577", type: "Phone", properties: { carrier: "Airtel", risk: 92 } },
      { id: "UPI:verify.cbi@okaxis", label: "verify.cbi@okaxis", type: "UPI", properties: { status: "Active", risk: 94 } },
      { id: "UPI:refund.support498@okaxis", label: "refund.support498@okaxis", type: "UPI", properties: { status: "Active", risk: 88 } },
      { id: "District:Jamtara (Jharkhand)", label: "Jamtara (Jharkhand)", type: "District", properties: { risk: 94 } },
      { id: "District:Mewat (Rajasthan)", label: "Mewat (Rajasthan)", type: "District", properties: { risk: 89 } },
      { id: "Fraudster:Suspect-8812", label: "Suspect-8812", type: "Fraudster", properties: { risk: 95 } },
      { id: "Fraudster:Suspect-9021", label: "Suspect-9021", type: "Fraudster", properties: { risk: 88 } }
    ],
    edges: [
      { id: "e1", source: "Complaint:Ref-499", target: "Victim:Aarav Sharma", type: "REPORTED_BY" },
      { id: "e2", source: "Complaint:Ref-499", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "PART_OF_FAMILY" },
      { id: "e3", source: "Complaint:Ref-499", target: "Phone:+919876543210", type: "LINKED_TO" },
      { id: "e4", source: "Complaint:Ref-499", target: "UPI:verify.cbi@okaxis", type: "LINKED_TO" },
      
      { id: "e5", source: "Complaint:Ref-498", target: "Victim:Priya Nair", type: "REPORTED_BY" },
      { id: "e6", source: "Complaint:Ref-498", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "PART_OF_FAMILY" },
      { id: "e7", source: "Complaint:Ref-498", target: "Phone:+919162856577", type: "LINKED_TO" },
      { id: "e8", source: "Complaint:Ref-498", target: "UPI:refund.support498@okaxis", type: "LINKED_TO" },
      
      { id: "e9", source: "Complaint:Ref-497", target: "Victim:Priya Nair", type: "REPORTED_BY" },
      { id: "e10", source: "Complaint:Ref-497", target: "Fraud Family:UPI_FRAUD_2026_003", type: "PART_OF_FAMILY" },
      { id: "e11", source: "Complaint:Ref-497", target: "UPI:refund.support498@okaxis", type: "LINKED_TO" },

      { id: "e12", source: "Phone:+919876543210", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO" },
      { id: "e13", source: "UPI:verify.cbi@okaxis", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO" },
      
      { id: "e14", source: "Phone:+919162856577", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO" },
      { id: "e15", source: "UPI:refund.support498@okaxis", target: "Fraud Family:DIGITAL_ARREST_2026_001", type: "CONNECTED_TO" },

      { id: "e16", source: "Fraudster:Suspect-8812", target: "Phone:+919876543210", type: "OWNS" },
      { id: "e17", source: "Fraudster:Suspect-8812", target: "UPI:verify.cbi@okaxis", type: "OWNS" },
      
      { id: "e18", source: "Fraudster:Suspect-9021", target: "Phone:+919162856577", type: "OWNS" },
      { id: "e19", source: "Fraudster:Suspect-9021", target: "UPI:refund.support498@okaxis", type: "OWNS" },
      
      { id: "e20", source: "Fraud Family:DIGITAL_ARREST_2026_001", target: "District:Jamtara (Jharkhand)", type: "LINKED_TO" },
      { id: "e21", source: "Fraud Family:UPI_FRAUD_2026_003", target: "District:Mewat (Rajasthan)", type: "LINKED_TO" }
    ]
  };

  // Programmatic circular network arrangement
  const layoutNodes = useCallback((raw: any[]) => {
    const radius = 260;
    const centerX = 420;
    const centerY = 280;
    
    return raw.map((node, i) => {
      const angle = (i / raw.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40;
      const y = centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40;
      
      return {
        id: node.id,
        type: 'default',
        position: { x, y },
        data: { 
          label: (
            <div className="flex items-center justify-center font-mono">
              {getIconForType(node.type)}
              <span className="truncate">{node.label}</span>
            </div>
          ) 
        },
        style: getNodeStyle(node.type)
      };
    });
  }, []);

  const layoutEdges = useCallback((raw: any[]) => {
    return raw.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      labelStyle: { fill: '#64748b', fontSize: 8, fontFamily: 'monospace' },
      style: { stroke: '#1e293b', strokeWidth: 1.2, opacity: 0.6 },
      animated: edge.type === 'PART_OF_FAMILY' || edge.type === 'OWNS'
    }));
  }, []);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const token = localStorage.getItem('shield_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

        // Load Full Graph
        let graphData = null;
        try {
          const res = await fetch(`${BASE_URL}/graph/overview?limit=150`, { headers });
          if (res.ok) {
            graphData = await res.json();
          } else {
            throw new Error('Graph fetch failed');
          }
        } catch (e) {
          console.warn("Using offline graph fallback data");
          graphData = fallbackGraphData;
        }

        // Load DNA families for filtering
        let familiesData = [];
        try {
          const famRes = await fetch(`${BASE_URL}/dna/families`, { headers });
          if (famRes.ok) {
            familiesData = await famRes.json();
          }
        } catch (e) {
          console.warn("Failed to load families for cluster filtering");
        }

        setRawNodes(graphData.nodes);
        setRawEdges(graphData.edges);
        setNodes(layoutNodes(graphData.nodes));
        setEdges(layoutEdges(graphData.edges));
        setFamilies(familiesData.length > 0 ? familiesData : [
          { family_code: "DIGITAL_ARREST_2026_001", name: "CBI Custom Arrest Syndicate" },
          { family_code: "UPI_FRAUD_2026_003", name: "Utility Bill Refund Ring" }
        ]);

      } catch (err) {
        console.error("Error setting up graph UI", err);
      } finally {
        setLoading(false);
      }
    };
    loadGraph();
  }, [layoutNodes, layoutEdges]);

  // Focus and Highlight neighbor nodes
  const onNodeClick = (_: React.MouseEvent, clickedNode: Node) => {
    const raw = rawNodes.find(n => n.id === clickedNode.id);
    setSelectedNode(raw || clickedNode);
    setSelectedEdge(null);

    const neighborIds = new Set<string>();
    neighborIds.add(clickedNode.id);

    rawEdges.forEach(edge => {
      if (edge.source === clickedNode.id) neighborIds.add(edge.target);
      if (edge.target === clickedNode.id) neighborIds.add(edge.source);
    });

    setNodes(prev => prev.map(n => {
      const isNeighbor = neighborIds.has(n.id);
      return {
        ...n,
        style: {
          ...getNodeStyle(n.id.split(':')[0]),
          opacity: isNeighbor ? 1 : 0.2,
          border: isNeighbor 
            ? n.id === clickedNode.id 
              ? '2px dashed #3b82f6' 
              : getNodeStyle(n.id.split(':')[0]).border
            : '1px solid rgba(255,255,255,0.02)'
        }
      };
    }));

    setEdges(prev => prev.map(e => {
      const isLinked = e.source === clickedNode.id || e.target === clickedNode.id;
      return {
        ...e,
        animated: isLinked,
        style: {
          ...e.style,
          stroke: isLinked ? '#3b82f6' : '#0f172a',
          strokeWidth: isLinked ? 2.5 : 1,
          opacity: isLinked ? 1 : 0.05
        }
      };
    }));
  };

  const onEdgeClick = (_: React.MouseEvent, clickedEdge: Edge) => {
    setSelectedEdge(clickedEdge);
    setSelectedNode(null);
  };

  const handleResetHighlight = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setNodes(layoutNodes(rawNodes));
    setEdges(layoutEdges(rawEdges));
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  // Search node by label
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const match = nodes.find(n => 
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.id.split(':')[1].toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (match) {
      onNodeClick({} as React.MouseEvent, match);
    }
  };

  // Filter cluster by family code
  const handleFamilyClusterFilter = async (code: string) => {
    setSelectedFamily(code);
    if (!code) {
      // Reset to complete graph overview
      setNodes(layoutNodes(rawNodes));
      setEdges(layoutEdges(rawEdges));
      setSelectedNode(null);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('shield_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

      const res = await fetch(`${BASE_URL}/graph/cluster/${encodeURIComponent(code)}`, { headers });
      if (res.ok) {
        const clusterData = await res.json();
        setNodes(layoutNodes(clusterData.nodes));
        setEdges(layoutEdges(clusterData.edges));
      } else {
        throw new Error('Cluster fetch failed');
      }
    } catch (e) {
      console.warn("Using offline mock cluster filter fallback");
      // Filter offline raw values
      const clusterNodes = rawNodes.filter(n => {
        if (n.id.includes(code)) return true;
        // Check neighbors connected to the family
        const hasEdge = rawEdges.some(e => 
          (e.source === n.id && e.target.includes(code)) || 
          (e.target === n.id && e.source.includes(code))
        );
        return hasEdge;
      });

      const clusterNodeIds = new Set(clusterNodes.map(n => n.id));
      const clusterEdges = rawEdges.filter(e => 
        clusterNodeIds.has(e.source) && clusterNodeIds.has(e.target)
      );

      setNodes(layoutNodes(clusterNodes));
      setEdges(layoutEdges(clusterEdges));
    } finally {
      setLoading(false);
    }
  };

  // Node Expansion Handler
  const handleNodeExpansion = async (node: any) => {
    const nodeType = node.id.split(':')[0];
    const nodeLabel = node.id.split(':')[1];
    
    setLoading(true);
    try {
      const token = localStorage.getItem('shield_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const BASE_URL = 'https://backend-gray-alpha-78.vercel.app/api/v1';

      const res = await fetch(`${BASE_URL}/graph/network/${encodeURIComponent(nodeLabel)}?node_type=${encodeURIComponent(nodeType)}&radius=2`, { headers });
      if (res.ok) {
        const expandedData = await res.json();
        
        // Merge nodes
        const mergedNodes = [...rawNodes];
        expandedData.nodes.forEach((n: any) => {
          if (!mergedNodes.some(x => x.id === n.id)) mergedNodes.push(n);
        });

        // Merge edges
        const mergedEdges = [...rawEdges];
        expandedData.edges.forEach((e: any) => {
          if (!mergedEdges.some(x => x.id === e.id)) mergedEdges.push(e);
        });

        setRawNodes(mergedNodes);
        setRawEdges(mergedEdges);
        setNodes(layoutNodes(mergedNodes));
        setEdges(layoutEdges(mergedEdges));
      } else {
        throw new Error('Expansion API failed');
      }
    } catch (e) {
      console.warn("Generating mock expansion nodes offline");
      // Fallback local expansion
      const mockExpNodes = [
        { id: `Phone:+918090${Math.floor(Math.random() * 9000) + 1000}`, label: `+918090${Math.floor(Math.random() * 9000) + 1000}`, type: "Phone", properties: { carrier: "Jio" } },
        { id: `UPI:exp.${Math.floor(Math.random() * 900)}@okaxis`, label: `exp.${Math.floor(Math.random() * 900)}@okaxis`, type: "UPI", properties: { status: "Active" } }
      ];
      const mockExpEdges = [
        { id: `e_exp_${Math.random()}`, source: node.id, target: mockExpNodes[0].id, type: "LINKED_TO" },
        { id: `e_exp_${Math.random()}`, source: node.id, target: mockExpNodes[1].id, type: "LINKED_TO" }
      ];

      const mergedNodes = [...rawNodes, ...mockExpNodes];
      const mergedEdges = [...rawEdges, ...mockExpEdges];

      setRawNodes(mergedNodes);
      setRawEdges(mergedEdges);
      setNodes(layoutNodes(mergedNodes));
      setEdges(layoutEdges(mergedEdges));
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
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-500/10 pb-6 gap-4 shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono flex items-center gap-3">
                <Network className="w-8 h-8 text-blue-500 animate-pulse" />
                FRAUD ENTITY GRAPH
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest uppercase">
                Syndicate Link Correlation & Financial Flow Visualizer
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleResetHighlight}
                className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 font-mono text-xs flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                RESET GRAPH VIEW
              </button>
              <div className="px-4 py-2 rounded-lg bg-red-950/20 border border-red-500/30 text-red-400 font-mono text-xs flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 animate-pulse" />
                NPCI AUTO-BLOCK LINKED
              </div>
            </div>
          </div>

          {/* Metric Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            <MetricCard label="Total Graph Nodes" value={rawNodes.length} icon={Compass} color="blue" />
            <MetricCard label="Total Edges" value={rawEdges.length} icon={Share2} color="green" />
            <MetricCard label="Risk Density" value="0.48" icon={ShieldAlert} color="red" />
            <MetricCard label="Linked Fraudsters" value={rawNodes.filter(n => n.type === 'Fraudster').length} icon={UserMinus} color="amber" />
          </div>

          {/* Graph Core Playground */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[500px]">
            {/* React Flow Panel */}
            <div className="flex-1 h-full rounded-xl bg-gray-950/80 border border-blue-500/15 relative overflow-hidden glass-panel min-h-[450px]">
              {loading && (
                <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-500/20 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase">Calculating Coordinates...</span>
                  </div>
                </div>
              )}
              
              <div className="w-full h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  fitView
                >
                  <Background color="#1e293b" gap={16} size={1} />
                  <Controls className="react-flow__controls" />
                  <MiniMap 
                    nodeColor={(n) => {
                      if (n.id.includes('Complaint')) return '#ef4444';
                      if (n.id.includes('Family')) return '#8b5cf6';
                      if (n.id.includes('Phone')) return '#3b82f6';
                      if (n.id.includes('UPI')) return '#06b6d4';
                      return '#1e293b';
                    }}
                    maskColor="rgba(3, 7, 18, 0.7)"
                    className="bg-gray-950 border border-blue-500/10 rounded-lg overflow-hidden"
                  />
                </ReactFlow>
              </div>
            </div>

            {/* Sidebar Details / Controller */}
            <div className="w-full lg:w-80 space-y-6 flex flex-col justify-start">
              
              {/* Search & Cluster Selector Panel */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md space-y-4">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-500" />
                  Network Filters
                </h3>

                {/* Entity Search */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Search Node Identifier</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="e.g. +919876543210 or UPI"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-3 pr-8 py-2 bg-gray-950/70 border border-blue-500/20 rounded-lg text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button 
                      onClick={handleSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Syndicate Cluster Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-mono uppercase">Fraud Family Cluster</label>
                  <select
                    value={selectedFamily}
                    onChange={(e) => handleFamilyClusterFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950/70 border border-blue-500/20 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <option value="">-- View Full Network --</option>
                    {families.map((fam, idx) => (
                      <option key={idx} value={fam.family_code}>
                        {fam.name || fam.family_code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Node / Edge Details Panel */}
              <div className="p-5 rounded-xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-md flex-1 flex flex-col min-h-[220px]">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-widest border-b border-blue-500/10 pb-3 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                  Node Information
                </h3>

                {selectedNode ? (
                  <div className="flex-1 flex flex-col justify-between py-4 space-y-4 font-mono">
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 block uppercase">Identifier Type</span>
                        <span className="text-blue-400 font-bold block">{selectedNode.id.split(':')[0]}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block uppercase">Entity Value</span>
                        <span className="text-white font-bold block break-all">{selectedNode.id.split(':')[1]}</span>
                      </div>
                      
                      {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                        <div className="p-3 bg-gray-950/50 rounded-lg border border-blue-500/5 space-y-2">
                          <span className="text-[9px] text-gray-500 block uppercase">Metadata properties</span>
                          {Object.entries(selectedNode.properties).map(([k, v]: any) => (
                            <div key={k} className="flex justify-between text-[10px]">
                              <span className="text-gray-400 capitalize">{k.replace('_', ' ')}:</span>
                              <span className="text-white text-right break-all truncate max-w-[120px]">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={() => handleNodeExpansion(selectedNode)}
                        className="w-full py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-400 text-xs font-bold transition-all"
                      >
                        EXPAND CONNECTIONS
                      </button>
                      
                      {selectedNode.id.includes('Phone') || selectedNode.id.includes('UPI') ? (
                        <button 
                          onClick={() => alert(`NPCI Action: Dispatched immediate freeze alert for ${selectedNode.id.split(':')[1]}`)}
                          className="w-full py-2 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs font-bold transition-all"
                        >
                          DISPATCH FREEZE ORDER
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : selectedEdge ? (
                  <div className="py-4 space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Link Connection ID</span>
                      <span className="text-white block truncate">{selectedEdge.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Link Source (Out)</span>
                      <span className="text-blue-400 font-bold block truncate">{selectedEdge.source}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Link Target (In)</span>
                      <span className="text-green-400 font-bold block truncate">{selectedEdge.target}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Relation Vector</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold inline-block text-[10px] mt-1">
                        {selectedEdge.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <Compass className="w-8 h-8 text-gray-600 animate-spin" style={{ animationDuration: '6s' }} />
                    <p className="text-[10px] text-gray-500 font-mono mt-3 uppercase tracking-widest">
                      Select any Node or Edge Link on the canvas to inspect profile dockets
                    </p>
                  </div>
                )}

              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FraudGraph;
