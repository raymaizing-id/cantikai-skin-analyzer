import { useEffect, useState } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import apiService from '../../services/api';

const STATUS_CONFIG = {
    pending:   { label: 'Menunggu', color: '#f59e0b', bg: '#fef3c7' },
    confirmed: { label: 'Dikonfirmasi', color: '#10b981', bg: '#d1fae5' },
    completed: { label: 'Selesai', color: '#6366f1', bg: '#e0e7ff' },
    cancelled: { label: 'Dibatalkan', color: '#ef4444', bg: '#fee2e2' },
};

const AppointmentsManagement = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [editForm, setEditForm] = useState({ status: '', appointment_date: '', appointment_time: '', admin_notes: '' });
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAdminAppointments();
            setAppointments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAppointments(); }, []);

    const openEdit = (appt) => {
        setSelected(appt);
        setEditForm({
            status: appt.status || 'pending',
            appointment_date: appt.appointment_date ? appt.appointment_date.split('T')[0] : '',
            appointment_time: appt.appointment_time ? appt.appointment_time.substring(0, 5) : '',
            admin_notes: appt.admin_notes || ''
        });
    };

    const handleSave = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await apiService.updateAdminAppointment(selected.id, editForm);
            await fetchAppointments();
            setSelected(null);
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

    const cardStyle = { background: 'rgba(255,255,255,0.85)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 8px 30px rgba(89,54,69,0.08)', backdropFilter: 'blur(20px)' };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-headline)', margin: '0 0 4px', fontFamily: 'var(--font-serif)' }}>Appointments</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: 0 }}>{appointments.length} total pengajuan janji</p>
                </div>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', background: filter === f ? 'var(--primary-color)' : 'rgba(157,90,118,0.08)', color: filter === f ? 'white' : 'var(--text-body)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            {f === 'all' ? 'Semua' : STATUS_CONFIG[f]?.label}
                            {f !== 'all' && (
                                <span style={{ marginLeft: '4px', opacity: 0.7 }}>({appointments.filter(a => a.status === f).length})</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-body)' }}>Memuat...</div>
            ) : filtered.length === 0 ? (
                <div style={{ ...cardStyle, padding: '60px', textAlign: 'center' }}>
                    <Calendar size={40} color="rgba(157,90,118,0.3)" style={{ marginBottom: '12px' }} />
                    <p style={{ color: 'var(--text-body)', margin: 0 }}>Belum ada pengajuan janji</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map(appt => {
                        const st = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
                        return (
                            <div key={appt.id} style={{ ...cardStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                {/* Status Badge */}
                                <span style={{ padding: '4px 10px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                    {st.label}
                                </span>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-headline)' }}>{appt.user_name || 'User'}</span>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>→</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600 }}>{appt.doctor_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} /> {appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum ditentukan'}
                                        </span>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {appt.appointment_time ? appt.appointment_time.substring(0, 5) : 'Belum ditentukan'}
                                        </span>
                                    </div>
                                    {appt.complaint && (
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', margin: '6px 0 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                                            "{appt.complaint}"
                                        </p>
                                    )}
                                </div>

                                {/* Action */}
                                <button onClick={() => openEdit(appt)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.2)', background: 'transparent', color: 'var(--primary-color)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                                    Kelola
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit Modal */}
            {selected && (
                <>
                    <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: '480px', background: 'white', borderRadius: '20px', padding: '28px', zIndex: 1000, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-headline)', margin: '0 0 4px', fontFamily: 'var(--font-serif)' }}>Kelola Janji</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-body)', margin: '0 0 20px' }}>
                            {selected.user_name} → {selected.doctor_name}
                        </p>

                        {/* Complaint */}
                        {selected.complaint && (
                            <div style={{ background: '#faf7f9', borderRadius: '12px', padding: '12px', marginBottom: '20px', border: '1px solid #ede5ea' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9d5a76', margin: '0 0 4px' }}>KELUHAN PASIEN</p>
                                <p style={{ fontSize: '0.84rem', color: '#3a2530', margin: 0, lineHeight: 1.5 }}>{selected.complaint}</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Status */}
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-headline)', display: 'block', marginBottom: '6px' }}>Status</label>
                                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.25)', fontSize: '0.88rem', outline: 'none', background: 'white' }}>
                                    <option value="pending">Menunggu</option>
                                    <option value="confirmed">Dikonfirmasi</option>
                                    <option value="completed">Selesai</option>
                                    <option value="cancelled">Dibatalkan</option>
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-headline)', display: 'block', marginBottom: '6px' }}>Tanggal Konfirmasi</label>
                                <input type="date" value={editForm.appointment_date} onChange={e => setEditForm(f => ({ ...f, appointment_date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.25)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            {/* Time */}
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-headline)', display: 'block', marginBottom: '6px' }}>Jam Konfirmasi</label>
                                <input type="time" value={editForm.appointment_time} onChange={e => setEditForm(f => ({ ...f, appointment_time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.25)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-headline)', display: 'block', marginBottom: '6px' }}>Catatan Admin</label>
                                <textarea value={editForm.admin_notes} onChange={e => setEditForm(f => ({ ...f, admin_notes: e.target.value }))} placeholder="Pesan untuk pasien..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(157,90,118,0.25)', fontSize: '0.88rem', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setSelected(null)} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid rgba(157,90,118,0.2)', background: 'transparent', color: 'var(--text-body)', fontWeight: 600, cursor: 'pointer' }}>
                                Batal
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: 'var(--primary-color)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                {saving ? 'Menyimpan...' : 'Simpan & Konfirmasi'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AppointmentsManagement;
