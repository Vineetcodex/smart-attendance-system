import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  LogOut,
  ArrowRight,
  ShieldCheck,
  SwitchCamera,
  AlertTriangle,
  Lock,
  User,
  Check,
  History,
  LayoutDashboard,
  Shuffle,
  ScanLine,
  UserPlus,
  LogIn,
  QrCode,
  Scan,
  Settings,
  Server,
  Trash2,
  Timer,
  RotateCcw,
  Building2,
  MapPinOff,
  Download,
  ArrowUpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  Employee,
  Organization,
  AttendanceLog,
  setApiBase,
  getApiBase,
  APP_VERSION,
  AppVersionInfo,
} from '../services/api.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { validateAndNormalizeEmployeeCode } from '../utils/codeValidator.js';
import {
  detectRealFace,
  loadFaceDetectionModels,
  FaceDetectionResult,
  checkPoseMatch,
  calculateArcFaceCosineSimilarity,
  PoseStage,
  FiveLandmarks,
} from '../services/faceDetectionService.js';
import { scanQrFromVideo, validateMasterQr } from '../services/qrScannerService.js';

// Haversine distance calculator in meters
const calculateHaversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Sound synthesizer using Web Audio API for interactive biometric feedback
const playAudioFeedback = (type: 'STEP' | 'SUCCESS' | 'SHUTTER' | 'ALERT') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'STEP') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'SUCCESS') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.09);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.18);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.27);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'SHUTTER') {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      whiteNoise.start(ctx.currentTime);
    } else if (type === 'ALERT') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (_) {
    // Ignore audio policy restrictions
  }
};

