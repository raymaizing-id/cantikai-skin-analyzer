


import { Fragment, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, MoveUpRight, Info, Sparkles, ScanFace, Heart, Image as ImageIcon } from 'lucide-react';
import { analyzeSkinWithAI } from '../services/aiAnalysisService';
import { generateSkinAnalyzerImage } from '../services/skinAnalyzerVisualization';
import apiService from '../services/api';
import BottomNav from '../components/BottomNav';
import AnalysisModeModal from '../components/AnalysisModeModal';
import ErrorToast from '../components/ErrorToast';
import LoginPrompt from '../components/LoginPrompt';
import LockedContent from '../components/LockedContent';
import metricExplanations from '../data/metricExplanations';
import { isAuthenticated, isGuestSession } from '../utils/auth';
import { getTokenInfo } from '../utils/tokenSystem';

// SPACING CONSTANTS - COMPACT & MINIMALIST
const SPACING = {
    section: 12,      // Section gap
    card: 16,         // Card padding
    element: 8,       // Element margin
    grid: 12          // Grid gap
};

const TYPOGRAPHY = {
    h1: '1.5rem',
    h2: '1.2rem',
    h3: '1.1rem',
    h4: '1rem',
    body: '0.9rem',
    small: '0.8rem',
    tiny: '0.75rem'
};

