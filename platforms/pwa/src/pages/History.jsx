import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Trash2, Eye, AlertCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import LoginPrompt from '../components/LoginPrompt';
import apiService from '../services/api';
import { isAuthenticated, isGuestSession } from '../utils/auth';

const History = () => {
    const navigate = useNavigate();
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [showClearButton, setShowClearButton] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    useEffect(() => {
        // Check if user is authenticated
        if (!isAuthenticated() || isGuestSession()) {
            setShowLoginPrompt(true);
            setLoading(false);
            return;
        }
        
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const userId = localStorage.getItem('cantik_user_id');
            
            if (!userId) {
                setError('Belum ada riwayat analisis. Silakan lakukan scan wajah terlebih dahulu.');
                setLoading(false);
                return;
            }

            // Get analyses from database
            const userIdInt = parseInt(userId, 10);
            const userAnalyses = await apiService.getAnalysisByUserId(userIdInt);
            
            console.log('📊 Fetched analyses:', userAnalyses.length);
            console.log('📊 User ID:', userIdInt);
            
            // Filter out invalid data
            const realAnalyses = userAnalyses.filter(analysis => {
                // Check if it's real data with proper structure
                const hasCvMetrics = analysis.cv_metrics && typeof analysis.cv_metrics === 'object';
                const hasVisionAnalysis = analysis.vision_analysis && typeof analysis.vision_analysis === 'object';
                const hasValidScore = analysis.overall_score !== undefined && analysis.overall_score !== null && analysis.overall_score > 0;
                const hasValidSkinType = analysis.skin_type && analysis.skin_type !== 'Unknown';
                
                // New data should have analysis_version or engine
                const hasMetadata = analysis.analysis_version || analysis.engine;
                
                const hasRealData = (hasCvMetrics || hasVisionAnalysis) && hasValidScore && hasValidSkinType;
                
                if (!hasRealData) {
                    console.warn('⚠️ Skipping invalid data:', analysis.id, {
                        hasCvMetrics,
                        hasVisionAnalysis,
                        hasValidScore,
                        hasValidSkinType,
                        hasMetadata
                    });
                }
                
                return hasRealData;
            });
            
            console.log('✅ Valid analyses:', realAnalyses.length);
            
            // Transform data to match expected format
            const transformedAnalyses = realAnalyses.map(analysis => ({
                id: analysis.id,
                overall_score: analysis.overall_score,
                skin_type: analysis.skin_type,
                predicted_age: analysis.predicted_age || 
                              analysis.vision_analysis?.age_prediction?.predicted_age || 
                              analysis.cv_metrics?.age_prediction?.predicted_age || 
                              25,
                fitzpatrick_type: analysis.fitzpatrick_type || 'III',
                analysis_version: analysis.analysis_version || 'N/A',
                engine: analysis.engine || 'AI Analysis',
                created_at: analysis.created_at
            }));
            
            // Sort by date (newest first)
            transformedAnalyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setAnalyses(transformedAnalyses);
            
            // Show clear button if there are invalid data
            const hasInvalidData = userAnalyses.length > realAnalyses.length;
            setShowClearButton(hasInvalidData);
            
            if (hasInvalidData) {
                console.warn(`⚠️ Found ${userAnalyses.length - realAnalyses.length} invalid data entries`);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            setError('Terjadi kesalahan saat memuat riwayat');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (analysisId) => {
        if (!confirm('Hapus analisis ini?')) return;

        setDeleting(analysisId);
        try {
            await apiService.deleteAnalysis(analysisId);
            setAnalyses(analyses.filter(a => a.id !== analysisId));
        } catch (err) {
            console.error('Error deleting analysis:', err);
            alert('Terjadi kesalahan');
        } finally {
            setDeleting(null);
        }
    };

    const handleClearMockupData = async () => {
        if (!confirm('Hapus semua data tidak valid? Data analisis valid Anda akan tetap aman.')) return;

        try {
            const userId = localStorage.getItem('cantik_user_id');
            if (!userId) return;

            const userIdInt = parseInt(userId, 10);
            const allAnalyses = await apiService.getAnalysisByUserId(userIdInt);
            
            // Delete invalid data
            for (const analysis of allAnalyses) {
                const hasCvMetrics = analysis.cv_metrics && typeof analysis.cv_metrics === 'object';
                const hasVisionAnalysis = analysis.vision_analysis && typeof analysis.vision_analysis === 'object';
                const hasValidScore = analysis.overall_score !== undefined && analysis.overall_score !== null && analysis.overall_score > 0;
                const hasValidSkinType = analysis.skin_type && analysis.skin_type !== 'Unknown';
                
                const hasRealData = (hasCvMetrics || hasVisionAnalysis) && hasValidScore && hasValidSkinType;
                
                if (!hasRealData) {
                    await apiService.deleteAnalysis(analysis.id);
                    console.log('🗑️ Deleted invalid data:', analysis.id);
                }
            }
            
            // Refresh
            fetchHistory();
            alert('✅ Data tidak valid berhasil dihapus!');
        } catch (err) {
            console.error('Error clearing invalid data:', err);
            alert('Terjadi kesalahan');
        }
    };

    const handleViewDetail = async (analysisId) => {
        try {
            const analysis = await apiService.getAnalysisById(analysisId);
            
            if (analysis) {
                // Reconstruct analysis_data from database columns
                const analysisData = {
                    overall_score: analysis.overall_score,
                    skin_type: analysis.skin_type,
                    fitzpatrick_type: analysis.fitzpatrick_type,
                    predicted_age: analysis.predicted_age,
                    engine: analysis.engine,
                    analysis_version: analysis.analysis_version,
                    processing_time: analysis.processing_time_ms,
                    ...analysis.vision_analysis,
                    ...analysis.cv_metrics
                };
                
                // Navigate to result page with analysis data
                navigate('/result', { 
                    state: { 
                        fromHistory: true,
                        imageBase64: analysis.image_url,
                        resultData: analysisData,
                        aiInsights: analysis.ai_insights,
                        analysisEngine: analysis.engine || 'AI Analysis'
                    } 
                });
            }
        } catch (err) {
            console.error('Error loading analysis:', err);
            alert('Gagal memuat detail analisis');
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#4ade80';
        if (score >= 60) return '#fbbf24';
        if (score >= 40) return '#fb923c';
        return '#ef4444';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Sangat Baik';
        if (score >= 60) return 'Baik';
        if (score >= 40) return 'Sedang';
        return 'Perlu Perhatian';
    };

    // Show login prompt for guest users
    if (showLoginPrompt) {
        return (
            <div className="app-container">
                <LoginPrompt
                    message="Riwayat analisis hanya tersedia untuk pengguna yang sudah login. Login untuk menyimpan dan melihat riwayat analisis Anda."
                    feature="Riwayat"
                    onClose={() => navigate('/')}
                />
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="screen-content" style={{ padding: '24px', paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={20} color="var(--text-headline)" />
                    </button>
                    <div style={{ flex: 1 }}>
                        <h1 className="headline" style={{ fontSize: '2.5rem', margin: 0 }}>Riwayat</h1>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginTop: '4px' }}>
                            {analyses.length} analisis tersimpan
                        </p>
                    </div>
                    {showClearButton && (
                        <button
                            onClick={handleClearMockupData}
                            style={{
                                padding: '8px 16px',
                                background: '#fee',
                                color: '#c53030',
                                border: '1px solid #fcc',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Clear Invalid
                        </button>
                    )}

                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                        <p style={{ color: 'var(--text-body)' }}>Memuat riwayat...</p>
                    </div>
                ) : error ? (
                    <div className="card-glass" style={{ padding: '40px 24px', textAlign: 'center' }}>
                        <AlertCircle size={48} color="#fb923c" style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '1rem', color: 'var(--text-headline)', marginBottom: '20px' }}>
                            {error}
                        </p>
                        <button
                            onClick={() => navigate('/scanner')}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Mulai Scan Wajah
                        </button>
                    </div>
                ) : analyses.length === 0 ? (
                    <div className="card-glass" style={{ padding: '40px 24px', textAlign: 'center' }}>
                        <Calendar size={48} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '8px' }}>
                            Belum Ada Riwayat
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: '20px' }}>
                            Lakukan analisis kulit pertama Anda untuk melihat riwayat
                        </p>
                        <button
                            onClick={() => navigate('/scanner')}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Mulai Scan Wajah
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {analyses.map((analysis) => (
                            <div
                                key={analysis.id}
                                className="card-glass"
                                style={{ padding: '20px', position: 'relative' }}
                            >
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    {/* Score Circle */}
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            background: `conic-gradient(${getScoreColor(analysis.overall_score)} ${analysis.overall_score * 3.6}deg, rgba(157, 143, 166, 0.2) 0deg)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: '50%',
                                                background: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: getScoreColor(analysis.overall_score) }}>
                                                {analysis.overall_score}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-body)' }}>
                                                {getScoreLabel(analysis.overall_score)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Calendar size={16} color="var(--text-body)" />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                                                {new Date(analysis.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '2px' }}>
                                                    Jenis Kulit
                                                </p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                                                    {analysis.skin_type || 'Normal'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    <button
                                        onClick={() => handleViewDetail(analysis.id)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Eye size={16} />
                                        Lihat Detail
                                    </button>
                                    <button
                                        onClick={() => handleDelete(analysis.id)}
                                        disabled={deleting === analysis.id}
                                        style={{
                                            padding: '10px 16px',
                                            background: deleting === analysis.id ? '#fcc' : '#fee',
                                            color: '#c53030',
                                            border: '1px solid #fcc',
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            cursor: deleting === analysis.id ? 'not-allowed' : 'pointer',
                                            opacity: deleting === analysis.id ? 0.6 : 1
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default History;
