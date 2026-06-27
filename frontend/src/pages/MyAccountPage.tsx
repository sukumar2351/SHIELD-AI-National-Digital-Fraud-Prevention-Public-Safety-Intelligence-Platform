import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { User, Shield, Mail, Building, Download, Save, Edit } from 'lucide-react';

export const MyAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState('/my-account');
  const [editing, setEditing] = useState(false);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  const fullName = user?.full_name || 'Sukumar Karanam';
  const role = user?.role || 'INVESTIGATOR';
  const email = user?.email || 'sukumar@shield.gov';

  return (
    <div className="min-h-screen bg-[#050913] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar onNavigate={handleNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        
        <main className="flex-1 bg-gray-950/60 p-4 md:p-8 overflow-y-auto space-y-6 h-[calc(100vh-4rem)]">
          <div className="flex flex-col border-b border-white/5 pb-4">
            <h1 className="text-3xl font-bold font-mono tracking-wider text-white">MY ACCOUNT</h1>
            <p className="text-xs text-blue-400 font-mono uppercase tracking-widest mt-1">Manage Identity Profile Settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
            <div className="lg:col-span-2 glass-panel p-6 space-y-6">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-400">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 block uppercase">Linked Name</span>
                  <input 
                    type="text" 
                    disabled={!editing} 
                    defaultValue={fullName}
                    className="w-full bg-[#0e1628]/50 border border-white/10 rounded-lg p-2.5 text-white disabled:opacity-60 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 block uppercase">Organization</span>
                  <input 
                    type="text" 
                    disabled 
                    value="SHIELD AI National Platform"
                    className="w-full bg-[#0e1628]/50 border border-white/10 rounded-lg p-2.5 text-white disabled:opacity-60 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 block uppercase">Department</span>
                  <input 
                    type="text" 
                    disabled 
                    value="National Fraud Intelligence"
                    className="w-full bg-[#0e1628]/50 border border-white/10 rounded-lg p-2.5 text-white disabled:opacity-60 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 block uppercase">Linked Email</span>
                  <input 
                    type="text" 
                    disabled 
                    value={email}
                    className="w-full bg-[#0e1628]/50 border border-white/10 rounded-lg p-2.5 text-white disabled:opacity-60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                {editing ? (
                  <>
                    <button 
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 rounded-lg bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500/45 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Sessions</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <span className="text-white block font-medium">Vercel Session Gateway</span>
                      <span className="text-[10px] text-gray-500">Active session</span>
                    </div>
                    <button className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] hover:bg-red-500/20 transition-colors font-bold uppercase">
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 uppercase tracking-widest">Exports</h3>
                <button className="w-full py-3 px-4 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-bold transition-all duration-200 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  DOWNLOAD PROFILE DATA
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
