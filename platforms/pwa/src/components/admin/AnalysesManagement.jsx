import React, { useEffect, useMemo, useState } from 'react';
import { Search, Eye, Trash2, X, Heart, Droplet, Sun, Wind, Sparkles, AlertCircle } from 'lucide-react';
import apiService from '../../services/api';

const fieldStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(157, 90, 118, 0.2)',
    background: 'rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s'
};

const cardStyle = {
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.95)',
    boxShadow: '0 10px 40px rgba(89,54,69,0.08)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    overflow: 'hidden'
};

const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ca8a04';
    if (score >= 40) return '#ea580c';
    return '#dc2626';
};

const getScoreGrade = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Care';
    return 'Needs Attention';
};

const AnalysesManagement = () => {
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    const fetchAnalyses = async () => {
        try {
            const data = await apiService.getAllAnalyses();
            setAnalyses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch analyses failed:', error);
            alert(error.message || 'Gagal memuat analyses');
            setAnalyses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalyses();
    }, []);

    const filteredAnalyses = useMemo(() => {
        const term = search.toLowerCase();
        return analyses.filter((analysis) => {
            const haystack = `${analysis.username || ''} ${analysis.user_email || ''} ${analysis.skin_type || ''}`.toLowerCase();
            return haystack.includes(term);
        });
    }, [analyses, search]);

    const viewDetail = async (id) => {
        try {
            const detail = await apiService.getAdminAnalysisById(id);
            setSelectedAnalysis(detail);
            setShowDetail(true);
        } catch (error) {
            console.error('Fetch analysis detail failed:', error);
            alert(error.message || 'Gagal memuat detail analysis');
        }
    };

    const deleteAnalysis = async (id) => {
        if (!window.confirm('Hapus analysis ini?')) return;
        try {
            await apiService.deleteAdminAnalysis(id);
            setAnalyses((prev) => prev.filter((item) => item.id !== id));
            if (selectedAnalysis?.id === id) {
                setShowDetail(false);
                setSelectedAnalysis(null);
            }
        } catch (error) {
            console.error('Delete analysis failed:', error);
            alert(error.message || 'Gagal menghapus analysis');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    border: '4px solid rgba(157, 90, 118, 0.2)',
                    borderTop: '4px solid var(--primary-color)',
                    borderRadius: '50%',
                    margin: '0 auto 20px',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: 'var(--text-body)', fontSize: '0.95rem' }}>Loading analyses...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Sparkles size={28} color="var(--primary-color)" />
                    <h2 style={{ fontSize: '1.75rem', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                        Skin Analyses
                    </h2>
                </div>
                <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', margin: 0 }}>
                    {filteredAnalyses.length} total analyses • View detailed skin reports
                </p>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px', position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by user, email, or skin type..."
                    style={{ ...fieldStyle, paddingLeft: '48px' }}
                />
            </div>

            {/* Grid Layout */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
            }}>
                {filteredAnalyses.map((analysis) => {
                    const score = Number(analysis.overall_score || 0);
                    const scoreColor = getScoreColor(score);
                    
                    // Handle image URL - could be base64, full URL, or file path
                    let imageUrl = '';
                    if (analysis.image_url) {
                        if (analysis.image_url.startsWith('data:')) {
                            // Base64 image
                            imageUrl = analysis.image_url;
                        } else if (analysis.image_url.startsWith('http')) {
                            // Full URL
                            imageUrl = analysis.image_url;
                        } else if (analysis.image_url.startsWith('/')) {
                            // Path starting with /
                            imageUrl = `http://localhost:8000${analysis.image_url}`;
                        } else {
                            // Relative path
                            imageUrl = `http://localhost:8000/${analysis.image_url}`;
                        }
                    }
                    
                    console.log('Analysis ID:', analysis.id, 'Image URL:', imageUrl.substring(0, 50), 'Original:', analysis.image_url?.substring(0, 50));
                    
                    return (
                        <div key={analysis.id} style={{
                            ...cardStyle,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            position: 'relative'
                        }}
                        onClick={() => viewDetail(analysis.id)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 15px 50px rgba(89,54,69,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(89,54,69,0.08)';
                        }}
                        >
                            {/* Image */}
                            <div style={{ 
                                width: '100%', 
                                height: '240px', 
                                overflow: 'hidden',
                                position: 'relative',
                                background: 'rgba(157, 90, 118, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {analysis.image_url ? (
                                    <>
                                        <img 
                                            src={imageUrl}
                                            alt="Analysis" 
                                            style={{ 
                                                width: '100%', 
                                                height: '100%', 
                                                objectFit: 'cover'
                                            }}
                                            onError={(e) => {
                                                console.error('Image failed to load:', imageUrl);
                                            }}
                                        />
                                        {/* Score Badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'rgba(255,255,255,0.95)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            zIndex: 10
                                        }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                                                {score}%
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-body)', marginTop: '2px' }}>
                                                {getScoreGrade(score)}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ color: 'var(--text-body)', fontSize: '0.9rem' }}>
                                        No image available
                                    </div>
                                )}
                            </div>
                            
                            {/* Content */}
                            <div style={{ padding: '16px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <h3 style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: 600, 
                                        color: 'var(--text-headline)', 
                                        marginBottom: '4px',
                                        fontFamily: 'var(--font-serif)'
                                    }}>
                                        {analysis.username || 'Unknown User'}
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0 }}>
                                        {analysis.user_email || 'No email'}
                                    </p>
                                </div>

                                {/* Metrics */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr', 
                                    gap: '8px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ 
                                        background: 'rgba(157, 90, 118, 0.05)', 
                                        padding: '8px 12px', 
                                        borderRadius: '10px',
                                        border: '1px solid rgba(157, 90, 118, 0.1)'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '2px' }}>
                                            Skin Type
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                                            {analysis.skin_type || 'Unknown'}
                                        </div>
                                    </div>
                                </div>

                                {/* Date & Actions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-body)' }}>
                                        {new Date(analysis.created_at).toLocaleDateString('id-ID', { 
                                            day: 'numeric', 
                                            month: 'short', 
                                            year: 'numeric' 
                                        })}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteAnalysis(analysis.id);
                                        }}
                                        style={{
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            borderRadius: '8px',
                                            background: 'rgba(239,68,68,0.1)',
                                            color: '#dc2626',
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.85rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredAnalyses.length === 0 && (
                <div style={{ 
                    ...cardStyle, 
                    padding: '60px 20px', 
                    textAlign: 'center' 
                }}>
                    <AlertCircle size={48} color="var(--text-body)" style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-body)', fontSize: '1rem', margin: 0 }}>
                        No analyses found
                    </p>
                </div>
            )}

            {/* Detail Modal */}
            {showDetail && selectedAnalysis && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(30, 20, 26, 0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px',
                    overflowY: 'auto'
                }}>
                    <div style={{ 
                        ...cardStyle, 
                        width: '100%', 
                        maxWidth: '900px', 
                        maxHeight: '90vh', 
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{ 
                            padding: '24px', 
                            borderBottom: '1px solid rgba(157, 90, 118, 0.1)',
                            position: 'sticky',
                            top: 0,
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(20px)',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ 
                                        fontSize: '1.75rem', 
                                        fontWeight: 600, 
                                        color: 'var(--text-headline)', 
                                        marginBottom: '8px',
                                        fontFamily: 'var(--font-serif)'
                                    }}>
                                        Skin Analysis Report
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.95rem', color: 'var(--text-body)' }}>
                                            {selectedAnalysis.username || selectedAnalysis.user_email || 'Unknown User'}
                                        </span>
                                        <span style={{ 
                                            fontSize: '0.85rem', 
                                            color: 'var(--text-body)',
                                            padding: '4px 12px',
                                            background: 'rgba(157, 90, 118, 0.1)',
                                            borderRadius: '8px'
                                        }}>
                                            {new Date(selectedAnalysis.created_at).toLocaleDateString('id-ID', { 
                                                day: 'numeric', 
                                                month: 'long', 
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetail(false)}
                                    style={{
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        background: 'rgba(157, 90, 118, 0.1)',
                                        color: 'var(--primary-color)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {/* Images */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: (selectedAnalysis.image_url && selectedAnalysis.visualization_url) ? '1fr 1fr' : '1fr',
                                gap: '16px', 
                                marginBottom: '24px' 
                            }}>
                                {selectedAnalysis.image_url && (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={selectedAnalysis.image_url}
                                            alt="Original"
                                            style={{ 
                                                width: '100%', 
                                                borderRadius: '16px', 
                                                border: '2px solid rgba(157,90,118,0.15)',
                                                boxShadow: '0 8px 24px rgba(89,54,69,0.1)',
                                                display: 'block'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            left: '12px',
                                            background: 'rgba(255,255,255,0.95)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            color: 'var(--text-headline)'
                                        }}>
                                            Original Photo
                                        </div>
                                    </div>
                                )}
                                {selectedAnalysis.visualization_url && (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={selectedAnalysis.visualization_url}
                                            alt="Analysis"
                                            style={{ 
                                                width: '100%', 
                                                borderRadius: '16px', 
                                                border: '2px solid rgba(157,90,118,0.15)',
                                                boxShadow: '0 8px 24px rgba(89,54,69,0.1)',
                                                display: 'block'
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            left: '12px',
                                            background: 'rgba(157, 90, 118, 0.95)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            color: 'white'
                                        }}>
                                            AI Analysis
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Overall Score - Prominent */}
                            <div style={{
                                background: `linear-gradient(135deg, ${getScoreColor(Number(selectedAnalysis.overall_score || 0))}15, ${getScoreColor(Number(selectedAnalysis.overall_score || 0))}05)`,
                                border: `2px solid ${getScoreColor(Number(selectedAnalysis.overall_score || 0))}30`,
                                borderRadius: '20px',
                                padding: '32px',
                                marginBottom: '24px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: '8px', fontWeight: 500 }}>
                                    Overall Skin Health Score
                                </div>
                                <div style={{ 
                                    fontSize: '4rem', 
                                    fontWeight: 700, 
                                    color: getScoreColor(Number(selectedAnalysis.overall_score || 0)),
                                    lineHeight: 1,
                                    marginBottom: '8px',
                                    fontFamily: 'var(--font-serif)'
                                }}>
                                    {Number(selectedAnalysis.overall_score || 0)}%
                                </div>
                                <div style={{ 
                                    fontSize: '1.1rem', 
                                    fontWeight: 600, 
                                    color: getScoreColor(Number(selectedAnalysis.overall_score || 0))
                                }}>
                                    {getScoreGrade(Number(selectedAnalysis.overall_score || 0))}
                                </div>
                            </div>

                            {/* Key Metrics */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    border: '1px solid rgba(157, 90, 118, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Droplet size={20} color="var(--primary-color)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 500 }}>
                                            Skin Type
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                                        {selectedAnalysis.skin_type || 'Unknown'}
                                    </div>
                                </div>

                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    border: '1px solid rgba(157, 90, 118, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Sun size={20} color="var(--primary-color)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 500 }}>
                                            Fitzpatrick Type
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                                        Type {selectedAnalysis.fitzpatrick_type || 'III'}
                                    </div>
                                </div>

                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    border: '1px solid rgba(157, 90, 118, 0.15)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Heart size={20} color="var(--primary-color)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 500 }}>
                                            Predicted Age
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                                        {selectedAnalysis.predicted_age || '-'} years
                                    </div>
                                </div>
                            </div>

                            {/* AI Insights */}
                            {selectedAnalysis.ai_insights && (() => {
                                const insights = typeof selectedAnalysis.ai_insights === 'string' 
                                    ? JSON.parse(selectedAnalysis.ai_insights) 
                                    : selectedAnalysis.ai_insights;
                                
                                return (
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        border: '1px solid rgba(157, 90, 118, 0.15)',
                                        borderRadius: '16px',
                                        padding: '24px'
                                    }}>
                                        <h3 style={{ 
                                            fontSize: '1.25rem', 
                                            fontWeight: 600, 
                                            color: 'var(--text-headline)', 
                                            marginBottom: '20px',
                                            fontFamily: 'var(--font-serif)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <Sparkles size={24} color="var(--primary-color)" />
                                            AI Dermatology Insights
                                        </h3>
                                        
                                        {/* Summary */}
                                        {insights.summary && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <h4 style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 600, 
                                                    color: 'var(--primary-color)', 
                                                    marginBottom: '8px' 
                                                }}>
                                                    Summary
                                                </h4>
                                                <p style={{ 
                                                    fontSize: '0.95rem', 
                                                    color: 'var(--text-headline)', 
                                                    lineHeight: 1.6,
                                                    margin: 0
                                                }}>
                                                    {insights.summary}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Main Concerns */}
                                        {insights.main_concerns && Array.isArray(insights.main_concerns) && insights.main_concerns.length > 0 && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <h4 style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 600, 
                                                    color: 'var(--primary-color)', 
                                                    marginBottom: '12px' 
                                                }}>
                                                    Main Concerns
                                                </h4>
                                                <ul style={{ 
                                                    margin: 0, 
                                                    paddingLeft: '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    {insights.main_concerns.map((concern, idx) => (
                                                        <li key={idx} style={{ 
                                                            fontSize: '0.95rem', 
                                                            color: 'var(--text-headline)', 
                                                            lineHeight: 1.6 
                                                        }}>
                                                            {concern}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {/* Recommendations */}
                                        {insights.recommendations && (
                                            <div>
                                                <h4 style={{ 
                                                    fontSize: '1rem', 
                                                    fontWeight: 600, 
                                                    color: 'var(--primary-color)', 
                                                    marginBottom: '12px' 
                                                }}>
                                                    Recommendations
                                                </h4>
                                                
                                                {/* Lifestyle Tips */}
                                                {insights.recommendations.lifestyle_tips && Array.isArray(insights.recommendations.lifestyle_tips) && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <h5 style={{ 
                                                            fontSize: '0.9rem', 
                                                            fontWeight: 600, 
                                                            color: 'var(--text-body)', 
                                                            marginBottom: '8px' 
                                                        }}>
                                                            Lifestyle Tips
                                                        </h5>
                                                        <ul style={{ 
                                                            margin: 0, 
                                                            paddingLeft: '20px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}>
                                                            {insights.recommendations.lifestyle_tips.map((tip, idx) => (
                                                                <li key={idx} style={{ 
                                                                    fontSize: '0.9rem', 
                                                                    color: 'var(--text-headline)', 
                                                                    lineHeight: 1.5 
                                                                }}>
                                                                    {tip}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {/* Long Term Goals */}
                                                {insights.recommendations.long_term_goals && Array.isArray(insights.recommendations.long_term_goals) && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <h5 style={{ 
                                                            fontSize: '0.9rem', 
                                                            fontWeight: 600, 
                                                            color: 'var(--text-body)', 
                                                            marginBottom: '8px' 
                                                        }}>
                                                            Long Term Goals
                                                        </h5>
                                                        <ul style={{ 
                                                            margin: 0, 
                                                            paddingLeft: '20px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}>
                                                            {insights.recommendations.long_term_goals.map((goal, idx) => (
                                                                <li key={idx} style={{ 
                                                                    fontSize: '0.9rem', 
                                                                    color: 'var(--text-headline)', 
                                                                    lineHeight: 1.5 
                                                                }}>
                                                                    {goal}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {/* Immediate Actions */}
                                                {insights.recommendations.immediate_actions && Array.isArray(insights.recommendations.immediate_actions) && (
                                                    <div>
                                                        <h5 style={{ 
                                                            fontSize: '0.9rem', 
                                                            fontWeight: 600, 
                                                            color: 'var(--text-body)', 
                                                            marginBottom: '8px' 
                                                        }}>
                                                            Immediate Actions
                                                        </h5>
                                                        <ul style={{ 
                                                            margin: 0, 
                                                            paddingLeft: '20px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}>
                                                            {insights.recommendations.immediate_actions.map((action, idx) => (
                                                                <li key={idx} style={{ 
                                                                    fontSize: '0.9rem', 
                                                                    color: 'var(--text-headline)', 
                                                                    lineHeight: 1.5 
                                                                }}>
                                                                    {action}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Engine info - small at bottom */}
                                        {selectedAnalysis.engine && (
                                            <div style={{ 
                                                marginTop: '20px', 
                                                paddingTop: '16px', 
                                                borderTop: '1px solid rgba(157, 90, 118, 0.1)',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-body)',
                                                textAlign: 'right'
                                            }}>
                                                Analyzed by: {selectedAnalysis.engine}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysesManagement;
