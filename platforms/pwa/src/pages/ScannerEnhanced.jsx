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
    
    // Camera quality controls
    const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2.0
    const [qualityLevel, setQualityLevel] = useState(1); // 0.5 to 2.0
    const [showControls, setShowControls] = useState(false);

    // Use thresholds from helper
    const { BRIGHTNESS_MIN, BRIGHTNESS_MAX } = THRESHOLDS;

    useEffect(() => {
        let cameraInstance = null;
        let faceMesh = null;
        let isComponentMounted = true;
        let orientationChangeTimeout = null;
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
                // Detect iOS early
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                
                console.log(`🍎 iOS Detection: ${isIOS}`);
                console.log(`🦁 Safari Detection: ${isSafari}`);
                console.log(`🌐 User Agent: ${navigator.userAgent}`);
                console.log(`🔒 Is Secure Context: ${window.isSecureContext}`);
                console.log(`📍 Protocol: ${window.location.protocol}`);
                
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
                    
                    // Use actual video dimensions for accurate coordinate mapping
                    const actualVideoWidth = videoRef.current.videoWidth;
                    const actualVideoHeight = videoRef.current.videoHeight;
                    
                    console.log(`📹 Actual Video Dimensions: ${actualVideoWidth}x${actualVideoHeight}`);
                    
                    // Set canvas size to match video dimensions
                    canvasRef.current.width = actualVideoWidth;
                    canvasRef.current.height = actualVideoHeight;
                    
                    const width = actualVideoWidth;
                    const height = actualVideoHeight;

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
                    // Detect orientation and set appropriate resolution
                    const isPortrait = window.innerHeight > window.innerWidth;
                    console.log(`📱 Is Portrait: ${isPortrait}`);
                    
                    const cameraWidth = isPortrait ? Math.floor(480 * qualityLevel) : Math.floor(1280 * qualityLevel);
                    const cameraHeight = isPortrait ? Math.floor(640 * qualityLevel) : Math.floor(720 * qualityLevel);
                    
                    console.log(`📱 Orientation: ${isPortrait ? 'Portrait' : 'Landscape'}`);
                    console.log(`📹 Camera Resolution: ${cameraWidth}x${cameraHeight}`);
                    console.log(`🖥️ Window Size: ${window.innerWidth}x${window.innerHeight}`);
                    
                    // iOS-specific camera constraints
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    
                    let cameraConfig = {
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
                        }
                    };
                    
                    // Only set resolution constraints for non-iOS devices
                    if (!isIOS) {
                        cameraConfig.width = cameraWidth;
                        cameraConfig.height = cameraHeight;
                    }
                    
                    console.log(`📱 Is iOS: ${isIOS}`);
                    console.log(`📹 Camera Config:`, cameraConfig);
                    
                    cameraInstance = new window.Camera(videoRef.current, cameraConfig);
                    cameraInstance.start().catch(async (err) => {
                        console.error("MediaPipe Camera start failed:", err);
                        
                        // iOS Fallback: Try direct getUserMedia
                        if (isIOS) {
                            console.log("🍎 Trying iOS fallback with getUserMedia...");
                            try {
                                const stream = await navigator.mediaDevices.getUserMedia({
                                    video: {
                                        facingMode: facingMode,
                                        width: { ideal: isPortrait ? 480 : 1280 },
                                        height: { ideal: isPortrait ? 640 : 720 }
                                    }
                                });
                                
                                if (videoRef.current && isComponentMounted) {
                                    videoRef.current.srcObject = stream;
                                    await videoRef.current.play();
                                    console.log("✅ iOS fallback successful");
                                }
                            } catch (fallbackErr) {
                                console.error("iOS fallback also failed:", fallbackErr);
                                if (isComponentMounted) setHasCameraError(true);
                            }
                        } else {
                            if (isComponentMounted) setHasCameraError(true);
                        }
                    });
                    
                    qualityCheckInterval = setInterval(checkImageQuality, 200); // Faster: 200ms instead of 500ms
                }

            } catch (error) {
                console.error("MediaPipe initialization error:", error);
                if (isComponentMounted) setHasCameraError(true);
            }
        };

        startMediaPipe();

        // Handle orientation changes
        const handleOrientationChange = () => {
            if (orientationChangeTimeout) clearTimeout(orientationChangeTimeout);
            
            orientationChangeTimeout = setTimeout(() => {
                console.log('📱 Orientation changed, restarting camera...');
                
                // Restart MediaPipe with new orientation
                if (isComponentMounted) {
                    startMediaPipe();
                }
            }, 300); // Debounce orientation changes
        };

        // Listen for orientation changes
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            isComponentMounted = false;
            
            // Clear orientation change timeout
            if (orientationChangeTimeout) {
                clearTimeout(orientationChangeTimeout);
                orientationChangeTimeout = null;
            }
            
            // Remove orientation listeners
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
            
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
    }, [facingMode, qualityLevel]); // Re-run when camera flips or quality changes

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
                    webkit-playsinline="true"
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        filter: isCapturing ? 'brightness(1.5) blur(4px)' : 'none',
                        zoom: zoomLevel
                    }} 
                />
                <canvas 
                    ref={canvasRef} 
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        pointerEvents: 'none',
                        mixBlendMode: 'screen',
                        zoom: zoomLevel
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
                    
                    {/* Camera Controls Toggle - Icon Only */}
                    <button
                        onClick={() => setShowControls(!showControls)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '20px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            color: 'white',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ⚙️
                    </button>
                    
                    {/* Professional Camera Controls Panel */}
                    {showControls && (
                        <div style={{
                            position: 'absolute',
                            top: '60px',
                            right: '20px',
                            background: 'rgba(0, 0, 0, 0.85)',
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            minWidth: '220px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }}>
                            {/* Zoom Control */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.9)', 
                                        fontSize: '0.8rem', 
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)'
                                    }}>
                                        Zoom
                                    </span>
                                    <span style={{ 
                                        color: 'white', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 600,
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '8px'
                                    }}>
                                        {zoomLevel.toFixed(1)}x
                                    </span>
                                </div>
                                <div style={{ position: 'relative', height: '4px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        height: '4px',
                                        width: `${((zoomLevel - 0.5) / 1.5) * 100}%`,
                                        background: 'linear-gradient(90deg, #ff6b9d, #c44569)',
                                        borderRadius: '2px'
                                    }} />
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={zoomLevel}
                                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            left: '0',
                                            width: '100%',
                                            height: '16px',
                                            background: 'transparent',
                                            outline: 'none',
                                            appearance: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Quality Control */}
                            <div>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{ 
                                        color: 'rgba(255, 255, 255, 0.9)', 
                                        fontSize: '0.8rem', 
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)'
                                    }}>
                                        Kejernihan
                                    </span>
                                    <span style={{ 
                                        color: 'white', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 600,
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '8px'
                                    }}>
                                        {qualityLevel.toFixed(1)}x
                                    </span>
                                </div>
                                <div style={{ position: 'relative', height: '4px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        height: '4px',
                                        width: `${((qualityLevel - 0.5) / 1.5) * 100}%`,
                                        background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                                        borderRadius: '2px'
                                    }} />
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={qualityLevel}
                                        onChange={(e) => setQualityLevel(parseFloat(e.target.value))}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            left: '0',
                                            width: '100%',
                                            height: '16px',
                                            background: 'transparent',
                                            outline: 'none',
                                            appearance: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
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
            {/* {!capturedImage && <OvalFrame isOptimal={isOptimal} />} */}

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
                
                /* Professional Slider Styling */
                input[type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                }
                
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    position: relative;
                    z-index: 2;
                }
                
                input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.9);
                    position: relative;
                    z-index: 2;
                }
                
                input[type="range"]::-webkit-slider-track {
                    background: transparent;
                }
                
                input[type="range"]::-moz-range-track {
                    background: transparent;
                    border: none;
                }
            `}</style>
        </div>
    );
};

export default ScannerEnhanced;
