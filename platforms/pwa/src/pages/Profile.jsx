import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Activity, TrendingUp, Settings, LogOut, Zap, Edit2, Save, X, Award, Target, BarChart3, ArrowLeft, Bell, Globe, Lock, HelpCircle, Clock, CheckCircle, XCircle, Camera } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import apiService from '../services/api';
import doctorApi from '../services/doctorApi';
import { getAuthToken, loginUser, logoutUser } from '../utils/auth';

const Profile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [lastAnalysis, setLastAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [skinScore, setSkinScore] = useState(null);
    const [lastScanDays, setLastScanDays] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        age: '',
        gender: '',
        skin_type: ''
    });
    const [totalAnalyses, setTotalAnalyses] = useState(0);
    const [averageScore, setAverageScore] = useState(0);
    const [appointments, setAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const fetchAppointments = async (userId) => {
        try {
            setLoadingAppointments(true);
            const data = await doctorApi.getUserAppointments(userId);
            // Show all non-cancelled appointments, most recent first, max 5
            setAppointments(data.filter(apt => apt.status !== 'cancelled').slice(0, 5));
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoadingAppointments(false);
        }
    };

    const applyUserState = (userData) => {
        if (!userData) return;
        setUser(userData);
        setEditForm({
            name: userData.name || '',
            age: userData.age || '',
            gender: userData.gender || '',
            skin_type: userData.skin_type || ''
        });
    };
    const loadUserData = async () => {
        try {
            // Get user ID from localStorage
            const storedUserId = localStorage.getItem('cantik_user_id');
            const storedEmail = localStorage.getItem('cantik_user_email');
            const authToken = getAuthToken();
            
            // Load skin score and last scan from localStorage
            const lastScore = localStorage.getItem('lastSkinScore');
            const lastAnalysisTime = localStorage.getItem('lastAnalysis');
            
            if (lastScore) {
                setSkinScore(parseInt(lastScore));
            }
            
            if (lastAnalysisTime) {
                const daysSince = Math.floor((Date.now() - parseInt(lastAnalysisTime)) / (1000 * 60 * 60 * 24));
                setLastScanDays(daysSince);
            }
            
            if (!storedUserId && !storedEmail && !authToken) {
                // Truly no persisted identity, show guest mode
                setLoading(false);
                return;
            }

            let activeUser = null;

            const trySyncFromAuthToken = async () => {
                if (!authToken) return null;
                try {
                    const profile = await apiService.getCurrentProfile();
                    const profileUser = profile?.user || null;
                    if (profileUser?.id) {
                        loginUser({
                            user: profileUser,
                            token: authToken
                        });
                        return profileUser;
                    }
                } catch (profileError) {
                    console.warn('Auth profile sync failed:', profileError?.message || profileError);
                }
                return null;
            };

            const trySyncFromEmail = async () => {
                if (!storedEmail || storedEmail === 'guest') return null;
                try {
                    const byEmail = await apiService.getUserByEmail(storedEmail);
                    if (byEmail?.id) {
                        loginUser({
                            user: byEmail,
                            token: authToken || undefined
                        });
                        return byEmail;
                    }
                } catch (emailError) {
                    console.warn('Email-based user recovery failed:', emailError?.message || emailError);
                }
                return null;
            };

            // For logged users, always prefer token-based profile first to avoid stale local IDs
            if (authToken) {
                activeUser = await trySyncFromAuthToken();
            }

            // Fallback to user ID only when token sync is unavailable/failed
            if (!activeUser) {
                try {
                    const userIdInt = parseInt(storedUserId, 10);
                    if (Number.isFinite(userIdInt)) {
                        activeUser = await apiService.getUserById(userIdInt);
                    }
                } catch (userErr) {
                    console.error('Failed to load user by ID:', userErr);
                    if (userErr?.status === 404 || userErr?.status === 401 || userErr?.status === 403) {
                        activeUser = await trySyncFromEmail();
                    }
                }
            }

            // Last recovery path by email
            if (!activeUser) {
                activeUser = await trySyncFromEmail();
            }

            if (!activeUser) {
                if (storedUserId || storedEmail || authToken) {
                    // Invalid stale local state: clear only if all recovery paths failed
                    logoutUser();
                }
                setLoading(false);
                return;
            }

            applyUserState(activeUser);

            const resolvedUserId = Number.parseInt(activeUser.id, 10);
            if (!Number.isFinite(resolvedUserId)) {
                setLoading(false);
                return;
            }

            // Fetch analysis history for statistics
            try {
                const analyses = await apiService.getAnalysisByUserId(resolvedUserId);
                
                if (analyses && analyses.length > 0) {
                    setLastAnalysis(analyses[0]);
                    setTotalAnalyses(analyses.length);
                    
                    // Fix NaN: filter valid scores before averaging
                    const validScores = analyses
                        .map(a => Number(a.overall_score))
                        .filter(s => !isNaN(s) && s > 0);
                    if (validScores.length > 0) {
                        const avg = Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length);
                        setAverageScore(avg);
                    }

                    // Auto-update skin_type from latest analysis if not set
                    const latestSkinType = analyses[0]?.skin_type;
                    if (latestSkinType && activeUser && !activeUser.skin_type) {
                        try {
                            await apiService.updateUser(resolvedUserId, { skin_type: latestSkinType });
                            activeUser.skin_type = latestSkinType;
                        } catch (e) { /* silent */ }
                    }
                }
            } catch (historyErr) {
                console.error('Failed to load analysis history:', historyErr);
            }

            // Fetch appointments
            fetchAppointments(resolvedUserId);
        } catch (err) {
            console.error('Failed to load user data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel edit - reset form
            setEditForm({
                name: user.name || '',
                age: user.age || '',
                gender: user.gender || '',
                skin_type: user.skin_type || ''
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSaveProfile = async () => {
        try {
            const userIdInt = Number.parseInt(user?.id, 10);
            if (!Number.isFinite(userIdInt)) {
                throw new Error('Invalid active user id');
            }
            
            const updatedUser = await apiService.updateUser(userIdInt, {
                name: editForm.name,
                age: editForm.age,
                gender: editForm.gender,
                skin_type: editForm.skin_type
            });
            applyUserState(updatedUser);
            setIsEditing(false);
            
            // Update localStorage if name changed
            if (editForm.name) {
                localStorage.setItem('cantik_user_name', editForm.name);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Gagal menyimpan perubahan. Silakan coba lagi.');
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Ukuran foto maksimal 2MB'); return; }

        setUploadingPhoto(true);
        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target.result;
                const userId = Number.parseInt(user?.id, 10);
                const updated = await apiService.updateUser(userId, { photo_url: base64 });
                applyUserState(updated);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert('Gagal upload foto');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleLogout = () => {        logoutUser();
        localStorage.removeItem('lastAnalysis');
        localStorage.removeItem('lastSkinScore');
        
        // Redirect to login
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ background: 'linear-gradient(180deg, #faf6f8 0%, #f1d3e2 100%)', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative Background Blobs */}
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(157, 90, 118, 0.15), transparent)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '-150px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(241, 211, 226, 0.3), transparent)', filter: 'blur(80px)', pointerEvents: 'none' }}></div>

            <div className="screen-content" style={{ padding: '24px 20px 100px', position: 'relative', zIndex: 1 }}>
                {/* Header with Back Button */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.5)',
                                backdropFilter: 'blur(25px)',
                                border: '1px solid rgba(255,255,255,0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                        >
                            <ArrowLeft size={20} color="var(--text-headline)" />
                        </button>
                        <div style={{ flex: 1 }}>
                            <h1 className="headline" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '0', fontFamily: 'var(--font-serif)' }}>Profil Saya</h1>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)', marginLeft: '52px' }}>Kelola informasi dan riwayat analisis Anda</p>
                </div>

                {user ? (
                    <>
                        {/* Skin Health Card */}
                        {skinScore && (
                            <div style={{ 
                                padding: '20px', 
                                marginBottom: '16px',
                                background: 'rgba(255, 255, 255, 0.4)',
                                backdropFilter: 'blur(25px)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.6)',
                                boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Kesehatan Kulit Anda</p>
                                        <h2 className="headline" style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '4px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                            {skinScore}<span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>%</span>
                                        </h2>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                                            Scan terakhir: {lastScanDays === 0 ? 'Hari ini' : lastScanDays === 1 ? 'Kemarin' : `${lastScanDays} hari lalu`}
                                        </p>
                                    </div>
                                    <div style={{ width: 70, height: 70, borderRadius: '50%', background: `conic-gradient(var(--primary-color) ${skinScore * 3.6}deg, rgba(157, 90, 118, 0.1) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Zap size={28} color="var(--primary-color)" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile Card */}
                        <div style={{ 
                            padding: '20px', 
                            marginBottom: '16px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(25px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                    Informasi Profil
                                </h3>
                                <button
                                    onClick={handleEditToggle}
                                    style={{
                                        padding: '8px 14px',
                                        background: isEditing ? 'rgba(255, 77, 79, 0.1)' : 'rgba(157, 90, 118, 0.1)',
                                        border: `1px solid ${isEditing ? 'rgba(255, 77, 79, 0.2)' : 'rgba(157, 90, 118, 0.2)'}`,
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        color: isEditing ? '#ff4d4f' : 'var(--primary-color)',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {isEditing ? <X size={14} /> : <Edit2 size={14} />}
                                    {isEditing ? 'Batal' : 'Edit'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                {/* Avatar with upload */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{
                                        width: '72px', height: '72px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 16px rgba(157, 90, 118, 0.3)'
                                    }}>
                                        {(user.photo_url || user.avatar_url) ? (
                                            <img
                                                src={user.photo_url || user.avatar_url}
                                                alt="Foto profil"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span style={{ color: 'white', fontSize: '1.8rem', fontWeight: 600, fontFamily: 'var(--font-serif)' }}>
                                                {(user.name || user.username || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {/* Upload button overlay */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        style={{
                                            position: 'absolute', bottom: 0, right: 0,
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: 'var(--primary-color)', border: '2px solid white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Camera size={12} color="white" />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoUpload}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                            placeholder="Nama Lengkap"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: 'var(--text-headline)',
                                                fontFamily: 'var(--font-serif)',
                                                background: 'rgba(255,255,255,0.8)',
                                                border: '1px solid rgba(157, 90, 118, 0.3)',
                                                borderRadius: '8px',
                                                marginBottom: '6px'
                                            }}
                                        />
                                    ) : (
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '2px', fontFamily: 'var(--font-serif)' }}>
                                            {user.name || user.username}
                                        </h2>
                                    )}
                                    <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}>{user.email}</p>
                                </div>
                            </div>

                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', display: 'block', fontFamily: 'var(--font-sans)' }}>Usia</label>
                                        <input
                                            type="number"
                                            value={editForm.age}
                                            onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                                            placeholder="Masukkan usia"
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                fontSize: '0.9rem',
                                                background: 'rgba(255,255,255,0.8)',
                                                border: '1px solid rgba(157, 90, 118, 0.3)',
                                                borderRadius: '8px',
                                                fontFamily: 'var(--font-sans)'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', display: 'block', fontFamily: 'var(--font-sans)' }}>Jenis Kelamin</label>
                                        <select
                                            value={editForm.gender}
                                            onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                fontSize: '0.9rem',
                                                background: 'rgba(255,255,255,0.8)',
                                                border: '1px solid rgba(157, 90, 118, 0.3)',
                                                borderRadius: '8px',
                                                fontFamily: 'var(--font-sans)'
                                            }}
                                        >
                                            <option value="">Pilih jenis kelamin</option>
                                            <option value="male">Laki-laki</option>
                                            <option value="female">Perempuan</option>
                                            <option value="other">Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', display: 'block', fontFamily: 'var(--font-sans)' }}>Jenis Kulit</label>
                                        <select
                                            value={editForm.skin_type}
                                            onChange={(e) => setEditForm({...editForm, skin_type: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                fontSize: '0.9rem',
                                                background: 'rgba(255,255,255,0.8)',
                                                border: '1px solid rgba(157, 90, 118, 0.3)',
                                                borderRadius: '8px',
                                                fontFamily: 'var(--font-sans)'
                                            }}
                                        >
                                            <option value="">Pilih jenis kulit</option>
                                            <option value="normal">Normal</option>
                                            <option value="oily">Berminyak</option>
                                            <option value="dry">Kering</option>
                                            <option value="combination">Kombinasi</option>
                                            <option value="sensitive">Sensitif</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleSaveProfile}
                                        style={{
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontFamily: 'var(--font-sans)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 16px rgba(157, 90, 118, 0.3)'
                                        }}
                                    >
                                        <Save size={16} />
                                        Simpan Perubahan
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Usia</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>
                                            {user.age ? `${user.age} tahun` : 'Belum diatur'}
                                        </p>
                                    </div>
                                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Jenis Kelamin</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>
                                            {user.gender === 'male' ? 'Laki-laki' : user.gender === 'female' ? 'Perempuan' : user.gender === 'other' ? 'Lainnya' : 'Belum diatur'}
                                        </p>
                                    </div>
                                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Jenis Kulit</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>
                                            {user.skin_type ? user.skin_type.charAt(0).toUpperCase() + user.skin_type.slice(1) : 'Belum diatur'}
                                        </p>
                                    </div>
                                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Bergabung</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>
                                            {new Date(user.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Statistics Card */}
                        {totalAnalyses > 0 && (
                            <div style={{ 
                                padding: '18px', 
                                marginBottom: '16px',
                                background: 'rgba(255, 255, 255, 0.4)',
                                backdropFilter: 'blur(25px)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.6)',
                                boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                            }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                    Statistik Saya
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div style={{ padding: '14px', background: 'rgba(157, 90, 118, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                                        <Award size={20} color="var(--primary-color)" style={{ marginBottom: '6px' }} />
                                        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '2px', fontFamily: 'var(--font-serif)' }}>
                                            {totalAnalyses}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>Total Scan</p>
                                    </div>
                                    <div style={{ padding: '14px', background: 'rgba(157, 90, 118, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                                        <Target size={20} color="var(--primary-color)" style={{ marginBottom: '6px' }} />
                                        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '2px', fontFamily: 'var(--font-serif)' }}>
                                            {averageScore > 0 ? `${averageScore}%` : '--'}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>Rata-rata</p>
                                    </div>
                                    <div style={{ padding: '14px', background: 'rgba(157, 90, 118, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                                        <BarChart3 size={20} color="var(--primary-color)" style={{ marginBottom: '6px' }} />
                                        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '2px', fontFamily: 'var(--font-serif)' }}>
                                            {skinScore ? `${skinScore}%` : averageScore > 0 ? `${averageScore}%` : '--'}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>Terbaru</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Last Analysis */}
                        {lastAnalysis && (
                            <div style={{ 
                                padding: '18px', 
                                marginBottom: '16px',
                                background: 'rgba(255, 255, 255, 0.4)',
                                backdropFilter: 'blur(25px)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.6)',
                                boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                            }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                    Analisis Terakhir
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Skor Kesehatan Kulit</p>
                                        <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-color)', fontFamily: 'var(--font-serif)' }}>
                                            {lastAnalysis.overall_score}%
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Jenis Kulit</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>
                                            {lastAnalysis.skin_type}
                                        </p>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                                    {new Date(lastAnalysis.created_at).toLocaleDateString('id-ID', { 
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                                <button
                                    onClick={() => navigate('/history')}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '10px',
                                        color: 'var(--text-headline)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontFamily: 'var(--font-sans)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    Lihat Riwayat Lengkap
                                </button>
                            </div>
                        )}

                        {/* Appointments Section */}
                        <div style={{ 
                            padding: '18px', 
                            marginBottom: '16px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(25px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                                    Janji Konsultasi
                                </h3>
                                <button onClick={() => navigate('/doctors')} style={{ fontSize: '0.78rem', color: 'var(--primary-color)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    + Buat Janji
                                </button>
                            </div>

                            {loadingAppointments ? (
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-body)', textAlign: 'center', padding: '12px 0' }}>Memuat...</p>
                            ) : appointments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <p style={{ fontSize: '0.84rem', color: 'var(--text-body)', marginBottom: '10px' }}>Belum ada janji konsultasi</p>
                                    <button onClick={() => navigate('/doctors')} style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', background: 'var(--primary-color)', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Cari Dokter
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {appointments.map((apt) => {
                                        const statusMap = {
                                            pending:   { label: 'Menunggu Konfirmasi', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={12} /> },
                                            confirmed: { label: 'Dikonfirmasi', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle size={12} /> },
                                            completed: { label: 'Selesai', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: <CheckCircle size={12} /> },
                                            cancelled: { label: 'Dibatalkan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <XCircle size={12} /> },
                                        };
                                        const st = statusMap[apt.status] || statusMap.pending;
                                        return (
                                            <div key={apt.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-headline)', marginBottom: '2px' }}>{apt.doctor_name}</p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', margin: '0 0 6px', fontWeight: 500 }}>{apt.specialty}</p>
                                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <Calendar size={11} />
                                                                {apt.appointment_date ? new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                <Clock size={11} />
                                                                {apt.appointment_time ? apt.appointment_time.substring(0, 5) : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        {st.icon}{st.label}
                                                    </span>
                                                </div>
                                                {apt.admin_notes && (
                                                    <div style={{ background: 'rgba(157,90,118,0.06)', borderRadius: '8px', padding: '8px 10px', marginTop: '6px' }}>
                                                        <p style={{ fontSize: '0.75rem', color: '#9d5a76', fontWeight: 600, margin: '0 0 2px' }}>Catatan Dokter:</p>
                                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.4 }}>{apt.admin_notes}</p>
                                                    </div>
                                                )}
                                                {apt.complaint && (
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', margin: '6px 0 0', fontStyle: 'italic', opacity: 0.7 }}>
                                                        "{apt.complaint.substring(0, 80)}{apt.complaint.length > 80 ? '...' : ''}"
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div style={{ 
                            padding: '18px', 
                            marginBottom: '16px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(25px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                Aksi Cepat
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={() => navigate('/scan')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(157, 90, 118, 0.1)',
                                        border: '1px solid rgba(157, 90, 118, 0.2)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        color: 'var(--primary-color)',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(157, 90, 118, 0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(157, 90, 118, 0.1)'}
                                >
                                    <Activity size={18} />
                                    Analisis Kulit Baru
                                </button>
                                <button
                                    onClick={() => navigate('/history')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        color: 'var(--text-headline)',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    <Calendar size={18} />
                                    Riwayat Analisis
                                </button>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255, 77, 79, 0.1)',
                                        border: '1px solid rgba(255, 77, 79, 0.2)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: 'pointer',
                                        color: '#ff4d4f',
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 77, 79, 0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'}
                                >
                                    <LogOut size={18} />
                                    Keluar
                                </button>
                            </div>
                        </div>

                        {/* Preferences/Settings */}
                        <div style={{ 
                            padding: '18px', 
                            marginBottom: '16px',
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(25px)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                Pengaturan
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    onClick={() => navigate('/settings')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        color: 'var(--text-headline)',
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Bell size={18} color="var(--primary-color)" />
                                        <span>Notifikasi</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-body)' }}>Aktif</span>
                                </button>
                                <button
                                    onClick={() => navigate('/settings')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        color: 'var(--text-headline)',
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Globe size={18} color="var(--primary-color)" />
                                        <span>Bahasa</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-body)' }}>Indonesia</span>
                                </button>
                                <button
                                    onClick={() => navigate('/settings')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        color: 'var(--text-headline)',
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Lock size={18} color="var(--primary-color)" />
                                        <span>Privasi & Keamanan</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => navigate('/settings')}
                                    style={{
                                        padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(255,255,255,0.8)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        color: 'var(--text-headline)',
                                        fontWeight: 500,
                                        fontFamily: 'var(--font-sans)',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <HelpCircle size={18} color="var(--primary-color)" />
                                        <span>Bantuan & Dukungan</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* App Info */}
                        <div style={{ 
                            padding: '16px', 
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                                Cantik.AI v1.0.0
                            </p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                                © 2026 Cantik.AI. All rights reserved.
                            </p>
                        </div>
                    </>
                ) : (
                    /* Guest Mode */
                    <div style={{ 
                        padding: '32px 24px', 
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(25px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.6)',
                        boxShadow: '0 8px 32px rgba(157, 90, 118, 0.1)'
                    }}>
                        <User size={56} color="var(--primary-color)" style={{ marginBottom: '16px', opacity: 0.6 }} />
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                            Belum Ada Profil
                        </h2>
                        <p style={{ color: 'var(--text-body)', marginBottom: '20px', lineHeight: 1.6, fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
                            Mulai analisis kulit pertama Anda untuk membuat profil dan menyimpan riwayat analisis.
                        </p>
                        <button
                            onClick={() => navigate('/scan')}
                            style={{
                                padding: '12px 28px',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--primary-light))',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontFamily: 'var(--font-sans)',
                                boxShadow: '0 4px 16px rgba(157, 90, 118, 0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            Mulai Analisis
                        </button>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default Profile;
