import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { SystemLogo } from '../components/SystemLogo.tsx';
import { AppRoute } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface LoginScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { signIn, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(trimmedEmail, password);
    setIsSubmitting(false);

    if (result.success) {
      onNavigate('/home');
    } else {
      setError(result.error || 'Unable to connect. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between py-8 px-5 select-none bg-[#05070e] text-slate-100">
      {/* Background ambient glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-cyan-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none" />

      {/* Decorative HUD corner markers */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/40" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/40" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-400/40" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-400/40" />

      {/* Top Header */}
      <div className="relative z-10 text-center pt-4">
        <SystemLogo size="md" showTagline={false} className="mb-3" />

        <div className="text-[11px] font-mono tracking-[0.3em] text-cyan-400 font-bold uppercase">
          QUESTLIFE
        </div>

        <h1 className="mt-1 text-xl sm:text-2xl font-mono font-black tracking-widest text-white uppercase system-text-glow">
          WELCOME BACK, HUNTER
        </h1>

        <p className="mt-1 text-xs font-mono text-slate-400 tracking-wider">
          Access your Hunter stats, streaks, and quest log
        </p>
      </div>

      {/* Main Form */}
      <div className="relative z-10 my-auto py-4 w-full max-w-sm mx-auto">
        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs font-mono flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>SUPABASE NOT CONFIGURED</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Supabase environment variables are missing. Configure <code className="text-amber-100 font-bold">VITE_SUPABASE_URL</code> and <code className="text-amber-100 font-bold">VITE_SUPABASE_ANON_KEY</code> to enable live cloud authentication.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/home')}
              className="mt-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-mono font-bold uppercase transition-colors text-center cursor-pointer"
            >
              Continue in Local Mode →
            </button>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Email Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hunter@domain.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#090d1c] border border-cyan-900 focus:border-cyan-400 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#090d1c] border border-cyan-900 focus:border-cyan-400 text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-login"
            disabled={isSubmitting}
            className="mt-3 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <>
                <span>LOGIN</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bottom Navigation Link */}
      <div className="relative z-10 pt-4 text-center">
        <button
          type="button"
          id="link-to-signup"
          onClick={() => onNavigate('/signup')}
          className="text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          Don't have an account? <span className="text-cyan-400 font-bold underline">SIGN UP</span>
        </button>
      </div>
    </div>
  );
};
