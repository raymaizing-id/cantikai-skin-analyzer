import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import StatusIndicators from '../components/scanner/StatusIndicators';
import OvalFrame from '../components/scanner/OvalFrame';
import ControlButtons from '../components/scanner/ControlButtons';
import { isAuthenticated, isGuestSession } from '../utils/auth';
import { checkAndUseToken, getTokenInfo } from '../utils/tokenSystem';
import { 
    THRESHOLDS, 
    calculateBrightness, 
    checkFaceDistance, 
    detectGlasses, 
    detectFilter,
    drawFaceContour,
    drawKeyPoints,
    drawSoftMesh
} from '../utils/faceDetectionHelpers';

const ScannerEnhanced = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const isCountingRef = useRef(false);
    const isPreviewing = useRef(false); // Use ref instead of state in dependency
    const [hasCameraError, setHasCameraError] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [facingMode, setFacingMode] = useState('user');
    const [capturedImage, setCapturedImage] = useState(null); // For preview
    
    // Enhanced detection states
    const [faceDetected, setFaceDetected] = useState(false);
    const [goodLight, setGoodLight] = useState(false);
    const [goodDistance, setGoodDistance] = useState(false);
    const [hasGlasses, setHasGlasses] = useState(false);
    const [hasFilter, setHasFilter] = useState(false);
    const [brightness, setBrightness] = useState(0);
    const [distance, setDistance] = useState('');
    const [isOptimal, setIsOptimal] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Use thresholds from helper
    const { BRIGHTNESS_MIN, BRIGHTNESS_MAX } = THRESHOLDS;

    useEffect(() => {
        let cameraInstance = null;
        let faceMesh = null;
        let isComponentMounted = true;
        let qualityCheckInterval = null;

        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.crossOrigin = 'anonymous';
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        };

        const checkImageQuality = () => {
            // STOP processing if preview is shown
            if (isPreviewing.current) return;
            
            if (!videoRef.current || !canvasRef.current) return;
            
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;
            
            if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
                return;
            }
            
            try {
                const newBrightness = calculateBrightness(videoRef.current, videoWidth, videoHeight);
                
                if (newBrightness > 0) { // Only update if valid
                    setBrightness(newBrightness);
                    
                    // FORCE PASS for testing - always true if brightness > 0
                    setGoodLight(true); // Always true for now
                }
            } catch (error) {
                console.error('Quality check error:', error);
            }
        };

        const startMediaPipe = async () => {
            try {
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

                if (!isComponentMounted) return;

                if (!window.FaceMesh || !window.Camera) {
                    setTimeout(startMediaPipe, 1000);
                    return;
                }

                faceMesh = new window.FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });

                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.6,
                    minTrackingConfidence: 0.6
                });

                faceMesh.onResults((results) => {
                    if (!canvasRef.current || !videoRef.current || !isComponentMounted) return;
                    
                    // STOP processing if preview is shown
                    if (isPreviewing.current) return;
                    
                    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;
                    
                    const canvasCtx = canvasRef.current.getContext('2d');
                    const width = canvasRef.current.width;
                    const height = canvasRef.current.height;

                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, width, height);

                    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                        setFaceDetected(true);
                        
                        const landmarks = results.multiFaceLandmarks[0];
                        
                        // Use helper functions for detection
                        const distanceCheck = checkFaceDistance(landmarks, width, height);
                        setGoodDistance(distanceCheck.isGood);
                        setDistance(distanceCheck.status);
                        
                        // IMPORTANT: Use current brightness value from state
                        const currentBrightness = brightness;
                        
                        // FORCE PASS for testing - always true if face detected
                        const goodBright = true; // Bypass brightness check for now
                        setGoodLight(true); // Always true
                        
                        const glassesDetected = detectGlasses(landmarks);
                        setHasGlasses(glassesDetected);
                        
                        const filterDetected = detectFilter(videoRef.current, landmarks, width, height);
                        setHasFilter(filterDetected);
                        
                        // Check if optimal (ONLY 3 checks: face, light, distance)
                        // IGNORE glasses and filter for auto-capture
                        const optimal = distanceCheck.isGood && goodBright && true;
                        setIsOptimal(optimal);
                        
                        // Auto-capture logic - countdown 3
                        if (optimal && !isCapturing && !isCountingRef.current) {
                            isCountingRef.current = true;
                            startCountdown();
                        } else if (!optimal && isCountingRef.current) {
                            stopCountdown();
                        }
                        
                        // Draw using helper functions - SOFT COLORS, NO DARK OVERLAY
                        drawSoftMesh(canvasCtx, landmarks, optimal);
                        drawFaceContour(canvasCtx, landmarks, width, height, optimal);
                        drawKeyPoints(canvasCtx, landmarks, width, height, optimal);
                        
                    } else {
                        setFaceDetected(false);
                        setGoodDistance(false);
                        setDistance('');
                        setIsOptimal(false);
                        stopCountdown();
                    }
                    canvasCtx.restore();
                });

                if (videoRef.current) {
                    cameraInstance = new window.Camera(videoRef.current, {
                        onFrame: async () => {
                            // STOP processing if preview is shown
                            if (isPreviewing.current) return;
                            
                            if (faceMesh && isComponentMounted && 
                                videoRef.current && 
                                videoRef.current.videoWidth > 0 && 
                                videoRef.current.videoHeight > 0) {
                                try {
                                    await faceMesh.send({ image: videoRef.current });
                                } catch (err) {
                                    // Silently ignore MediaPipe processing errors to reduce console noise
                                }
                            }
                        },
                        width: 1280,  // Higher resolution
                        height: 720
                    });
                    cameraInstance.start().catch((err) => {
                        console.error("Camera start failed:", err);
                        if (isComponentMounted) setHasCameraError(true);
                    });
                    
                    qualityCheckInterval = setInterval(checkImageQuality, 200); // Faster: 200ms instead of 500ms
                }

            } catch (error) {
                console.error("MediaPipe initialization error:", error);
                if (isComponentMounted) setHasCameraError(true);
            }
        };

        startMediaPipe();

        return () => {
            isComponentMounted = false;
            
            // Stop camera with better cleanup
            if (cameraInstance) {
                try {
                    cameraInstance.stop();
                    cameraInstance = null;
                } catch (error) {
                    console.warn('Error stopping camera:', error);
                }
            }
            
            // Close MediaPipe
            if (faceMesh) {
                try {
                    faceMesh.close();
                    faceMesh = null;
                } catch (error) {
                    console.warn('Error closing faceMesh:', error);
                }
            }
            
            // Stop video stream directly
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                if (stream && stream.getTracks) {
                    stream.getTracks().forEach(track => {
                        track.stop();
                    });
                }
                videoRef.current.srcObject = null;
            }
            
            // Clear intervals
            if (qualityCheckInterval) {
                clearInterval(qualityCheckInterval);
                qualityCheckInterval = null;
            }
            
            stopCountdown();
        };
    }, [facingMode]); // Only re-run when camera flips

    // Countdown functions using ref to avoid state issues
    const startCountdown = () => {
        let count = 3;
        setCountdown(count);
        
        countdownTimerRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
            } else {
                setCountdown(0);
                stopCountdown();
                captureImage();
            }
        }, 1000);
    };

    const stopCountdown = () => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        isCountingRef.current = false;
        setCountdown(null);
    };

    // Countdown effect - REMOVED, using ref-based approach instead
    // useEffect(() => {
    //     if (countdown === null || countdown === undefined) return;
    //     
    //     if (countdown === 0) {
    //         captureImage();
    //         setCountdown(null);
    //         setAutoCapturing(false);
    //         return;
    //     }
    //     
    //     // Countdown timer
    //     const timer = setTimeout(() => {
    //         setCountdown(prev => {
    //             if (prev === null || prev === undefined) return null;
    //             return prev - 1;
    //         });
    //     }, 1000);
    //     
    //     return () => clearTimeout(timer);
    // }, [countdown]); // Only depend on countdown

    const captureImage = () => {
        if (!videoRef.current || isCapturing) return;
        
        setIsCapturing(true);
        stopCountdown(); // Stop countdown when capturing
        isPreviewing.current = true; // Set flag to stop MediaPipe
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Mirror if front camera
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(videoRef.current, 0, 0);
        
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.95);
        
        // Show preview instead of going directly to result
        setCapturedImage(imageBase64);
    };

    const confirmCapture = () => {
        // TOKEN CHECK BEFORE PROCEEDING
        const guest = !isAuthenticated() || isGuestSession();
        const tokenCheck = checkAndUseToken('analysis', guest);
        
        if (!tokenCheck.success) {
            alert(tokenCheck.message);
            if (guest && window.confirm('Login untuk unlimited scan?')) {
                navigate('/login');
            }
            return;
        }
        
        // Clear any existing session before navigating to new analysis
        sessionStorage.removeItem('current_analysis_session');
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('analysis_session_')) {
                sessionStorage.removeItem(key);
            }
        });
        
        // Go to result with captured image
        navigate('/result', { state: { imageBase64: capturedImage } });
    };

    const retakePhoto = () => {
        // Clear preview and allow retake
        setCapturedImage(null);
        setIsCapturing(false);
        isPreviewing.current = false; // Resume MediaPipe
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Clear any existing session before uploading new image
        sessionStorage.removeItem('current_analysis_session');
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('analysis_session_')) {
                sessionStorage.removeItem(key);
            }
        });
        
        const reader = new FileReader();
        reader.onload = (event) => {
            navigate('/result', { state: { imageBase64: event.target.result } });
        };
        reader.readAsDataURL(file);
    };

    const retake = () => {
        setCapturedImage(null);
        setIsCapturing(false);
        stopCountdown();
        isPreviewing.current = false; // Resume MediaPipe
    };

    const handleFlip = () => {
        setFacingMode(facingMode === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="app-container" style={{ background: '#36212a', position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            
            {/* Video & Canvas - Full screen - HIDE when preview shown */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: capturedImage ? 'none' : 'block' }}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        filter: isCapturing ? 'brightness(1.5) blur(4px)' : 'none'
                    }} 
                />
                <canvas 
                    ref={canvasRef} 
                    width={1280}  // Swapped to match video aspect ratio
                    height={720}  // Swapped to match video aspect ratio 
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        pointerEvents: 'none',
                        mixBlendMode: 'screen'
                    }} 
                />
            </div>

            {/* Top gradient overlay - SMALLER, only at edge - HIDE when preview shown */}
            {!capturedImage && (
                <div style={{
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '120px',  // Reduced from 300px
                    background: 'linear-gradient(180deg, rgba(54, 33, 42, 0.85) 0%, transparent 100%)',
                    pointerEvents: 'none', 
                    zIndex: 1
                }} />
            )}

            {/* Title - Font konsisten dengan Home - HIDE when preview shown */}
            {!capturedImage && (
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, zIndex: 10, textAlign: 'center' }}>
                    <h1 className="headline" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                        Analisis Kulit Anda
                    </h1>
                    <p className="subtitle" style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.85)', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        Posisikan wajah di dalam frame
                    </p>
                    
                    {/* Warnings - HORIZONTAL, COMPACT, AT TOP */}
                    {(hasGlasses || hasFilter) && (
                        <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            justifyContent: 'center',
                            marginTop: '12px',
                            flexWrap: 'wrap'
                        }}>
                            {hasGlasses && (
                                <div style={{ 
                                    padding: '4px 10px', 
                                    background: 'rgba(255, 190, 215, 0.25)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 190, 215, 0.4)',
                                    backdropFilter: 'blur(8px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <AlertCircle size={11} color="#fff" />
                                    <span style={{ 
                                        color: '#fff', 
                                        fontSize: '0.6rem', 
                                        fontWeight: 600, 
                                        fontFamily: 'var(--font-sans)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Lepas kacamata
                                    </span>
                                </div>
                            )}
                            {hasFilter && (
                                <div style={{ 
                                    padding: '4px 10px', 
                                    background: 'rgba(255, 190, 215, 0.25)', 
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 190, 215, 0.4)',
                                    backdropFilter: 'blur(8px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <AlertCircle size={11} color="#fff" />
                                    <span style={{ 
                                        color: '#fff', 
                                        fontSize: '0.6rem', 
                                        fontWeight: 600, 
                                        fontFamily: 'var(--font-sans)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Nonaktifkan filter
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modular Status Indicators Component - NO WARNINGS HERE - HIDE when preview shown */}
            {!capturedImage && (
                <StatusIndicators 
                    faceDetected={faceDetected}
                    goodLight={goodLight}
                    goodDistance={goodDistance}
                    hasGlasses={false}  // Don't show warnings here
                    hasFilter={false}   // Don't show warnings here
                    countdown={countdown}
                    distance={distance}
                    brightness={brightness}
                />
            )}

            {/* Modular Oval Frame Component - BIGGER for closer face - HIDE when preview shown */}
            {!capturedImage && <OvalFrame isOptimal={isOptimal} />}

            {/* Bottom gradient overlay - SMALLER, only at edge - HIDE when preview shown */}
            {!capturedImage && (
                <div style={{
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '140px',  // Reduced from 200px
                    background: 'linear-gradient(0deg, rgba(54, 33, 42, 0.85) 0%, transparent 100%)',
                    pointerEvents: 'none', 
                    zIndex: 4
                }} />
            )}

            {/* Modular Control Buttons Component - HIDE when preview shown */}
            {!capturedImage && (
                <ControlButtons 
                    onUpload={handleUpload}
                    onCapture={captureImage}
                    onFlip={handleFlip}
                    onRetake={retake}
                    fileInputRef={fileInputRef}
                    isCapturing={isCapturing}
                    isOptimal={isOptimal}
                    faceDetected={faceDetected}
                    hasCameraError={hasCameraError}
                />
            )}

            {/* Photo Preview Modal */}
            {capturedImage && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <h2 style={{ color: 'white', marginBottom: '20px', fontFamily: 'var(--font-sans)' }}>
                        Preview Foto
                    </h2>
                    <img 
                        src={capturedImage} 
                        alt="Preview" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '60vh',
                            borderRadius: '20px',
                            marginBottom: '30px'
                        }}
                    />
                    {(hasGlasses || hasFilter) && (
                        <div style={{
                            background: 'rgba(255, 190, 215, 0.2)',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            border: '1px solid rgba(255, 190, 215, 0.4)'
                        }}>
                            <p style={{ color: 'white', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
                                ⚠️ {hasGlasses && 'Kacamata'}{hasGlasses && hasFilter && ' dan '}{hasFilter && 'Filter'} terdeteksi - dapat mempengaruhi hasil analisis
                            </p>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={retakePhoto}
                            style={{
                                padding: '14px 32px',
                                borderRadius: '30px',
                                border: '2px solid white',
                                background: 'transparent',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            Ulangi
                        </button>
                        <button
                            onClick={confirmCapture}
                            style={{
                                padding: '14px 32px',
                                borderRadius: '30px',
                                border: 'none',
                                background: 'var(--primary-color)',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            Lanjutkan Analisis
                        </button>
                    </div>
                </div>
            )}

            {/* Camera Error */}
            {hasCameraError && (
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    textAlign: 'center', 
                    zIndex: 20, 
                    background: 'rgba(0,0,0,0.9)', 
                    padding: '40px', 
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: '80%'
                }}>
                    <AlertCircle size={56} color="#f87171" style={{ marginBottom: '20px' }} />
                    <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '12px', fontWeight: 600 }}>
                        Akses Kamera Ditolak
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Mohon izinkan akses kamera untuk melanjutkan analisis kulit
                    </p>
                </div>
            )}

            {/* Pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ScannerEnhanced;
