import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, Lightbulb, TrendingUp, User, Settings, BookOpen } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import apiService from '../services/api';
import { isAuthenticated, isGuestSession } from '../utils/auth';
import { getTokenInfo, getHoursUntilReset } from '../utils/tokenSystem';

const ProductCard = ({ image, name, brand, price, onClick }) => (
    <div style={{ minWidth: '130px', maxWidth: '130px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(25px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)' }} onClick={onClick}>
        <div style={{
            height: '130px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.5)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {image ? (
                <img src={image} style={{ width: '85%', height: '85%', objectFit: 'contain' }} alt={name} onError={(e) => e.target.style.display = 'none'} />
            ) : (
                <div style={{ width: '85%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)', fontSize: '0.7rem', fontFamily: 'var(--font-sans)' }}>
                    No Image
                </div>
            )}
        </div>
        <div style={{ padding: '2px' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-headline)', marginBottom: '4px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontFamily: 'var(--font-sans)' }}>{name}</h4>
            {brand ? (
                <p style={{ fontSize: '0.65rem', color: 'var(--text-body)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {brand}
                </p>
            ) : null}
            {price ? (
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-sans)' }}>Rp {Number(price || 0).toLocaleString('id-ID')}</p>
            ) : (
                <p style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Lihat Detail</p>
            )}
        </div>
    </div>
);

