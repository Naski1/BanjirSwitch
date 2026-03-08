import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getUsers, getPetugasCoverage, getActiveAlerts,
    getNearbyZones, getFieldReports, createShelter
} from '../services/api';
import LocationPickerMap from '../components/LocationPickerMap';
import { formatDate, timeAgo, getDisasterLabel, getDisasterIcon } from '../utils/helpers';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [coverage, setCoverage] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [fieldReports, setFieldReports] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('all');
    const [shelterFormData, setShelterFormData] = useState({
        name: '', address: '', lat: '', lng: '', capacity: '',
        type: 'community_center', facilities: [], contact: '', is_open: true
    });
    const [shelterFormLoading, setShelterFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const results = await Promise.allSettled([
            getUsers(),
            getPetugasCoverage(),
            getActiveAlerts({ limit: 50 }),
            getFieldReports(),
            getNearbyZones(-6.2088, 106.8456, 50),
        ]);
        if (results[0].status === 'fulfilled') setUsers(results[0].value || []);
        if (results[1].status === 'fulfilled') setCoverage(results[1].value || []);
        if (results[2].status === 'fulfilled') setAlerts(results[2].value || []);
        if (results[3].status === 'fulfilled') setFieldReports(results[3].value || []);
        if (results[4].status === 'fulfilled') setZones(results[4].value || []);
        setLoading(false);
    }

    async function handleCreateShelter(e) {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setShelterFormLoading(true);
        try {
            const payload = { ...shelterFormData, capacity: parseInt(shelterFormData.capacity) || 0 };
            if (!payload.lat || !payload.lng) {
                throw new Error("Lengkapi koordinat lokasi shelter.");
            } else {
                payload.lat = parseFloat(payload.lat);
                payload.lng = parseFloat(payload.lng);
            }
            await createShelter(payload);
            setFormSuccess('✅ Shelter berhasil ditambahkan!');
            setShelterFormData({
                name: '', address: '', lat: '', lng: '', capacity: '', type: 'community_center', facilities: [], contact: '', is_open: true
            });
            setActiveTab('overview');
        } catch (err) {
            setFormError(err.message || 'Gagal membuat shelter');
        }
        setShelterFormLoading(false);
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    const petugasCount = users.filter(u => u.role === 'petugas').length;
    const userCount = users.filter(u => u.role === 'user').length;
    const filteredUsers = userFilter === 'all' ? users : users.filter(u => u.role === userFilter);
    const activeFieldReports = fieldReports.filter(r => r.status === 'active');

    if (loading) {
        return <div className="page"><div className="loading-container"><div className="loading-spinner" /><span className="loading-text">Memuat dashboard admin...</span></div></div>;
    }

    return (
        <div className="dashboard-page">
            {/* Header */}
            <div className="dash-header">
                <div className="dash-header-info">
                    <div className="dash-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>👑</div>
                    <div>
                        <h1 className="dash-title">Dashboard Administrator</h1>
                        <p className="dash-subtitle">
                            Selamat datang, <strong>{user?.full_name || 'Admin'}</strong> — Kendali penuh sistem BanjirWatch
                        </p>
                    </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={logout}>🚪 Logout</button>
            </div>

            {/* Stats */}
            <div className="stats-grid fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon info">👥</div><div><div className="stat-value">{users.length}</div><div className="stat-label">Total Pengguna</div></div></div>
                <div className="stat-card"><div className="stat-icon success">👷</div><div><div className="stat-value">{petugasCount}</div><div className="stat-label">Petugas Aktif</div></div></div>
                <div className="stat-card"><div className="stat-icon danger">🚨</div><div><div className="stat-value">{alerts.length}</div><div className="stat-label">Peringatan Aktif</div></div></div>
                <div className="stat-card"><div className="stat-icon warning">📋</div><div><div className="stat-value">{activeFieldReports.length}</div><div className="stat-label">Laporan Aktif</div></div></div>
                <div className="stat-card"><div className="stat-icon info">🗺️</div><div><div className="stat-value">{zones.length}</div><div className="stat-label">Zona Bencana</div></div></div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginTop: 24 }}>
                {[
                    { key: 'overview', label: '📊 Ringkasan' },
                    { key: 'users', label: `👥 Pengguna (${users.length})` },
                    { key: 'coverage', label: '🗺️ Cakupan Petugas' },
                    { key: 'reports', label: `📋 Laporan Lapangan (${fieldReports.length})` },
                    { key: 'alerts', label: `🚨 Peringatan (${alerts.length})` },
                    { key: 'create_shelter', label: '🏠 Input Shelter' },
                ].map(t => (
                    <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}>{t.label}</button>
                ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
                    {/* Recent Reports */}
                    <div className="glass-card">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📋 Laporan Terbaru</h3>
                        {fieldReports.slice(0, 5).map(r => (
                            <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.2rem' }}>{getDisasterIcon(r.disaster_type)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.location_name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{r.severity} • {timeAgo(r.created_at)}</div>
                                </div>
                                <span className={`badge ${r.status === 'active' ? 'badge-danger' : 'badge-success'}`}>{r.status}</span>
                            </div>
                        ))}
                        {fieldReports.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Belum ada laporan</div>}
                    </div>

                    {/* Recent Alerts */}
                    <div className="glass-card">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>🚨 Peringatan Aktif</h3>
                        {alerts.slice(0, 5).map(a => (
                            <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className={`badge ${a.severity === 'extreme' || a.severity === 'severe' ? 'badge-danger' : 'badge-warning'}`}>{a.severity}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.headline}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{timeAgo(a.sent_at)}</div>
                                </div>
                            </div>
                        ))}
                        {alerts.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Tidak ada peringatan aktif ✅</div>}
                    </div>

                    {/* User Distribution */}
                    <div className="glass-card">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>👥 Distribusi Pengguna</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Admin', count: adminCount, color: '#8b5cf6', icon: '👑' },
                                { label: 'Petugas', count: petugasCount, color: '#2563eb', icon: '👷' },
                                { label: 'Warga', count: userCount, color: '#10b981', icon: '👤' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                                            <span>{item.label}</span><strong>{item.count}</strong>
                                        </div>
                                        <div className="capacity-bar">
                                            <div className="capacity-fill" style={{ width: `${users.length ? (item.count / users.length) * 100 : 0}%`, background: item.color }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {['all', 'admin', 'petugas', 'user'].map(f => (
                            <button key={f} className={`btn btn-sm ${userFilter === f ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setUserFilter(f)}>{f === 'all' ? 'Semua' : f}</button>
                        ))}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dash-table">
                            <thead>
                                <tr><th>Nama</th><th>Telepon</th><th>Role</th><th>Wilayah</th><th>Status</th><th>Terdaftar</th></tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.full_name || '-'}</td>
                                        <td>{u.phone}</td>
                                        <td><span className={`badge ${u.role === 'admin' ? 'badge-info' : u.role === 'petugas' ? 'badge-warning' : 'badge-neutral'}`}>{u.role}</span></td>
                                        <td style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {u.full_address || u.village_name || '-'}
                                        </td>
                                        <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                                        <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatDate(u.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Coverage Tab */}
            {activeTab === 'coverage' && (
                <div className="fade-in">
                    {coverage.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">🗺️</div><div className="empty-text">Belum ada data cakupan petugas.</div></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {coverage.map((c, i) => (
                                <div key={i} className="glass-card" style={{ padding: 16 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>📍 {c.village_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>{c.district_name}, {c.regency_name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '1.5rem' }}>👷</span>
                                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-accent-light)' }}>{c.total_petugas}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Petugas</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="fade-in report-list">
                    {fieldReports.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Belum ada laporan lapangan.</div></div>
                    ) : fieldReports.map((r, i) => (
                        <div key={r.id} className={`report-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                            <div className="report-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{getDisasterIcon(r.disaster_type)}</span>
                                    <div className="report-title">{r.location_name}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span className={`badge ${r.status === 'active' ? 'badge-danger' : 'badge-success'}`}>{r.status}</span>
                                    <span className="badge badge-neutral">{r.severity}</span>
                                </div>
                            </div>
                            <div className="report-desc">{r.description}</div>
                            <div className="report-meta">
                                <span>👷 Petugas #{r.petugas_id}</span>
                                <span>🕐 {timeAgo(r.created_at)}</span>
                                {r.water_level_cm != null && <span>💧 {r.water_level_cm} cm</span>}
                                {r.affected_people != null && <span>👥 {r.affected_people}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
                <div className="fade-in alert-list">
                    {alerts.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-text">Tidak ada peringatan aktif.</div></div>
                    ) : alerts.map((a, i) => (
                        <div key={a.id} className={`alert-card severity-${a.severity} fade-in fade-in-${Math.min(i + 1, 5)}`}>
                            <div className="alert-content">
                                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                    <span className={`badge ${a.severity === 'extreme' || a.severity === 'severe' ? 'badge-danger' : 'badge-warning'}`}>{a.severity}</span>
                                    {a.event_type && <span className="badge badge-neutral">{getDisasterLabel(a.event_type)}</span>}
                                </div>
                                <div className="alert-headline">{a.headline}</div>
                                <div className="alert-description">{a.description}</div>
                                <div className="alert-meta"><span>🕐 {timeAgo(a.sent_at)}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Shelter Tab */}
            {activeTab === 'create_shelter' && (
                <div className="fade-in">
                    <div className="glass-card" style={{ maxWidth: 700 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>🏠 Input Lokasi Pengungsian / Shelter</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>Tambahkan data posko pengungsian baru untuk ditampilkan di Peta Publik.</p>
                        {formError && <div className="login-error" style={{ marginBottom: 16 }}>⚠️ {formError}</div>}

                        <form onSubmit={handleCreateShelter} className="dash-form">
                            <div className="form-group">
                                <label>Nama Shelter *</label>
                                <input type="text" required placeholder="Contoh: Posko Pengungsian Balai Desa" value={shelterFormData.name}
                                    onChange={e => setShelterFormData(p => ({ ...p, name: e.target.value }))} />
                            </div>

                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Tipe Bangunan *</label>
                                    <select value={shelterFormData.type} onChange={e => setShelterFormData(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <option value="school" style={{ color: '#000' }}>Sekolah</option>
                                        <option value="mosque" style={{ color: '#000' }}>Rumah Ibadah</option>
                                        <option value="community_center" style={{ color: '#000' }}>Balai Warga / Gedung Umum</option>
                                        <option value="stadium" style={{ color: '#000' }}>GOR / Stadion</option>
                                        <option value="other" style={{ color: '#000' }}>Lainnya</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Kapasitas Daya Tampung *</label>
                                    <input type="number" required min="1" placeholder="Contoh: 200" value={shelterFormData.capacity}
                                        onChange={e => setShelterFormData(p => ({ ...p, capacity: e.target.value }))} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Fasilitas Tersedia</label>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '10px 0' }}>
                                    {[
                                        { id: 'toilet', label: 'Toilet' },
                                        { id: 'dapur_umum', label: 'Dapur Umum' },
                                        { id: 'p3k', label: 'Medis / P3K' },
                                        { id: 'mushola', label: 'Tempat Ibadah' },
                                        { id: 'air_bersih', label: 'Air Bersih' }
                                    ].map(f => (
                                        <label key={f.id} className="checkbox-label" style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem' }}>
                                            <input type="checkbox" checked={shelterFormData.facilities.includes(f.id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setShelterFormData(p => ({
                                                        ...p,
                                                        facilities: checked
                                                            ? [...p.facilities, f.id]
                                                            : p.facilities.filter(x => x !== f.id)
                                                    }));
                                                }} />
                                            {f.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>📍 Koordinat Lokasi Shelter *</label>
                                <div className="location-picker">
                                    <button type="button" className="btn btn-primary location-btn"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    pos => setShelterFormData(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
                                                    err => alert("Gagal mendapatkan lokasi GPS. Silakan pastikan izin diberikan dan HTTPS digunakan. Error: " + err.message)
                                                );
                                            } else {
                                                alert("GPS tidak didukung browser ini. Silakan ketik lintang/bujur secara manual.");
                                            }
                                        }}
                                        style={{ width: '100%', marginBottom: 12 }}>
                                        📍 Gunakan Lokasi Saya Saat Ini
                                    </button>

                                    <div style={{ marginTop: 16, marginBottom: 16 }}>
                                        <LocationPickerMap
                                            lat={shelterFormData.lat}
                                            lng={shelterFormData.lng}
                                            onChange={(lat, lng) => setShelterFormData(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
                                        />
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.72rem' }}>Latitude</label>
                                            <input type="text" required placeholder="-6.2088"
                                                value={shelterFormData.lat} onChange={e => setShelterFormData(p => ({ ...p, lat: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.72rem' }}>Longitude</label>
                                            <input type="text" required placeholder="106.8456"
                                                value={shelterFormData.lng} onChange={e => setShelterFormData(p => ({ ...p, lng: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Alamat Lengkap</label>
                                <input type="text" placeholder="Jl. Raya Desa No 123..." value={shelterFormData.address}
                                    onChange={e => setShelterFormData(p => ({ ...p, address: e.target.value }))} />
                            </div>

                            <div className="form-group">
                                <label>Kontak Darurat (Telp)</label>
                                <input type="text" placeholder="0812xxxxxx" value={shelterFormData.contact}
                                    onChange={e => setShelterFormData(p => ({ ...p, contact: e.target.value }))} />
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="checkbox-label" style={{ background: 'var(--color-success-bg)', padding: '12px', borderRadius: 8 }}>
                                    <input type="checkbox" checked={shelterFormData.is_open}
                                        onChange={e => setShelterFormData(p => ({ ...p, is_open: e.target.checked }))} />
                                    ✅ Shelter Sedang Buka / Aktif
                                </label>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={shelterFormLoading} style={{ width: '100%', marginTop: 16 }}>
                                {shelterFormLoading ? 'Menyimpan...' : '💾 Simpan Shelter Baru'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
