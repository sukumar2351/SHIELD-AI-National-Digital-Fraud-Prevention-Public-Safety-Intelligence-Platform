import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Radio, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Login: React.FC = () => {
  const { user, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Initialize startup load states
  const [initPercent, setInitPercent] = useState(0);
  const [initStep, setInitStep] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  const initTexts = [
    "Initializing National Fraud Intelligence Operating System...",
    "Bootstrapping Autonomous AI Threat Assessment Core...",
    "Syncing Network Graph Database & DNA Clusters...",
    "Opening Ingestion Pipeline for Geospatial Threat Maps...",
    "Securing Token Verification Gateway..."
  ];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Loading Simulation
  useEffect(() => {
    if (!isInitializing) return;

    const interval = setInterval(() => {
      setInitPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsInitializing(false), 400);
          return 100;
        }
        const increment = Math.floor(Math.random() * 8) + 4;
        const nextVal = Math.min(prev + increment, 100);
        const step = Math.floor((nextVal / 100) * initTexts.length);
        setInitStep(Math.min(step, initTexts.length - 1));
        return nextVal;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [isInitializing]);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (isInitializing) return;

    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: "786438927429-mockclientid.apps.googleusercontent.com",
            callback: handleGoogleResponse,
          });
          (window as any).google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "dark", size: "large", width: 280 }
          );
        } catch (e) {
          console.warn("Google GIS initialization failed:", e);
        }
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // script already removed or failed to append
      }
    };
  }, [isInitializing]);

  const handleGoogleResponse = async (response: any) => {
    try {
      setError(null);
      await loginWithGoogle(response.credential);
      navigate('/dashboard');
    } catch (err) {
      setError("Authentication failed. Please try again.");
    }
  };

  const handleMockLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle("mock_google_token");
      navigate('/dashboard');
    } catch (err) {
      setError("Hackathon bypass login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* ─── Hardware Accelerated Global Styles & Keyframes ─── */}
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes cyber-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cyber-rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes neon-glow-border {
          0%, 100% {
            border-color: rgba(59, 130, 246, 0.15);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.05);
          }
          50% {
            border-color: rgba(0, 210, 255, 0.45);
            box-shadow: 0 0 35px rgba(0, 210, 255, 0.2);
          }
        }

        .radial-radar {
          position: absolute;
          width: 800px;
          height: 800px;
          border: 1px solid rgba(59, 130, 246, 0.04);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* ─── Background Ambient Layers ─── */}
      <div className="absolute inset-0 bg-radial-at-c from-[#0f172a] via-[#020617] to-[#020617] opacity-90 z-0"></div>
      
      {/* Visual Scanning Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,25,41,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(18,25,41,0.08)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 z-0"></div>
      


      {/* Animated Radar Sweeper */}
      <div className="radial-radar flex items-center justify-center z-0">
        <div className="w-[600px] h-[600px] border border-blue-500/5 rounded-full flex items-center justify-center">
          <div className="w-[400px] h-[400px] border border-blue-500/5 rounded-full flex items-center justify-center relative">
            {/* Sweeping Line */}
            <div 
              className="absolute top-1/2 left-1/2 w-1/2 h-[2px] bg-gradient-to-r from-blue-500/20 to-transparent origin-left"
              style={{ animation: 'radar-sweep 12s linear infinite', transform: 'translateY(-50%)' }}
            ></div>
          </div>
        </div>
      </div>

      {/* Concentric Cyber Rings Behind Login Card */}
      {!isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <svg className="w-[580px] h-[580px] text-blue-500/10 animate-[cyber-rotate_45s_linear_infinite]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 6" />
            <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="12 18" />
          </svg>
          <svg className="w-[480px] h-[480px] text-cyan-500/15 animate-[cyber-rotate-reverse_28s_linear_infinite] absolute" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="18 12 4 12" />
          </svg>
        </div>
      )}

      {/* ─── Immersive Interactive Cards ─── */}
      <AnimatePresence mode="wait">
        {isInitializing ? (
          /* startup load sequence screen */
          <motion.div
            key="initializer"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(12px)' }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center text-center space-y-8 z-50 absolute inset-0 bg-[#020617] px-6"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/5 border border-blue-500/30 flex items-center justify-center p-3 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.15)] pulse-glow">
                <Shield className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-[0.25em] font-mono">
                  SHIELD <span className="text-blue-500">AI</span>
                </h1>
                <p className="text-[9px] text-gray-500 mt-2 font-mono tracking-[0.3em] uppercase">
                  National Fraud Intelligence Platform
                </p>
              </div>
            </div>

            {/* Load percentage hud */}
            <div className="space-y-3 flex flex-col items-center">
              <div className="w-72 h-1 rounded-full bg-blue-950/50 border border-blue-500/10 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-75 ease-out shadow-[0_0_8px_#3b82f6]"
                  style={{ width: `${initPercent}%` }}
                ></div>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest">{initPercent}%</span>
                <span className="text-[9px] text-gray-400 font-mono tracking-widest uppercase transition-all duration-150 h-4">
                  {initTexts[initStep]}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* main sign-in board */
          <motion.div
            key="login-panel"
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full max-w-md p-8 rounded-2xl bg-gray-900/35 border border-blue-500/15 backdrop-blur-xl shadow-2xl relative z-10 glass-panel space-y-6"
            style={{ animation: 'neon-glow-border 6s ease-in-out infinite' }}
          >
            {/* Header section with rotating logo ring */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Logo Rotating Rings */}
                <svg className="absolute inset-0 w-full h-full text-blue-500/30 animate-[cyber-rotate_10s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8 4 8" />
                </svg>
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center p-3 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)] pulse-glow relative z-10">
                  <Shield className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <motion.h1 
                  initial={{ letterSpacing: "0.1em", opacity: 0 }}
                  animate={{ letterSpacing: "0.25em", opacity: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="text-3xl font-bold text-white font-mono"
                >
                  SHIELD <span className="text-blue-500">AI</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-[9px] text-gray-400 mt-2 font-mono tracking-[0.2em] uppercase leading-relaxed"
                >
                  National Fraud Intelligence Operating System
                </motion.p>
              </div>
            </div>

            <div className="border-t border-blue-500/10 my-2"></div>

            {/* Live system state panel */}
            <div className="p-4 rounded-xl bg-gray-950/60 border border-blue-500/10 font-mono text-[9px] space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-blue-500/10 pb-1 text-[8px] text-gray-500 tracking-wider">
                <span>SYSTEM STATUS RUNTIME</span>
                <span className="text-green-400 animate-pulse font-bold">● ONLINE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_6px_#10b981] animate-pulse"></span>
                  <span>AI Core Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_6px_#10b981] animate-pulse"></span>
                  <span>Fraud DB Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_6px_#10b981] animate-pulse"></span>
                  <span>Threat intel feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_6px_#10b981] animate-pulse"></span>
                  <span>Secure JWT Handshake</span>
                </div>
              </div>
            </div>

            {/* Sign in core actions */}
            <div className="flex flex-col items-center space-y-5">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Sign in to continue</p>
                <p className="text-[9px] text-gray-600 font-mono">Secured credential gateway</p>
              </div>

              {/* Google OAuth rendering target container */}
              <div id="google-signin-btn" className="min-h-[44px]"></div>

              <div className="flex items-center gap-3 w-full my-1">
                <div className="h-[1px] bg-blue-500/10 flex-1"></div>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">OR</span>
                <div className="h-[1px] bg-blue-500/10 flex-1"></div>
              </div>

              {/* Hackathon bypass button */}
              <button
                onClick={handleMockLogin}
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-white font-mono text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(0,210,255,0.15)]"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                JURY DIRECT BYPASS LOGIN
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[9px] font-mono text-center">
                {error}
              </div>
            )}

            {/* Security layout badges */}
            <div className="border-t border-blue-500/10 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/20 border border-blue-500/10 text-[8px] font-mono text-gray-500 tracking-wider">
                  SSL SECURE
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/20 border border-blue-500/10 text-[8px] font-mono text-gray-500 tracking-wider">
                  JWT AUTH
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/20 border border-blue-500/10 text-[8px] font-mono text-gray-500 tracking-wider">
                  GOOGLE SECURED
                </div>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-gray-600 font-mono tracking-widest uppercase">
                  RESTRICTED ACCESS AREA | AUTHORIZED PERSONNEL ONLY
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
