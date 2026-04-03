import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import api from '../../services/api';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  User,
  Activity,
  Calendar,
  ArrowRightLeft,
  Search,
  Camera,
  CameraOff,
  RotateCcw,
  Upload
} from 'lucide-react';

const themes = {
  brand: {
    accentText: 'text-brand-500',
    cornerBorder: 'border-brand-500',
    focusRing: 'focus:ring-brand-500/20',
    focusBorder: 'focus:border-brand-500',
    button: 'bg-brand-500 hover:bg-brand-600 disabled:hover:bg-brand-500',
    spinner: 'border-brand-200 border-t-brand-500',
    statusText: 'text-brand-500',
    statusSurface: 'bg-brand-50 border-brand-100',
    statusTitle: 'text-brand-600',
    statusValue: 'text-brand-800'
  },
  blue: {
    accentText: 'text-blue-500',
    cornerBorder: 'border-blue-500',
    focusRing: 'focus:ring-blue-500/20',
    focusBorder: 'focus:border-blue-500',
    button: 'bg-blue-500 hover:bg-blue-600 disabled:hover:bg-blue-500',
    spinner: 'border-blue-200 border-t-blue-500',
    statusText: 'text-blue-500',
    statusSurface: 'bg-blue-50 border-blue-100',
    statusTitle: 'text-blue-600',
    statusValue: 'text-blue-800'
  }
};

const getCameraErrorMessage = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in the browser and try again.';
  }

  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.';
  }

  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'The camera is already in use by another application.';
  }

  return 'Unable to start the camera scanner.';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const decodeWithJsQr = (canvas) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  return qrResult?.data || null;
};

const decodeQrFromCanvas = async (canvas) => {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(canvas);
      if (barcodes[0]?.rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to jsQR.
    }
  }

  return decodeWithJsQr(canvas);
};