const Home = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [userName, setUserName] = useState('Guest');
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [productsLoading, setProductsLoading] = useState(true);
    const [dailyTip, setDailyTip] = useState('');
    const [latestArticle, setLatestArticle] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [appTagline, setAppTagline] = useState('cantik.ai asisten kulit sehatmu');
    const [isGuestMode, setIsGuestMode] = useState(true);
    const [analysisTokenInfo, setAnalysisTokenInfo] = useState(null);
    const [chatTokenInfo, setChatTokenInfo] = useState(null);
    const [hoursUntilReset, setHoursUntilReset] = useState(getHoursUntilReset());

    // Daily tips array - will rotate daily
    const skincareTips = [
        "Gunakan sunscreen setiap hari, bahkan saat di dalam ruangan. UV rays dapat menembus jendela!",
        "Cuci wajah maksimal 2x sehari. Terlalu sering mencuci dapat menghilangkan minyak alami kulit.",
        "Minum air putih minimal 8 gelas sehari untuk menjaga hidrasi kulit dari dalam.",
        "Tidur 7-8 jam setiap malam. Kulit melakukan regenerasi saat Anda tidur.",
        "Ganti sarung bantal seminggu sekali untuk mencegah bakteri penyebab jerawat.",
        "Aplikasikan skincare dari tekstur paling ringan ke paling berat.",
        "Jangan lupa aplikasikan skincare di leher dan area dada, bukan hanya wajah.",
        "Hindari menyentuh wajah terlalu sering untuk mencegah transfer bakteri.",
        "Eksfoliasi 1-2x seminggu untuk mengangkat sel kulit mati.",
        "Konsumsi makanan kaya antioksidan seperti buah dan sayuran untuk kulit sehat."
    ];

    useEffect(() => {
        // Fetch banners
        fetchBanners();
        
        // Fetch all products
        fetchAllProducts();
        
        // Fetch latest article
        fetchLatestArticle();
        
        // Load user data from localStorage
        const storedName =
            localStorage.getItem('cantik_user_name') ||
            localStorage.getItem('userName') ||
            'Guest';
        
        setUserName(storedName);

        try {
            const rawSettings = localStorage.getItem('cantik_public_settings');
            if (rawSettings) {
                const parsedSettings = JSON.parse(rawSettings);
                if (parsedSettings['app.tagline']) {
                    setAppTagline(parsedSettings['app.tagline']);
                }
            }
        } catch {
            // Ignore invalid cached settings
        }

        // Set daily tip based on day of year (changes daily)
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        setDailyTip(skincareTips[dayOfYear % skincareTips.length]);
    }, []);

    useEffect(() => {
        // Auto-rotate banners every 5 seconds
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [banners]);

    useEffect(() => {
        refreshGuestTokenInfo();
        window.addEventListener('focus', refreshGuestTokenInfo);
        const interval = setInterval(refreshGuestTokenInfo, 30000);
        return () => {
            window.removeEventListener('focus', refreshGuestTokenInfo);
            clearInterval(interval);
        };
    }, []);

    const fetchBanners = async () => {
        try {
            const bannersData = await apiService.getBanners();
            setBanners(bannersData.filter(b => b.is_active));
            console.log('✅ Banners loaded:', bannersData.length);
        } catch (error) {
            console.error('❌ Error fetching banners:', error);
        }
    };

    const fetchAllProducts = async () => {
        try {
            setProductsLoading(true);
            // Fetch from Beautylatory API instead of local backend
            const response = await fetch(`${import.meta.env.VITE_PRODUCTS_API_URL}?page=1`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch products from Beautylatory API');
            }
            
            const data = await response.json();
            // Take first 4 products for home page display
            setProducts(data.data.slice(0, 4));
            console.log('✅ Beautylatory products loaded:', data.data.length);
        } catch (error) {
            console.error('❌ Error fetching Beautylatory products:', error);
            setProducts([]);
        } finally {
            setProductsLoading(false);
        }
    };

    const fetchLatestArticle = async () => {
        try {
            const articlesData = await apiService.getArticles();
            if (articlesData && articlesData.length > 0) {
                setLatestArticle(articlesData[0]);
            }
        } catch (error) {
            console.error('❌ Error fetching articles:', error);
        }
    };

    const refreshGuestTokenInfo = () => {
        const guestMode = !isAuthenticated() || isGuestSession();
        setIsGuestMode(guestMode);

        if (!guestMode) {
            setAnalysisTokenInfo(null);
            setChatTokenInfo(null);
            return;
        }

        setAnalysisTokenInfo(getTokenInfo('analysis', true));
        setChatTokenInfo(getTokenInfo('chat', true));
        setHoursUntilReset(getHoursUntilReset());
    };

    const nextBanner = () => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    };

    const prevBanner = () => {
        setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    // Touch swipe support
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStart - touchEnd > 50) {
            // Swipe left
            nextBanner();
        }
        if (touchStart - touchEnd < -50) {
            // Swipe right
            prevBanner();
        }
    };

    return (
        <div className="app-container" style={{ animation: 'etherealFade 0.6s ease' }}>
            <div className="screen-content" style={{ paddingBottom: '100px', padding: 0 }}>
                {/* Banner Slider - Full Width with Rounded Bottom */}
                {banners.length > 0 && (
                    <div 
                        style={{ 
                            position: 'relative', 
                            width: '100%',
                            paddingTop: '56.25%',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            borderRadius: '0 0 24px 24px'
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: index === currentBannerIndex ? 1 : 0,
                                    transition: 'opacity 0.5s ease',
                                    cursor: banner.link_url ? 'pointer' : 'default'
                                }}
                                onClick={() => banner.link_url && navigate(banner.link_url)}
                            >
                                <img 
                                    src={apiService.resolveMediaUrl(banner.image_url)} 
                                    alt={banner.title}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        ))}
                        
                        {banners.length > 1 && (
                            <>
                                {/* Dots Indicator Only */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    gap: '6px',
                                    zIndex: 10
                                }}>
                                    {banners.map((_, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setCurrentBannerIndex(index)}
                                            style={{
                                                width: index === currentBannerIndex ? '24px' : '8px',
                                                height: '8px',
                                                borderRadius: '4px',
                                                background: index === currentBannerIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Content with padding */}
                <div style={{ padding: '0 20px' }}>

                {/* Header - Compact with Profile & Settings */}
                <div style={{ marginBottom: '24px', padding: '0 17px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                            <h1 className="headline" style={{ fontSize: '1.8rem', marginBottom: '0', fontFamily: 'var(--font-serif)', textAlign: 'left' }}>
                                {isGuestMode ? 'Halo!' : `Halo, ${userName}!`}
                            </h1>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* Profile Icon */}
                            <div 
                                onClick={() => navigate('/profile')}
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
                                    boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                            >
                                <User size={20} color="var(--primary-color)" />
                            </div>
                            {/* Settings Icon */}
                            <div 
                                onClick={() => navigate('/settings')}
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
                                    boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'}
                            >
                                <Settings size={20} color="var(--primary-color)" />
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'left', color: 'var(--text-body)', marginBottom: '16px' }}>{appTagline}</p>

                    {isGuestMode && analysisTokenInfo && chatTokenInfo && (
                        <div className="card-glass" style={{ padding: '14px', marginBottom: '14px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(157, 90, 118, 0.12), rgba(241, 211, 226, 0.14))' }}>
                            <p style={{ fontSize: '0.78rem', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.3px' }}>
                                GUEST TOKEN HARI INI
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '10px' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', marginBottom: '3px' }}>Analisis</p>
                                    <p style={{ fontSize: '1rem', color: 'var(--text-headline)', margin: 0, fontWeight: 700 }}>
                                        {analysisTokenInfo.remaining}/{analysisTokenInfo.limit}
                                    </p>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '10px' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-body)', marginBottom: '3px' }}>Chat</p>
                                    <p style={{ fontSize: '1rem', color: 'var(--text-headline)', margin: 0, fontWeight: 700 }}>
                                        {chatTokenInfo.remaining}/{chatTokenInfo.limit}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-body)' }}>
                                    Reset dalam ±{hoursUntilReset} jam
                                </p>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Login Unlimited
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Quick Questions - Above chat input */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '6px', 
                        overflowX: 'auto',
                        marginBottom: '10px',
                        paddingBottom: '2px'
                    }} className="no-scrollbar">
                        {[
                            { icon: Sparkles, text: 'Analisis Kulit' },
                            { icon: Lightbulb, text: 'Tips Harian' },
                            { icon: TrendingUp, text: 'Rekomendasi' }
                        ].map((item, index) => {
                            const fullText = index === 0 ? 'Analisis Kulit Saya' : index === 1 ? 'Tips Skincare Harian' : 'Rekomendasi Produk';
                            return (
                                <div
                                    key={index}
                                    onClick={() => navigate('/chat', { state: { initialMessage: fullText } })}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '14px',
                                        background: 'rgba(255, 255, 255, 0.5)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255,255,255,0.7)',
                                        boxShadow: '0 2px 6px rgba(157, 90, 118, 0.05)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.7rem',
                                        fontFamily: 'var(--font-sans)',
                                        color: 'var(--text-headline)',
                                        fontWeight: 500,
                                        transition: 'all 0.2s',
                                        height: '30px',
                                        flex: 1
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <item.icon size={12} color="var(--primary-color)" />
                                    {item.text}
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Chat Input Bubble */}
                    <div 
                        style={{ 
                            padding: '10px 16px', 
                            background: 'rgba(255, 255, 255, 0.5)', 
                            backdropFilter: 'blur(25px)', 
                            borderRadius: '20px', 
                            border: '1px solid rgba(255,255,255,0.8)', 
                            boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            height: '48px'
                        }}
                    >
                        <MessageCircle size={20} color="var(--text-body)" />
                        <input
                            type="text"
                            placeholder="Tanya apa saja tentang skincare..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && chatInput.trim()) {
                                    navigate('/chat', { state: { initialMessage: chatInput } });
                                }
                            }}
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '0.85rem',
                                color: 'var(--text-headline)',
                                fontFamily: 'var(--font-sans)'
                            }}
                        />
                        {/* Send Button - Always visible */}
                        <div 
                            onClick={() => {
                                if (chatInput.trim()) {
                                    navigate('/chat', { state: { initialMessage: chatInput } });
                                }
                            }}
                            style={{ 
                                cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: chatInput.trim() 
                                    ? 'linear-gradient(135deg, var(--primary-color), var(--primary-light))'
                                    : 'rgba(200, 200, 200, 0.3)',
                                transition: 'all 0.2s',
                                opacity: 1
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? 'white' : 'rgba(100, 100, 100, 0.5)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Menu Grid 3x2 - Focused Actions */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {/* Scan Kulit */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/scan')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                    <circle cx="12" cy="13" r="4"></circle>
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Scan Kulit</p>
                        </div>
                        
                        {/* Edukasi */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/education')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Edukasi</p>
                        </div>
                        
                        {/* Produk */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/products')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Produk</p>
                        </div>
                        
                        {/* Riwayat */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/history')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Riwayat</p>
                        </div>
                        
                        {/* Rekomendasi */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/recommendations')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <Sparkles size={28} color="var(--primary-color)" />
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Rekomendasi</p>
                        </div>
                        
                        {/* Konsultasi (Chat) */}
                        <div 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }} 
                            onClick={() => navigate('/chat')}
                        >
                            <div style={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(25px)', 
                                border: '1px solid rgba(255,255,255,0.8)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                boxShadow: '0 4px 12px rgba(157, 90, 118, 0.08)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 90, 118, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.08)';
                            }}>
                                <MessageCircle size={28} color="var(--primary-color)" />
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-body)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>Konsultasi</p>
                        </div>
                    </div>
                </div>

                {latestArticle && (
                    <div
                        className="card-glass"
                        style={{ marginBottom: '18px', padding: '14px', cursor: 'pointer' }}
                        onClick={() => navigate(`/education/${latestArticle.id}`)}
                    >
                        <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                            <BookOpen size={14} /> ARTIKEL TERBARU
                        </p>
                        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-headline)', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>
                            {latestArticle.title}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.5 }}>
                            {latestArticle.excerpt || 'Baca insight skincare terbaru dari tim Cantik AI.'}
                        </p>
                    </div>
                )}

                {/* Section Title - Compact */}
                <div style={{ marginBottom: '16px' }}>
                    <h3 className="headline" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-headline)', fontFamily: 'var(--font-serif)', textAlign: 'left' }}>
                        Produk Rekomendasi
                    </h3>
                </div>

                {/* Products Grid - Compact */}
                <div className="no-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '120px' }}>
                    {productsLoading ? (
                        <div style={{ width: '100%', textAlign: 'center', padding: '30px 20px', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                            <p>Memuat produk...</p>
                        </div>
                    ) : products.length > 0 ? (
                        products.map((product) => (
                            <ProductCard 
                                key={product.slug} 
                                image={product.image_url}
                                name={product.name}
                                brand={product.category.name}
                                price={null} // No price in Beautylatory API
                                onClick={() => navigate(`/products/${product.slug}`)}
                            />
                        ))
                    ) : (
                        <div style={{ width: '100%', textAlign: 'center', padding: '30px 20px', color: 'var(--text-body)', fontFamily: 'var(--font-sans)' }}>
                            <p>Tidak ada produk untuk kategori ini</p>
                        </div>
                    )}
                </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Home;
