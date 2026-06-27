import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { Settings, Eye, Bell, Shield, Lock, Cpu, Moon } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState('/settings');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  return (
    <div className="min-h-screen bg-[#050913] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        
        <main className="flex-1 bg-gray-950/60 p-4 md:p-8 overflow-y-auto space-y-6 h-[calc(100vh-4rem)]">
          <div className="flex flex-col border-b border-white/5 pb-4">
            <h1 className="text-3xl font-bold font-mono tracking-wider text-white">SETTINGS</h1>
            <p className="text-xs text-blue-400 font-mono uppercase tracking-widest mt-1">Platform and System Configurations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest flex items-center gap-2">
                <Moon className="w-4 h-4 text-blue-400" />
                Appearance
              </h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Cyber Dark Theme</span>
                  <span className="text-[9px] font-bold text-green-400 uppercase bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">Active</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Glassmorphic Overlay</span>
                  <span className="text-[9px] font-bold text-green-400 uppercase bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Notifications
              </h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Threat Alerts</span>
                  <span className="text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">On</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Investigation Dispatch Alerts</span>
                  <span className="text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">On</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Security
              </h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Google SSO Login</span>
                  <span className="text-[9px] font-bold text-green-400 uppercase bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">Active</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <span>Logout All Active Devices</span>
                  <button className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] hover:bg-red-500/20 transition-colors font-bold uppercase">
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                System Telemetry
              </h3>
              <div className="space-y-3 text-gray-400">
                <div className="flex justify-between">
                  <span>Platform Version:</span>
                  <span className="text-white font-medium">v2.1.0-prod</span>
                </div>
                <div className="flex justify-between">
                  <span>API Server Status:</span>
                  <span className="text-green-400 font-medium">CONNECTED</span>
                </div>
                <div className="flex justify-between">
                  <span>Backend Operations:</span>
                  <span className="text-green-400 font-medium">ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
