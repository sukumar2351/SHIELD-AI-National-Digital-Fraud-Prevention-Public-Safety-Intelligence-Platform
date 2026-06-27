import React, { useEffect, useState } from 'react';
import { Shield, Radio, LogOut, User, Menu } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  onNavigate: (to: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('officer_shield');
  const [role, setRole] = useState('Investigator');
  const [alertIndex, setAlertIndex] = useState(0);

  const mockAlerts = [
    "ALERT: New Digital Arrest Campaign detected from Mewat cluster",
    "THREAT INTEL: High UPI transfer spikes detected in Cyberabad district",
    "SYSTEM: Autonomous Agent drafted 12 new FIRs in last 60 minutes",
    "ALERT: Emerging WhatsApp Impersonation ring flagged in Pune"
  ];

  useEffect(() => {
    setUsername(localStorage.getItem('shield_username') || 'officer_shield');
    setRole(localStorage.getItem('shield_role') || 'Investigator');

    const interval = setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % mockAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    api.logout();
    window.location.reload();
  };

  return (
    <header className="h-16 border-b border-blue-500/20 bg-gray-950/70 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand Logo & Hamburger */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors focus:outline-none"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/dashboard')}>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center p-2 text-blue-400 shadow-blue-500/20 shadow-md">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-white text-lg tracking-wider font-mono">SHIELD <span className="text-blue-500">AI</span></span>
            <p className="text-[10px] text-gray-400 tracking-widest font-mono uppercase">National Intelligence Operating System</p>
          </div>
        </div>
      </div>

      {/* Flashing Live Threat Feed */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-mono max-w-xl overflow-hidden shadow-inner">
        <Radio className="w-4 h-4 animate-ping text-red-500" />
        <span className="animate-pulse">{mockAlerts[alertIndex]}</span>
      </div>

      {/* User Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border-r border-blue-500/10 pr-4">
          <div className="w-8 h-8 rounded-full bg-blue-950/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <User className="w-4 h-4" />
          </div>
          <div className="text-right">
            <p className="text-xs text-white font-medium font-mono">{username}</p>
            <p className="text-[9px] text-blue-400 font-mono tracking-wider uppercase">{role}</p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
