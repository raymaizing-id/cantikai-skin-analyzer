import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calendar, Clock, FileText } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import doctorApi from '../services/doctorApi';

const DAY_MAP = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
const DAY_LABELS = { Mon: 'Sen', Tue: 'Sel', Wed: 'Rab', Thu: 'Kam', Fri: 'Jum', Sat: 'Sab', Sun: 'Min' };

const getAvailableDates = (availableDays) => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30 && dates.length < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayKey = DAY_MAP[d.getDay()];
        if (!availableDays.length || availableDays.includes(dayKey)) {
            dates.push({
                date: d.toISOString().split('T')[0],
                dayLabel: DAY_LABELS[dayKey] || dayKey,
                dayNum: d.getDate(),
                month: d.toLocaleString('id-ID', { month: 'short' })
            });
        }
    }
    return dates;
};

const DoctorBooking = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [complaint, setComplaint] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);

    useEffect(() => { fetchDoctorDetail(); }, [id]);

    const fetchDoctorDetail = async () => {
        try {
            setLoading(true);
            const data = await doctorApi.getDoctorDetail(id);
            setDoctor(data);
            const days = Array.isArray(data.schedule) ? data.schedule : [];
            const dates = getAvailableDates(days);
            setAvailableDates(dates);
            if (dates.length > 0) setSelectedDate(dates[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedDate || complaint.trim().length < 10) return;
        const userId = localStorage.getItem('cantik_user_id');
        if (!userId) { navigate('/login'); return; }
        try {
            setSubmitting(true);
            await doctorApi.bookAppointment(id, {
                user_id: parseInt(userId),
                preferred_date: selectedDate.date,
                complaint
            });
            setSuccess(true);
        } catch (err) {
            alert(err.message || 'Gagal mengajukan janji');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ background: '#faf6f8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(157,90,118,0.15)', borderTop: '3px solid #9d5a76', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );

    if (success) return (
        <div style={{ background: '#faf6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <CheckCircle size={36} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3a2530', fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>Pengajuan Terkirim!</h2>
            <p style={{ fontSize: '0.9rem', color: '#6a5a62', lineHeight: 1.6, marginBottom: '6px' }}>
                Permintaan janji dengan <strong>{doctor?.name}</strong> sudah diterima.
            </p>
            <p style={{ fontSize: '0.85rem', color: '#9d5a76', fontWeight: 600, marginBottom: '12px' }}>
                Preferensi: {selectedDate?.dayLabel}, {selectedDate?.dayNum} {selectedDate?.month}
            </p>
            <div style={{ background: '#fff8f0', border: '1px solid #fde8c8', borderRadius: '12px', padding: '12px 16px', marginBottom: '28px', maxWidth: '320px' }}>
                <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                    ⏳ Dokter akan mengkonfirmasi dan menentukan waktu yang tepat. Cek status di profil kamu.
                </p>
            </div>
            <button onClick={() => navigate('/profile')} style={{ padding: '13px 24px', borderRadius: '14px', border: 'none', background: '#9d5a76', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '10px', width: '100%', maxWidth: '320px' }}>
                Lihat Status Janji
            </button>
            <button onClick={() => navigate('/doctors')} style={{ padding: '13px 24px', borderRadius: '14px', border: '1px solid #e8d5e0', background: 'transparent', color: '#6a5a62', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', width: '100%', maxWidth: '320px' }}>
                Kembali ke Daftar Dokter
            </button>
        </div>
    );

    const isReady = selectedDate && complaint.trim().length >= 10;

    return (
        <div style={{ background: '#faf6f8', minHeight: '100vh' }}>
            <div style={{ paddingBottom: '120px' }}>

                {/* Header */}
                <div style={{ padding: '16px 20px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/doctors/' + id)}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0 }}
                        >
                            <ArrowLeft size={18} color="#5a3d4a" strokeWidth={2.5} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3a2530', margin: 0, fontFamily: 'var(--font-serif)' }}>Buat Janji</h1>
                            <p style={{ fontSize: '0.78rem', color: '#8a7a82', margin: '2px 0 0' }}>dengan {doctor?.name}</p>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Info Banner */}
                    <div style={{ background: 'linear-gradient(135deg, #f5eef2, #ede0e8)', borderRadius: '16px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.1rem' }}>💡</span>
                        <p style={{ fontSize: '0.82rem', color: '#5a3d4a', margin: 0, lineHeight: 1.5 }}>
                            Ajukan preferensi tanggal dan ceritakan keluhanmu. Dokter akan mengkonfirmasi waktu yang tepat.
                        </p>
                    </div>

                    {/* Step 1: Tanggal */}
                    <div style={{ background: 'white', borderRadius: '18px', padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#9d5a76', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white' }}>1</span>
                            </div>
                            <Calendar size={15} color="#9d5a76" />
                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#3a2530', margin: 0 }}>Preferensi Tanggal</h3>
                        </div>
                        {availableDates.length === 0 ? (
                            <p style={{ fontSize: '0.84rem', color: '#8a7a82', margin: 0 }}>Tidak ada jadwal tersedia</p>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {availableDates.map(d => (
                                    <button
                                        key={d.date}
                                        type="button"
                                        onClick={() => setSelectedDate(d)}
                                        style={{ flexShrink: 0, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid', borderColor: selectedDate?.date === d.date ? '#9d5a76' : '#ede5ea', background: selectedDate?.date === d.date ? '#9d5a76' : 'white', color: selectedDate?.date === d.date ? 'white' : '#5a4a52', cursor: 'pointer', textAlign: 'center', minWidth: '56px' }}
                                    >
                                        <div style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.85 }}>{d.dayLabel}</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2 }}>{d.dayNum}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{d.month}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Keluhan */}
                    <div style={{ background: 'white', borderRadius: '18px', padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedDate ? '#9d5a76' : '#e8d5e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'white' }}>2</span>
                            </div>
                            <FileText size={15} color="#9d5a76" />
                            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#3a2530', margin: 0 }}>Keluhan / Pertanyaan</h3>
                        </div>
                        <textarea
                            value={complaint}
                            onChange={e => setComplaint(e.target.value)}
                            placeholder="Ceritakan keluhan atau pertanyaan kamu untuk dokter..."
                            rows={4}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #ede5ea', background: '#faf7f9', fontSize: '0.84rem', color: '#3a2530', resize: 'none', outline: 'none', fontFamily: 'var(--font-sans)', lineHeight: 1.5, boxSizing: 'border-box' }}
                            onFocus={e => e.target.style.borderColor = '#9d5a76'}
                            onBlur={e => e.target.style.borderColor = '#ede5ea'}
                        />
                        <p style={{ fontSize: '0.75rem', color: complaint.length < 10 ? '#c084a0' : '#8a7a82', margin: '6px 0 0', textAlign: 'right' }}>
                            {complaint.length} karakter {complaint.length < 10 ? '(min. 10)' : '✓'}
                        </p>
                    </div>

                    {/* Doctor Summary */}
                    {doctor && (
                        <div style={{ background: 'white', borderRadius: '18px', padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#f5eef2', flexShrink: 0 }}>
                                {doctor.photo_url
                                    ? <img src={doctor.photo_url} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#9d5a76' }}>{doctor.name?.charAt(0)}</div>
                                }
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#3a2530', margin: '0 0 2px' }}>{doctor.name}</p>
                                <p style={{ fontSize: '0.78rem', color: '#9d5a76', margin: 0 }}>{doctor.specialty}</p>
                            </div>
                            {doctor.price_per_session > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.72rem', color: '#8a7a82', margin: '0 0 2px' }}>Biaya sesi</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9d5a76', margin: 0 }}>
                                        Rp {Number(doctor.price_per_session).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isReady || submitting}
                        style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: isReady ? '#9d5a76' : '#e8d5e0', color: isReady ? 'white' : '#b89aaa', fontSize: '0.95rem', fontWeight: 700, cursor: isReady ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isReady ? '0 4px 16px rgba(157,90,118,0.3)' : 'none', transition: 'all 0.2s' }}
                    >
                        <Clock size={18} />
                        {submitting ? 'Mengirim...' : 'Ajukan Janji Temu'}
                    </button>

                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default DoctorBooking;
