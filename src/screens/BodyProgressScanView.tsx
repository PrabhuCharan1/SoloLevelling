import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  ShieldCheck,
  Sparkles,
  Columns2,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  Eye,
  Sliders,
  History,
  Lock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { AppRoute, BodyProgressScan, ScanComparisonResult } from '../types.ts';
import {
  getAllBodyScans,
  saveBodyScan,
  deleteBodyScan,
  calculateScanLabel,
  syncBodyScanToCloud,
} from '../utils/bodyScanStorage.ts';
import { compareBodyScans } from '../utils/bodyScanComparison.ts';
import { CameraCaptureModal } from '../components/body-scan/CameraCaptureModal.tsx';
import { ComparisonModal } from '../components/body-scan/ComparisonModal.tsx';
import { ScanCompleteModal } from '../components/body-scan/ScanCompleteModal.tsx';
import { BodyProgressTimeline } from '../components/body-scan/BodyProgressTimeline.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface BodyProgressScanViewProps {
  onBackToWorkout?: () => void;
  onNavigate?: (route: AppRoute) => void;
}

export const BodyProgressScanView: React.FC<BodyProgressScanViewProps> = ({
  onBackToWorkout,
  onNavigate,
}) => {
  const { user } = useAuth();

  const [scans, setScans] = useState<BodyProgressScan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureIsBaseline, setCaptureIsBaseline] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [justCompletedIsBaseline, setJustCompletedIsBaseline] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [comparisonTargetScan, setComparisonTargetScan] = useState<BodyProgressScan | null>(null);
  const [comparingProcessing, setComparingProcessing] = useState<boolean>(false);
  const [showPoseInstructions, setShowPoseInstructions] = useState<boolean>(false);

  // Load scans from IndexedDB
  const loadScans = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getAllBodyScans();
      setScans(items);
    } catch (err) {
      console.error('[BodyProgressScanView] Failed to load scans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const baselineScan = scans.find((s) => s.isBaseline) || (scans.length > 0 ? scans[0] : null);
  const latestScan = scans.length > 0 ? scans[scans.length - 1] : null;
  const previousScan = scans.length > 1 ? scans[scans.length - 2] : baselineScan;

  // Initiate Baseline Capture
  const handleStartBaselineCapture = () => {
    setCaptureIsBaseline(true);
    setIsCapturing(true);
  };

  // Initiate Regular Progress Capture
  const handleStartProgressCapture = () => {
    setCaptureIsBaseline(false);
    setIsCapturing(true);
  };

  // Handle Photo Saved from Camera Viewfinder
  const handleCaptureComplete = async (dataUrl: string) => {
    const isBaseline = captureIsBaseline || scans.length === 0;
    const now = Date.now();
    const scanNumber = scans.length + 1;
    const label = calculateScanLabel(isBaseline, now, baselineScan?.timestamp, scanNumber);

    const newScan: BodyProgressScan = {
      id: `scan_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      dateKey: new Date().toISOString().split('T')[0],
      scanNumber,
      label,
      isBaseline,
      imageDataUrl: dataUrl,
    };

    // If there is a previous scan, compare against it
    if (!isBaseline && latestScan) {
      setComparingProcessing(true);
      try {
        const compResult = await compareBodyScans(latestScan.imageDataUrl, dataUrl);
        newScan.comparisonWithPrevious = compResult;
      } catch (err) {
        console.warn('[BodyProgressScanView] Comparison error:', err);
      } finally {
        setComparingProcessing(false);
      }
    }

    // Persist to local IndexedDB
    await saveBodyScan(newScan);

    // Optional cloud sync to Supabase private storage if authenticated
    if (user?.id) {
      syncBodyScanToCloud(user.id, newScan).catch((e) =>
        console.warn('[BodyProgressScanView] Background cloud sync note:', e)
      );
    }

    // Reload list and show completion modal
    await loadScans();
    setJustCompletedIsBaseline(isBaseline);
    setShowCompleteModal(true);
  };

  // Delete Scan Handler
  const handleDeleteScan = async (scanId: string) => {
    await deleteBodyScan(scanId);
    await loadScans();
  };

  // Open comparison modal for a specific scan
  const handleOpenComparison = (scan: BodyProgressScan) => {
    setComparisonTargetScan(scan);
    setShowComparisonModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-hud text-xs font-bold text-cyan-300 tracking-widest uppercase animate-pulse">
          INITIALIZING BIOMETRIC SCAN DATABASE...
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. FIRST TIME SETUP / BASELINE ONBOARDING VIEW
  // ─────────────────────────────────────────────────────────────
  if (!baselineScan) {
    return (
      <div className="space-y-6 pb-20 select-none">
        {/* Navigation Back to Workout */}
        {onBackToWorkout && (
          <button
            type="button"
            onClick={onBackToWorkout}
            className="flex items-center gap-2 text-xs font-hud font-bold text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO WORKOUT ROUTINE
          </button>
        )}

        {/* SYSTEM BASELINE SETUP CARD */}
        <div className="relative rounded-2xl p-6 bg-gradient-to-b from-[#080d1e] via-[#09112a] to-[#060a18] border border-cyan-500/50 shadow-[0_0_35px_rgba(0,240,255,0.25)] text-center space-y-6">
          {/* Tech Corner Accents */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

          {/* System Title Header */}
          <div className="space-y-1">
            <p className="font-hud text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase">
              SYSTEM
            </p>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent my-2" />
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-widest uppercase system-text-glow">
              BODY PROGRESS SCAN
            </h1>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent my-2" />
          </div>

          <p className="font-hud text-sm font-semibold text-slate-200 tracking-wide">
            Create your baseline progress photo.
          </p>

          {/* Consistency Guidelines (Prompt Exact List) */}
          <div className="text-left max-w-md mx-auto p-4 rounded-xl bg-black/60 border border-cyan-950/80 space-y-2.5">
            <p className="font-hud text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
              FOR CONSISTENT COMPARISON:
            </p>
            <ul className="space-y-2 font-mono text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Use the same front-facing pose</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Keep the camera at approximately the same distance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Use similar lighting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Keep similar clothing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>Use the same body position each time</span>
              </li>
            </ul>
          </div>

          {/* Capture Baseline Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartBaselineCapture}
              className="w-full max-w-md mx-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              [ CAPTURE BASELINE ]
            </button>
          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>ENCRYPTED & STORED PRIVATELY • NEVER SHARED PUBLICLY</span>
          </div>
        </div>

        {/* STANDARDIZED POSE INSTRUCTION DETAIL BOX */}
        <div className="p-5 rounded-2xl bg-[#080d1e] border border-cyan-950 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <h3 className="font-hud text-xs font-bold text-white tracking-wider uppercase">
              STANDARDIZED POSE PROTOCOL
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            Standardization is essential for authentic visual comparison. When the camera opens, an alignment wireframe will guide your body position, centering your shoulders, chest, and arms.
          </p>
        </div>

        {/* Camera Modal */}
        <CameraCaptureModal
          isOpen={isCapturing}
          isBaseline={captureIsBaseline}
          onClose={() => setIsCapturing(false)}
          onCaptureComplete={handleCaptureComplete}
        />

        {/* Completion Modal */}
        <ScanCompleteModal
          isOpen={showCompleteModal}
          isBaseline={justCompletedIsBaseline}
          onViewProgress={() => setShowCompleteModal(false)}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ACTIVE PROGRESS SCAN DASHBOARD (BASELINE ALREADY EXISTS)
  // ─────────────────────────────────────────────────────────────
  const latestResult = latestScan?.comparisonWithPrevious;
  const isUnreliable = latestResult?.confidenceReliable === false;
  const hasChanges = latestResult?.overall === 'visible changes detected';

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Top Bar with Back Navigation */}
      <div className="flex items-center justify-between">
        {onBackToWorkout && (
          <button
            type="button"
            onClick={onBackToWorkout}
            className="flex items-center gap-1.5 text-xs font-hud font-bold text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            WORKOUT ROUTINE
          </button>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-hud text-cyan-300 ml-auto">
          <Lock className="w-3 h-3 text-cyan-400" />
          <span>PRIVATE BIOMETRIC STORAGE</span>
        </div>
      </div>

      {/* Primary Action Banner: CAPTURE NEW PROGRESS */}
      <div className="relative rounded-2xl p-5 bg-gradient-to-r from-[#080d1e] via-[#0b1430] to-[#0e0e28] border border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-400" />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="font-hud text-xs font-bold text-cyan-300 uppercase tracking-widest">
              SYSTEM // BIOMETRIC TRACKER
            </p>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
            BODY PROGRESS SCAN
          </h2>
          <p className="font-mono text-xs text-slate-400">
            {scans.length} Total {scans.length === 1 ? 'Scan' : 'Scans'} Recorded • Baseline:{' '}
            {new Date(baselineScan.timestamp).toLocaleDateString()}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartProgressCapture}
          className="py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          [ CAPTURE NEW PROGRESS ]
        </button>
      </div>

      {/* RESULT UI: Solo Leveling System Aesthetic (Exact Format Requested) */}
      {latestScan && scans.length > 1 && latestResult && (
        <div className="relative rounded-2xl p-6 bg-[#080d1e] border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(0,240,255,0.2)] space-y-4">
          <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

          {/* SYSTEM HEADER */}
          <div className="text-center space-y-1">
            <p className="font-hud text-xs font-bold tracking-[0.25em] text-cyan-400 uppercase">
              SYSTEM
            </p>
            <div className="w-full h-px bg-cyan-500/40 my-2" />
            <h3 className="font-display text-lg sm:text-xl font-black text-white tracking-widest uppercase system-text-glow">
              BODY PROGRESS SCAN
            </h3>
            <div className="w-full h-px bg-cyan-500/40 my-2" />
          </div>

          {/* If Inconclusive / Lighting Differs */}
          {isUnreliable ? (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 space-y-1 text-center">
              <p className="font-hud text-xs font-bold uppercase tracking-wider">
                NOTICE // UNRELIABLE COMPARISON
              </p>
              <p className="font-mono text-xs text-amber-300/90 leading-relaxed">
                "{latestResult.unreliableReason || 'System could not confidently determine visual changes because the photos differ in lighting/pose/position.'}"
              </p>
            </div>
          ) : (
            /* EXACT CATEGORIES LIST */
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-widest">
                  CHEST
                </span>
                <span
                  className={`font-hud text-xs font-bold uppercase tracking-wider ${
                    latestResult.chest === 'visible change' ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  {latestResult.chest === 'visible change'
                    ? 'Visible change detected'
                    : 'No clear change detected'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-widest">
                  ARMS
                </span>
                <span
                  className={`font-hud text-xs font-bold uppercase tracking-wider ${
                    latestResult.arms === 'visible change' ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  {latestResult.arms === 'visible change'
                    ? 'Visible change detected'
                    : 'No clear change detected'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-widest">
                  SHOULDERS
                </span>
                <span
                  className={`font-hud text-xs font-bold uppercase tracking-wider ${
                    latestResult.shoulders === 'visible change' ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  {latestResult.shoulders === 'visible change'
                    ? 'Visible change detected'
                    : 'No clear change detected'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-widest">
                  ABDOMEN
                </span>
                <span
                  className={`font-hud text-xs font-bold uppercase tracking-wider ${
                    latestResult.abdomen === 'visible change' ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                >
                  {latestResult.abdomen === 'visible change'
                    ? 'Visible change detected'
                    : 'No clear change detected'}
                </span>
              </div>
            </div>
          )}

          {/* PROGRESS STATUS BAR */}
          <div className="space-y-1 pt-2">
            <div className="w-full h-px bg-cyan-500/40 my-2" />
            <div className="flex items-center justify-between">
              <span className="font-hud text-xs font-bold text-slate-400 tracking-widest uppercase">
                PROGRESS STATUS
              </span>
              <span
                className={`font-hud text-xs font-bold uppercase tracking-wider ${
                  hasChanges ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {isUnreliable
                  ? 'INCONCLUSIVE'
                  : hasChanges
                  ? 'Changes detected'
                  : 'No clear changes detected'}
              </span>
            </div>
            <div className="w-full h-px bg-cyan-500/40 my-2" />
          </div>

          {/* VIEW COMPARISON BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleOpenComparison(latestScan)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Columns2 className="w-4 h-4" />
              [ VIEW COMPARISON ]
            </button>
          </div>
        </div>
      )}

      {/* PROGRESS TIMELINE SECTION */}
      <BodyProgressTimeline
        scans={scans}
        onViewComparison={handleOpenComparison}
        onDeleteScan={handleDeleteScan}
      />

      {/* STANDARDIZED POSE REMINDER ACCORDION */}
      <div className="p-4 rounded-xl bg-[#080d1e] border border-cyan-950 space-y-2">
        <button
          type="button"
          onClick={() => setShowPoseInstructions(!showPoseInstructions)}
          className="w-full flex items-center justify-between text-left text-xs font-hud font-bold text-slate-300 hover:text-cyan-300 transition-colors uppercase tracking-wider"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            STANDARDIZED POSE RULES
          </span>
          <span>{showPoseInstructions ? '▲ HIDE' : '▼ VIEW'}</span>
        </button>

        {showPoseInstructions && (
          <div className="pt-2 font-mono text-xs text-slate-400 space-y-1.5 border-t border-slate-900">
            <p>• Stand facing the camera directly.</p>
            <p>• Keep the camera at chest/torso height consistently.</p>
            <p>• Align body with the HUD silhouette guidelines.</p>
            <p>• Maintain approximately 2 meters (6-7 ft) distance using hands-free countdown.</p>
            <p>• Use similar room lighting without heavy side-shadows.</p>
          </div>
        )}
      </div>

      {/* RANK & SYSTEM INTEGRITY ASSURANCE BANNER */}
      <div className="p-4 rounded-xl bg-[#070c1a] border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed space-y-1">
        <p className="font-hud font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          HUNTER RANK & PRIVACY GUARANTEE
        </p>
        <p>
          Body Progress Scan operates purely as a sensitive, personal visual development tool. It
          does not grade appearance, evaluate body-fat %, or affect your Hunter Rank or XP. Hunter
          Rank is determined exclusively by your Level progression through completed Quests and
          Training.
        </p>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCapturing}
        isBaseline={captureIsBaseline}
        onClose={() => setIsCapturing(false)}
        onCaptureComplete={handleCaptureComplete}
      />

      {/* Comparison Modal (Side-by-Side / Interactive Split Slider) */}
      <ComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        previousScan={previousScan}
        currentScan={comparisonTargetScan || latestScan}
        comparisonResult={comparisonTargetScan?.comparisonWithPrevious || latestResult}
      />

      {/* Completion Notification Modal */}
      <ScanCompleteModal
        isOpen={showCompleteModal}
        isBaseline={justCompletedIsBaseline}
        onViewProgress={() => setShowCompleteModal(false)}
      />
    </div>
  );
};
