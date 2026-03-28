import { useEffect, useState } from 'react';
import { UserCheck, Plus, Edit2, Trash2, X, Star, Clock, Search, AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../../services/api';

const fieldStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid rgba(157, 90, 118, 0.25)', background: 'rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-sans)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
};

const cardStyle = {
    background: 'rgba(255,255,255,0.85)', borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 30px rgba(89,54,69,0.08)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const EMPTY_FORM = {
    name: '', specialization: '', bio: '', education: '',
    experience_years: '', price_per_session: '', photo_url: '',
    available_days: [], available_hours: [], assistant_knowledge: '', is_active: true
};

const DoctorsManagement = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAdminDoctors();
            setDoctors(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast('Gagal memuat data dokter', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDoctors(); }, []);

    const openCreate = () => { setEditingDoctor(null); setForm(EMPTY_FORM); setShowModal(true); };

    const openEdit = (doctor) => {
        setEditingDoctor(doctor);
        setForm({
            name: doctor.name || '', specialization: doctor.specialization || '',
            bio: doctor.bio || '', education: doctor.education || '',
            experience_years: doctor.experience_years || '', price_per_session: doctor.price_per_session || '',
            photo_url: doctor.photo_url || '',
            available_days: Array.isArray(doctor.available_days) ? doctor.available_days : [],
            available_hours: Array.isArray(doctor.available_hours) ? doctor.available_hours : [],
            assistant_knowledge: doctor.assistant_knowledge || '',
            is_active: doctor.is_active !== false
        });
        setShowModal(true);
    };

    const toggleDay = (day) => setForm(f => ({
        ...f, available_days: f.available_days.includes(day)
            ? f.available_days.filter(d => d !== day) : [...f.available_days, day]
    }));

    const toggleHour = (hour) => setForm(f => ({
        ...f, available_hours: f.available_hours.includes(hour)
            ? f.available_hours.filter(h => h !== hour) : [...f.available_hours, hour].sort()
    }));

    const handleSave = async () => {
        if (!form.name.trim() || !form.specialization.trim()) {
            showToast('Nama dan spesialisasi wajib diisi', 'error'); return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                experience_years: Number(form.experience_years) || 0,
                price_per_session: Number(form.price_per_session) || 0,
                available_days: JSON.stringify(form.available_days),
                available_hours: JSON.stringify(form.available_hours),
            };
            if (editingDoctor) {
                await apiService.updateAdminDoctor(editingDoctor.id, payload);
                showToast('Dokter berhasil diperbarui');
            } else {
                await apiService.createAdminDoctor(payload);
                showToast('Dokter berhasil ditambahkan');
            }
            setShowModal(false);
            fetchDoctors();
        } catch (err) {
            showToast(err.message || 'Gagal menyimpan dokter', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (doctor) => {
        if (!window.confirm(`Hapus Dr. ${doctor.name}?`)) return;
        try {
            await apiService.deleteAdminDoctor(doctor.id);
            showToast('Dokter berhasil dihapus');
            fetchDoctors();
        } catch (err) {
            showToast(err.message || 'Gagal menghapus dokter', 'error');
        }
    };

    const filtered = doctors.filter(d =>
        `${d.name} ${d.specialization}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                    background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    color: toast.type === 'error' ? '#dc2626' : '#16a34a',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontWeight: 600, fontSize: '0.9rem'
                }}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    {toast.msg}
                </div>
            )}


            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserCheck size={28} color="var(--primary-color)" />
                    <div>
                        <h2 style={{ fontSize: '1.75rem', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                            Doctors Management
                        </h2>
                        <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', margin: 0 }}>{doctors.length} dokter terdaftar</p>
                    </div>
                </div>
                <button onClick={openCreate} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                    borderRadius: '12px', border: 'none', background: 'var(--primary-color)',
                    color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer'
                }}>
                    <Plus size={18} /> Tambah Dokter
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari dokter..." style={{ ...fieldStyle, paddingLeft: '44px' }} />
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(157,90,118,0.2)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-body)' }}>Memuat data dokter...</p>
                </div>
            ) : (
                <div style={{ ...cardStyle, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(157,90,118,0.06)', borderBottom: '1px solid rgba(157,90,118,0.1)' }}>
                                {['Dokter', 'Spesialisasi', 'Rating', 'Pengalaman', 'Harga/Sesi', 'Status', 'Aksi'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-body)' }}>Tidak ada dokter ditemukan</td></tr>
                            ) : filtered.map((doctor, i) => (
                                <tr key={doctor.id} style={{ borderBottom: '1px solid rgba(157,90,118,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(157,90,118,0.02)' }}>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(157,90,118,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {doctor.photo_url ? (
                                                    <img src={doctor.photo_url} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                                                ) : <UserCheck size={20} color="var(--primary-color)" />}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-headline)', fontSize: '0.95rem' }}>{doctor.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: 'var(--text-body)', fontSize: '0.9rem' }}>{doctor.specialization}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{Number(doctor.rating || 0).toFixed(1)}</span>
                                            <span style={{ color: 'var(--text-body)', fontSize: '0.8rem' }}>({doctor.review_count || 0})</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: 'var(--text-body)', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} />{doctor.experience_years} tahun</div>
                                    </td>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-headline)', fontSize: '0.9rem' }}>
                                        Rp {Number(doctor.price_per_session || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: doctor.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: doctor.is_active ? '#16a34a' : '#dc2626' }}>
                                            {doctor.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEdit(doctor)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'rgba(157,90,118,0.1)', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(doctor)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                <Trash2 size={14} /> Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ ...cardStyle, width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(157,90,118,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.97)', zIndex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)' }}>
                                {editingDoctor ? 'Edit Dokter' : 'Tambah Dokter Baru'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-body)' }}><X size={22} /></button>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Nama Lengkap *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Nama Dokter" style={fieldStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Spesialisasi *</label>
                                    <input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Dermatologist" style={fieldStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Pengalaman (tahun)</label>
                                    <input type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} placeholder="10" style={fieldStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Harga per Sesi (Rp)</label>
                                    <input type="number" value={form.price_per_session} onChange={e => setForm(f => ({ ...f, price_per_session: e.target.value }))} placeholder="150000" style={fieldStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>URL Foto</label>
                                <input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." style={fieldStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Pendidikan</label>
                                <input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} placeholder="MD - Harvard Medical School" style={fieldStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>Bio</label>
                                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Deskripsi singkat tentang dokter..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>
                                    Assistant Knowledge Base
                                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-body)', marginLeft: '8px' }}>
                                        (Ilmu & skill yang dimiliki asisten AI dokter ini)
                                    </span>
                                </label>
                                <textarea 
                                    value={form.assistant_knowledge} 
                                    onChange={e => setForm(f => ({ ...f, assistant_knowledge: e.target.value }))} 
                                    placeholder={`Contoh:\nSaya adalah asisten AI untuk ${form.name || 'dokter ini'}, seorang ${form.specialization || 'spesialis'}. ${form.bio || ''}\n\nSaya dapat membantu Anda dengan:\n- Informasi tentang layanan dan keahlian dokter\n- Menjawab pertanyaan umum seputar ${form.specialization || 'spesialisasi ini'}\n- Membantu Anda memutuskan apakah konsultasi dengan dokter ini sesuai kebutuhan Anda\n- Menjelaskan prosedur dan treatment yang tersedia`}
                                    rows={6} 
                                    style={{ ...fieldStyle, resize: 'vertical', fontSize: '0.85rem', lineHeight: '1.6' }} 
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-body)', margin: '6px 0 0', lineHeight: '1.5' }}>
                                    💡 Tips: Jelaskan keahlian khusus, pengalaman, dan area fokus dokter. Asisten AI akan menggunakan informasi ini untuk membantu pasien.
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '10px' }}>Hari Tersedia</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {DAYS.map(day => (
                                        <button key={day} type="button" onClick={() => toggleDay(day)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', borderColor: form.available_days.includes(day) ? 'var(--primary-color)' : 'rgba(157,90,118,0.2)', background: form.available_days.includes(day) ? 'var(--primary-color)' : 'transparent', color: form.available_days.includes(day) ? 'white' : 'var(--text-body)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: '10px' }}>Jam Tersedia</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {HOURS.map(hour => (
                                        <button key={hour} type="button" onClick={() => toggleHour(hour)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid', borderColor: form.available_hours.includes(hour) ? 'var(--primary-color)' : 'rgba(157,90,118,0.2)', background: form.available_hours.includes(hour) ? 'var(--primary-color)' : 'transparent', color: form.available_hours.includes(hour) ? 'white' : 'var(--text-body)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s' }}>
                                            {hour}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)' }}>Status Aktif</label>
                                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', background: form.is_active ? 'var(--primary-color)' : 'rgba(157,90,118,0.2)', position: 'relative', transition: 'all 0.2s' }}>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', transition: 'all 0.2s', left: form.is_active ? '25px' : '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                </button>
                                <span style={{ fontSize: '0.85rem', color: form.is_active ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(157,90,118,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px', position: 'sticky', bottom: 0, background: 'rgba(255,255,255,0.97)' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.2)', background: 'transparent', color: 'var(--text-body)', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
                            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Menyimpan...' : (editingDoctor ? 'Simpan Perubahan' : 'Tambah Dokter')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorsManagement;
