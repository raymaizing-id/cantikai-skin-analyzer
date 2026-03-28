import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Calendar, GraduationCap, MessageSquare, Sparkles } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import doctorApi from '../services/doctorApi';

const DAY_LABELS = { Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' };

const DoctorDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDoctorDetail(); }, [id]);

    const fetchDoctorDetail = async () => {
        try {
            setLoading(true);
            const data = await doctorApi.getDoctorDetail(id);
            setDoctor(data);
        } catch (error) {
            console.error('Error fetching doctor detail:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="app-container" style={{ background: '#faf6f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid rgba(157,90,118,0.15)', borderTop: '3px solid #9d5a76', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        </div>
    );

    if (!doctor) return (
        <div className="app-container" style={{ background: '#faf6f8' }}>
            <div style={{ padding: '20px' }}>
                <p style={{ color: '#8a7a82' }}>Dokter tidak ditemukan</p>
            </div>
        </div>
    );

    const availableDays = Array.isArray(doctor.schedule) ? doctor.schedule : [];
    const availableHours = Array.isArray(doctor.available_hours) ? doctor.available_hours : [];

    return (
        <div style={{ background: '#faf6f8', minHeight: '100vh', position: 'relative' }}>
            {/* Scrollable Content */}
            <div style={{ paddingBottom: '200px', overflowY: 'auto' }}>

                {/* Top Hero Section */}
                <div style={{
                    background: 'linear-gradient(160deg, #f9f0f4 0%, #f0e4ec 100%)',
                    padding: '16px 20px 28px',
                }}>
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/doctors')}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                            marginBottom: '20px'
                        }}
                    >
                        <ArrowLeft size={18} color="#5a3d4a" strokeWidth={2.5} />
                    </button>

                    {/* Doctor Identity */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        {/* Photo */}
                        <div style={{
                            width: '90px',
                            height: '90px',
                            borderRadius: '22px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'linear-gradient(135deg, #e8d5e0, #f5e8ef)',
                            boxShadow: '0 8px 24px rgba(157,90,118,0.2)',
                            border: '3px solid white'
                        }}>
                            {doctor.photo_url ? (
                                <img
                                    src={doctor.photo_url}
                                    alt={doctor.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 700, color: '#9d5a76' }}>
                                    {doctor.name?.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Name & Info */}
                        <div style={{ flex: 1, paddingTop: '2px' }}>
                            <h1 style={{
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#3a2530',
                                margin: '0 0 4px',
                                fontFamily: 'var(--font-serif)',
                                lineHeight: 1.25
                            }}>
                                {doctor.name}
                            </h1>
                            <p style={{
                                fontSize: '0.85rem',
                                color: '#9d5a76',
                                fontWeight: 600,
                                margin: '0 0 10px'
                            }}>
                                {doctor.specialty}
                            </p>
                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Star size={13} color="#f59e0b" fill="#f59e0b" />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3a2530' }}>
                                        {Number(doctor.rating || 0).toFixed(1)}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: '#8a7a82' }}>
                                        ({doctor.review_count || 0} ulasan)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} color="#8a7a82" />
                                    <span style={{ fontSize: '0.78rem', color: '#8a7a82' }}>
                                        {doctor.experience_years} tahun pengalaman
                                    </span>
                                </div>
                            </div>
                            {doctor.price_per_session > 0 && (
                                <div style={{
                                    marginTop: '10px',
                                    display: 'inline-block',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    background: 'white',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#9d5a76',
                                    boxShadow: '0 2px 8px rgba(157,90,118,0.12)'
                                }}>
                                    Rp {Number(doctor.price_per_session).toLocaleString('id-ID')} / sesi
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cards Section */}
                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* About */}
                    {doctor.bio && (
                        <div style={{
                            background: 'white',
                            borderRadius: '18px',
                            padding: '18px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                        }}>
                            <h3 style={{
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: '#3a2530',
                                margin: '0 0 8px',
                                letterSpacing: '-0.01em'
                            }}>Tentang Dokter</h3>
                            <p style={{
                                fontSize: '0.84rem',
                                color: '#6a5a62',
                                lineHeight: 1.65,
                                margin: 0
                            }}>{doctor.bio}</p>
                        </div>
                    )}

                    {/* Education */}
                    {doctor.location && (
                        <div style={{
                            background: 'white',
                            borderRadius: '18px',
                            padding: '18px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5eef2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <GraduationCap size={15} color="#9d5a76" />
                                </div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3a2530', margin: 0 }}>Pendidikan</h3>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#6a5a62', margin: 0, lineHeight: 1.5 }}>{doctor.location}</p>
                        </div>
                    )}

                    {/* Schedule */}
                    <div style={{
                        background: 'white',
                        borderRadius: '18px',
                        padding: '18px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5eef2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Calendar size={15} color="#9d5a76" />
                            </div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3a2530', margin: 0 }}>Jadwal Tersedia</h3>
                        </div>
                        {availableDays.length > 0 ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: availableHours.length > 0 ? '10px' : 0 }}>
                                {availableDays.map(day => (
                                    <span key={day} style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        background: '#f5eef2',
                                        color: '#9d5a76',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}>
                                        {DAY_LABELS[day] || day}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.84rem', color: '#8a7a82', margin: '0 0 10px' }}>Hubungi untuk jadwal</p>
                        )}
                        {availableHours.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {availableHours.map(h => (
                                    <span key={h} style={{
                                        padding: '4px 10px',
                                        borderRadius: '7px',
                                        background: '#faf7f9',
                                        color: '#6a5a62',
                                        fontSize: '0.76rem',
                                        fontWeight: 500,
                                        border: '1px solid #ede5ea'
                                    }}>
                                        {h}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Expertise Tags - derived from specialty */}
                    {(() => {
                        const spec = (doctor.specialty || '').toLowerCase();
                        let tags = [];
                        if (spec.includes('dermatolog')) tags = ['Jerawat & Acne', 'Anti-Aging', 'Hiperpigmentasi', 'Rosacea', 'Eczema', 'Skin Resurfacing'];
                        else if (spec.includes('general') || spec.includes('physician')) tags = ['Skincare Holistik', 'Nutrisi Kulit', 'Hormonal Skin', 'Preventive Care', 'Kulit Sensitif', 'Stress & Lifestyle'];
                        else if (spec.includes('cardiolog')) tags = ['Sirkulasi & Kulit', 'Luka Lambat Sembuh', 'Kulit Pucat', 'Efek Obat Jantung', 'Skin Manifestation'];
                        else if (spec.includes('arthro') || spec.includes('rheumat')) tags = ['Psoriasis', 'Lupus (SLE)', 'Scleroderma', 'Dermatomyositis', 'Vasculitis', 'Autoimun'];
                        else if (spec.includes('endocrin')) tags = ['Jerawat Hormonal', 'PCOS & Kulit', 'Hirsutism', 'Tiroid & Kulit', 'Menopause Skin', 'Diabetes Skin'];
                        else tags = ['Konsultasi Kulit', 'Perawatan Preventif', 'Skincare Routine'];
                        return (
                            <div style={{ background: 'white', borderRadius: '18px', padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3a2530', margin: '0 0 12px' }}>Keahlian</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {tags.map(tag => (
                                        <span key={tag} style={{ padding: '6px 12px', borderRadius: '20px', background: '#f5eef2', color: '#9d5a76', fontSize: '0.78rem', fontWeight: 600 }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* AI Consultation Promo Card */}
                    <div
                        onClick={() => navigate('/chat', { state: { doctorContext: { id: doctor.id, name: doctor.name, specialty: doctor.specialty, bio: doctor.bio, experience_years: doctor.experience_years, price_per_session: doctor.price_per_session, assistant_knowledge: doctor.assistant_knowledge } } })}
                        style={{
                            background: 'linear-gradient(135deg, #9d5a76 0%, #c084a0 100%)',
                            borderRadius: '18px',
                            padding: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px'
                        }}
                    >
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Sparkles size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Konsultasi AI Gratis</p>
                            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.4 }}>
                                Tanya langsung ke AI {doctor.name} sebelum buat janji
                            </p>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>›</div>
                    </div>

                    {/* CTA Buttons - inline, below AI promo */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => navigate('/chat', { state: { doctorContext: { id: doctor.id, name: doctor.name, specialty: doctor.specialty, bio: doctor.bio, experience_years: doctor.experience_years, price_per_session: doctor.price_per_session, assistant_knowledge: doctor.assistant_knowledge } } })}
                            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1.5px solid #e8d5e0', background: 'white', color: '#9d5a76', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 2px 8px rgba(157,90,118,0.08)' }}
                        >
                            <Sparkles size={16} strokeWidth={2.5} />
                            Chat AI
                        </button>
                        <button
                            onClick={() => navigate(`/doctors/${id}/booking`)}
                            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#9d5a76', color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 4px 16px rgba(157,90,118,0.3)' }}
                        >
                            <Calendar size={16} strokeWidth={2.5} />
                            Buat Janji
                        </button>
                    </div>

                    {/* Reviews */}
                    {doctor.reviews && doctor.reviews.length > 0 && (
                        <div style={{
                            background: 'white',
                            borderRadius: '18px',
                            padding: '18px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5eef2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={15} color="#9d5a76" />
                                </div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3a2530', margin: 0 }}>Ulasan Pasien</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {doctor.reviews.slice(0, 3).map((review, i) => (
                                    <div key={i} style={{
                                        padding: '12px',
                                        background: '#faf7f9',
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#3a2530' }}>{review.user_name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Star size={11} color="#f59e0b" fill="#f59e0b" />
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#3a2530' }}>{review.rating}</span>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#6a5a62', margin: 0, lineHeight: 1.5 }}>
                                            {review.comment || review.review_text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default DoctorDetail;
