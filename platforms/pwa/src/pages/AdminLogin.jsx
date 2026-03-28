import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle } from 'lucide-react';
import apiService from '../services/api';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('🔐 Attempting admin login...', { username });
            const data = await apiService.adminLogin(username, password);
            console.log('✅ Login successful:', data);

            localStorage.setItem('admin_session', JSON.stringify(data));
            localStorage.setItem('admin_logged_in', 'true');
            if (data.token) {
                localStorage.setItem('cantik_admin_token', data.token);
            }
            if (data.csrf_token) {
                localStorage.setItem('cantik_admin_csrf_token', data.csrf_token);
            } else {
                localStorage.removeItem('cantik_admin_csrf_token');
            }

            navigate('/admin/dashboard');
        } catch (err) {
            console.error('❌ Login error:', err);
            const errorMessage = err.message || err.error || 'Connection error. Please check if backend is running.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div data-admin-page="true" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color)',
            backgroundImage: `
                radial-gradient(circle at 80% 0%, rgba(241, 211, 226, 0.4) 0%, transparent 40%),
                radial-gradient(circle at 20% 40%, rgba(255, 255, 255, 0.9) 0%, transparent 60%),
                radial-gradient(circle at 100% 80%, rgba(157, 90, 118, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, rgba(220, 200, 210, 0.5) 0%, transparent 60%)
            `,
            padding: '20px',
            fontFamily: 'var(--font-sans)'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                borderRadius: '28px',
                padding: '40px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 10px 40px rgba(89, 54, 69, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.85)'
            }}>
                {/* Logo/Title */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 25px rgba(157, 90, 118, 0.25)'
                    }}>
                        <Lock size={40} color="white" />
                    </div>
                    <h1 style={{ 
                        fontSize: '2rem', 
                        fontWeight: 600, 
                        color: 'var(--text-headline)', 
                        marginBottom: '8px',
                        fontFamily: 'var(--font-serif)'
                    }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', fontFamily: 'var(--font-sans)' }}>
                        Cantik AI Management System
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <AlertCircle size={20} color="var(--error-color)" />
                        <span style={{ color: 'var(--error-color)', fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-headline)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                            Username
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 45px',
                                    border: '1px solid rgba(157, 90, 118, 0.2)',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: '0.3s ease',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    fontFamily: 'var(--font-sans)',
                                    color: 'var(--text-headline)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--primary-color)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(157, 90, 118, 0.2)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.6)';
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-headline)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 45px',
                                    border: '1px solid rgba(157, 90, 118, 0.2)',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: '0.3s ease',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    fontFamily: 'var(--font-sans)',
                                    color: 'var(--text-headline)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--primary-color)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(157, 90, 118, 0.2)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.6)';
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading ? 'rgba(157, 90, 118, 0.5)' : 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                            color: 'white',
                            border: 'none',
                            borderRadius: '30px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: '0.3s ease',
                            boxShadow: '0 10px 25px rgba(157, 90, 118, 0.25)',
                            fontFamily: 'var(--font-sans)'
                        }}
                        onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        {loading ? 'Logging in...' : 'Login to Dashboard'}
                    </button>
                </form>

                {/* Default Credentials Info */}
                <div style={{
                    marginTop: '30px',
                    padding: '15px',
                    background: 'rgba(157, 90, 118, 0.05)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    color: 'var(--text-body)',
                    fontFamily: 'var(--font-sans)',
                    border: '1px solid rgba(157, 90, 118, 0.1)'
                }}>
                    <strong style={{ color: 'var(--text-headline)' }}>Default Credentials:</strong><br />
                    Username: <code style={{ background: 'rgba(157, 90, 118, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>admin</code><br />
                    Password: <code style={{ background: 'rgba(157, 90, 118, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>admin123</code>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
