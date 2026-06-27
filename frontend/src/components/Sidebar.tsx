import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Dna, 
  Network, 
  FileSearch, 
  Map, 
  MessageSquareCode,
  Lock,
  Menu
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (to: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Fraud DNA", icon: Dna, path: "/dna" },
    { label: "Fraud Graph", icon: Network, path: "/graph" },
    { label: "Investigations", icon: FileSearch, path: "/investigations" },
    { label: "Threat Map", icon: Map, path: "/geospatial" },
    { label: "Citizen Copilot", icon: MessageSquareCode, path: "/copilot" }
  ];

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('toggle-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
    };
  }, []);

  const handleItemClick = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:static top-16 left-0 h-[calc(100vh-4rem)] w-64 border-r border-blue-500/20 bg-gray-950/90 backdrop-blur-md flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Platform Title Section */}
        <div className="p-6 border-b border-blue-500/10 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Navigation Desk</span>
          <Menu className="w-4 h-4 text-blue-400 cursor-pointer hover:text-white transition-colors" onClick={() => setIsOpen(false)} />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono tracking-wider transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)] font-semibold' 
                    : 'text-gray-400 hover:bg-gray-900/50 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Security Footer Info */}
        <div className="p-6 border-t border-blue-500/10 bg-gray-950/30 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-blue-500/60 animate-pulse" />
          <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Secured Command Desk</span>
        </div>
      </aside>
    </>
  );
};
