import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { TaskVerificationConfig } from '../types.ts';
import { checkIsWithinTimeWindow, formatMinutesToTime } from '../utils/taskVerificationConfig.ts';

interface TaskCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  xp: number;
  config: TaskVerificationConfig;
  onCaptureSuccess: (payload: {
    photoUrl: string;
    captureTimestamp: number;
    captureTimeFormatted: string;
    isWithinWindow: boolean;
  }) => void;
  onCompleteManually: () => void;
}

export const TaskCaptureModal: React.FC<TaskCaptureModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  xp,
  config,
  onCaptureSuccess,
  onCompleteManually,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Testing & Simulation overrides (for instant verification testing across any time of day)
  const [timeSimulationMode, setTimeSimulationMode] = useState<'real' | 'in_window' | 'out_of_window'>('real');

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser environment.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback if ideal constraint fails
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err: unknown) {
      console.warn('[TaskCaptureModal] Camera initialization notice:', err);
      const errorMsg =
        err instanceof Error ? err.message : 'Camera permission was denied or optical sensor is unavailable.';
      setCameraError(errorMsg);
      setIsInitializing(false);
    }
  }, [facingMode]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Toggle Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Snapshot
  const handleTakePhoto = () => {
    setIsCapturing(true);

    let dataUrl = '';

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // If front-facing, mirror horizontally
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add System timestamp stamp watermark
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(16, canvas.height - 48, 380, 36);
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText(
          `SYSTEM VERIFIED // ${taskTitle.toUpperCase()} // ${new Date().toLocaleTimeString()}`,
          24,
          canvas.height - 25
        );

        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    } else {
      // Fallback synthetic photo when physical camera is mock/simulated
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090e1c';
        ctx.fillRect(0, 0, 640, 480);
        // Grid pattern
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 480);
          ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
        }
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'center';
        ctx.fillText('OPTICAL CAPTURE // VERIFIED', 320, 220);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${taskTitle.toUpperCase()} • ${new Date().toLocaleTimeString()}`, 320, 260);
        dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
    }

    setCapturedPhoto(dataUrl);

    // Evaluate Time Window
    let effectiveDate = new Date();
    if (timeSimulationMode === 'in_window') {
      effectiveDate = new Date();
      effectiveDate.setHours(Math.floor(config.windowStartMinute / 60));
      effectiveDate.setMinutes(config.windowStartMinute + 5);
    } else if (timeSimulationMode === 'out_of_window') {
      effectiveDate = new Date();
      effectiveDate.setHours(Math.floor((config.windowEndMinute + 120) / 60) % 24);
      effectiveDate.setMinutes(0);
    }

    const windowCheck = checkIsWithinTimeWindow(config, effectiveDate);

    // Stop video tracks once photo is taken
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsCapturing(false);

    // Complete verification
    onCaptureSuccess({
      photoUrl: dataUrl,
      captureTimestamp: effectiveDate.getTime(),
      captureTimeFormatted: windowCheck.currentFormattedTime,
      isWithinWindow: windowCheck.isWithin,
    });
  };

  if (!isOpen) return null;

  // Real-time evaluation of current local time against window
  const currentWindowCheck = checkIsWithinTimeWindow(config, new Date());

  return (
    <div
      id="task-camera-viewfinder-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div
        id="camera-viewfinder-card"
        className="relative w-full max-w-lg rounded-2xl bg-[#060a14] border border-cyan-500/50 overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-3.5 bg-[#0a0f22] border-b border-cyan-950/80">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <p
                id="camera-modal-title"
                className="font-hud text-xs font-black tracking-widest text-cyan-300 uppercase"
              >
                SYSTEM OPTICAL SCANNER
              </p>
              <p className="font-mono text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                TARGET: {taskTitle.toUpperCase()}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-camera-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-400 transition-colors cursor-pointer"
            aria-label="Close camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Target & Time Window Banner */}
        <div className="px-3.5 py-2 bg-[#091024] border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target: <strong className="text-white">{config.targetTimeStr}</strong></span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">Window:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#060914] border border-cyan-500/30 text-cyan-300 font-hud text-[10px] font-bold">
              {config.windowDisplayStr}
            </span>
          </div>
        </div>

        {/* Camera Viewport / Live Feed */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] bg-black overflow-hidden flex items-center justify-center">
          {cameraError ? (
            /* CAMERA PERMISSION DENIED OR ERROR STATE */
            <div
              id="camera-permission-denied-state"
              className="p-6 text-center max-w-sm space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/60 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-hud text-sm font-black text-amber-300 tracking-wider uppercase mb-1">
                  OPTICAL SENSOR ACCESS RESTRICTED
                </h3>
                <p className="font-mono text-xs text-slate-400 leading-relaxed">
                  Camera permission was denied or optical sensor is unavailable on this device.
                </p>
                <p className="font-mono text-[11px] text-cyan-400 mt-2">
                  You may still clear this quest objective using [MANUAL COMPLETE].
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  id="btn-retry-camera"
                  onClick={startCamera}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 font-hud text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RETRY PERMISSION
                </button>

                <button
                  type="button"
                  id="btn-fallback-manual-complete"
                  onClick={() => {
                    onCompleteManually();
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-hud text-xs font-extrabold tracking-wider uppercase hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer"
                >
                  MANUAL COMPLETE
                </button>
              </div>

              {/* Optional simulated sensor capture for testing in browser without camera */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-simulated-capture"
                  onClick={handleTakePhoto}
                  className="text-[10px] font-hud text-cyan-400/80 hover:text-cyan-300 underline tracking-wider cursor-pointer"
                >
                  SIMULATE CAMERA SENSOR CAPTURE (TEST MODE)
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE CAMERA STREAM */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                }`}
              />

              {/* HUD Targeting Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                {/* Top Corner Lasers */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                </div>

                {/* Center Reticle Crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-cyan-400/40 rounded-xl flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]" />
                  <div className="absolute -top-3 text-[9px] font-mono tracking-widest text-cyan-400/80 bg-black/60 px-1 rounded">
                    SCAN TARGET
                  </div>
                </div>

                {/* Bottom Corner Lasers */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                </div>
              </div>

              {/* Specific Capture Hint Pill */}
              {config.capturePrompt && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/75 border border-cyan-500/40 px-3 py-1 rounded-full text-[10px] font-mono text-cyan-300 shadow-md backdrop-blur-sm pointer-events-none text-center">
                  {config.capturePrompt}
                </div>
              )}
            </>
          )}
        </div>

        {/* Testing Simulator Strip (Allows verifying both Verified & Missed window immediately) */}
        <div className="px-3 py-1.5 bg-[#050814] border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">TEST WINDOW CHECK:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="test-mode-real"
              onClick={() => setTimeSimulationMode('real')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                timeSimulationMode === 'real'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              REAL ({formatMinutesToTime(new Date().getHours() * 60 + new Date().getMinutes())})
            </button>
            <button
              type="button"
              id="test-mode-in-window"
              onClick={() => setTimeSimulationMode('in_window')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                timeSimulationMode === 'in_window'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              IN-WINDOW (VERIFIED)
            </button>
            <button
              type="button"
              id="test-mode-out-of-window"
              onClick={() => setTimeSimulationMode('out_of_window')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                timeSimulationMode === 'out_of_window'
                  ? 'bg-amber-950 border border-amber-400 text-amber-300 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              MISSED WINDOW
            </button>
          </div>
        </div>

        {/* Bottom Shutter Controls */}
        <div className="p-4 bg-[#0a0f22] border-t border-cyan-950 flex items-center justify-between">
          {/* Flip Camera Button */}
          <button
            type="button"
            id="btn-flip-camera"
            onClick={handleFlipCamera}
            disabled={Boolean(cameraError)}
            className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Switch front/back camera"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Shutter Button (Capture) */}
          <button
            type="button"
            id="btn-shutter-capture"
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="group relative w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.6)] active:scale-95 transition-transform cursor-pointer"
            aria-label="Capture verification photo"
          >
            <div className="w-full h-full rounded-full border-2 border-white bg-cyan-950 flex items-center justify-center group-hover:bg-cyan-900 transition-colors">
              <Camera className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
          </button>

          {/* Switch to Manual Complete Option */}
          <button
            type="button"
            id="btn-manual-from-camera"
            onClick={() => {
              onCompleteManually();
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-[11px] font-hud font-bold text-slate-300 hover:text-cyan-200 transition-colors cursor-pointer text-center"
          >
            MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};
