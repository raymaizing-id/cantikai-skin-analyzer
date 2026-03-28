import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import {
    Users,
    Activity,
    Package,
    FileText,
    Settings,
    LogOut,
    TrendingUp,
    Database,
    Image,
    BarChart3,
    MessageSquare,
    Palette,
    ScanLine,
    UserCheck,
    Calendar
} from 'lucide-react';
import apiService from '../services/api';
import UsersManagement from '../components/admin/UsersManagement';
import ProductsManagement from '../components/admin/ProductsManagement';
import ArticlesManagement from '../components/admin/ArticlesManagement';
import AnalysesManagement from '../components/admin/AnalysesManagement';
import BannersManagement from '../components/admin/BannersManagement';
import ChatSessionsManagement from '../components/admin/ChatSessionsManagement';
import KioskSessionsManagement from '../components/admin/KioskSessionsManagement';
import DesignSystemManagement from '../components/admin/DesignSystemManagement';
import DatabaseManagement from '../components/admin/DatabaseManagement';
import SettingsManagement from '../components/admin/SettingsManagement';
import DoctorsManagement from '../components/admin/DoctorsManagement';
import AppointmentsManagement from '../components/admin/AppointmentsManagement';
const ADMIN_DATA_CHANGED_EVENT = 'cantik:admin-data-changed';

