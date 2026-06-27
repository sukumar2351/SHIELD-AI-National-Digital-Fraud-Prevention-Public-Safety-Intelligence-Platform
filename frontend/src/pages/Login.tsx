import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
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
        // ignore if already removed
      }
    };
  }, []);

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
      setError("Hackathon login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-radial-at-c from-blue-900/10 via-transparent to-transparent opacity-50 z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,25,41,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,25,41,0.05)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 z-0"></div>

      <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900/40 border border-blue-500/15 backdrop-blur-xl shadow-2xl relative z-10 glass-panel grid-scan space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center p-3 text-blue-400 shadow-blue-500/20 shadow-lg pulse-glow">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-widest font-mono">
              SHIELD <span className="text-blue-500">AI</span>
            </h1>
            <p className="text-[10px] text-gray-400 mt-1.5 font-mono tracking-widest uppercase leading-relaxed">
              National Fraud Intelligence Operating System
            </p>
          </div>
        </div>

        <div className="border-t border-blue-500/10 my-4"></div>

        <div className="flex flex-col items-center space-y-6">
          <div className="text-center">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Sign in to continue</p>
            <p className="text-[10px] text-gray-500 font-mono mt-1">Authorized access points only</p>
          </div>

          <div id="google-signin-btn" className="min-h-[44px]"></div>

          <div className="flex items-center gap-3 w-full my-2">
            <div className="h-px bg-blue-500/10 flex-1"></div>
            <span className="text-[9px] font-mono text-gray-500 uppercase">OR</span>
            <div className="h-px bg-blue-500/10 flex-1"></div>
          </div>

          <button
            onClick={handleMockLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 hover:text-white font-mono text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            JURY DIRECT BYPASS LOGIN
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono text-center">
            {error}
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-[8px] text-gray-600 font-mono tracking-widest uppercase">
            RESTRICTED NETWORK | SECURED BY SSL &amp; JWT
          </p>
        </div>
      </div>
    </div>
  );
};