export const MobileApp: React.FC = () => {
  // Auth Mode: 'LOGIN' | 'SIGNUP'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('SIGNUP');

  // Employee & Org Data (Initialized from local storage for instant dashboard render)
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(() => api.getStoredEmployee());
  const currentEmpRef = useRef<Employee | null>(api.getStoredEmployee());
  const directoryEmployeesRef = useRef<Employee[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);

  // Active Tab when logged in: 'DASHBOARD' | 'HISTORY' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'HISTORY' | 'PROFILE'>('DASHBOARD');
  const [myLogs, setMyLogs] = useState<AttendanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Synchronize currentEmpRef with currentEmp state
  useEffect(() => {
    currentEmpRef.current = currentEmp;
  }, [currentEmp]);

  // -------------------------------------------------------------
  // 1. SIGNUP FORM (New Employee Registration)
  // -------------------------------------------------------------
  const [signupFullName, setSignupFullName] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupDept, setSignupDept] = useState('Engineering');
  const [signupPosition, setSignupPosition] = useState('Software Engineer');
  const [signupShiftStart, setSignupShiftStart] = useState('Flexible 24x7');
  const [signupShiftEnd, setSignupShiftEnd] = useState('Anytime');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Registration Multi-Pose Face Capture State (Straight, Left, Right)
  const [isEnrollmentCameraOpen, setIsEnrollmentCameraOpen] = useState(false);
  const [currentPoseStage, setCurrentPoseStage] = useState<PoseStage>('STRAIGHT');
  const currentPoseStageRef = useRef<PoseStage>('STRAIGHT');
  const [capturedPoses, setCapturedPoses] = useState<{
    straight?: { embedding: number[]; photoUrl: string };
    left?: { embedding: number[]; photoUrl: string };
    right?: { embedding: number[]; photoUrl: string };
  }>({});
  const [poseHoldProgress, setPoseHoldProgress] = useState(0); // 0 to 100%
  const poseHoldStartTime = useRef<number | null>(null);

  // -------------------------------------------------------------
  // 2. SIGNIN FORM (Existing Employee Login)
  // -------------------------------------------------------------
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // -------------------------------------------------------------
  // 3. DAILY ATTENDANCE CAMERA (Dual-Step: Master QR Scan ➔ Biometric Face ID)
  // -------------------------------------------------------------
  const [isAttendanceCameraActive, setIsAttendanceCameraActive] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<'QR_SCAN' | 'FACE_SCAN'>('QR_SCAN');
  const attendanceStepRef = useRef<'QR_SCAN' | 'FACE_SCAN'>('QR_SCAN');
  const [punchType, setPunchType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [scannedQrPayload, setScannedQrPayload] = useState<string | null>(null);
  const scannedQrPayloadRef = useRef<string | null>(null);
  const [isQrVerified, setIsQrVerified] = useState(false);
  const [qrScanFeedback, setQrScanFeedback] = useState<string>('Point camera at the Office Master QR poster on the wall');

  // 90-Second Countdown Window from QR Scan to Biometric Face ID Verification
  const [qrTimerSeconds, setQrTimerSeconds] = useState<number>(90);
  const [qrScannedTimestamp, setQrScannedTimestamp] = useState<number | null>(null);
  const qrScannedTimestampRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enrollmentVideoRef = useRef<HTMLVideoElement>(null);
  const isLoopRunning = useRef(false);

  // Live Biometric Face Detection State
  const [detectedFace, setDetectedFace] = useState<FaceDetectionResult | null>(null);
  const [liveSimilarityScore, setLiveSimilarityScore] = useState<number>(0);
  const [isFaceMatch, setIsFaceMatch] = useState(false);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0); // 0 to 100%
  const attendanceHoldStartTime = useRef<number | null>(null);

  // -------------------------------------------------------------
  // 90-SECOND ACTIVE COUNTDOWN TIMER FOR BIOMETRIC FACE ID
  // -------------------------------------------------------------
  useEffect(() => {
    let timerInterval: any = null;
    if (isAttendanceCameraActive && attendanceStep === 'FACE_SCAN' && qrScannedTimestampRef.current) {
      timerInterval = setInterval(() => {
        if (!qrScannedTimestampRef.current) return;
        const elapsedSec = Math.floor((Date.now() - qrScannedTimestampRef.current) / 1000);
        const remaining = Math.max(0, 90 - elapsedSec);
        setQrTimerSeconds(remaining);

        if (remaining <= 0) {
          // 90-SECOND TIME EXPIRED: Block face verification & reset to Step 1 (QR scan)
          clearInterval(timerInterval);
          playAudioFeedback('ALERT');
          scannedQrPayloadRef.current = null;
          setScannedQrPayload(null);
          setIsQrVerified(false);
          qrScannedTimestampRef.current = null;
          setQrScannedTimestamp(null);
          attendanceStepRef.current = 'QR_SCAN';
          setAttendanceStep('QR_SCAN');
          setQrTimerSeconds(90);
          setQrScanFeedback('⏱️ 90-Second Window Expired! Please re-scan Office Master QR poster.');
          showToast('⏱️ QR Session Expired (90s limit). Please re-scan QR poster.');
        }
      }, 500);
    } else if (attendanceStep === 'QR_SCAN') {
      setQrTimerSeconds(90);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isAttendanceCameraActive, attendanceStep]);

  // Verification Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(getApiBase());
  const [isDetecting, setIsDetecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; testing: boolean; message: string }>({
    connected: false,
    testing: false,
    message: 'Checking...',
  });

  // Out of Office Geofence Perimeter Warning Modal
  const [outOfPerimeterModal, setOutOfPerimeterModal] = useState<{
    isOpen: boolean;
    distanceMeters: number;
    allowedRadiusMeters: number;
    officeName?: string;
  }>({
    isOpen: false,
    distanceMeters: 0,
    allowedRadiusMeters: 50,
  });

  // In-App Software Update Modal State
  const [updateModal, setUpdateModal] = useState<{
    isOpen: boolean;
    versionInfo?: AppVersionInfo;
    isChecking: boolean;
    hasUpdate: boolean;
  }>({
    isOpen: false,
    isChecking: false,
    hasUpdate: false,
  });

  const handleCheckUpdate = async (isManual = false) => {
    setUpdateModal((prev) => ({ ...prev, isChecking: true }));
    try {
      const res = await api.checkAppUpdate();
      setUpdateModal({
        isOpen: res.hasUpdate,
        versionInfo: res.versionInfo,
        isChecking: false,
        hasUpdate: res.hasUpdate,
      });
      if (isManual) {
        if (res.hasUpdate) {
          showToast(`🚀 New Version ${res.versionInfo?.latestVersion} Available!`);
        } else {
          showToast(`✅ You are using the latest version (v${APP_VERSION})`);
        }
      }
    } catch {
      setUpdateModal((prev) => ({ ...prev, isChecking: false }));
      if (isManual) {
        showToast(`✅ App is up to date (v${APP_VERSION})`);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const checkBackendHealth = async (urlToCheck?: string) => {
    setConnectionStatus((prev) => ({ ...prev, testing: true }));
    const res = await api.testConnection(urlToCheck);
    setConnectionStatus({
      connected: res.connected,
      testing: false,
      message: res.connected ? 'Connected' : 'Offline Mode',
    });
    return res.connected;
  };

  const handleAutoDetectServer = async () => {
    setIsDetecting(true);
    showToast('🔍 Scanning for backend server...');
    const res = await api.autoDetectBackend();
    setIsDetecting(false);
    setCustomServerUrl(res.activeUrl);
    setConnectionStatus({
      connected: res.success,
      testing: false,
      message: res.success ? 'Connected' : 'Offline Mode',
    });
    showToast(res.message);
    if (res.success) {
      fetchInitialData();
    }
  };

  const departments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
  ];

  const handleGenerateCodeSuggestion = () => {
    const randomNum = Math.floor(1 + Math.random() * 10);
    const formatted = randomNum < 10 ? `0${randomNum}` : `${randomNum}`;
    setSignupCode(`DRP${formatted}`);
  };

  // Load Models & Check Updates on Mount
  useEffect(() => {
    loadFaceDetectionModels().catch((err) => {
      console.warn('Face models loading background:', err);
    });
    checkBackendHealth();
    handleCheckUpdate(false);
  }, []);

  // Load Initial Org & Stored Session with fresh database embeddings
  const fetchInitialData = async () => {
    checkBackendHealth();
    // 1. Immediately hydrate cached user to guarantee instant UI render
    const savedEmp = api.getStoredEmployee();
    if (savedEmp) {
      setCurrentEmp(savedEmp);
      currentEmpRef.current = savedEmp;
      fetchMyAttendanceLogs(savedEmp.id);
    }

    // 2. Fetch background updates gracefully
    try {
      const [orgData, empData] = await Promise.all([api.getOrganization(), api.getEmployees()]);
      if (orgData) setOrg(orgData);
      if (empData) directoryEmployeesRef.current = empData;

      if (savedEmp && Array.isArray(empData)) {
        const matched = empData.find((e) => e.id === savedEmp.id || e.employeeCode === savedEmp.employeeCode);
        if (matched) {
          setCurrentEmp(matched);
          currentEmpRef.current = matched;
          localStorage.setItem('employee_user', JSON.stringify(matched));
        }
      }
    } catch (err) {
      console.warn('Background sync note:', err);
    }
  };

  const fetchMyAttendanceLogs = async (employeeId: string) => {
    try {
      setLoadingLogs(true);
      const logs = await api.getAttendanceLogs({ employeeId });
      setMyLogs(logs);
    } catch (err) {
      console.error('Failed to fetch personal attendance logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Derive today's presence and logs for the current employee
  const todayStr = new Date().toISOString().split('T')[0];
  const todayValidLogs = Array.isArray(myLogs)
    ? myLogs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr) && l.status !== 'REJECTED')
    : [];
  const lastPunchToday = todayValidLogs.length > 0 ? todayValidLogs[0] : null;
  const isInOffice = lastPunchToday
    ? lastPunchToday.punchType === 'CHECK_IN' || lastPunchToday.status === 'PRESENT' || lastPunchToday.status === 'LATE'
    : false;
  const checkInLogToday = [...todayValidLogs].reverse().find(
    (l) => l.punchType === 'CHECK_IN' || l.status === 'PRESENT' || l.status === 'LATE'
  );
  const checkOutLogToday = todayValidLogs.find(
    (l) => l.punchType === 'CHECK_OUT' || l.status === 'CHECKED_OUT'
  );

  useEffect(() => {
    if (isInOffice) {
      setPunchType('CHECK_OUT');
    } else {
      setPunchType('CHECK_IN');
    }
  }, [isInOffice]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentEmp) {
      fetchMyAttendanceLogs(currentEmp.id);
    }
  }, [currentEmp]);

  // Camera Management
  useEffect(() => {
    if (isAttendanceCameraActive || isEnrollmentCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isAttendanceCameraActive, isEnrollmentCameraOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (enrollmentVideoRef.current) {
        enrollmentVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable. Please check camera permissions in your browser.');
    }
  };

  const stopCamera = () => {
    isLoopRunning.current = false;
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // -------------------------------------------------------------
  // REGISTRATION: MULTI-POSE GUIDED CAPTURE LOOP
  // -------------------------------------------------------------
  const runEnrollmentAnalysisLoop = useCallback(async () => {
    if (!isLoopRunning.current || !enrollmentVideoRef.current) return;
    const video = enrollmentVideoRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const faceResult = await detectRealFace(video, facingMode);
        setDetectedFace(faceResult);

        const activeStage = currentPoseStageRef.current;

        if (faceResult.hasFace && faceResult.descriptor) {
          // -------------------------------------------------------------
          // ANTI-MALPRACTICE CHECK: Reject if face already registered
          // -------------------------------------------------------------
          if (directoryEmployeesRef.current && directoryEmployeesRef.current.length > 0) {
            let matchedDuplicate: Employee | null = null;
            let maxDuplicateSim = 0;

            for (const emp of directoryEmployeesRef.current) {
              const candidateVectors: number[][] = [];
              if (Array.isArray(emp.faceEmbeddings) && emp.faceEmbeddings.length > 0) {
                candidateVectors.push(...emp.faceEmbeddings);
              }
              if (Array.isArray(emp.faceEmbedding) && emp.faceEmbedding.length > 0) {
                candidateVectors.push(emp.faceEmbedding);
              }

              for (const baseVec of candidateVectors) {
                if (Array.isArray(baseVec) && baseVec.length > 0) {
                  const res = calculateArcFaceCosineSimilarity(faceResult.descriptor, baseVec);
                  if (res.isMatch && res.similarityScore > maxDuplicateSim) {
                    maxDuplicateSim = res.similarityScore;
                    matchedDuplicate = emp;
                  }
                }
              }
            }

            if (matchedDuplicate) {
              // MALPRACTICE DETECTED!
              isLoopRunning.current = false;
              stopCamera();
              setIsEnrollmentCameraOpen(false);
              playAudioFeedback('ALERT');
              const alertMsg = `⚠️ MALPRACTICE DETECTED: This face is already enrolled under Employee ID "${matchedDuplicate.employeeCode}" (${matchedDuplicate.fullName}) with ${(maxDuplicateSim * 100).toFixed(1)}% match. Duplicate registration with a new ID is blocked!`;
              setSignupError(alertMsg);
              setCapturedPoses({});
              showToast('🚨 Malpractice Blocked: Face already registered!');
              return;
            }
          }

          const poseCheck = checkPoseMatch(
            activeStage,
            faceResult.quality.yawAngle,
            faceResult.quality.pitchAngle
          );

          // Fast snap when score is >= 90% or pose matches criteria
          if ((poseCheck.isMatch || poseCheck.progress >= 90) && faceResult.descriptor) {
            if (!poseHoldStartTime.current) {
              poseHoldStartTime.current = Date.now();
            }
            const elapsed = Date.now() - poseHoldStartTime.current;
            const targetDuration = 180; // Fast 180ms confirmation
            const pct = Math.min(100, Math.round((elapsed / targetDuration) * 100));
            setPoseHoldProgress(pct);

            if (pct >= 100) {
              // Check for duplicate face against backend database before saving
              try {
                const dupCheck = await api.checkFaceDuplicate(faceResult.descriptor);
                if (dupCheck.isDuplicate && dupCheck.matchedEmployee) {
                  // MALPRACTICE DETECTED FROM DATABASE!
                  isLoopRunning.current = false;
                  stopCamera();
                  setIsEnrollmentCameraOpen(false);
                  playAudioFeedback('ALERT');
                  const alertMsg = `🚨 MALPRACTICE BLOCKED: This face is already registered in the database under Employee ID "${dupCheck.matchedEmployee.employeeCode}" (${dupCheck.matchedEmployee.fullName}) with ${(dupCheck.similarityScore * 100).toFixed(1)}% match. Re-registration with a second ID or email is prohibited!`;
                  setSignupError(alertMsg);
                  setCapturedPoses({});
                  showToast('🚨 Malpractice Blocked: Face already enrolled!');
                  return;
                }
              } catch (_) {
                // If offline or check fails, backend will enforce on submit
              }

              // Capture this pose!
              playAudioFeedback('SHUTTER');
              const poseData = {
                embedding: faceResult.descriptor,
                photoUrl: faceResult.alignedFaceDataUrl || '',
              };

              if (activeStage === 'STRAIGHT') {
                setCapturedPoses((prev) => ({ ...prev, straight: poseData }));
                currentPoseStageRef.current = 'LEFT';
                setCurrentPoseStage('LEFT');
                playAudioFeedback('STEP');
                showToast('✅ Straight captured! Now turn slightly LEFT.');
              } else if (activeStage === 'LEFT') {
                setCapturedPoses((prev) => ({ ...prev, left: poseData }));
                currentPoseStageRef.current = 'RIGHT';
                setCurrentPoseStage('RIGHT');
                playAudioFeedback('STEP');
                showToast('✅ Left captured! Now turn slightly RIGHT.');
              } else if (activeStage === 'RIGHT') {
                setCapturedPoses((prev) => ({ ...prev, right: poseData }));
                currentPoseStageRef.current = 'STRAIGHT';
                setCurrentPoseStage('STRAIGHT');
                playAudioFeedback('SUCCESS');
                showToast('🎉 All 3 facial poses captured successfully!');
                setIsEnrollmentCameraOpen(false);
                stopCamera();
              }

              poseHoldStartTime.current = null;
              setPoseHoldProgress(0);
            }
          } else {
            poseHoldStartTime.current = null;
            setPoseHoldProgress(0);
          }
        } else {
          poseHoldStartTime.current = null;
          setPoseHoldProgress(0);
        }
      } catch (err) {
        console.error('Enrollment frame error:', err);
      }
    }

    if (isLoopRunning.current) {
      setTimeout(runEnrollmentAnalysisLoop, 50); // ~20 FPS for responsive HUD
    }
  }, [facingMode]);

  useEffect(() => {
    if (isEnrollmentCameraOpen) {
      isLoopRunning.current = true;
      poseHoldStartTime.current = null;
      setPoseHoldProgress(0);
      currentPoseStageRef.current = currentPoseStage || 'STRAIGHT';
      runEnrollmentAnalysisLoop();
    } else {
      isLoopRunning.current = false;
    }
    return () => {
      isLoopRunning.current = false;
    };
  }, [isEnrollmentCameraOpen, runEnrollmentAnalysisLoop]);

  // -------------------------------------------------------------
  // ATTENDANCE: DUAL-STEP RECOGNITION (STEP 1: QR ➔ STEP 2: FACE ID)
  // -------------------------------------------------------------
  const runAttendanceAnalysisLoop = useCallback(async () => {
    if (!isLoopRunning.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const step = attendanceStepRef.current;

        // -------------------------------------------------------------
        // STEP 1: SCAN & VERIFY OFFICE MASTER QR POSTER
        // -------------------------------------------------------------
        if (step === 'QR_SCAN') {
          const qrResult = scanQrFromVideo(video);
          if (qrResult && qrResult.data) {
            const validation = validateMasterQr(qrResult.data, org);
            if (validation.isValid) {
              // Real-time Office Geofence Perimeter Verification
              if (org && org.latitude && org.longitude && org.geofenceRadiusMeters) {
                if (navigator.geolocation) {
                  try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                      navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 3000,
                        enableHighAccuracy: true,
                      });
                    });

                    const distance = calculateHaversineDistanceMeters(
                      pos.coords.latitude,
                      pos.coords.longitude,
                      org.latitude,
                      org.longitude
                    );

                    if (distance > org.geofenceRadiusMeters) {
                      // ❌ OUT OF PERIMETER! Block attendance immediately and pop up alert
                      playAudioFeedback('ALERT');
                      stopCamera();
                      setIsAttendanceCameraActive(false);
                      setOutOfPerimeterModal({
                        isOpen: true,
                        distanceMeters: distance,
                        allowedRadiusMeters: org.geofenceRadiusMeters,
                        officeName: org.name,
                      });
                      showToast(`📍 Out of Office Location (${distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : distance + ' m'} away)!`);
                      return;
                    }
                  } catch (geoErr) {
                    console.warn('Geolocation check bypassed/unavailable:', geoErr);
                  }
                }
              }

              playAudioFeedback('STEP');
              const now = Date.now();
              qrScannedTimestampRef.current = now;
              setQrScannedTimestamp(now);
              setQrTimerSeconds(90);
              scannedQrPayloadRef.current = qrResult.data;
              setScannedQrPayload(qrResult.data);
              setIsQrVerified(true);
              setQrScanFeedback('✅ Office Master QR Verified! Aligning face...');
              showToast('✅ Office Master QR Verified! 90s Face Scan window started.');

              // Instantly transition to Face Verification in the same camera view
              attendanceStepRef.current = 'FACE_SCAN';
              setAttendanceStep('FACE_SCAN');

              // If using rear camera for wall QR, auto-switch to front camera for face
              if (facingMode === 'environment') {
                setFacingMode('user');
              }
            } else {
              setQrScanFeedback('❌ Invalid QR: Please scan the official Office Master QR poster');
            }
          }
        }
        // -------------------------------------------------------------
        // STEP 2: BIOMETRIC FACE VERIFICATION & AUTO-CAPTURE
        // -------------------------------------------------------------
        else if (step === 'FACE_SCAN') {
          const faceResult = await detectRealFace(video, facingMode);
          setDetectedFace(faceResult);

          const emp = currentEmpRef.current || currentEmp;

          if (faceResult.hasFace && faceResult.descriptor && emp) {
            // Compare probe vector against all enrolled baseline poses (Straight, Left, Right)
            const baselinePoses: number[][] = [];

            if (Array.isArray(emp.faceEmbeddings) && emp.faceEmbeddings.length > 0) {
              baselinePoses.push(...emp.faceEmbeddings);
            }
            if (Array.isArray(emp.faceEmbedding) && emp.faceEmbedding.length > 0) {
              baselinePoses.push(emp.faceEmbedding);
            }

            let bestMatch = { isMatch: false, similarityScore: 0, distance: 999 };

            for (const baseVec of baselinePoses) {
              if (Array.isArray(baseVec) && baseVec.length > 0) {
                const res = calculateArcFaceCosineSimilarity(faceResult.descriptor, baseVec);
                if (res.similarityScore > bestMatch.similarityScore) {
                  bestMatch = res;
                }
              }
            }

            setLiveSimilarityScore(bestMatch.similarityScore);
            const isMatch = bestMatch.isMatch && bestMatch.similarityScore >= 0.85 && faceResult.antiSpoofing.isLive;
            setIsFaceMatch(isMatch);

            // Fast Auto-Capture: 250ms sustained lock only when match >= 85%
            if (isMatch && !isProcessing) {
              if (!attendanceHoldStartTime.current) {
                attendanceHoldStartTime.current = Date.now();
              }
              const elapsed = Date.now() - attendanceHoldStartTime.current;
              const targetDuration = 250; // Fast 250ms capture
              const pct = Math.min(100, Math.round((elapsed / targetDuration) * 100));
              setAutoCaptureProgress(pct);

              if (pct >= 100) {
                attendanceHoldStartTime.current = null;
                setAutoCaptureProgress(0);
                handleTriggerAttendanceVerification(faceResult, scannedQrPayloadRef.current);
              }
            } else {
              attendanceHoldStartTime.current = null;
              setAutoCaptureProgress(0);
            }
          } else {
            setLiveSimilarityScore(0);
            setIsFaceMatch(false);
            attendanceHoldStartTime.current = null;
            setAutoCaptureProgress(0);
          }
        }
      } catch (err) {
        console.error('Attendance frame error:', err);
      }
    }

    if (isLoopRunning.current) {
      setTimeout(runAttendanceAnalysisLoop, 50); // ~20 FPS for responsive scanning
    }
  }, [currentEmp, facingMode, isProcessing, org]);

  useEffect(() => {
    if (isAttendanceCameraActive) {
      isLoopRunning.current = true;
      attendanceHoldStartTime.current = null;
      setAutoCaptureProgress(0);
      runAttendanceAnalysisLoop();
    } else {
      isLoopRunning.current = false;
    }
    return () => {
      isLoopRunning.current = false;
    };
  }, [isAttendanceCameraActive, runAttendanceAnalysisLoop]);

  // -------------------------------------------------------------
  // MANUAL POSE CAPTURE TRIGGER (Tap to snap current frame)
  // -------------------------------------------------------------
  const handleManualPoseCapture = () => {
    if (!enrollmentVideoRef.current) return;
    const video = enrollmentVideoRef.current;
    if (video.readyState < 2) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
      const descriptor =
        detectedFace?.descriptor ||
        new Array(512).fill(0).map(() => (Math.random() - 0.5) * 0.1);

      playAudioFeedback('SHUTTER');
      const poseData = { embedding: descriptor, photoUrl };

      if (currentPoseStage === 'STRAIGHT') {
        setCapturedPoses((prev) => ({ ...prev, straight: poseData }));
        setCurrentPoseStage('LEFT');
        currentPoseStageRef.current = 'LEFT';
        playAudioFeedback('STEP');
        showToast('✅ Straight captured! Turn slightly LEFT.');
      } else if (currentPoseStage === 'LEFT') {
        setCapturedPoses((prev) => ({ ...prev, left: poseData }));
        setCurrentPoseStage('RIGHT');
        currentPoseStageRef.current = 'RIGHT';
        playAudioFeedback('STEP');
        showToast('✅ Left captured! Turn slightly RIGHT.');
      } else if (currentPoseStage === 'RIGHT') {
        setCapturedPoses((prev) => ({ ...prev, right: poseData }));
        setCurrentPoseStage('STRAIGHT');
        currentPoseStageRef.current = 'STRAIGHT';
        playAudioFeedback('SUCCESS');
        showToast('🎉 All 3 facial poses captured successfully!');
        setIsEnrollmentCameraOpen(false);
        stopCamera();
      }
    } catch (err) {
      console.error('Manual capture error:', err);
    }
  };

  // Quick 1-tap demo auto fill for instant testing
  const handleQuickDemoFill = () => {
    const randomNum = Math.floor(1 + Math.random() * 10);
    const formatted = randomNum < 10 ? `0${randomNum}` : `${randomNum}`;
    const code = `DRP${formatted}`;
    setSignupFullName(`Staff Member ${formatted}`);
    setSignupCode(code);
    setSignupEmail(`staff${formatted.toLowerCase()}@drptech.com`);
    setSignupPassword('pass1234');
    setSignupDept('Engineering');
    setSignupPosition('Software Engineer');
    
    // Seed valid 512-D vector
    const dummyVector = new Array(512).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    setCapturedPoses({
      straight: { embedding: dummyVector, photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}` },
      left: { embedding: dummyVector, photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}` },
      right: { embedding: dummyVector, photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${code}` },
    });
    showToast(`⚡ Sample profile auto-filled with ${code}!`);
  };

  // -------------------------------------------------------------
  // 1. SIGNUP SUBMIT HANDLER: Save Employee + ArcFace Baseline
  // -------------------------------------------------------------
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupFullName.trim()) {
      setSignupError('Please enter your full name.');
      return;
    }
    if (!signupCode.trim()) {
      setSignupError('Please choose your Employee ID (DRP01 to DRP10).');
      return;
    }
    const codeValidation = validateAndNormalizeEmployeeCode(signupCode);
    if (!codeValidation.isValid) {
      setSignupError(codeValidation.error || 'Employee ID must be between DRP01 and DRP10 (e.g. DRP01, DRP02, ... DRP10).');
      return;
    }
    if (!signupEmail.trim()) {
      setSignupError('Please enter your work email.');
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setSignupError('Password must be at least 4 characters long.');
      return;
    }

    setIsSigningUp(true);

    try {
      const chosenCode = codeValidation.normalizedCode;

      // Collect multi-pose embeddings or generate fallback baseline
      const fallbackVector = new Array(512).fill(0).map(() => (Math.random() - 0.5) * 0.1);
      const poseEmbeddings: number[][] = [];
      if (capturedPoses.straight) poseEmbeddings.push(capturedPoses.straight.embedding);
      if (capturedPoses.left) poseEmbeddings.push(capturedPoses.left.embedding);
      if (capturedPoses.right) poseEmbeddings.push(capturedPoses.right.embedding);

      const primaryEmbedding = capturedPoses.straight?.embedding || fallbackVector;
      const primaryPhoto =
        capturedPoses.straight?.photoUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(signupFullName.trim())}`;

      // Save directly to backend / local storage database
      const res = await api.employeeSignup({
        fullName: signupFullName.trim(),
        employeeCode: chosenCode,
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        phone: signupPhone.trim(),
        department: signupDept,
        position: signupPosition.trim(),
        shiftStart: signupShiftStart,
        shiftEnd: signupShiftEnd,
        faceEmbedding: primaryEmbedding,
        faceEmbeddings: poseEmbeddings.length > 0 ? poseEmbeddings : [primaryEmbedding],
        photoUrl: primaryPhoto,
      });

      const createdEmp =
        res.data?.employee ||
        res.employee || {
          id: 'emp_' + Date.now(),
          orgId: 'org_drp_tech_hq',
          employeeCode: chosenCode,
          fullName: signupFullName.trim(),
          email: signupEmail.trim().toLowerCase(),
          department: signupDept,
          position: signupPosition.trim(),
          faceEmbedding: primaryEmbedding,
          faceEmbeddings: poseEmbeddings.length > 0 ? poseEmbeddings : [primaryEmbedding],
          photoUrl: primaryPhoto,
          isActive: true,
          shiftStart: signupShiftStart,
          shiftEnd: signupShiftEnd,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

      playAudioFeedback('SUCCESS');
      setCurrentEmp(createdEmp);
      localStorage.setItem('employee_user', JSON.stringify(createdEmp));
      if (!localStorage.getItem('employee_token')) {
        localStorage.setItem('employee_token', 'token_' + Date.now());
      }
      fetchInitialData();
      fetchMyAttendanceLogs(createdEmp.id);
      showToast(`🎉 Registration Successful! Welcome, ${createdEmp.fullName}!`);
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.data?.isMalpractice) {
        const msg = err.response?.data?.message || '🚨 Face already enrolled under another ID!';
        setSignupError(msg);
        playAudioFeedback('ALERT');
        setCapturedPoses({});
        showToast('🚨 Malpractice Blocked: Face already enrolled!');
        return;
      }

      console.warn('Network or server error during signup, activating graceful local onboarding:', err);
      const fallbackEmp: Employee = {
        id: 'emp_local_' + Date.now(),
        orgId: 'org_drp_tech_hq',
        employeeCode: signupCode.trim().toUpperCase(),
        fullName: signupFullName.trim(),
        email: signupEmail.trim().toLowerCase(),
        department: signupDept,
        position: signupPosition.trim(),
        faceEmbedding: capturedPoses.straight?.embedding || [],
        faceEmbeddings: [capturedPoses.straight?.embedding || []],
        photoUrl:
          capturedPoses.straight?.photoUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(signupFullName.trim())}`,
        isActive: true,
        shiftStart: signupShiftStart,
        shiftEnd: signupShiftEnd,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const localEmployees: any[] = JSON.parse(localStorage.getItem('local_employees') || '[]');
      localEmployees.push(fallbackEmp);
      localStorage.setItem('local_employees', JSON.stringify(localEmployees));
      localStorage.setItem('employee_user', JSON.stringify(fallbackEmp));
      localStorage.setItem('employee_token', 'local_token_' + Date.now());

      playAudioFeedback('SUCCESS');
      setCurrentEmp(fallbackEmp);
      fetchInitialData();
      fetchMyAttendanceLogs(fallbackEmp.id);
      showToast(`🎉 Registration Successful! Welcome, ${fallbackEmp.fullName}!`);
    } finally {
      setIsSigningUp(false);
    }
  };

  // -------------------------------------------------------------
  // 2. SIGNIN HANDLER: Employee Login
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await api.employeeLogin(loginIdentifier.trim(), loginPassword.trim());
      if (res.success && res.data?.employee) {
        playAudioFeedback('SUCCESS');
        setCurrentEmp(res.data.employee);
        if (res.data.organization) setOrg(res.data.organization);
        fetchMyAttendanceLogs(res.data.employee.id);
        showToast(`👋 Welcome back, ${res.data.employee.fullName}!`);
      } else {
        setLoginError(res.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login failed. Check your ID/email and password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    api.employeeLogout();
    setCurrentEmp(null);
    setIsAttendanceCameraActive(false);
    setVerifyResult(null);
    showToast('Logged out successfully.');
  };

  // -------------------------------------------------------------
  // 3. ATTENDANCE VERIFICATION SUBMISSION (QR + FACE BIOMETRICS)
  // -------------------------------------------------------------
  const handleTriggerAttendanceVerification = async (
    faceData: FaceDetectionResult,
    qrPayloadOverride?: string | null
  ) => {
    if (!currentEmp || isProcessing) return;

    // Strict 90-second expiration check
    if (qrScannedTimestampRef.current && Date.now() - qrScannedTimestampRef.current > 90_000) {
      playAudioFeedback('ALERT');
      scannedQrPayloadRef.current = null;
      setScannedQrPayload(null);
      setIsQrVerified(false);
      qrScannedTimestampRef.current = null;
      setQrScannedTimestamp(null);
      attendanceStepRef.current = 'QR_SCAN';
      setAttendanceStep('QR_SCAN');
      setQrTimerSeconds(90);
      setQrScanFeedback('⏱️ 90-Second Window Expired! Please re-scan Office Master QR poster.');
      showToast('⏱️ 90s Limit Expired! Please re-scan QR poster.');
      return;
    }

    setIsProcessing(true);
    playAudioFeedback('SHUTTER');

    try {
      // Get current GPS position (optional / fallback to org coords)
      let lat = org?.latitude || 37.7749;
      let lng = org?.longitude || -122.4194;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (_) {
          // Fallback to org location if geolocation is denied
        }
      }

      const qrPayloadToSend = qrPayloadOverride || scannedQrPayloadRef.current || scannedQrPayload || undefined;

      const res = await api.verifyAttendance({
        employeeId: currentEmp.id,
        qrPayload: qrPayloadToSend,
        qrScannedAt: qrScannedTimestampRef.current || qrScannedTimestamp || undefined,
        punchType,
        faceEmbedding: faceData.descriptor || [],
        livenessScore: faceData.antiSpoofing.livenessScore,
        antiSpoofPassed: faceData.antiSpoofing.isLive,
        antiSpoofVerdict: faceData.antiSpoofing.verdict,
        latitude: lat,
        longitude: lng,
        snapshotUrl: faceData.alignedFaceDataUrl || currentEmp.photoUrl,
        capturedAt: new Date().toISOString(),
      });

      setVerifyResult(res);

      if (res.success && res.status !== 'REJECTED') {
        playAudioFeedback('SUCCESS');
        if (res.punchType === 'CHECK_OUT' || res.status === 'CHECKED_OUT') {
          showToast(`👋 Office Departure Recorded (Check-Out)! Total: ${res.workDurationMinutes ? Math.floor(res.workDurationMinutes / 60) + 'h ' + (res.workDurationMinutes % 60) + 'm' : 'Done'}`);
        } else {
          showToast(res.status === 'LATE' ? '⚠️ Office Entry Recorded (Late Arrival)' : '🎉 Office Entry Recorded (Check-In)!');
        }
        fetchMyAttendanceLogs(currentEmp.id);
      } else {
        playAudioFeedback('ALERT');
        const reason = res.details?.failureReason || res.message || 'Face mismatch with registered profile.';
        showToast(`❌ Attendance Rejected: ${reason}`);

        if (
          res.details?.geofencePassed === false ||
          (res.details?.distanceMeters && org?.geofenceRadiusMeters && res.details.distanceMeters > org.geofenceRadiusMeters)
        ) {
          setOutOfPerimeterModal({
            isOpen: true,
            distanceMeters: res.details?.distanceMeters || 0,
            allowedRadiusMeters: org?.geofenceRadiusMeters || 50,
            officeName: org?.name,
          });
        }
      }
    } catch (err: any) {
      playAudioFeedback('ALERT');
      const errData = err.response?.data;
      setVerifyResult(errData || { success: false, message: err.message });
      const reason = errData?.details?.failureReason || errData?.message || err.message || 'Verification failed.';
      showToast(`❌ Attendance Failed: ${reason}`);

      if (
        errData?.details?.geofencePassed === false ||
        (errData?.details?.distanceMeters && org?.geofenceRadiusMeters && errData.details.distanceMeters > org.geofenceRadiusMeters)
      ) {
        setOutOfPerimeterModal({
          isOpen: true,
          distanceMeters: errData?.details?.distanceMeters || 0,
          allowedRadiusMeters: org?.geofenceRadiusMeters || 50,
          officeName: org?.name,
        });
      }
    } finally {
      setIsProcessing(false);
      setIsAttendanceCameraActive(false);
      stopCamera();
    }
  };

  // Render 5 Key Facial Landmarks Cybernetic Overlay
  const renderLandmarksHUD = (landmarks5?: FiveLandmarks) => {
    if (!landmarks5) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
        {/* Glow Filter */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dynamic Connective Polygon */}
        <polygon
          points={`${landmarks5.leftEye.x},${landmarks5.leftEye.y} ${landmarks5.rightEye.x},${landmarks5.rightEye.y} ${landmarks5.rightMouth.x},${landmarks5.rightMouth.y} ${landmarks5.leftMouth.x},${landmarks5.leftMouth.y}`}
          fill="rgba(16, 185, 129, 0.12)"
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Eye connection */}
        <line
          x1={landmarks5.leftEye.x}
          y1={landmarks5.leftEye.y}
          x2={landmarks5.rightEye.x}
          y2={landmarks5.rightEye.y}
          stroke="#10b981"
          strokeWidth="2"
        />

        {/* Nose to eyes triangle */}
        <line
          x1={landmarks5.leftEye.x}
          y1={landmarks5.leftEye.y}
          x2={landmarks5.noseTip.x}
          y2={landmarks5.noseTip.y}
          stroke="rgba(52, 211, 153, 0.7)"
          strokeWidth="1.5"
        />
        <line
          x1={landmarks5.rightEye.x}
          y1={landmarks5.rightEye.y}
          x2={landmarks5.noseTip.x}
          y2={landmarks5.noseTip.y}
          stroke="rgba(52, 211, 153, 0.7)"
          strokeWidth="1.5"
        />

        {/* 5 Landmark Nodes */}
        {[
          { pt: landmarks5.leftEye, label: 'L.Eye' },
          { pt: landmarks5.rightEye, label: 'R.Eye' },
          { pt: landmarks5.noseTip, label: 'Nose' },
          { pt: landmarks5.leftMouth, label: 'L.Lip' },
          { pt: landmarks5.rightMouth, label: 'R.Lip' },
        ].map((node, i) => (
          <g key={i}>
            <circle cx={node.pt.x} cy={node.pt.y} r="5" fill="#10b981" filter="url(#glow)" />
            <circle cx={node.pt.x} cy={node.pt.y} r="2.5" fill="#ffffff" />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl overflow-hidden font-sans border-x border-slate-900">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-emerald-500/50 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* TOP APP HEADER */}
      <header className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              FaceTrack AI
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                ArcFace
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">{org?.name || 'DRP Technology Hub'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status Indicator */}
          <button
            type="button"
            onClick={() => setServerSettingsOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition ${
              connectionStatus.connected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title="Click to configure backend connection"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{connectionStatus.connected ? 'Online' : 'Offline'}</span>
          </button>

          <a
            href="/admin"
            title="HR & Admin Management Portal"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition flex items-center gap-1.5 text-[11px] font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin</span>
          </a>
          <button
            type="button"
            onClick={() => setServerSettingsOpen(true)}
            title="Backend Server Settings"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          {currentEmp && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* SERVER SETTINGS MODAL */}
      {serverSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Server className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Backend Server URL</h3>
                  <p className="text-[11px] text-slate-400">Connect APK to PC / Cloud Backend</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setServerSettingsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Connection Status Banner */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              connectionStatus.connected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="font-medium">
                  {connectionStatus.testing ? 'Testing connection...' : connectionStatus.connected ? 'Backend Server Connected' : 'Running in Offline Standalone Mode'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => checkBackendHealth(customServerUrl)}
                className="text-[11px] font-semibold text-emerald-400 hover:underline"
              >
                Test Ping
              </button>
            </div>

            {/* 1-Tap Auto-Discovery */}
            <button
              type="button"
              disabled={isDetecting}
              onClick={handleAutoDetectServer}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Auto-Detecting PC Backend...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  ⚡ Auto-Detect PC Backend Server
                </>
              )}
            </button>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Server Endpoint URL</label>
              <input
                type="text"
                placeholder="e.g. http://192.168.29.93:5000/api/v1"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-medium">Quick IP Presets:</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('https://smart-attendance-system-sdnf.onrender.com/api/v1')}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 truncate font-semibold text-center"
                >
                  ☁️ 24/7 Render Cloud (Global 5G/4G)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('http://192.168.29.93:5000/api/v1')}
                  className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 truncate"
                >
                  🏠 Wi-Fi (192.168.29.93)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('http://localhost:5000/api/v1')}
                  className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 truncate"
                >
                  💻 Localhost:5000
                </button>
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('http://10.0.2.2:5000/api/v1')}
                  className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 truncate"
                >
                  📱 Android Emulator
                </button>
                <button
                  type="button"
                  onClick={() => setCustomServerUrl('/api/v1')}
                  className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 truncate"
                >
                  🌐 Relative (/api/v1)
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomServerUrl('/api/v1');
                  setApiBase('');
                  showToast('Reset to default local standalone mode');
                  setServerSettingsOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={async () => {
                  setApiBase(customServerUrl);
                  showToast('Server URL Saved!');
                  setServerSettingsOpen(false);
                  await checkBackendHealth(customServerUrl);
                  fetchInitialData();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              >
                Save & Apply
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Wipe all local employee profiles, attendance logs, and sessions to start 100% fresh?')) {
                    localStorage.clear();
                    setCurrentEmp(null);
                    setMyLogs([]);
                    setCapturedPoses({});
                    setServerSettingsOpen(false);
                    showToast('🧹 All employee records wiped! Ready for first registration.');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clean All Data & Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 overflow-y-auto p-5 space-y-6">
        {!currentEmp ? (
          // =========================================================================
          // AUTHENTICATION SCREEN: REGISTRATION OR SIGN-IN
          // =========================================================================
          <div className="space-y-6 animate-fadeIn">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMode('SIGNUP')}
                className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  authMode === 'SIGNUP'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                New Registration
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('LOGIN')}
                className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  authMode === 'LOGIN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Employee Sign In
              </button>
            </div>

            {authMode === 'SIGNUP' ? (
              // -------------------------------------------------------------
              // 1. REGISTRATION FORM WITH 3-POSE SCRFD FACE ENROLLMENT
              // -------------------------------------------------------------
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-white">Employee Onboarding</h2>
                  <p className="text-xs text-slate-400">
                    Register your profile & complete SCRFD 3D Face ID baseline enrollment.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    className="mt-2 text-[11px] px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    ⚡ Auto-Fill Sample Profile (1-Tap Test)
                  </button>
                </div>

                {signupError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{signupError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Employee ID with Suggestions (Restricted to DRP01 - DRP10) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Employee ID <span className="text-emerald-400 font-mono text-[11px]">(DRP01 - DRP10)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCodeSuggestion}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" /> Auto-suggest ID
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DRP01 or DRP 01 (DRP01 to DRP10)"
                    value={signupCode}
                    onChange={(e) => setSignupCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Allowed IDs: <span className="text-slate-400 font-mono">DRP01 to DRP10</span> (e.g. <span className="text-slate-400">"DRP02"</span> or <span className="text-slate-400">"DRP 02"</span>)
                  </p>
                </div>

                {/* Email & Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Work Email</label>
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Department & Position */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Department</label>
                    <select
                      value={signupDept}
                      onChange={(e) => setSignupDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Position</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Engineer"
                      value={signupPosition}
                      onChange={(e) => setSignupPosition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Phone & Shift Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Shift Schedule</label>
                    <select
                      value={signupShiftStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSignupShiftStart(val);
                        if (val === '09:00') setSignupShiftEnd('18:00');
                        else if (val === '06:00') setSignupShiftEnd('15:00');
                        else if (val === '22:00') setSignupShiftEnd('07:00');
                        else setSignupShiftEnd('Anytime');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="Flexible 24x7">🌟 Flexible 24x7 (Anytime Punch)</option>
                      <option value="09:00">General Shift (09:00 - 18:00)</option>
                      <option value="06:00">Morning Shift (06:00 - 15:00)</option>
                      <option value="22:00">Night Shift (22:00 - 07:00)</option>
                    </select>
                  </div>
                </div>

                {/* -------------------------------------------------------------
                    BIOMETRIC FACE ID ENROLLMENT SECTION (STRAIGHT, LEFT, RIGHT)
                   ------------------------------------------------------------- */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ScanLine className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">SCRFD Face ID Enrollment</h3>
                        <p className="text-[10px] text-slate-400">Auto-captures 3 poses (Straight, Left, Right)</p>
                      </div>
                    </div>

                    {capturedPoses.straight && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>

                  {/* Pose Indicators */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div
                      className={`p-2.5 rounded-xl border transition flex flex-col items-center gap-1 ${
                        capturedPoses.straight
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {capturedPoses.straight?.photoUrl ? (
                        <img
                          src={capturedPoses.straight.photoUrl}
                          alt="Straight"
                          className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs">
                          1
                        </div>
                      )}
                      <span className="text-[10px] font-medium">Straight</span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border transition flex flex-col items-center gap-1 ${
                        capturedPoses.left
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {capturedPoses.left?.photoUrl ? (
                        <img
                          src={capturedPoses.left.photoUrl}
                          alt="Left"
                          className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs">
                          2
                        </div>
                      )}
                      <span className="text-[10px] font-medium">Turn Left</span>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border transition flex flex-col items-center gap-1 ${
                        capturedPoses.right
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {capturedPoses.right?.photoUrl ? (
                        <img
                          src={capturedPoses.right.photoUrl}
                          alt="Right"
                          className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs">
                          3
                        </div>
                      )}
                      <span className="text-[10px] font-medium">Turn Right</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPoseStage('STRAIGHT');
                      setIsEnrollmentCameraOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold transition flex items-center justify-center gap-2 border border-emerald-500/30"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    {capturedPoses.straight ? 'Re-calibrate Face ID' : 'Start Guided Face Capture'}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSigningUp || !capturedPoses.straight}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  {isSigningUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Registration & Sign In
                    </>
                  )}
                </button>
              </form>
            ) : (
              // -------------------------------------------------------------
              // 2. SIGN IN FORM
              // -------------------------------------------------------------
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-white">Employee Sign In</h2>
                  <p className="text-xs text-slate-400">Enter your Employee ID or email to access your portal</p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Employee ID or Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-1001 or alex@company.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In to FaceTrack
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Direct Admin Portal Access Link */}
            <div className="pt-3 border-t border-slate-800/60 text-center">
              <a
                href="/admin"
                className="text-[11px] text-slate-400 hover:text-emerald-400 font-medium inline-flex items-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Access HR & Admin Management Portal ➔
              </a>
            </div>
          </div>
        ) : (
          // =========================================================================
          // LOGGED IN PORTAL (DASHBOARD | HISTORY | PROFILE)
          // =========================================================================
          <div className="space-y-6">
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Employee Welcome Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        currentEmp?.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          currentEmp?.fullName || 'Employee'
                        )}`
                      }
                      alt={currentEmp?.fullName || 'Employee'}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                    />
                    <div>
                      <h2 className="font-bold text-white text-sm">{currentEmp?.fullName || 'Employee'}</h2>
                      <p className="text-[11px] text-emerald-400 font-mono">{currentEmp?.employeeCode || 'EMP-XXXX'}</p>
                      <p className="text-[10px] text-slate-400">
                        {currentEmp?.department || 'Engineering'} • {currentEmp?.position || 'Staff'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Shift {currentEmp?.shiftStart || 'Flexible 24x7'}
                  </span>
                </div>

                {/* Live Office Presence Banner */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isInOffice
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/40'
                    : checkOutLogToday
                    ? 'bg-purple-950/30 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-950/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isInOffice ? 'bg-emerald-500/20 text-emerald-400' : checkOutLogToday ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isInOffice ? <Building2 className="w-5 h-5 animate-pulse" /> : checkOutLogToday ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {isInOffice ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Currently In Office
                          </>
                        ) : checkOutLogToday ? (
                          'Checked Out for the Day'
                        ) : (
                          'Not Checked In Yet'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isInOffice && checkInLogToday ? (
                          `Entered at ${new Date(checkInLogToday.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        ) : checkOutLogToday ? (
                          `Left at ${new Date(checkOutLogToday.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${
                            checkOutLogToday.workDurationMinutes
                              ? ` • Total Worked: ${Math.floor(checkOutLogToday.workDurationMinutes / 60)}h ${checkOutLogToday.workDurationMinutes % 60}m`
                              : ''
                          }`
                        ) : (
                          'Scan Master QR + Face ID to enter'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Touchless Attendance Action Card (Dual Factor: QR + Face ID) */}
                <div className={`p-5 rounded-2xl border text-center space-y-4 shadow-xl transition-all ${
                  punchType === 'CHECK_OUT'
                    ? 'bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border-purple-500/30'
                    : 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30'
                }`}>
                  {/* Punch Type Mode Toggle */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setPunchType('CHECK_IN')}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        punchType === 'CHECK_IN'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Office Entry
                    </button>
                    <button
                      onClick={() => setPunchType('CHECK_OUT')}
                      className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        punchType === 'CHECK_OUT'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Office Exit
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base">
                      {punchType === 'CHECK_OUT' ? 'Office Departure Punch' : 'Office Entry Punch'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Step 1: Scan Master QR ➔ Step 2: 90s Biometric Face ID Verification.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setVerifyResult(null);
                      setAttendanceStep('QR_SCAN');
                      attendanceStepRef.current = 'QR_SCAN';
                      setIsQrVerified(false);
                      setScannedQrPayload(null);
                      scannedQrPayloadRef.current = null;
                      setQrTimerSeconds(90);
                      setQrScannedTimestamp(null);
                      qrScannedTimestampRef.current = null;
                      setQrScanFeedback('Point camera at the Office Master QR poster on the wall');
                      setFacingMode('environment'); // default to rear camera for wall poster
                      setIsAttendanceCameraActive(true);
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 active:scale-95 text-white ${
                      punchType === 'CHECK_OUT'
                        ? 'bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 shadow-purple-600/30'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/30'
                    }`}
                  >
                    {punchType === 'CHECK_OUT' ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                    {punchType === 'CHECK_OUT' ? 'Clock Out (Office Exit)' : 'Clock In (Office Entry)'}
                  </button>
                </div>

                {/* Recent Attendance Status */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Today's Activity</span>
                    <button
                      onClick={() => setActiveTab('HISTORY')}
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      View All Logs <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {Array.isArray(myLogs) && myLogs.length > 0 ? (
                    <div className="space-y-2">
                      {myLogs.slice(0, 3).map((log) => (
                        <div
                          key={log.id || Math.random().toString()}
                          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  log.snapshotUrl ||
                                  currentEmp?.photoUrl ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                    currentEmp?.fullName || 'Employee'
                                  )}`
                                }
                                alt="Face Snapshot"
                                className="w-10 h-10 rounded-lg object-cover border border-emerald-500/40"
                              />
                              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">
                                {log.timestamp
                                  ? new Date(log.timestamp).toLocaleDateString(undefined, {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'Today'}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {log.timestamp
                                  ? new Date(log.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })
                                  : '--:--'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <StatusBadge status={log.status || 'PRESENT'} punchType={log.punchType} />
                            {log.workDurationMinutes ? (
                              <p className="text-[10px] text-purple-300 font-mono font-semibold">
                                {Math.floor(log.workDurationMinutes / 60)}h {log.workDurationMinutes % 60}m worked
                              </p>
                            ) : (
                              <p className="text-[10px] text-emerald-400 font-mono">
                                {((log.faceSimilarityScore ?? 0.98) * 100).toFixed(1)}% Match
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-900">
                      No attendance marked yet today. Tap "Mark Attendance" above to record check-in!
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'HISTORY' && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  My Biometric Attendance History
                </h2>

                {loadingLogs ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
                    Loading logs...
                  </div>
                ) : !Array.isArray(myLogs) || myLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">
                    No attendance records found yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myLogs.map((log) => (
                      <div
                        key={log.id || Math.random().toString()}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              log.snapshotUrl ||
                              currentEmp?.photoUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                currentEmp?.fullName || 'Employee'
                              )}`
                            }
                            alt="Snapshot"
                            className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-white">
                              {log.timestamp
                                ? new Date(log.timestamp).toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Today'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {log.timestamp
                                ? new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : '--:--'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="text-emerald-400 font-semibold">
                                Match: {((log.faceSimilarityScore ?? 0.98) * 100).toFixed(1)}%
                              </span>
                              {log.workDurationMinutes && (
                                <span className="text-purple-300 font-semibold">
                                  • {Math.floor(log.workDurationMinutes / 60)}h {log.workDurationMinutes % 60}m
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={log.status || 'PRESENT'} punchType={log.punchType} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'PROFILE' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <img
                    src={
                      currentEmp?.photoUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        currentEmp?.fullName || 'Employee'
                      )}`
                    }
                    alt={currentEmp?.fullName || 'Employee'}
                    className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-emerald-500/50 shadow-xl"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base">{currentEmp?.fullName || 'Employee'}</h3>
                    <p className="text-xs text-emerald-400 font-mono">{currentEmp?.employeeCode || 'EMP-XXXX'}</p>
                    <p className="text-xs text-slate-400">{currentEmp?.email || ''}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Department</span>
                    <span className="text-white font-medium">{currentEmp?.department || 'Engineering'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Position</span>
                    <span className="text-white font-medium">{currentEmp?.position || 'Staff'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Scheduled Shift</span>
                    <span className="text-emerald-400 font-medium">
                      {currentEmp?.shiftStart || 'Flexible 24x7'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Biometric Model</span>
                    <span className="text-white font-mono text-[10px]">SCRFD + ArcFace 512-D</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Face ID Status</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Enrolled (Active)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">App Version</span>
                    <span className="text-white font-mono font-semibold">v{APP_VERSION}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">Software Updates</p>
                      <p className="text-[11px] text-slate-400">Check for the latest APK releases</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      v{APP_VERSION}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={updateModal.isChecking}
                    onClick={() => handleCheckUpdate(true)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    {updateModal.isChecking ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        Checking for Updates...
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Check for App Updates
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM TAB NAVIGATION (When Logged In) */}
      {currentEmp && (
        <nav className="p-2 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 grid grid-cols-3 gap-1 sticky bottom-0 z-30">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
              activeTab === 'DASHBOARD' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
              activeTab === 'HISTORY' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition ${
              activeTab === 'PROFILE' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
        </nav>
      )}

      {/* =========================================================================
          MODAL 1: REGISTRATION MULTI-POSE ENROLLMENT CAMERA (STRAIGHT, LEFT, RIGHT)
         ========================================================================= */}
      {isEnrollmentCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between max-w-md mx-auto p-4 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="font-bold text-sm">Face ID Enrollment (Stage: {currentPoseStage})</h3>
              <p className="text-[11px] text-slate-400">SCRFD 5-Landmark Multi-Pose Calibration</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleCamera}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEnrollmentCameraOpen(false);
                  stopCamera();
                }}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewfinder Frame with Landmarks & Guidance */}
          <div className="relative my-auto w-full aspect-square rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-rose-400 text-xs">{cameraError}</div>
            ) : (
              <>
                <video
                  ref={enrollmentVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Render 5 SCRFD Key Landmarks */}
                {detectedFace?.hasFace && renderLandmarksHUD(detectedFace.landmarks5)}

                {/* Oval Guide Silhouette */}
                <div className="absolute inset-8 rounded-full border-2 border-dashed border-emerald-400/40 pointer-events-none flex items-center justify-center">
                  {/* Hold Progress Ring */}
                  {poseHoldProgress > 0 && (
                    <div
                      className="absolute inset-0 rounded-full border-4 border-emerald-400 transition-all duration-75"
                      style={{ opacity: poseHoldProgress / 100 }}
                    />
                  )}
                </div>
              </>
            )}

            {/* Live Guidance Prompt */}
            <div className="absolute bottom-4 inset-x-4 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-center space-y-1">
              <p className="text-xs font-bold text-emerald-300">
                {detectedFace?.hasFace
                  ? checkPoseMatch(
                      currentPoseStage,
                      detectedFace.quality.yawAngle,
                      detectedFace.quality.pitchAngle
                    ).prompt
                  : 'Align your face inside the circle'}
              </p>
              {detectedFace?.hasFace && (
                <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 font-mono">
                  <span>Yaw: {detectedFace.quality.yawAngle}°</span>
                  <span>Pitch: {detectedFace.quality.pitchAngle}°</span>
                  <span>Sharpness: {detectedFace.quality.sharpnessScore}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pose Progress Status */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className={`p-2 rounded-xl border text-center text-[11px] font-semibold ${
                currentPoseStage === 'STRAIGHT'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                  : capturedPoses.straight
                  ? 'bg-slate-900 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              1. Straight {capturedPoses.straight ? '✅' : ''}
            </div>
            <div
              className={`p-2 rounded-xl border text-center text-[11px] font-semibold ${
                currentPoseStage === 'LEFT'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                  : capturedPoses.left
                  ? 'bg-slate-900 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              2. Left Turn {capturedPoses.left ? '✅' : ''}
            </div>
            <div
              className={`p-2 rounded-xl border text-center text-[11px] font-semibold ${
                currentPoseStage === 'RIGHT'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                  : capturedPoses.right
                  ? 'bg-slate-900 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              3. Right Turn {capturedPoses.right ? '✅' : ''}
            </div>
          </div>

          {/* Manual Snapshot Trigger */}
          <button
            type="button"
            onClick={handleManualPoseCapture}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Camera className="w-4 h-4" />
            Capture {currentPoseStage} Pose Now 📸
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DAILY ATTENDANCE CAMERA (STEP 1: QR SCAN ➔ STEP 2: FACE ID)
         ========================================================================= */}
      {isAttendanceCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between max-w-md mx-auto p-4 animate-fadeIn">
          {/* Header & Stepper */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  {punchType === 'CHECK_OUT' ? (
                    <span className="text-purple-400 flex items-center gap-1">
                      <LogOut className="w-4 h-4" /> Office Departure (Check-Out)
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <LogIn className="w-4 h-4" /> Office Entry (Check-In)
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {attendanceStep === 'QR_SCAN'
                    ? 'Step 1 of 2: Scan Master QR Poster on wall'
                    : 'Step 2 of 2: Facial Biometric Identification'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleCamera}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsAttendanceCameraActive(false);
                    stopCamera();
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive 2-Step Progress Indicator with 90s Active Countdown */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`py-1.5 px-3 rounded-xl border text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isQrVerified
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : attendanceStep === 'QR_SCAN'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>1. Master QR {isQrVerified ? '✅' : ''}</span>
              </div>
              <div
                className={`py-1.5 px-3 rounded-xl border text-center text-xs font-semibold flex items-center justify-between transition ${
                  attendanceStep === 'FACE_SCAN'
                    ? qrTimerSeconds <= 10
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse'
                      : qrTimerSeconds <= 30
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5" />
                  <span>2. Face ID</span>
                </div>
                {attendanceStep === 'FACE_SCAN' && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                      qrTimerSeconds <= 10
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-bounce'
                        : qrTimerSeconds <= 30
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    }`}
                  >
                    <Timer className="w-3 h-3" />
                    {qrTimerSeconds}s
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Viewfinder Viewport */}
          <div className="relative my-auto w-full aspect-square rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl bg-black flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-rose-400 text-xs">{cameraError}</div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* 90s Countdown Linear Progress Gauge */}
                {attendanceStep === 'FACE_SCAN' && (
                  <div className="absolute top-0 inset-x-0 z-20 h-1.5 bg-slate-900/80">
                    <div
                      className={`h-full transition-all duration-300 ${
                        qrTimerSeconds <= 10
                          ? 'bg-rose-500'
                          : qrTimerSeconds <= 30
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-emerald-400 to-teal-300'
                      }`}
                      style={{ width: `${(qrTimerSeconds / 90) * 100}%` }}
                    />
                  </div>
                )}

                {/* -------------------------------------------------------------
                    VIEWFINDER OVERLAY: STEP 1 (QR SCANNER)
                   ------------------------------------------------------------- */}
                {attendanceStep === 'QR_SCAN' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Square QR Targeting Reticle with Corner Brackets */}
                    <div className="relative w-3/4 aspect-square rounded-2xl border-2 border-dashed border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                      {/* Animated Laser Scanning Beam */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-[bounce_2s_infinite]" />

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      <div className="text-center p-4 bg-black/40 backdrop-blur-sm rounded-xl">
                        <QrCode className="w-10 h-10 mx-auto text-emerald-400/80 animate-pulse mb-1" />
                        <span className="text-[11px] font-semibold text-emerald-200">Align Master QR Here</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    VIEWFINDER OVERLAY: STEP 2 (FACE ID BIOMETRIC)
                   ------------------------------------------------------------- */}
                {attendanceStep === 'FACE_SCAN' && (
                  <>
                    {/* 5 Facial Landmarks Cybernetic Overlay */}
                    {detectedFace?.hasFace && renderLandmarksHUD(detectedFace.landmarks5)}

                    {/* Facial Recognition Oval Target */}
                    <div
                      className={`absolute inset-8 rounded-full border-2 transition-colors pointer-events-none flex items-center justify-center ${
                        isFaceMatch
                          ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                          : 'border-dashed border-slate-500/60'
                      }`}
                    >
                      {/* Auto Capture Progress Fill Ring */}
                      {autoCaptureProgress > 0 && (
                        <div
                          className="absolute inset-0 rounded-full border-4 border-emerald-400 transition-all duration-75 animate-pulse"
                          style={{ opacity: autoCaptureProgress / 100 }}
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Bottom Real-Time HUD Status Bar */}
            <div className="absolute bottom-4 inset-x-4 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 space-y-2">
              {attendanceStep === 'QR_SCAN' ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Scan className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="truncate">{qrScanFeedback}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <ShieldCheck
                        className={`w-4 h-4 ${
                          detectedFace?.antiSpoofing.isLive ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      />
                      <span>
                        {detectedFace?.hasFace
                          ? detectedFace.antiSpoofing.isLive
                            ? 'Liveness: Genuine Live'
                            : detectedFace.antiSpoofing.message
                          : 'Looking for Face...'}
                      </span>
                    </div>
                    {detectedFace?.hasFace && (
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                          isFaceMatch
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Match: {(liveSimilarityScore * 100).toFixed(1)}% {isFaceMatch ? '✅' : '(Req: ≥85%)'}
                      </span>
                    )}
                  </div>

                  {/* Similarity Meter Progress Bar */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isFaceMatch ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min(100, liveSimilarityScore * 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Bar / Camera Controls */}
          <div className="space-y-2">
            {attendanceStep === 'QR_SCAN' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const payload = org?.masterQrPayload || 'QR-ATTEND-V1:DRP-HQ-01:VALID';
                    playAudioFeedback('STEP');
                    const now = Date.now();
                    qrScannedTimestampRef.current = now;
                    setQrScannedTimestamp(now);
                    setQrTimerSeconds(90);
                    scannedQrPayloadRef.current = payload;
                    setScannedQrPayload(payload);
                    setIsQrVerified(true);
                    setQrScanFeedback('✅ Office Master QR Verified! Aligning face...');
                    showToast('✅ Office Master QR Verified! 90s Face Scan window started.');
                    attendanceStepRef.current = 'FACE_SCAN';
                    setAttendanceStep('FACE_SCAN');
                    if (facingMode === 'environment') {
                      setFacingMode('user');
                    }
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  ✨ Verified Master QR (Proceed to Face ID)
                </button>
                <button
                  onClick={handleToggleCamera}
                  className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <SwitchCamera className="w-4 h-4 text-emerald-400" />
                  Flip Camera ({facingMode === 'environment' ? 'Rear Active' : 'Front Active'})
                </button>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-[11px] text-amber-300 font-medium flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Scan Office Poster or tap button above to unlock Face Biometrics.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    scannedQrPayloadRef.current = null;
                    setScannedQrPayload(null);
                    setIsQrVerified(false);
                    qrScannedTimestampRef.current = null;
                    setQrScannedTimestamp(null);
                    attendanceStepRef.current = 'QR_SCAN';
                    setAttendanceStep('QR_SCAN');
                    setQrTimerSeconds(90);
                    setQrScanFeedback('Point camera at the Office Master QR poster on the wall');
                    if (facingMode === 'user') {
                      setFacingMode('environment');
                    }
                  }}
                  className="px-3.5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Cancel and Re-scan QR"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Re-scan QR
                </button>
                <button
                  onClick={() =>
                    detectedFace && handleTriggerAttendanceVerification(detectedFace, scannedQrPayloadRef.current)
                  }
                  disabled={!detectedFace?.hasFace || isProcessing}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying Attendance Multi-Factor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {isFaceMatch ? 'Auto-Verifying Face...' : 'Mark Attendance Now'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VERIFICATION RESULT CARD MODAL
         ========================================================================= */}
      {verifyResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
            {verifyResult.success ? (
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <XCircle className="w-10 h-10" />
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {verifyResult.success
                  ? verifyResult.punchType === 'CHECK_OUT' || verifyResult.status === 'CHECKED_OUT'
                    ? 'Office Departure Recorded (Check-Out)'
                    : verifyResult.status === 'LATE'
                    ? 'Office Entry Recorded (Late Arrival)'
                    : 'Office Entry Recorded (Check-In)'
                  : 'Verification Rejected'}
              </h3>
              <p className="text-xs text-slate-400">{verifyResult.message}</p>
            </div>

            {/* Metrics Breakdown */}
            {verifyResult.details && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-left">
                {verifyResult.workDurationMinutes != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Work Duration</span>
                    <span className="text-purple-300 font-mono font-bold">
                      {Math.floor(verifyResult.workDurationMinutes / 60)}h {verifyResult.workDurationMinutes % 60}m
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">ArcFace Similarity</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {verifyResult.details.faceSimilarityScore
                      ? `${(verifyResult.details.faceSimilarityScore * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Anti-Spoofing Check</span>
                  <span className="text-emerald-400 font-semibold">
                    {verifyResult.details.livenessPassed ? '✅ Verified Live' : '❌ Failed'}
                  </span>
                </div>
                {verifyResult.details.timestamp && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Timestamp</span>
                    <span className="text-white font-mono">
                      {new Date(verifyResult.details.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setVerifyResult(null)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: OUT OF OFFICE GEOFENCE PERIMETER ALERT POPUP
         ========================================================================= */}
      {outOfPerimeterModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl shadow-rose-950/50 space-y-4 text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20 text-rose-400">
              <MapPinOff className="w-8 h-8 animate-pulse text-rose-400" />
            </div>

            {/* Header Title */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                Out of Office Location
              </h3>
              <p className="text-xs text-rose-300 font-semibold flex items-center justify-center gap-1">
                <span>🚫 Attendance Blocked • Geofence Restriction</span>
              </p>
            </div>

            {/* Main Explanation */}
            <div className="p-3.5 bg-rose-950/40 rounded-2xl border border-rose-500/30 text-left space-y-2 text-xs">
              <p className="text-slate-200 leading-relaxed">
                You are currently{' '}
                <span className="text-rose-400 font-bold font-mono text-sm">
                  {outOfPerimeterModal.distanceMeters >= 1000
                    ? (outOfPerimeterModal.distanceMeters / 1000).toFixed(2) + ' km'
                    : outOfPerimeterModal.distanceMeters.toFixed(0) + ' m'}
                </span>{' '}
                away from the registered office coordinates.
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                You must be physically present inside the office premises (within{' '}
                <span className="text-emerald-400 font-bold">{outOfPerimeterModal.allowedRadiusMeters} meters</span>) to scan the Master QR code and mark attendance.
              </p>
            </div>

            {/* Real-time Distance Diagnostics */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-left">
                <span className="text-slate-500 block text-[9px] font-sans">CURRENT DISTANCE</span>
                <span className="text-rose-400 font-bold text-xs">
                  {outOfPerimeterModal.distanceMeters >= 1000
                    ? (outOfPerimeterModal.distanceMeters / 1000).toFixed(2) + ' km'
                    : outOfPerimeterModal.distanceMeters.toFixed(0) + ' m'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-left">
                <span className="text-slate-500 block text-[9px] font-sans">ALLOWED RADIUS</span>
                <span className="text-emerald-400 font-bold text-xs">
                  {outOfPerimeterModal.allowedRadiusMeters} meters
                </span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setOutOfPerimeterModal((prev) => ({ ...prev, isOpen: false }))}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              Understood (Close)
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: IN-APP SOFTWARE UPDATE POPUP MODAL
         ========================================================================= */}
      {updateModal.isOpen && updateModal.versionInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl shadow-emerald-950/50 space-y-4 text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 text-emerald-400">
              <ArrowUpCircle className="w-8 h-8 animate-bounce text-emerald-400" />
            </div>

            {/* Header Title */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                New Update Available!
              </h3>
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px]">
                  v{APP_VERSION}
                </span>
                <span className="text-emerald-400">➔</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30">
                  v{updateModal.versionInfo.latestVersion}
                </span>
              </div>
            </div>

            {/* Release Notes */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs">
              <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                What's New:
              </p>
              <div className="text-slate-300 text-xs whitespace-pre-line leading-relaxed">
                {updateModal.versionInfo.releaseNotes || 'Performance improvements and security updates.'}
              </div>
            </div>

            {/* 1-Tap Download & Install Button */}
            <a
              href={updateModal.versionInfo.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download & Install Update (APK) 🚀
            </a>

            {/* Releases Page Link */}
            <a
              href={updateModal.versionInfo.releasesPageUrl || 'https://github.com/Vineetcodex/smart-attendance-system/releases'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition flex items-center justify-center gap-1"
            >
              <span>View Release Notes on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Dismiss Button (if not mandatory) */}
            {!updateModal.versionInfo.mandatory && (
              <button
                type="button"
                onClick={() => setUpdateModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition"
              >
                Remind Me Later
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
