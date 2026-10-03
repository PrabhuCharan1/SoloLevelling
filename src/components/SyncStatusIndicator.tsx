import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SyncStatusIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  showText = true,
}) => {
  const { syncStatus, isConfigured, isAuthenticated } = useAuth();

  if (!isConfigured) {
    return (
      <div
        id="sync-status-unconfigured"
        title="Supabase cloud sync not configured. Running in offline/local storage mode."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-slate-900/80 border-slate-700/60 text-slate-400 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        {showText && <span>LOCAL MODE</span>}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        id="sync-status-guest"
        title="Not logged in. Progress saved to this device only."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-slate-900/80 border-slate-700/60 text-slate-400 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        {showText && <span>GUEST</span>}
      </div>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <div
        id="sync-status-offline"
        title="Device is offline. Changes saved locally and will sync when reconnected."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-amber-950/40 border-amber-600/40 text-amber-400 ${className}`}
      >
        <CloudOff className="w-3 h-3 text-amber-400" />
        {showText && <span>OFFLINE</span>}
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div
        id="sync-status-syncing"
        title="Synchronizing with Supabase Cloud..."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)] ${className}`}
      >
        <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
        {showText && <span>SYNCING...</span>}
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div
        id="sync-status-error"
        title="Cloud sync encountered an issue. Local data remains safe."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-rose-950/40 border-rose-600/40 text-rose-400 ${className}`}
      >
        <AlertCircle className="w-3 h-3 text-rose-400" />
        {showText && <span>SYNC ERROR</span>}
      </div>
    );
  }

  // Synced
  return (
    <div
      id="sync-status-synced"
      title="All data synchronized with Supabase Cloud."
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider border bg-emerald-950/40 border-emerald-500/40 text-emerald-400 ${className}`}
    >
      <Check className="w-3 h-3 text-emerald-400" />
      {showText && <span>SYNCED</span>}
    </div>
  );
};
