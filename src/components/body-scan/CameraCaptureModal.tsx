import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  RotateCcw,
  Timer,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { PoseAlignmentGuide } from './PoseAlignmentGuide.tsx';

interface CameraCaptureModalProps {
  isOpen: boolean;
  isBaseline: boolean;
  onClose: () => void;
  onCaptureComplete: (imageDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  isBaseline,
  onClose,
  onCaptureComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(3); // default 3s countdown for hands-free positioning
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState<boolean>(false);

  // Start device camera
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setCameraError(null);
    setIsCameraActive(false);

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not available in this browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('[CameraCaptureModal] Camera initialization error:', err);
      let message = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera device detected on this system.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is currently in use by another application.';
      }
      setCameraError(message);
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedImage, startCamera, stopCamera]);

  // Flip camera front / back
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Perform image capture
  const takeSnapshot = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const width = video.videoWidth || 720;
      const height = video.videoHeight || 960;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // If front camera, mirror image for intuitive consistency
        if (facingMode === 'user') {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, width, height);

        // Export optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  }, [facingMode, stopCamera]);

  // Handle countdown trigger
  const handleShutterPress = () => {
    if (timerSeconds <= 0) {
      takeSnapshot();
      return;
    }

    setCountdown(timerSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            setCountdown(null);
            takeSnapshot();
          }, 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Generate a sample test scan when physical camera is restricted or unavailable
  const handleUseSimulatedScan = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark high-tech background
      const grad = ctx.createLinearGradient(0, 0, 0, 960);
      grad.addColorStop(0, '#0a1020');
      grad.addColorStop(0.5, '#05070e');
      grad.addColorStop(1, '#070b16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 960);

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 720; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 960);
        ctx.stroke();
      }
      for (let y = 0; y < 960; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(720, y);
        ctx.stroke();
      }

      // Stylized Hunter Silhouette
      ctx.fillStyle = '#0e1830';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 2;

      // Head
      ctx.beginPath();
      ctx.arc(360, 200, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Torso & Shoulders
      ctx.beginPath();
      ctx.moveTo(220, 320);
      ctx.quadraticCurveTo(360, 290, 500, 320); // Shoulders
      ctx.lineTo(460, 680); // Waist
      ctx.lineTo(260, 680);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Arms
      ctx.beginPath();
      ctx.moveTo(220, 320);
      ctx.lineTo(190, 640);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(500, 320);
      ctx.lineTo(530, 640);
      ctx.stroke();

      // System Tag
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isBaseline ? 'HUNTER BASELINE // STANDARDIZED' : 'HUNTER PROGRESS // STANDARDIZED', 360, 780);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(new Date().toLocaleDateString(), 360, 815);

      const testDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(testDataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCaptureComplete(capturedImage);
      setCapturedImage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen flash on capture */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-cyan-200 z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col justify-between overflow-hidden bg-[#05070e]">
        {/* Top Control Bar */}
        <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <h2 className="font-hud text-xs font-bold tracking-widest text-cyan-300 uppercase">
                {isBaseline ? 'BASELINE SCAN PROTOCOL' : 'STANDARDIZED PROGRESS SCAN'}
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                {facingMode === 'user' ? 'FRONT CAMERA // MIRRORED' : 'REAR CAMERA // DIRECT'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-red-500/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
          {!capturedImage ? (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? '-scale-x-100' : ''
                }`}
              />

              {/* HUD Pose Alignment Silhouette Overlay */}
              {isCameraActive && <PoseAlignmentGuide />}

              {/* Countdown Overlay */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  >
                    <div className="w-28 h-28 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center backdrop-blur-md shadow-[0_0_40px_rgba(0,240,255,0.6)]">
                      <span className="font-display text-6xl font-black text-cyan-300">
                        {countdown}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Camera Error / Permission Fallback Screen */}
              {cameraError && (
                <div className="absolute inset-0 z-30 p-6 flex flex-col items-center justify-center text-center bg-[#070b16]/95 backdrop-blur-md">
                  <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-4 text-red-400">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h3 className="font-hud text-sm font-bold text-red-300 tracking-wider uppercase mb-2">
                    CAMERA INITIALIZATION FAILED
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs mb-6 font-mono leading-relaxed">
                    {cameraError}
                  </p>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      RETRY CAMERA
                    </button>

                    <button
                      onClick={handleUseSimulatedScan}
                      className="w-full py-2 px-4 rounded-xl bg-slate-900 border border-cyan-500/40 hover:bg-slate-800 text-cyan-300 font-hud text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      TEST WITH STANDARDIZED SAMPLE
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Review Captured Photo */
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured progress scan"
                className="w-full h-full object-contain"
              />

              {/* Overlay Confirmation Badge */}
              <div className="absolute top-4 px-3 py-1.5 rounded-lg bg-black/80 border border-cyan-500/60 backdrop-blur-md flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-hud text-xs font-bold text-cyan-200 uppercase tracking-wider">
                  SCAN CAPTURED // READY FOR VERIFICATION
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Controls */}
        <div className="relative z-20 p-5 bg-gradient-to-t from-black via-black/90 to-transparent">
          {!capturedImage ? (
            <div className="flex items-center justify-between gap-4 max-w-sm mx-auto">
              {/* Hands-free Timer Selector Button */}
              <button
                type="button"
                onClick={() => {
                  const options = [0, 3, 5, 10];
                  const nextIdx = (options.indexOf(timerSeconds) + 1) % options.length;
                  setTimerSeconds(options[nextIdx]);
                }}
                disabled={!isCameraActive || countdown !== null}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border transition-all ${
                  timerSeconds > 0
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-800 bg-slate-900/60 text-slate-500'
                }`}
                title="Hands-free Countdown Timer"
              >
                <Timer className="w-4 h-4" />
                <span className="text-[9px] font-mono font-bold">
                  {timerSeconds === 0 ? 'OFF' : `${timerSeconds}s`}
                </span>
              </button>

              {/* Primary Shutter Button */}
              <button
                type="button"
                onClick={handleShutterPress}
                disabled={!isCameraActive || countdown !== null}
                className="relative group p-1 rounded-full border-2 border-cyan-400/80 shadow-[0_0_24px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 via-cyan-400 to-blue-500 flex items-center justify-center group-hover:scale-95 transition-transform">
                  <Camera className="w-7 h-7 text-white drop-shadow" />
                </div>
              </button>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                disabled={!isCameraActive || countdown !== null}
                className="flex flex-col items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500 transition-all disabled:opacity-40"
                title="Flip Camera"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[9px] font-mono">FLIP</span>
              </button>
            </div>
          ) : (
            /* Confirm or Retake Bar */
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-hud text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                RETAKE
              </button>

              <button
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {isBaseline ? 'SAVE BASELINE' : 'CONFIRM SCAN'}
              </button>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>PRIVATE & ENCRYPTED // ACCESSIBLE ONLY BY YOU</span>
          </div>
        </div>
      </div>
    </div>
  );
};