const SubscriptionScannerPage = ({
  title,
  description,
  manualPlaceholder,
  theme = 'brand'
}) => {
  const palette = themes[theme] || themes.brand;

  const [passId, setPassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [helperMessage, setHelperMessage] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const scanLockRef = useRef(false);
  const lastScannedRef = useRef('');

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState('idle');
  };

  const verifyPass = async (payload) => {
    setLoading(true);
    setScanResult(null);
    setHelperMessage('');

    try {
      const { data } = await api.post('/v2/subscriptions/verify-entry', payload);
      setScanResult({
        success: true,
        data: data.data || data,
        message: data.message || 'Access granted'
      });
      setPassId('');
    } catch (err) {
      setScanResult({
        success: false,
        error: err.response?.data?.error?.message || err.response?.data?.message || 'Invalid pass or scan failed'
      });
    } finally {
      setLoading(false);
      scanLockRef.current = false;
    }
  };

  const handleDecodedPayload = (decodedText) => {
    if (!decodedText || scanLockRef.current || lastScannedRef.current === decodedText) {
      return;
    }

    scanLockRef.current = true;
    lastScannedRef.current = decodedText;
    verifyPass({ qrPayload: decodedText });

    window.setTimeout(() => {
      if (lastScannedRef.current === decodedText) {
        lastScannedRef.current = '';
      }
    }, 1500);
  };

  const scanFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamRef.current) {
      return;
    }

    if (!scanLockRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const decodedText = await decodeQrFromCanvas(canvas);
        if (decodedText) {
          handleDecodedPayload(decodedText);
        }
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      setCameraError('This browser does not support camera scanning.');
      return;
    }

    stopCamera();
    setCameraError('');
    setCameraState('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setCameraState('ready');
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      stopCamera();
      setCameraState('error');
      setCameraError(getCameraErrorMessage(error));
    }
  };

  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    if (!passId.trim()) return;
    await verifyPass({ passId: passId.trim().toUpperCase() });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHelperMessage('');

    try {
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Scanner canvas unavailable');
      }

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('Unable to read uploaded image');
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const decodedText = await decodeQrFromCanvas(canvas);
      URL.revokeObjectURL(imageUrl);

      if (!decodedText) {
        setHelperMessage('No QR code was detected in that image.');
        e.target.value = '';
        return;
      }

      handleDecodedPayload(decodedText);
    } catch {
      setHelperMessage('The uploaded image could not be scanned.');
    } finally {
      e.target.value = '';
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ScanLine size={20} className={palette.accentText} />
              Scan Pass
            </h2>
          </div>

          <div className="p-8 flex-1 flex flex-col justify-center">
            <div className="w-full aspect-square max-w-[240px] mx-auto bg-gray-950 border-2 border-dashed border-gray-300 rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden">
              <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover ${cameraState === 'ready' ? '' : 'hidden'}`}
                  autoPlay
                  muted
                  playsInline
                />
              {cameraState !== 'ready' && (
                <div className="absolute inset-0 bg-gray-50" />
              )}

              <div className={`absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl z-10 pointer-events-none ${palette.cornerBorder}`} />
              <div className={`absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl z-10 pointer-events-none ${palette.cornerBorder}`} />
              <div className={`absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl z-10 pointer-events-none ${palette.cornerBorder}`} />
              <div className={`absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 rounded-br-xl z-10 pointer-events-none ${palette.cornerBorder}`} />

              {cameraState !== 'ready' && (
                <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
                  {cameraState === 'starting' ? (
                    <>
                      <div className={`w-10 h-10 border-4 rounded-full animate-spin mb-4 ${palette.spinner}`} />
                      <p className="text-sm text-gray-600 font-medium">Starting camera...</p>
                    </>
                  ) : (
                    <>
                      <CameraOff size={42} className="text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">
                        {cameraError || 'Camera preview unavailable'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Camera size={16} />
                {cameraState === 'ready' ? 'Restart Camera' : 'Start Camera'}
              </button>

              {cameraState === 'ready' && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <CameraOff size={16} />
                  Stop
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload size={16} />
                Scan Image
              </button>
            </div>

            {helperMessage && (
              <p className="mb-4 text-center text-sm text-amber-600">{helperMessage}</p>
            )}

            <form onSubmit={handleManualSubmit} className="w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Manual Entry (Pass ID)
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={passId}
                  onChange={(e) => setPassId(e.target.value)}
                  placeholder={manualPlaceholder}
                  className={`w-full pl-11 pr-32 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 transition-all uppercase tracking-wider ${palette.focusRing} ${palette.focusBorder}`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !passId.trim()}
                  className={`absolute right-2 top-2 bottom-2 px-6 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center min-w-[100px] ${palette.button}`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity size={20} className={palette.accentText} />
              Scan Result
            </h2>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {!scanResult && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <ScanLine size={48} className="mb-4 opacity-30" />
                <p>Waiting for scan...</p>
                <p className="text-sm mt-1">Scan a pass to view entry/exit details</p>
              </div>
            )}

            {loading && (
              <div className={`flex-1 flex flex-col items-center justify-center ${palette.statusText}`}>
                <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${palette.spinner}`} />
                <p className="font-semibold animate-pulse">Verifying pass...</p>
              </div>
            )}

            {scanResult && scanResult.success && (
              <div className="flex-1 flex flex-col animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-emerald-800">{scanResult.message}</h3>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mt-1">
                    Recorded as {scanResult.data.action}
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <User size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">User</p>
                      <p className="text-sm font-bold text-gray-800">{scanResult.data.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{scanResult.data.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Activity size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Facility</p>
                      <p className="text-sm font-bold text-gray-800 capitalize">{scanResult.data.facilityType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Calendar size={18} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase">Pass Valid Until</p>
                      <p className="text-sm font-bold text-gray-800">{formatDate(scanResult.data.validUntil)}</p>
                    </div>
                  </div>

                  {scanResult.data.occupancy && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl mt-auto border ${palette.statusSurface}`}>
                      <ArrowRightLeft size={18} className={`shrink-0 ${palette.statusText}`} />
                      <div>
                        <p className={`text-xs font-semibold uppercase ${palette.statusTitle}`}>Current Occupancy</p>
                        <p className={`text-sm font-bold ${palette.statusValue}`}>
                          {scanResult.data.occupancy.occupiedSlots ?? 0} / {scanResult.data.occupancy.totalSlots ?? '--'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scanResult && !scanResult.success && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <XCircle size={64} className="text-red-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-red-600 bg-red-50 py-2 px-4 rounded-lg font-semibold border border-red-100">
                  {scanResult.error}
                </p>
                <button
                  onClick={() => {
                    setScanResult(null);
                    setPassId('');
                  }}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-4 transition-colors"
                >
                  <RotateCcw size={14} />
                  Clear and try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionScannerPage;
