import React, { useEffect, useState } from 'react';
import { Shield, Radio, LogOut, User, Menu, ChevronDown, Settings, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (to: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);

  const mockAlerts = [
    "ALERT: New Digital Arrest Campaign detected from Mewat cluster",
    "THREAT INTEL: High UPI transfer spikes detected in Cyberabad district",
    "SYSTEM: Autonomous Agent drafted 12 new FIRs in last 60 minutes",
    "ALERT: Emerging WhatsApp Impersonation ring flagged in Pune"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % mockAlerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fullName = user?.full_name || user?.username || 'Officer Shield';
  const email = user?.email || 'officer@shield.gov';
  const displayRole = user?.role || 'INVESTIGATOR';
  const profilePic = user?.profile_picture;

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

      {/* User Controls with Dropdown */}
      <div className="relative flex items-center gap-4">
        <div 
          className="flex items-center gap-2 cursor-pointer border-r border-blue-500/10 pr-4 hover:opacity-90 select-none"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {profilePic ? (
            <img src={profilePic} alt="avatar" className="w-8 h-8 rounded-full border border-blue-500/30 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-950/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
              {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="hidden xs:block text-left">
            <p className="text-xs text-white font-medium font-mono truncate max-w-[120px]">{fullName}</p>
            <p className="text-[9px] text-blue-400 font-mono tracking-wider uppercase">{displayRole}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
            <div className="absolute right-4 top-12 w-56 rounded-xl bg-gray-950 border border-blue-500/20 shadow-2xl z-50 p-2 font-mono text-xs divide-y divide-blue-500/10 backdrop-blur-xl bg-opacity-95">
              <div className="p-3 text-left">
                <p className="text-white font-medium truncate">{fullName}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{email}</p>
                <span className="mt-2 inline-block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[8px] font-bold uppercase tracking-wider">
                  {displayRole}
                </span>
              </div>
              
              <div className="py-1">
                <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-500/10 text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Profile
                </button>
                <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-500/10 text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  My Account
                </button>
                <button className="w-full text-left px-3 py-2 rounded hover:bg-blue-500/10 text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
                  <Settings className="w-3.5 h-3.5 text-blue-400" />
                  Settings
                </button>
              </div>

              <div className="py-1">
                <button 
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-red-500/10 text-gray-300 hover:text-red-400 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
