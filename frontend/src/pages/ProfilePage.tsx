import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { 
  User, Shield, ShieldCheck, Mail, MapPin, Phone, 
  Clock, Activity, Lock, Key, Laptop, Smartphone,
  Settings, Award, Globe, Bell, ToggleLeft, HelpCircle
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState('/profile');
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security' | 'preferences'>('overview');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  const fullName = user?.full_name || 'Sukumar Karanam';
  const role = user?.role || 'INVESTIGATOR';
  const email = user?.email || 'sukumar@shield.gov';
  const profilePic = user?.profile_picture;

  return (
    <div className="min-h-screen bg-[#050913] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        
        <main className="flex-1 bg-gray-950/60 p-4 md:p-8 overflow-y-auto space-y-6 h-[calc(100vh-4rem)]">
          <div className="flex flex-col border-b border-white/5 pb-4">
            <h1 className="text-3xl font-bold font-mono tracking-wider text-white">PROFILE</h1>
            <p className="text-xs text-blue-400 font-mono uppercase tracking-widest mt-1">Officer Information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 glass-panel p-6 flex flex-col items-center text-center space-y-6">
              <div className="relative">
                {profilePic ? (
                  <img src={profilePic} alt="Officer Avatar" className="w-24 h-24 rounded-full border-2 border-blue-500/50 object-cover shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-950/30 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <User className="w-12 h-12" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#050913] shadow-[0_0_10px_#22c55e] animate-pulse"></span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-wide font-mono">{fullName}</h2>
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">OFFICER_SHIELD</p>
                <span className="inline-block mt-2 px-3 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase tracking-wider font-mono">
                  {role}
                </span>
              </div>

              <div className="w-full border-t border-white/5 pt-4 text-left space-y-3 font-mono text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Designation:</span>
                  <span className="text-white font-medium">Investigator</span>
                </div>
                <div className="flex justify-between">
                  <span>Employee ID:</span>
                  <span className="text-white font-medium">SHIELD-2026-001</span>
                </div>
                <div className="flex justify-between">
                  <span>Department:</span>
                  <span className="text-white font-medium text-right max-w-[160px] truncate">National Fraud Intelligence</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="text-white font-medium">Andhra Pradesh</span>
                </div>
                <div className="flex justify-between">
                  <span>Login Method:</span>
                  <span className="text-cyan-400 font-medium flex items-center gap-1">
                    Google Auth
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-panel p-4 text-center font-mono space-y-1 hover:border-blue-500/40 transition-colors">
                  <span className="text-[10px] text-gray-500 block uppercase">Assigned</span>
                  <span className="text-2xl font-bold text-white block">14</span>
                  <span className="text-[8px] text-blue-400 uppercase tracking-widest block mt-1">Investigations</span>
                </div>
                <div className="glass-panel p-4 text-center font-mono space-y-1 hover:border-blue-500/40 transition-colors">
                  <span className="text-[10px] text-gray-500 block uppercase">Reviewed</span>
                  <span className="text-2xl font-bold text-white block">156</span>
                  <span className="text-[8px] text-blue-400 uppercase tracking-widest block mt-1">Complaints</span>
                </div>
                <div className="glass-panel p-4 text-center font-mono space-y-1 hover:border-blue-500/40 transition-colors">
                  <span className="text-[10px] text-gray-500 block uppercase">Identified</span>
                  <span className="text-2xl font-bold text-white block">8</span>
                  <span className="text-[8px] text-blue-400 uppercase tracking-widest block mt-1">Fraud Families</span>
                </div>
                <div className="glass-panel p-4 text-center font-mono space-y-1 hover:border-blue-500/40 transition-colors">
                  <span className="text-[10px] text-gray-500 block uppercase">Score Rating</span>
                  <span className="text-2xl font-bold text-red-500 block text-red-500">92</span>
                  <span className="text-[8px] text-red-400 uppercase tracking-widest block mt-1">Threat Score</span>
                </div>
              </div>

              <div className="glass-panel p-2 flex border border-white/5 rounded-xl font-mono text-xs">
                {(['overview', 'activity', 'security', 'preferences'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg capitalize font-medium transition-all duration-200 ${
                      activeTab === tab 
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="glass-panel p-6 flex-1 min-h-[300px]">
                {activeTab === 'overview' && (
                  <div className="space-y-6 font-mono text-xs">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Basic Profile Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 block">FULL NAME</span>
                        <span className="text-white text-sm">{fullName}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 block">EMAIL ADDRESS</span>
                        <span className="text-white text-sm">{email}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 block">PHONE NUMBER</span>
                        <span className="text-white text-sm">+91 98480 22338</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 block">LAST LOGIN SESSION</span>
                        <span className="text-cyan-400 text-sm flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-6 font-mono text-xs">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Recent Activity Streams</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                        <Activity className="w-4 h-4 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">Bypassed Login Session Verified</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Console authorization check passed via Vercel gateway</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                        <Shield className="w-4 h-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">Drafted FIR case file SHIELD-FIR-789</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Autonomous intelligence generated suspect link analysis node</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6 font-mono text-xs">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Authentication &amp; JWT Config</h3>
                    <div className="space-y-4 text-gray-400">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-green-400" />
                          <div>
                            <span className="text-white block font-medium">Google Authentication</span>
                            <span className="text-[10px] text-gray-500">Connected with {email}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-green-400 uppercase bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-white block font-medium">JWT Secure Credentials</span>
                            <span className="text-[10px] text-gray-500">Bearer Token authentication active</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">Valid</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-6 font-mono text-xs">
                    <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Interface Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span>Compact Mode</span>
                        <ToggleLeft className="w-6 h-6 text-gray-600 cursor-pointer" />
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span>Glassmorphism UI</span>
                        <span className="text-[9px] font-bold text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">Enabled</span>
                      </div>
                    </div>
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