const AnalysisResult = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('');
    const [showOverallScore, setShowOverallScore] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);
    const [showMetrics, setShowMetrics] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [analysisEngine, setAnalysisEngine] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    const [visualizationImage, setVisualizationImage] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [isGuest, setIsGuest] = useState(true);
    const [tokenInfo, setTokenInfo] = useState(null);

    // Check auth status on mount
    useEffect(() => {
        const guest = !isAuthenticated() || isGuestSession();
        setIsGuest(guest);
        
        // Get token info
        const info = getTokenInfo('analysis', guest);
        setTokenInfo(info);
    }, []);

    useEffect(() => {
        if (!resultData) return;
        try {
            localStorage.setItem('cantik_last_result_data', JSON.stringify(resultData));
        } catch (error) {
            console.warn('Failed to cache last result data:', error);
        }
    }, [resultData]);

    useEffect(() => {
        if (!aiInsights) return;
        try {
            localStorage.setItem('cantik_last_ai_insights', JSON.stringify(aiInsights));
        } catch (error) {
            console.warn('Failed to cache last AI insights:', error);
        }
    }, [aiInsights]);

    // Generate or retrieve session ID
    const getOrCreateSessionId = () => {
        // Check if we have a session ID in state (from navigation)
        if (state?.sessionId) {
            return state.sessionId;
        }
        
        // Check sessionStorage for existing session
        const existingSession = sessionStorage.getItem('current_analysis_session');
        if (existingSession) {
            try {
                const session = JSON.parse(existingSession);
                // Session is valid if less than 1 hour old
                if (Date.now() - session.timestamp < 3600000) {
                    return session.id;
                }
            } catch (e) {
                console.warn('Invalid session data, creating new session');
            }
        }
        
        // Create new session ID
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionData = {
            id: newSessionId,
            timestamp: Date.now()
        };
        sessionStorage.setItem('current_analysis_session', JSON.stringify(sessionData));
        return newSessionId;
    };

    // Clear session (called when user scans again or saves report)
    const clearSession = () => {
        sessionStorage.removeItem('current_analysis_session');
        // Clear all analysis sessions
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('analysis_session_')) {
                sessionStorage.removeItem(key);
            }
            if (key.startsWith('analysis_run_lock_')) {
                sessionStorage.removeItem(key);
            }
        });
    };

    // Auto-save analysis to IndexedDB (silent)
    const autoSaveAnalysis = async (analysisData, currentSessionId) => {
        try {
            console.log('💾 Auto-save: Preparing data...');
            
            // Get or create user ID
            let userId = localStorage.getItem('cantik_user_id');
            if (!userId) {
                console.log('💾 Auto-save: Creating user...');
                const user = await apiService.createUser({
                    email: `user_${Date.now()}@cantik.ai`,
                    username: `User${Date.now()}`
                });
                userId = user.id;
                localStorage.setItem('cantik_user_id', userId);
                console.log('✅ User created:', userId);
            }

            // Prepare complete analysis data for storage
                const dataToSave = {
                    user_id: parseInt(userId),
                    client_session_id: currentSessionId || null,
                    image_base64: state?.imageBase64 || '',
                    visualization_base64: visualizationImage || '',
                    overall_score: analysisData.overall_score || 0,
                skin_type: analysisData.skin_type || 'Unknown',
                fitzpatrick_type: analysisData.fitzpatrick_type || 'III',
                predicted_age: analysisData.predicted_age || 
                              analysisData.age_prediction?.predicted_age || 
                              25,
                analysis_version: analysisData.analysis_version || '6.0',
                engine: analysisData.engine || 'AI Analysis',
                processing_time_ms: Math.round(parseFloat(analysisData.processing_time || 0) * 1000),
                analysis_data: JSON.stringify(analysisData || {}),
                ai_insights: JSON.stringify(analysisData.ai_insights || analysisData.ai_report || {})
            };

            console.log('💾 Saving to database with complete data...');
            console.log('📊 Data to save:', {
                user_id: dataToSave.user_id,
                overall_score: dataToSave.overall_score,
                skin_type: dataToSave.skin_type,
                fitzpatrick_type: dataToSave.fitzpatrick_type,
                predicted_age: dataToSave.predicted_age,
                analysis_version: dataToSave.analysis_version,
                engine: dataToSave.engine,
                processing_time_ms: dataToSave.processing_time_ms,
                has_image: !!dataToSave.image_base64,
                has_visualization: !!dataToSave.visualization_base64
            });
            
            const savedAnalysis = await apiService.saveAnalysis(dataToSave);
            
            console.log('✅ Auto-save complete:', savedAnalysis.id);
            
            // Store in session for quick access
            const sessionKey = `analysis_session_${sessionId}`;
            sessionStorage.setItem(sessionKey, JSON.stringify({
                analysisId: savedAnalysis.id,
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            // Don't show error to user, just log it
        }
    };

    // Open analysis mode detail modal
    const openModeDetail = (mode) => {
        setSelectedMode(mode);
    };

    // Manual save function (called by user action)
    const saveAnalysisToProfile = async () => {
        if (!resultData || saving) return;
        
        setSaving(true);
        try {
            // Save to localStorage
            localStorage.setItem('lastAnalysis', Date.now().toString());
            localStorage.setItem('lastSkinScore', resultData.overall_score.toString());
            
            // Get or create user ID
            let userId = localStorage.getItem('cantik_user_id');
            if (!userId) {
                const user = await apiService.createUser({
                    email: `user_${Date.now()}@cantik.ai`,
                    username: `user_${Date.now()}`,
                    full_name: 'Guest User'
                });
                userId = user.id;
                localStorage.setItem('cantik_user_id', userId);
                console.log('✅ Created temporary user:', userId);
            }
            
            // Save analysis to database with complete data
            if (userId) {
                const dataToSave = {
                    user_id: parseInt(userId),
                    client_session_id: sessionId || null,
                    image_base64: state?.imageBase64 || '',
                    visualization_base64: visualizationImage || '',
                    overall_score: resultData.overall_score || 0,
                    skin_type: resultData.skin_type || 'Unknown',
                    fitzpatrick_type: resultData.fitzpatrick_type || 'III',
                    predicted_age: resultData.predicted_age || 
                                  resultData.age_prediction?.predicted_age || 
                                  25,
                    analysis_version: resultData.analysis_version || '6.0',
                    engine: resultData.engine || analysisEngine || 'AI Analysis',
                    processing_time_ms: Math.round(parseFloat(resultData.processing_time || 0) * 1000),
                    analysis_data: resultData,
                    ai_insights: aiInsights || null
                };
                
                const savedAnalysis = await apiService.saveAnalysis(dataToSave);
                console.log('✅ Analysis saved to database:', savedAnalysis.id);
                localStorage.setItem('last_analysis_id', savedAnalysis.id);
                alert('✓ Laporan berhasil disimpan ke profil Anda!');
            } else {
                alert('✓ Laporan disimpan secara lokal!');
            }
            
            // Clear session after save
            clearSession();
            
            setTimeout(() => navigate('/'), 500);
        } catch (error) {
            console.error('Error saving analysis:', error);
            alert('Gagal menyimpan laporan. Coba lagi nanti.');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!state?.imageBase64) {
            navigate('/');
            return;
        }

        // Initialize session ID
        const currentSessionId = getOrCreateSessionId();
        setSessionId(currentSessionId);

        // Check if coming from history (already has data)
        if (state?.fromHistory) {
            setResultData(state.resultData);
            setAiInsights(state.aiInsights);
            setAnalysisEngine(state.analysisEngine);
            
            // Show all sections immediately for historical data
            setProgress(100);
            setShowOverallScore(true);
            setShowMetrics(true);
            setShowProducts(true);
            setLoading(false);
            return;
        }

        const sessionKey = `analysis_session_${currentSessionId}`;
        const runLockKey = `analysis_run_lock_${currentSessionId}`;
        const hydrateFromSession = (serializedSessionData) => {
            try {
                console.log('📦 Loading analysis from session storage...');
                const parsed = JSON.parse(serializedSessionData);

                setResultData(parsed.resultData);
                setAiInsights(parsed.aiInsights);
                setAnalysisEngine(parsed.analysisEngine);

                // Show all sections immediately
                setProgress(100);
                setShowOverallScore(true);
                setShowMetrics(true);
                setShowProducts(true);
                setLoading(false);

                console.log('✅ Loaded from session successfully');
                return true;
            } catch (sessionError) {
                console.warn('⚠️ Session data corrupted, will re-analyze');
                sessionStorage.removeItem(sessionKey);
                return false;
            }
        };

        const sessionData = sessionStorage.getItem(sessionKey);
        if (sessionData && hydrateFromSession(sessionData)) {
            sessionStorage.removeItem(runLockKey);
            return;
        }

        const existingRunLock = sessionStorage.getItem(runLockKey);
        if (existingRunLock) {
            console.log('⏳ Analysis already running, waiting for session result...');
            const startedAt = Date.now();
            const waitInterval = window.setInterval(() => {
                const cachedData = sessionStorage.getItem(sessionKey);
                if (cachedData && hydrateFromSession(cachedData)) {
                    sessionStorage.removeItem(runLockKey);
                    window.clearInterval(waitInterval);
                    return;
                }

                if (Date.now() - startedAt > 45000) {
                    sessionStorage.removeItem(runLockKey);
                    window.clearInterval(waitInterval);
                    console.warn('⚠️ Wait lock timeout, retrying analysis...');
                    window.location.reload();
                }
            }, 350);

            return () => {
                window.clearInterval(waitInterval);
            };
        }

        sessionStorage.setItem(runLockKey, JSON.stringify({
            startedAt: Date.now(),
            sessionId: currentSessionId
        }));

        const fetchAnalysis = async (skipValidation = false) => {
            try {
                // Stage 1: Preparing (0-10%)
                setLoadingStage('Mempersiapkan analisis...');
                setProgress(5);
                await new Promise(resolve => setTimeout(resolve, 200));
                setProgress(10);

                // Stage 2: AI Analysis (10-70%) - Direct to Gemini
                setLoadingStage(' Menganalisis dengan AI Dermatology...');
                setProgress(20);
                
                console.log('🚀 Starting AI-Only Analysis...');
                const analysisResult = await analyzeSkinWithAI(state.imageBase64, skipValidation);
                
                if (!analysisResult.success) {
                    throw new Error(analysisResult.error || 'Analysis failed');
                }
                
                const analysisData = analysisResult.data;
                setProgress(60);
                
                // Stage 3: Show Overall Score IMMEDIATELY (60-70%)
                setLoadingStage('Menampilkan hasil...');
                setResultData(analysisData);
                setAiInsights(analysisData.ai_insights || analysisData.ai_report);
                setAnalysisEngine(analysisData.engine);
                setShowOverallScore(true);
                setProgress(70);
                setLoading(false); // Stop loading, show results!
                
                // Stage 3.5: Generate Visualization Image (70-75%)
                setLoadingStage('Generating visualization...');
                try {
                    const vizImage = await generateSkinAnalyzerImage(state.imageBase64, analysisData);
                    setVisualizationImage(vizImage);
                    setShowVisualization(true);
                    console.log('✅ Visualization image generated');
                } catch (vizError) {
                    console.warn('⚠️ Visualization generation failed:', vizError);
                    // Continue without visualization
                }
                setProgress(75);
                
                // Stage 4: Show 15 Analysis Modes (75-85%)
                await new Promise(resolve => setTimeout(resolve, 300));
                setShowMetrics(true);
                setProgress(85);
                
                // Stage 5: Show Action Buttons (85-100%)
                await new Promise(resolve => setTimeout(resolve, 300));
                setShowProducts(true);
                setProgress(100);
                
                // Save to session storage
                const sessionKey = `analysis_session_${currentSessionId}`;
                const sessionData = {
                    resultData: analysisData,
                    aiInsights: analysisData.ai_insights || analysisData.ai_report,
                    analysisEngine: analysisData.engine,
                    timestamp: Date.now(),
                    sessionId: currentSessionId
                };
                sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
                sessionStorage.removeItem(runLockKey);
                console.log('💾 Analysis saved to session:', currentSessionId);
                
                // Auto-save to IndexedDB
                try {
                    console.log('💾 Auto-saving analysis to IndexedDB...');
                    await autoSaveAnalysis(analysisData, currentSessionId);
                    console.log('✅ Auto-save complete');
                } catch (autoSaveError) {
                    console.warn('⚠️ Auto-save failed (silent):', autoSaveError);
                    // Silent fail - user can still manually save
                }
                
                setProgress(100);
                console.log(`✅ Analysis complete`);
            } catch (error) {
                sessionStorage.removeItem(runLockKey);
                console.error('Analysis error:', error);
                const isInvalidInput = error?.code === 'INVALID_INPUT_QUALITY'
                    || /foto.*(tidak valid|belum layak|invalid)/i.test(String(error?.message || ''));
                
                // Check if it's a minor quality issue
                const isMinorQualityIssue = isInvalidInput && (
                    /slightly|minor|sedikit|ringan/i.test(String(error?.message || ''))
                );
                
                if (isMinorQualityIssue) {
                    setError({
                        type: 'minor_quality',
                        message: error.message || 'Foto memiliki masalah kualitas minor.',
                        canRetry: true
                    });
                } else {
                    setError(
                        isInvalidInput
                            ? (error.message || 'Foto belum valid untuk analisa. Silakan ulangi scan tanpa masker/kacamata dan dengan cahaya cukup.')
                            : 'Gagal melakukan analisis. Pastikan koneksi internet stabil dan coba lagi.'
                    );
                    
                    // Auto-redirect after 3 seconds for major issues
                    setTimeout(() => {
                        navigate(isInvalidInput ? '/scan' : '/');
                    }, 3000);
                }
                
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [state, navigate]);

    // Retry function for minor quality issues
    const retryWithRelaxedValidation = async () => {
        setError(null);
        setLoading(true);
        setProgress(0);
        
        try {
            // Stage 1: Preparing (0-10%)
            setLoadingStage('Mempersiapkan analisis...');
            setProgress(5);
            await new Promise(resolve => setTimeout(resolve, 200));
            setProgress(10);

            // Stage 2: AI Analysis (10-70%) - Direct to Gemini
            setLoadingStage(' Menganalisis dengan AI Dermatology (Mode Toleran)...');
            setProgress(20);
            
            console.log('🚀 Starting AI-Only Analysis (Skip Validation)...');
            const analysisResult = await analyzeSkinWithAI(state.imageBase64, true);
            
            if (!analysisResult.success) {
                throw new Error(analysisResult.error || 'Analysis failed');
            }
            
            const analysisData = analysisResult.data;
            setProgress(60);
            
            // Stage 3: Show Overall Score IMMEDIATELY (60-70%)
            setLoadingStage('Menampilkan hasil...');
            setResultData(analysisData);
            setAiInsights(analysisData.ai_insights || analysisData.ai_report);
            setAnalysisEngine(analysisData.engine);
            setShowOverallScore(true);
            setProgress(70);
            setLoading(false); // Stop loading, show results!
            
            console.log('✅ Retry analysis complete');
        } catch (error) {
            console.error('Retry analysis error:', error);
            setError('Gagal melakukan analisis. Pastikan koneksi internet stabil dan coba lagi.');
            setLoading(false);
        }
    };

    const DetailedContentWrapper = isGuest ? LockedContent : Fragment;

    return (
        <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>

            {/* Error Toast */}
            {error && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    backgroundColor: '#ff4444',
                    color: 'white',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    maxWidth: '90vw',
                    textAlign: 'center'
                }}>
                    <div style={{ marginBottom: error?.canRetry ? '12px' : '0' }}>
                        {typeof error === 'string' ? error : error?.message}
                    </div>
                    {error?.canRetry && (
                        <button
                            onClick={retryWithRelaxedValidation}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                marginRight: '8px'
                            }}
                        >
                            🔄 Coba Tetap Analisis
                        </button>
                    )}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        ✕ Tutup
                    </button>
                </div>
            )}

            {/* Fixed Floating Progress Phase - ALWAYS visible (compact mode after loading) */}
            {progress > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    maxWidth: '600px',
                    zIndex: 1000,
                    background: loading ? 'linear-gradient(135deg, rgba(250, 246, 248, 0.98), rgba(255, 255, 255, 0.98))' : 'linear-gradient(135deg, rgba(250, 246, 248, 0.95), rgba(255, 255, 255, 0.95))',
                    backdropFilter: 'blur(20px)',
                    padding: loading ? '20px 24px' : '12px 24px',
                    boxShadow: loading ? '0 4px 30px rgba(230, 0, 126, 0.15)' : '0 2px 15px rgba(230, 0, 126, 0.1)',
                    borderBottom: '2px solid rgba(230, 0, 126, 0.1)',
                    transition: 'all 0.3s ease'
                }}>
                    {/* Phase Indicators */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: loading ? '16px' : '0', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
                        {[
                            { name: 'Kesehatan Kulit', threshold: 50, Icon: Heart },
                            { name: 'Analisis Detail', threshold: 75, Icon: ScanFace },
                            { name: 'AI Dermatology', threshold: 100, Icon: Sparkles }
                        ].map((phase, idx) => {
                            const isActive = progress >= phase.threshold;
                            const isCurrent = progress < phase.threshold && (idx === 0 || progress >= [50, 75][idx - 1]);
                            const PhaseIcon = phase.Icon;
                            
                            return (
                                <div key={idx} style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    position: 'relative'
                                }}>
                                    {/* Connector Line */}
                                    {idx > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: loading ? '20px' : '14px',
                                            right: '50%',
                                            width: '100%',
                                            height: loading ? '3px' : '2px',
                                            background: isActive ? 'var(--primary-color)' : 'rgba(157, 143, 166, 0.2)',
                                            transition: 'background 0.5s ease',
                                            zIndex: 0
                                        }} />
                                    )}
                                    
                                    {/* Phase Circle */}
                                    <div style={{
                                        width: loading ? '40px' : '28px',
                                        height: loading ? '40px' : '28px',
                                        borderRadius: '50%',
                                        background: isActive ? 'var(--primary-color)' : isCurrent ? 'rgba(230, 0, 126, 0.15)' : 'rgba(157, 143, 166, 0.08)',
                                        border: `${loading ? 3 : 2}px solid ${isActive ? 'var(--primary-color)' : isCurrent ? 'var(--primary-color)' : 'rgba(157, 143, 166, 0.3)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.5s ease',
                                        position: 'relative',
                                        zIndex: 1,
                                        animation: (loading && isCurrent) ? 'pulse 2s infinite' : 'none',
                                        boxShadow: isActive ? '0 4px 12px rgba(230, 0, 126, 0.3)' : 'none'
                                    }}>
                                        <PhaseIcon 
                                            size={loading ? 20 : 14} 
                                            color={isActive ? 'white' : isCurrent ? 'var(--primary-color)' : 'var(--text-body)'} 
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                    
                                    {/* Phase Name - Only show during loading */}
                                    {loading && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: isActive || isCurrent ? 700 : 500,
                                            color: isActive ? 'var(--primary-color)' : isCurrent ? 'var(--text-headline)' : 'var(--text-body)',
                                            marginTop: '8px',
                                            textAlign: 'center',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.3s ease',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {phase.name}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Progress Bar - Only show during loading */}
                    {loading && (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div style={{ 
                                height: '8px', 
                                background: 'rgba(230, 0, 126, 0.1)', 
                                borderRadius: '10px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, var(--primary-color), var(--primary-light))',
                                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 0 15px rgba(230, 0, 126, 0.4)',
                                    position: 'relative'
                                }}>
                                    {/* Shimmer effect */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                        animation: 'shimmer 2s infinite'
                                    }} />
                                </div>
                            </div>
                            
                            {/* Progress Text */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-body)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                                    {loadingStage}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'var(--font-display)' }}>
                                    {progress}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Spacer when progress bar is showing */}
            {progress > 0 && <div style={{ height: loading ? '140px' : '60px' }} />}

            {/* Intense Background Face Blur */}
            {state?.imageBase64 && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundImage: `url(${state.imageBase64})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(55px) brightness(1.1) saturate(1.2)',
                    transform: 'scale(1.25)',
                    zIndex: 0
                }} />
            )}

            {/* Light elegant frosted white/pink overlay tint */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(180deg, rgba(250, 246, 248, 0.85) 0%, rgba(241, 211, 226, 0.6) 100%)',
                zIndex: 0
            }} />

            <div className="screen-content" style={{ zIndex: 1, padding: '48px 24px', flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '100px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
                    <div>
                        <p style={{ color: 'var(--text-headline)', marginBottom: '0px', fontWeight: 500, fontSize: '1.2rem', opacity: 0.9 }}>Laporan</p>
                        <h1 className="headline" style={{ fontSize: 'clamp(1.8rem, 8vw, 2.4rem)', lineHeight: 1.05 }}>Kulit Anda</h1>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
                    >
                        <X size={28} color="var(--text-headline)" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Info Badge - Hidden (Backend Implementation Detail) */}

                {/* Guest Token Banner */}
                {isGuest && tokenInfo && !loading && (
                    <div style={{
                        margin: '0 0 20px',
                        background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
                        borderRadius: '16px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid rgba(255, 193, 7, 0.35)',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)'
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>🎫</span>
                        <p style={{ margin: 0, flex: 1, fontSize: '0.85rem', color: '#5f4a00', fontFamily: 'var(--font-sans)' }}>
                            <strong>Token Analisis:</strong> {tokenInfo.message}
                        </p>
                        <button
                            onClick={() => setShowLoginPrompt(true)}
                            style={{
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            Upgrade
                        </button>
                    </div>
                )}
                
                {loading ? (
                    <div className="card-glass" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                        {/* Progress Circle */}
                        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="rgba(157, 143, 166, 0.2)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="var(--primary-color)"
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 54}`}
                                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <h2 className="headline" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: 0, color: 'var(--primary-color)' }}>{progress}%</h2>
                            </div>
                        </div>
                        
                        {/* Loading Stage Text */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '8px' }}>
                                {loadingStage || 'Memproses...'}
                            </p>
                            <p className="subtitle" style={{ fontSize: '0.9rem' }}>
                                Mohon tunggu, AI sedang menganalisis kulit Anda
                            </p>
                        </div>

                        {/* Progress Steps */}
                        <div style={{ width: '100%', maxWidth: '400px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: 'Skor Kesehatan', threshold: 50 },
                                    { label: 'Visualisasi 15-Mode', threshold: 60 },
                                    { label: 'Analisis Detail', threshold: 75 },
                                    { label: 'Rekomendasi AI', threshold: 90 },
                                    { label: 'Produk Rekomendasi', threshold: 100 }
                                ].map((step, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: progress >= step.threshold ? 'var(--primary-color)' : 'rgba(157, 143, 166, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'background 0.3s ease'
                                        }}>
                                            {progress >= step.threshold && (
                                                <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: '0.9rem',
                                            color: progress >= step.threshold ? 'var(--text-headline)' : 'var(--text-body)',
                                            fontWeight: progress >= step.threshold ? 600 : 400,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Stage 1: Overall Score + Summary - COMPACT */}
                        {showOverallScore && (
                            <div style={{ animation: 'etherealFade 0.6s ease' }}>
                                <div className="card-glass" style={{ padding: `${SPACING.card}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: `${SPACING.section}px` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span className="headline" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.2rem)', color: 'var(--text-headline)', lineHeight: 1 }}>{resultData?.overall_score}<span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>%</span></span>
                                        <span style={{ fontSize: TYPOGRAPHY.body, color: 'var(--text-headline)', fontWeight: 600 }}>Kesehatan Kulit</span>
                                    </div>
                                </div>

                                <div className="card-glass" style={{ padding: `${SPACING.card}px` }}>
                                    <h3 style={{ fontSize: TYPOGRAPHY.h3, fontWeight: 600, color: 'var(--text-headline)', marginBottom: `${SPACING.element}px` }}>
                                        📊 Ringkasan Hasil
                                    </h3>
                                    
                                    {/* Data-Driven Summary - COMPACT */}
                                    <p style={{ fontSize: TYPOGRAPHY.small, color: 'var(--text-body)', lineHeight: 1.5, marginBottom: `${SPACING.element}px`, fontFamily: 'var(--font-sans)' }}>
                                        {(() => {
                                            const score = resultData?.overall_score || 0;
                                            const acneCount = resultData?.acne?.acne_count || 0;
                                            const wrinkleCount = resultData?.wrinkles?.wrinkle_count || 0;
                                            const darkSpots = resultData?.pigmentation?.dark_spot_count || 0;
                                            const priorityConcerns = resultData?.priority_concerns || [];
                                            
                                            let condition = score >= 80 ? "sangat baik" : score >= 60 ? "baik" : score >= 40 ? "cukup baik" : "memerlukan perhatian";
                                            let emoji = score >= 80 ? "✨" : score >= 60 ? "😊" : score >= 40 ? "🤔" : "⚠️";
                                            
                                            let summary = `${emoji} Kulit Anda dalam kondisi ${condition} dengan skor ${score}/100. `;
                                            
                                            const issues = [];
                                            if (acneCount > 0) issues.push(`${acneCount} jerawat`);
                                            if (wrinkleCount > 0) issues.push(`${wrinkleCount} garis halus`);
                                            if (darkSpots > 0) issues.push(`${darkSpots} bintik gelap`);
                                            
                                            if (issues.length > 0) {
                                                summary += `Terdeteksi ${issues.join(', ')}. `;
                                            }
                                            
                                            if (priorityConcerns.length > 0) {
                                                const topConcern = priorityConcerns[0];
                                                summary += `Prioritas: ${topConcern.concern} di ${topConcern.zones?.join(', ') || 'wajah'}.`;
                                            }
                                            
                                            return summary;
                                        })()}
                                    </p>
                                    
                                    {/* Breakdown Metrics - INLINE */}
                                    <div style={{ display: 'flex', gap: `${SPACING.element}px`, flexWrap: 'wrap', marginTop: `${SPACING.element}px` }}>
                                        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '8px 12px', flex: '1 1 auto', minWidth: '120px' }}>
                                            <p style={{ fontSize: TYPOGRAPHY.tiny, color: 'var(--text-body)', marginBottom: '2px' }}>Jenis Kulit</p>
                                            <p style={{ fontSize: TYPOGRAPHY.small, fontWeight: 600, color: 'var(--text-headline)', margin: 0 }}>{resultData?.skin_type || "Normal"}</p>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '8px 12px', flex: '1 1 auto', minWidth: '120px' }}>
                                            <p style={{ fontSize: TYPOGRAPHY.tiny, color: 'var(--text-body)', marginBottom: '2px' }}>Usia Kulit</p>
                                            <p style={{ fontSize: TYPOGRAPHY.small, fontWeight: 600, color: 'var(--text-headline)', margin: 0 }}>{resultData?.age_prediction?.predicted_age || 25} tahun</p>
                                        </div>
                                    </div>
                                    
                                    {/* Priority Concerns - COMPACT */}
                                    {resultData?.priority_concerns && resultData.priority_concerns.length > 0 && (
                                        <div style={{ marginTop: `${SPACING.element}px`, padding: '10px 12px', background: 'rgba(230, 0, 126, 0.06)', borderRadius: '10px', borderLeft: '3px solid var(--primary-color)' }}>
                                            <p style={{ fontSize: TYPOGRAPHY.tiny, fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px' }}>
                                                🎯 Prioritas:
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {resultData.priority_concerns.slice(0, 3).map((concern, idx) => (
                                                    <span key={idx} style={{ fontSize: TYPOGRAPHY.tiny, color: 'var(--text-body)', background: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: '6px' }}>
                                                        {concern.concern} ({concern.severity})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Detailed content: locked for guest, unlocked for logged in users */}
                        <DetailedContentWrapper
                            {...(isGuest ? {
                                onUnlock: () => setShowLoginPrompt(true),
                                title: 'Analisis Lengkap Terkunci'
                            } : {})}
                        >
                            <>
                                {/* Stage 2: Skin Analyzer Visualization */}
                                {showVisualization && visualizationImage && (
                                    <div style={{ animation: 'etherealFade 0.6s ease', marginBottom: `${SPACING.section}px` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: `${SPACING.element}px` }}>
                                            <h3 style={{ fontSize: TYPOGRAPHY.h3, fontWeight: 600, color: 'var(--text-headline)' }}>
                                                🔬 Skin Analyzer Visualization
                                            </h3>
                                            <button
                                                onClick={() => setShowOriginal(!showOriginal)}
                                                style={{
                                                    background: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    padding: '8px 16px',
                                                    fontSize: TYPOGRAPHY.small,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontFamily: 'var(--font-sans)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <ImageIcon size={16} />
                                                {showOriginal ? 'Show Analysis' : 'Show Original'}
                                            </button>
                                        </div>
                                        
                                        <div className="card-glass" style={{ padding: '12px', overflow: 'hidden' }}>
                                            <img 
                                                src={showOriginal ? state.imageBase64 : visualizationImage}
                                                alt={showOriginal ? "Original" : "Analysis"}
                                                style={{
                                                    width: '100%',
                                                    height: 'auto',
                                                    borderRadius: '12px',
                                                    display: 'block'
                                                }}
                                            />
                                            <p style={{
                                                fontSize: TYPOGRAPHY.tiny,
                                                color: 'var(--text-body)',
                                                textAlign: 'center',
                                                marginTop: '8px',
                                                fontFamily: 'var(--font-sans)'
                                            }}>
                                                {showOriginal ? '📸 Original Image' : '🔬 15 Analysis Modes Visualization'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Stage 3: 15 Analysis Modes - FROM AI REPORT */}
                                {showMetrics && aiInsights?.analysis_modes && (
                                    <div style={{ animation: 'etherealFade 0.6s ease' }}>
                                        <h3 style={{ fontSize: TYPOGRAPHY.h3, fontWeight: 600, color: 'var(--text-headline)', marginBottom: `${SPACING.element}px`, textShadow: '0 2px 10px rgba(255,255,255,0.8)' }}>
                                            🔬 15 Analysis Modes
                                        </h3>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                            gap: `${SPACING.grid}px` 
                                        }}>
                                            {aiInsights.analysis_modes.map((mode, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="card-glass" 
                                                    style={{ 
                                                        padding: '12px', 
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s ease'
                                                    }}
                                                    onClick={() => openModeDetail(mode)}
                                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: TYPOGRAPHY.tiny, fontWeight: 600, color: 'var(--text-headline)' }}>
                                                            {mode.mode}
                                                        </span>
                                                        <span style={{ 
                                                            fontSize: TYPOGRAPHY.tiny, 
                                                            fontWeight: 700, 
                                                            color: mode.score >= 80 ? '#10b981' : mode.score >= 60 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            {mode.score}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: TYPOGRAPHY.tiny, color: 'var(--text-body)', margin: 0 }}>
                                                        {mode.status}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Wawasan Tambahan - COMPACT */}
                                        <div className="card-glass" style={{ padding: '20px', marginTop: '16px' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '16px', fontFamily: 'var(--font-sans)' }}>
                                                💎 Wawasan Tambahan
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {/* Row 1 */}
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Jenis Kulit</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.skin_type || "Normal"}
                                                    </p>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Warna Kulit</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.fitzpatrick_type || "Type III"}
                                                    </p>
                                                </div>
                                                
                                                {/* Row 2 */}
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Undertone</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.skin_tone?.undertone || "Neutral"}
                                                    </p>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Usia Kulit</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.age_prediction?.predicted_age || 25} tahun
                                                    </p>
                                                </div>
                                                
                                                {/* Row 3 */}
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Hidrasi</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.hydration?.hydration_level || 0}% ({resultData?.hydration?.status || "Normal"})
                                                    </p>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Minyak</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.oiliness?.oiliness_score || 0}% ({resultData?.oiliness?.sebum_level || "Balanced"})
                                                    </p>
                                                </div>
                                                
                                                {/* Row 4 */}
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Tekstur</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.texture?.smoothness_score || 0}/100 ({resultData?.texture?.severity || "Smooth"})
                                                    </p>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '12px', borderLeft: '3px solid var(--primary-color)' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontWeight: 500 }}>Pori-pori</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                        {resultData?.pores?.pore_density || 0}/cm² ({resultData?.pores?.visibility || "Normal"})
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stage 3: AI Insights - COMPREHENSIVE DISPLAY */}
                                {showProducts && aiInsights && (
                                    <div style={{ animation: 'etherealFade 0.6s ease', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        
                                        {/* AI Summary */}
                                        {aiInsights.summary && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    📋 Ringkasan AI
                                                </h4>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                    {aiInsights.summary}
                                                </p>
                                            </div>
                                        )}

                                        {/* Main Concerns */}
                                        {aiInsights.main_concerns && aiInsights.main_concerns.length > 0 && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    🎯 Masalah Utama
                                                </h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {aiInsights.main_concerns.map((concern, idx) => (
                                                        <span key={idx} style={{ 
                                                            fontSize: '0.8rem', 
                                                            color: 'var(--primary-color)', 
                                                            background: 'rgba(230, 0, 126, 0.1)', 
                                                            padding: '6px 12px', 
                                                            borderRadius: '20px',
                                                            fontWeight: 500,
                                                            fontFamily: 'var(--font-sans)'
                                                        }}>
                                                            {concern}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Skin Type Analysis */}
                                        {aiInsights.skin_type_analysis && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    🔬 Analisis Jenis Kulit
                                                </h4>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-sans)' }}>
                                                    {aiInsights.skin_type_analysis}
                                                </p>
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        {aiInsights.recommendations && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    ✨ Rekomendasi Perawatan
                                                </h4>
                                                
                                                {/* Immediate Actions */}
                                                {aiInsights.recommendations.immediate_actions && aiInsights.recommendations.immediate_actions.length > 0 && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
                                                            🚀 Tindakan Segera
                                                        </h5>
                                                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                            {aiInsights.recommendations.immediate_actions.map((action, idx) => (
                                                                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                                                                    {action}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Long-term Goals */}
                                                {aiInsights.recommendations.long_term_goals && aiInsights.recommendations.long_term_goals.length > 0 && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
                                                            🎯 Target Jangka Panjang
                                                        </h5>
                                                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                            {aiInsights.recommendations.long_term_goals.map((goal, idx) => (
                                                                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                                                                    {goal}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Lifestyle Tips */}
                                                {aiInsights.recommendations.lifestyle_tips && aiInsights.recommendations.lifestyle_tips.length > 0 && (
                                                    <div>
                                                        <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
                                                            🌟 Tips Gaya Hidup
                                                        </h5>
                                                        <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                            {aiInsights.recommendations.lifestyle_tips.map((tip, idx) => (
                                                                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                                                                    {tip}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Product Recommendations */}
                                        {aiInsights.product_recommendations && aiInsights.product_recommendations.length > 0 && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    🛍️ Rekomendasi Produk
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {aiInsights.product_recommendations.map((product, idx) => (
                                                        <div key={idx} style={{ 
                                                            background: 'rgba(255,255,255,0.6)', 
                                                            borderRadius: '12px', 
                                                            padding: '12px',
                                                            border: '1px solid rgba(230, 0, 126, 0.1)'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                                <h6 style={{ 
                                                                    fontSize: '0.9rem', 
                                                                    fontWeight: 600, 
                                                                    color: 'var(--text-headline)', 
                                                                    margin: 0,
                                                                    fontFamily: 'var(--font-sans)',
                                                                    flex: 1
                                                                }}>
                                                                    {product.name}
                                                                </h6>
                                                                <span style={{ 
                                                                    fontSize: '0.7rem', 
                                                                    color: 'var(--primary-color)', 
                                                                    background: 'rgba(230, 0, 126, 0.1)', 
                                                                    padding: '4px 8px', 
                                                                    borderRadius: '10px',
                                                                    fontWeight: 500,
                                                                    marginLeft: '8px'
                                                                }}>
                                                                    {product.category}
                                                                </span>
                                                            </div>
                                                            <p style={{ 
                                                                fontSize: '0.8rem', 
                                                                color: 'var(--text-body)', 
                                                                lineHeight: 1.5, 
                                                                margin: '0 0 8px 0',
                                                                fontFamily: 'var(--font-sans)'
                                                            }}>
                                                                {product.reason}
                                                            </p>
                                                            {product.addresses && product.addresses.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                    {product.addresses.map((address, addressIdx) => (
                                                                        <span key={addressIdx} style={{ 
                                                                            fontSize: '0.7rem', 
                                                                            color: 'var(--text-body)', 
                                                                            background: 'rgba(157, 143, 166, 0.1)', 
                                                                            padding: '2px 6px', 
                                                                            borderRadius: '8px'
                                                                        }}>
                                                                            {address}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {product.slug && (
                                                                <button
                                                                    onClick={() => navigate(`/products/${product.slug}`)}
                                                                    style={{
                                                                        marginTop: '8px',
                                                                        background: 'var(--primary-color)',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '8px',
                                                                        padding: '6px 12px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        fontFamily: 'var(--font-sans)'
                                                                    }}
                                                                >
                                                                    Lihat Detail
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Skincare Routine */}
                                        {aiInsights.skincare_routine && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    🌅 Rutinitas Skincare
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    {/* Morning Routine */}
                                                    {aiInsights.skincare_routine.morning && (
                                                        <div style={{ 
                                                            background: 'rgba(255,255,255,0.6)', 
                                                            borderRadius: '12px', 
                                                            padding: '12px',
                                                            border: '1px solid rgba(255, 193, 7, 0.2)'
                                                        }}>
                                                            <h5 style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: 600, 
                                                                color: 'var(--text-headline)', 
                                                                marginBottom: '8px',
                                                                fontFamily: 'var(--font-sans)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                ☀️ Pagi
                                                            </h5>
                                                            <ol style={{ paddingLeft: '16px', margin: 0 }}>
                                                                {aiInsights.skincare_routine.morning.map((step, idx) => (
                                                                    <li key={idx} style={{ 
                                                                        fontSize: '0.8rem', 
                                                                        color: 'var(--text-body)', 
                                                                        lineHeight: 1.5, 
                                                                        marginBottom: '4px',
                                                                        fontFamily: 'var(--font-sans)'
                                                                    }}>
                                                                        {step}
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}

                                                    {/* Evening Routine */}
                                                    {aiInsights.skincare_routine.evening && (
                                                        <div style={{ 
                                                            background: 'rgba(255,255,255,0.6)', 
                                                            borderRadius: '12px', 
                                                            padding: '12px',
                                                            border: '1px solid rgba(75, 85, 99, 0.2)'
                                                        }}>
                                                            <h5 style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: 600, 
                                                                color: 'var(--text-headline)', 
                                                                marginBottom: '8px',
                                                                fontFamily: 'var(--font-sans)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                🌙 Malam
                                                            </h5>
                                                            <ol style={{ paddingLeft: '16px', margin: 0 }}>
                                                                {aiInsights.skincare_routine.evening.map((step, idx) => (
                                                                    <li key={idx} style={{ 
                                                                        fontSize: '0.8rem', 
                                                                        color: 'var(--text-body)', 
                                                                        lineHeight: 1.5, 
                                                                        marginBottom: '4px',
                                                                        fontFamily: 'var(--font-sans)'
                                                                    }}>
                                                                        {step}
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legacy sections for backward compatibility */}
                                        {/* Key Insights */}
                                        {aiInsights.key_insights && aiInsights.key_insights.length > 0 && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    💡 Key Insights
                                                </h4>
                                                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                    {aiInsights.key_insights.map((insight, idx) => (
                                                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                                                            {insight}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Legacy Recommendations (if different structure) */}
                                        {!aiInsights.recommendations && aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    ✨ Recommendations
                                                </h4>
                                                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                    {aiInsights.recommendations.map((rec, idx) => (
                                                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Legacy Lifestyle Tips (if different structure) */}
                                        {!aiInsights.recommendations?.lifestyle_tips && aiInsights.lifestyle_tips && aiInsights.lifestyle_tips.length > 0 && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    🌟 Lifestyle Tips
                                                </h4>
                                                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                                    {aiInsights.lifestyle_tips.map((tip, idx) => (
                                                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                                                            {tip}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Timeline */}
                                        {aiInsights.timeline && (
                                            <div className="card-glass" style={{ padding: '16px' }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                                    📅 Timeline Perbaikan
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {aiInsights.timeline.week_1_2 && (
                                                        <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '10px', padding: '10px' }}>
                                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Minggu 1-2</p>
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0, fontFamily: 'var(--font-sans)' }}>{aiInsights.timeline.week_1_2}</p>
                                                        </div>
                                                    )}
                                                    {aiInsights.timeline.week_4_6 && (
                                                        <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '10px', padding: '10px' }}>
                                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Minggu 4-6</p>
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0, fontFamily: 'var(--font-sans)' }}>{aiInsights.timeline.week_4_6}</p>
                                                        </div>
                                                    )}
                                                    {aiInsights.timeline.month_3_plus && (
                                                        <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '10px', padding: '10px' }}>
                                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Bulan 3+</p>
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0, fontFamily: 'var(--font-sans)' }}>{aiInsights.timeline.month_3_plus}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Stage 4: Action Buttons */}
                                {showProducts && (
                                    <div style={{ animation: 'etherealFade 0.6s ease', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Button 1: Lihat Semua Rekomendasi Produk */}
                                        <button
                                            onClick={() => navigate('/recommendations', { state: { resultData, aiInsights, backendRecommendations: resultData?.product_recommendations } })}
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--primary-color)',
                                                border: '2px solid var(--primary-color)',
                                                borderRadius: '20px',
                                                padding: '16px 24px',
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                width: '100%',
                                                cursor: 'pointer',
                                                fontFamily: 'var(--font-sans)',
                                                transition: 'all 0.3s ease',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'var(--primary-color)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'var(--primary-color)';
                                            }}
                                        >
                                            Lihat Semua Rekomendasi Produk
                                            <MoveUpRight size={20} />
                                        </button>

                                        {/* Button 2: Simpan Laporan ke Profil */}
                                        <button
                                            onClick={saveAnalysisToProfile}
                                            disabled={saving}
                                            style={{
                                                background: saving ? 'rgba(230, 0, 126, 0.5)' : 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '20px',
                                                padding: '16px 24px',
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: '12px',
                                                boxShadow: '0 10px 25px rgba(89, 54, 69, 0.25)',
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                opacity: saving ? 0.7 : 1,
                                                fontFamily: 'var(--font-sans)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {saving ? 'Menyimpan...' : 'Simpan Laporan ke Profil'}
                                            {!saving && <MoveUpRight size={20} color="white" />}
                                        </button>
                                    </div>
                                )}
                            </>
                        </DetailedContentWrapper>

                    </div>
                )}

            </div>
            
            {/* Analysis Mode Detail Modal */}
            {selectedMode && (
                <AnalysisModeModal
                    mode={selectedMode}
                    onClose={() => setSelectedMode(null)}
                />
            )}

            {/* Login Prompt Modal */}
            {showLoginPrompt && (
                <LoginPrompt
                    message="Login untuk melihat analisis lengkap dan menyimpan riwayat"
                    feature="Analisis Lengkap"
                    onClose={() => setShowLoginPrompt(false)}
                />
            )}
            
            {/* Animation Styles */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes pulse {
                    0%, 100% { 
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(230, 0, 126, 0.4);
                    }
                    50% { 
                        transform: scale(1.05);
                        box-shadow: 0 0 0 10px rgba(230, 0, 126, 0);
                    }
                }
            `}</style>
            
            <BottomNav />
        </div>
    );

};

export default AnalysisResult;
