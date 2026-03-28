import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, ChevronRight, Search } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import doctorApi from '../services/doctorApi';

const Doctors = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => { fetchDoctors(); }, []);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const data = await doctorApi.getDoctors();
            setDoctors(data);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        } finally {
            setLoading(false);
        }
    };

    const specialties = ['all', ...new Set(doctors.map(d => d.specialty).filter(Boolean))];
    const filtered = doctors.filter(d => {
        const matchSpec = selectedSpecialty === 'all' || d.specialty === selectedSpecialty;
        const matchSearch = `${d.name} ${d.specialty}`.toLowerCase().includes(search.toLowerCase());
        return matchSpec && matchSearch;
    });

    return (
        <div className="app-container">
            <div className="screen-content" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{
                    padding: '20px 20px 0',
                    marginBottom: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div onClick={() => navigate('/')} style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(157,90,118,0.1)' }}>
                            <ArrowLeft size={18} color="var(--primary-color)" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, fontFamily: 'var(--font-serif)' }}>
                                Konsultasi Dokter
                            </h1>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', margin: '2px 0 0' }}>
                                {doctors.length} dokter tersedia · Booking jadwal online
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)', opacity: 0.6 }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama dokter atau spesialisasi..."
                            style={{
                                width: '100%', padding: '11px 14px 11px 40px', borderRadius: '14px',
                                border: '1px solid rgba(157,90,118,0.15)', background: 'rgba(255,255,255,0.85)',
                                fontSize: '0.88rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Specialty Filter */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }} className="no-scrollbar">
                        {specialties.map(s => (
                            <button key={s} onClick={() => setSelectedSpecialty(s)} style={{
                                padding: '7px 16px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                                background: selectedSpecialty === s ? 'var(--primary-color)' : 'rgba(255,255,255,0.8)',
                                color: selectedSpecialty === s ? 'white' : 'var(--text-body)',
                                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                boxShadow: selectedSpecialty === s ? '0 4px 12px rgba(157,90,118,0.3)' : '0 2px 6px rgba(0,0,0,0.06)',
                                transition: 'all 0.2s'
                            }}>
                                {s === 'all' ? 'Semua' : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div style={{ padding: '0 20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(157,90,118,0.15)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: 'var(--text-body)', fontSize: '0.9rem' }}>Memuat dokter...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <p style={{ color: 'var(--text-body)' }}>Tidak ada dokter ditemukan</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filtered.map(doctor => (
                                <div key={doctor.id} onClick={() => navigate(`/doctors/${doctor.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        padding: '14px 16px', borderRadius: '18px', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.85)',
                                        border: '1px solid rgba(255,255,255,0.9)',
                                        boxShadow: '0 4px 16px rgba(89,54,69,0.07)',
                                        backdropFilter: 'blur(20px)', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(89,54,69,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(89,54,69,0.07)'; }}
                                >
                                    {/* Photo */}
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, rgba(192,132,160,0.2), rgba(221,179,198,0.2))' }}>
                                        {doctor.photo_url ? (
                                            <img src={doctor.photo_url} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                                                {doctor.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-headline)', margin: '0 0 2px', fontFamily: 'var(--font-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {doctor.name}
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600, margin: '0 0 6px' }}>
                                            {doctor.specialty}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-headline)' }}>{Number(doctor.rating || 0).toFixed(1)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Clock size={12} color="var(--text-body)" />
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{doctor.experience_years} tahun</span>
                                            </div>
                                            {doctor.price_per_session > 0 && (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', background: 'rgba(157,90,118,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                                                    Rp {Number(doctor.price_per_session).toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={18} color="var(--text-body)" style={{ opacity: 0.4, flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default Doctors;
