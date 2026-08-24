import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Check, Sparkles, ScanLine } from 'lucide-react';
import { detectRealFace, loadFaceDetectionModels, FaceDetectionResult } from '../services/faceDetectionService.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string, faceEmbedding?: number[]) => void;
}

export const WebcamModal: React.FC<Props> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedEmbedding, setCapturedEmbedding] = useState<number[] | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedFace, setDetectedFace] = useState<FaceDetectionResult | null>(null);
  const isLoopRunning = useRef(false);

  useEffect(() => {
    loadFaceDetectionModels().catch(console.warn);
  }, []);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, capturedPhoto]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      isLoopRunning.current = true;
      runAnalysisLoop();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access webcam. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    isLoopRunning.current = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const runAnalysisLoop = useCallback(async () => {
    if (!isLoopRunning.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const res = await detectRealFace(video, 'user');
        setDetectedFace(res);
      } catch (err) {
        // Ignore loop glitch
      }
    }

    if (isLoopRunning.current) {
      setTimeout(runAnalysisLoop, 80);
    }
  }, []);

  const handleTakeSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const res = await detectRealFace(video, 'user');
    const photoUrl = res.alignedFaceDataUrl || (() => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.9);
      }
      return '';
    })();

    setCapturedPhoto(photoUrl);
    setCapturedEmbedding(res.descriptor || null);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedEmbedding(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto, capturedEmbedding || undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-xs sm:text-sm">SCRFD Face ID Baseline Calibration</h3>
              <p className="text-[10px] text-slate-400">Extracts 5 Landmarks & ArcFace 512-D Normalized Vector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder / Preview */}
        <div className="p-4 sm:p-6 flex flex-col items-center overflow-y-auto flex-1">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-emerald-500/50 shadow-xl bg-slate-950 flex items-center justify-center shrink-0">
            {cameraError ? (
              <div className="p-4 text-center text-rose-400 text-xs">{cameraError}</div>
            ) : capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured face" className="w-full h-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* 5 Facial Landmarks Cybernetic Overlay */}
                {detectedFace?.hasFace && detectedFace.landmarks5 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {[
                      detectedFace.landmarks5.leftEye,
                      detectedFace.landmarks5.rightEye,
                      detectedFace.landmarks5.noseTip,
                      detectedFace.landmarks5.leftMouth,
                      detectedFace.landmarks5.rightMouth,
                    ].map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#10b981" />
                    ))}
                  </svg>
                )}

                {/* Oval Guide Overlay */}
                <div className="absolute inset-3 sm:inset-4 rounded-full border-2 border-dashed border-emerald-400/60 pointer-events-none flex items-center justify-center">
                  <span className="text-[9px] sm:text-[10px] bg-slate-900/80 text-emerald-300 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {detectedFace?.hasFace ? 'Face Aligned (SCRFD)' : 'Center Face Here'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-center space-y-1">
            <p className="text-xs text-slate-300 font-medium">
              {capturedPhoto
                ? '✅ Aligned face portrait captured & ArcFace 512-D embedding extracted.'
                : detectedFace?.hasFace
                ? `Face Detected (${(detectedFace.confidence * 100).toFixed(0)}%). Sharpness: ${detectedFace.quality.sharpnessScore}%.`
                : 'Position face inside the frame with neutral expression and good lighting.'}
            </p>
            {detectedFace?.hasFace && !capturedPhoto && (
              <p className="text-[10px] text-emerald-400 font-mono">
                Pose: Yaw {detectedFace.quality.yawAngle}° | Liveness: {detectedFace.antiSpoofing.verdict}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          {capturedPhoto ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm & Save
              </button>
            </>
          ) : (
            <button
              onClick={handleTakeSnapshot}
              disabled={!!cameraError || !detectedFace?.hasFace}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Capture Face
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