const cardStyle = {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 10px 40px rgba(89, 54, 69, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.85)'
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState({
        total_users: 0,
        total_analyses: 0,
        total_products: 0,
        total_doctors: 0,
        total_articles: 0,
        total_banners: 0,
        total_chat_sessions: 0,
        total_kiosk_sessions: 0,
        recent_analyses_7d: 0,
        average_skin_score: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Get current tab from URL
    const getCurrentTab = () => {
        const path = location.pathname.replace('/admin/dashboard', '').replace('/', '');
        return path || 'overview';
    };
    
    const [activeTab, setActiveTab] = useState(getCurrentTab());
    
    // Update activeTab when URL changes
    useEffect(() => {
        setActiveTab(getCurrentTab());
    }, [location.pathname]);

    const isAdminLoggedIn = () => {
        return Boolean(localStorage.getItem('admin_logged_in') || localStorage.getItem('cantik_admin_token'));
    };

    const fetchDashboardData = async () => {
        try {
            const [users, analyses, products, articles, banners, chatSessions, kioskSessions, doctors] = await Promise.all([
                apiService.getAllUsers(),
                apiService.getAllAnalyses(),
                apiService.getAdminProducts(),
                apiService.getAdminArticles(),
                apiService.getAdminBanners(),
                apiService.getAdminChatSessions(),
                apiService.getAdminKioskSessions(),
                apiService.getAdminDoctors().catch(() => [])
            ]);

            const safeUsers = Array.isArray(users) ? users : [];
            const safeAnalyses = Array.isArray(analyses) ? analyses : [];
            const safeProducts = Array.isArray(products) ? products : [];
            const safeArticles = Array.isArray(articles) ? articles : [];
            const safeBanners = Array.isArray(banners) ? banners : [];
            const safeSessions = Array.isArray(chatSessions) ? chatSessions : [];
            const safeKioskSessions = Array.isArray(kioskSessions) ? kioskSessions : [];
            const safeDoctors = Array.isArray(doctors) ? doctors : [];

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const recentAnalyses = safeAnalyses.filter((analysis) => new Date(analysis.created_at) > sevenDaysAgo);
            const avgScore = safeAnalyses.length > 0
                ? safeAnalyses.reduce((sum, analysis) => sum + Number(analysis.overall_score || 0), 0) / safeAnalyses.length
                : 0;

            setStats({
                total_users: safeUsers.length,
                total_analyses: safeAnalyses.length,
                total_products: safeProducts.length,
                total_doctors: safeDoctors.length,
                total_articles: safeArticles.length,
                total_banners: safeBanners.length,
                total_chat_sessions: safeSessions.length,
                total_kiosk_sessions: safeKioskSessions.length,
                recent_analyses_7d: recentAnalyses.length,
                average_skin_score: Math.round(avgScore)
            });

            const recent = [...safeAnalyses]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5)
                .map((analysis) => ({
                    id: analysis.id,
                    username: analysis.username || analysis.user_email || `User #${analysis.user_id}`,
                    score: analysis.overall_score || 0,
                    skin_type: analysis.skin_type || 'Unknown',
                    created_at: analysis.created_at
                }));

            setRecentActivity(recent);
        } catch (error) {
            console.error('Failed to fetch admin dashboard data:', error);
            alert(error.message || 'Gagal memuat dashboard admin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdminLoggedIn()) {
            navigate('/admin');
            return;
        }
        fetchDashboardData();
    }, [navigate]);

    useEffect(() => {
        if (!isAdminLoggedIn()) return undefined;

        const handleAdminDataChanged = () => {
            fetchDashboardData();
        };

        window.addEventListener(ADMIN_DATA_CHANGED_EVENT, handleAdminDataChanged);
        const timer = window.setInterval(() => {
            fetchDashboardData();
        }, 20000);

        return () => {
            window.removeEventListener(ADMIN_DATA_CHANGED_EVENT, handleAdminDataChanged);
            window.clearInterval(timer);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('cantik_admin_token');
        localStorage.removeItem('cantik_admin_csrf_token');
        navigate('/admin');
    };

    const StatCard = ({ icon: Icon, title, value, color, trend }) => (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', marginBottom: '8px' }}>{title}</p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-serif)' }}>
                        {value}
                    </h3>
                    {trend ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendingUp size={14} /> {trend}
                        </p>
                    ) : null}
                </div>
                <div
                    style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: `${color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Icon size={24} color={color} />
                </div>
            </div>
        </div>
    );

    const MenuItem = ({ icon: Icon, label, tab, badge }) => (
        <button
            onClick={() => {
                setActiveTab(tab);
                navigate(`/admin/dashboard/${tab === 'overview' ? '' : tab}`);
            }}
            style={{
                width: '100%',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: activeTab === tab ? 'rgba(157, 90, 118, 0.1)' : 'transparent',
                border: 'none',
                borderLeft: activeTab === tab ? '3px solid var(--primary-color)' : '3px solid transparent',
                color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-body)',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)'
            }}
        >
            <Icon size={20} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge !== undefined && badge > 0 ? (
                <span
                    style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}
                >
                    {badge}
                </span>
            ) : null}
        </button>
    );

    const renderTabContent = () => {
        if (activeTab === 'overview') {
            return (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '20px',
                            marginBottom: '30px'
                        }}
                    >
                        <StatCard icon={Users} title="Total Users" value={stats.total_users} color="var(--primary-color)" />
                        <StatCard icon={Activity} title="Total Analyses" value={stats.total_analyses} color="var(--success-color)" trend={`+${stats.recent_analyses_7d} this week`} />
                        <StatCard icon={Package} title="Products" value={stats.total_products} color="var(--warning-color)" />
                        <StatCard icon={TrendingUp} title="Avg Skin Score" value={`${stats.average_skin_score}%`} color="var(--info-color)" />
                        <StatCard icon={MessageSquare} title="Chat Sessions" value={stats.total_chat_sessions} color="var(--primary-color)" />
                        <StatCard icon={ScanLine} title="Kiosk Sessions" value={stats.total_kiosk_sessions} color="var(--warning-color)" />
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                            Recent Activity
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    style={{
                                        padding: '16px',
                                        background: 'rgba(157, 90, 118, 0.05)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        border: '1px solid rgba(157, 90, 118, 0.1)'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px' }}>
                                            {activity.username} completed analysis
                                        </p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                                            Score: {activity.score}% • {activity.skin_type}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                                        {new Date(activity.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--text-body)', textAlign: 'center', padding: '20px' }}>
                                    No recent activity
                                </p>
                            )}
                        </div>
                    </div>
                </>
            );
        }

        if (activeTab === 'users') return <UsersManagement />;
        if (activeTab === 'analyses') return <AnalysesManagement />;
        if (activeTab === 'products') return <ProductsManagement />;
        if (activeTab === 'doctors') return <DoctorsManagement />;
        if (activeTab === 'appointments') return <AppointmentsManagement />;
        if (activeTab === 'articles') return <ArticlesManagement />;
        if (activeTab === 'banners') return <BannersManagement />;
        if (activeTab === 'chat') return <ChatSessionsManagement />;
        if (activeTab === 'kiosk') return <KioskSessionsManagement />;
        if (activeTab === 'design') return <DesignSystemManagement />;
        if (activeTab === 'database') return <DatabaseManagement />;
        if (activeTab === 'settings') return <SettingsManagement />;
        return null;
    };

    if (loading) {
        return (
            <div
                data-admin-page="true"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'var(--bg-color)'
                }}
            >
                <p style={{ color: 'var(--text-body)' }}>Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div
            data-admin-page="true"
            style={{
                display: 'flex',
                minHeight: '100vh',
                width: '100vw',
                margin: 0,
                padding: 0,
                background: 'var(--bg-color)',
                backgroundImage: `
                    radial-gradient(circle at 80% 0%, rgba(241, 211, 226, 0.4) 0%, transparent 40%),
                    radial-gradient(circle at 20% 40%, rgba(255, 255, 255, 0.9) 0%, transparent 60%),
                    radial-gradient(circle at 100% 80%, rgba(157, 90, 118, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 0% 100%, rgba(220, 200, 210, 0.5) 0%, transparent 60%)
                `
            }}
        >
            <div
                style={{
                    width: '280px',
                    minWidth: '280px',
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    borderRight: '1px solid rgba(157, 90, 118, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: 'sticky',
                    top: 0
                }}
            >
                <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(157, 90, 118, 0.1)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-serif)' }}>
                        Cantik AI
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>Admin Dashboard</p>
                </div>

                <div style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
                    <MenuItem icon={BarChart3} label="Overview" tab="overview" />
                    <MenuItem icon={Users} label="Users" tab="users" badge={stats.total_users} />
                    <MenuItem icon={Activity} label="Analyses" tab="analyses" badge={stats.total_analyses} />
                    <MenuItem icon={Package} label="Products" tab="products" badge={stats.total_products} />
                    <MenuItem icon={UserCheck} label="Doctors" tab="doctors" badge={stats.total_doctors} />
                    <MenuItem icon={Calendar} label="Appointments" tab="appointments" />
                    <MenuItem icon={FileText} label="Articles" tab="articles" badge={stats.total_articles} />
                    <MenuItem icon={Image} label="Banners" tab="banners" badge={stats.total_banners} />
                    <MenuItem icon={MessageSquare} label="Chat Sessions" tab="chat" badge={stats.total_chat_sessions} />
                    <MenuItem icon={ScanLine} label="Kiosk Sessions" tab="kiosk" badge={stats.total_kiosk_sessions} />
                    <MenuItem icon={Palette} label="Design System" tab="design" />
                    <MenuItem icon={Database} label="Database" tab="database" />
                    <MenuItem icon={Settings} label="Settings" tab="settings" />
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid rgba(157, 90, 118, 0.1)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            color: 'var(--error-color)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, padding: '30px 40px', overflowY: 'auto', width: '100%', maxWidth: '100%' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
                        {activeTab === 'overview' ? 'Dashboard Overview' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management`}
                    </h1>
                    <p style={{ color: 'var(--text-body)' }}>
                        {activeTab === 'overview'
                            ? "Welcome back! Here's what's happening with your app."
                            : `Manage ${activeTab} content and configuration.`}
                    </p>
                </div>

                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminDashboard;
