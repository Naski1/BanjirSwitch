import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFieldReports, createFieldReport, updateFieldReport, getNearbyZones, createShelter } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import LocationPickerMap from '../components/LocationPickerMap';
import { getDisasterLabel, getDisasterIcon, timeAgo, formatDate } from '../utils/helpers';
import {
    LayoutDashboard, Map as MapIcon, FileText, PlusCircle,
    LogOut, AlertTriangle, ShieldAlert, CheckCircle, Waves, HardHat
} from 'lucide-react';

const severityOptions = [
    { value: 'minor', label: 'Minor', color: '#06b6d4', icon: '🟢' },
    { value: 'moderate', label: 'Sedang', color: '#f59e0b', icon: '🟡' },
    { value: 'severe', label: 'Parah', color: '#f97316', icon: '🟠' },
    { value: 'extreme', label: 'Ekstrem', color: '#ef4444', icon: '🔴' },
];

const disasterTypes = [
    { value: 'flood', label: 'Banjir', icon: '🌊' },
    { value: 'landslide', label: 'Tanah Longsor', icon: '⛰️' },
    { value: 'earthquake', label: 'Gempa Bumi', icon: '🔔' },
    { value: 'fire', label: 'Kebakaran', icon: '🔥' },
    { value: 'other', label: 'Lainnya', icon: '⚠️' },
];

export default function PetugasDashboard() {
    const { user, logout } = useAuth();
    const { location } = useGeolocation();
    const [reports, setReports] = useState([]);
    const [zones, setZones] = useState([]);
    const [buildingTypes, setBuildingTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        disaster_type: 'flood',
        severity: 'moderate',
        water_level_cm: '',
        affected_people: '',
        road_accessible: true,
        needs_evacuation: false,
        description: '',
        lat: '',
        lng: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [shelterFormData, setShelterFormData] = useState({
        name: '', address: '', lat: '', lng: '', capacity: '',
        type: 'community_center', facilities: [], contact: '', is_open: true
    });
    const [shelterFormLoading, setShelterFormLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [locationUsed, setLocationUsed] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [showManualCoords, setShowManualCoords] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Auto-fill location when available
    useEffect(() => {
        if (location && !locationUsed && !formData.lat && !formData.lng) {
            setFormData(p => ({
                ...p,
                lat: location.lat.toFixed(6),
                lng: location.lng.toFixed(6),
            }));
            setLocationUsed(true);
        }
    }, [location]);

    async function loadData() {
        setLoading(true);
        try {
            const apiFetchTypes = async () => {
                const token = localStorage.getItem('access_token');
                const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'}/building-types/`, { headers });
                if (!res.ok) throw new Error('API Error');
                return res.json();
            };

            const [reportsData, zonesData, bTypesData] = await Promise.allSettled([
                getFieldReports(),
                location ? getNearbyZones(location.lat, location.lng, 30) : Promise.resolve([]),
                apiFetchTypes(),
            ]);
            if (reportsData.status === 'fulfilled') setReports(reportsData.value || []);
            if (zonesData.status === 'fulfilled') setZones(zonesData.value || []);
            if (bTypesData.status === 'fulfilled') setBuildingTypes(bTypesData.value || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    function handleUseMyLocation() {
        setGettingLocation(true);
        if (!navigator.geolocation) {
            setFormError('Browser tidak mendukung GPS. Silakan isi koordinat manual.');
            setShowManualCoords(true);
            setGettingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(p => ({
                    ...p,
                    lat: pos.coords.latitude.toFixed(6),
                    lng: pos.coords.longitude.toFixed(6),
                }));
                setLocationUsed(true);
                setGettingLocation(false);
                setFormError('');
            },
            (err) => {
                setFormError('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif, atau isi manual.');
                setShowManualCoords(true);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    async function handleCreateReport(e) {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setFormLoading(true);
        try {
            const payload = {
                disaster_type: formData.disaster_type,
                severity: formData.severity,
                water_level_cm: formData.water_level_cm ? parseInt(formData.water_level_cm) : null,
                affected_people: formData.affected_people ? parseInt(formData.affected_people) : null,
                road_accessible: formData.road_accessible,
                needs_evacuation: formData.needs_evacuation,
                description: formData.description || null,
                lat: formData.lat ? parseFloat(formData.lat) : (location?.lat || null),
                lng: formData.lng ? parseFloat(formData.lng) : (location?.lng || null),
            };
            await createFieldReport(payload);
            setFormSuccess('✅ Laporan berhasil dibuat!');
            setShowForm(false);
            await loadData();
            setFormData(prev => ({ ...prev, description: '', water_level_cm: '', affected_people: '' }));
        } catch (err) {
            setFormError(err.message || 'Gagal membuat laporan');
        }
        setFormLoading(false);
    }

    async function handleStatusChange(reportId, newStatus) {
        try {
            await updateFieldReport(reportId, { status: newStatus });
            await loadData();
        } catch (err) {
            alert('Gagal: ' + err.message);
        }
    }

    async function handleCreateShelter(e) {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setShelterFormLoading(true);
        try {
            const payload = { ...shelterFormData, capacity: parseInt(shelterFormData.capacity) || 0 };
            if (!payload.lat || !payload.lng) {
                if (location?.lat) {
                    payload.lat = location.lat;
                    payload.lng = location.lng;
                } else {
                    throw new Error("Lengkapi koordinat lokasi shelter.");
                }
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

    const activeReports = reports.filter(r => r.status === 'active');
    const resolvedReports = reports.filter(r => r.status === 'resolved');
    const filteredReports = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);

    if (loading) {
        return (
            <div className="page"><div className="loading-container"><div className="loading-spinner" /><span className="loading-text">Memuat dashboard petugas...</span></div></div>
        );
    }

    const navigationLinks = [
        { key: 'overview', label: 'Laporan Saya', icon: <FileText size={20} /> },
        { key: 'create', label: 'Input Bencana', icon: <PlusCircle size={20} /> },
        { key: 'create_shelter', label: 'Input Posko', icon: <PlusCircle size={20} /> },
        { key: 'zones', label: 'Zona Aktif', icon: <AlertTriangle size={20} /> },
    ];

    return (
        <div className="dashboard-layout">

            {/* Sidebar Navigation */}
            <aside className="dashboard-sidebar">
                <div className="dashboard-sidebar-header">
                    <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HardHat size={18} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>Petugas Lapangan</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>BanjirWatch Ops</div>
                    </div>
                </div>

                <nav className="dashboard-sidebar-menu">
                    {navigationLinks.map(link => (
                        <button
                            key={link.key}
                            className={`sidebar-link ${activeTab === link.key ? 'active' : ''}`}
                            onClick={() => { setActiveTab(link.key); if (link.key.startsWith('create')) setShowForm(true); }}
                        >
                            <span className="sidebar-icon">{link.icon}</span>
                            {link.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: '20px' }}>
                    <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <strong>Wilayah Tugas:</strong><br />
                        {user?.village_name || 'Seluruh Area'}
                    </div>
                    <button className="btn btn-outline" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
                        <LogOut size={16} /> Keluar
                    </button>
                </div>
            </aside>

            {/* Main Content Workspace */}
            <main className="dashboard-main">

                {/* Topbar for current active view title */}
                <header className="dashboard-topbar">
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{navigationLinks.find(n => n.key === activeTab)?.label}</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Selamat bertugas, {user?.full_name || 'Petugas'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="badge badge-success">Siaga Bencana</span>
                    </div>
                </header>

                <div className="dashboard-content">

                    {formSuccess && (
                        <div style={{ padding: '12px 16px', background: 'var(--color-success-bg)', borderRadius: 8, color: 'var(--color-success)', fontWeight: 600, marginBottom: 16 }}>
                            {formSuccess}
                        </div>
                    )}

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Stats */}
                            <div className="stats-grid fade-in">
                                <div className="stat-card" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="stat-icon danger" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}><FileText size={20} /></div>
                                    <div><div className="stat-value">{reports.length}</div><div className="stat-label">Total Laporan</div></div>
                                </div>
                                <div className="stat-card" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="stat-icon warning" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}><AlertTriangle size={20} /></div>
                                    <div><div className="stat-value">{activeReports.length}</div><div className="stat-label">Masih Aktif</div></div>
                                </div>
                                <div className="stat-card" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="stat-icon success" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}><CheckCircle size={20} /></div>
                                    <div><div className="stat-value">{resolvedReports.length}</div><div className="stat-label">Terselesaikan</div></div>
                                </div>
                                <div className="stat-card" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div className="stat-icon info" style={{ color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)' }}><MapIcon size={20} /></div>
                                    <div><div className="stat-value">{zones.length}</div><div className="stat-label">Zona Bencana</div></div>
                                </div>
                            </div>


                            <div className="fade-in">
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    {['all', 'active', 'resolved', 'outdated'].map(s => (
                                        <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setStatusFilter(s)}>{s === 'all' ? 'Semua' : s}</button>
                                    ))}
                                </div>
                                {filteredReports.length === 0 ? (
                                    <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Belum ada laporan.</div></div>
                                ) : (
                                    <div className="report-list">
                                        {filteredReports.map((r, i) => (
                                            <div key={r.id} className={`report-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                                                <div className="report-header">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: '1.3rem' }}>{getDisasterIcon(r.disaster_type)}</span>
                                                        <div>
                                                            <div className="report-title">{r.location_name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.kelurahan}, {r.kecamatan}, {r.kota}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        <span className={`badge ${r.status === 'active' ? 'badge-danger' : r.status === 'resolved' ? 'badge-success' : 'badge-neutral'}`}>
                                                            {r.status}
                                                        </span>
                                                        <span className={`badge ${r.severity === 'extreme' ? 'badge-danger' : r.severity === 'severe' ? 'badge-warning' : 'badge-info'}`}>
                                                            {r.severity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="report-desc">{r.description}</div>
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '8px 0' }}>
                                                    {r.water_level_cm != null && <span>💧 {r.water_level_cm} cm</span>}
                                                    {r.affected_people != null && <span>👥 {r.affected_people} orang</span>}
                                                    <span>{r.road_accessible ? '🟢 Jalan OK' : '🔴 Jalan Rusak'}</span>
                                                    {r.needs_evacuation && <span className="pulse" style={{ color: 'var(--color-danger)' }}>🚨 Perlu Evakuasi</span>}
                                                </div>
                                                <div className="report-meta">
                                                    <span>🕐 {timeAgo(r.created_at)}</span>
                                                    {r.lat && <span>📍 {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}</span>}
                                                </div>
                                                {r.status === 'active' && (
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                        <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(r.id, 'resolved')}>✅ Selesaikan</button>
                                                        <button className="btn btn-sm btn-outline" onClick={() => handleStatusChange(r.id, 'outdated')}>📦 Kedaluwarsa</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Create Tab */}
                    {activeTab === 'create' && (
                        <div className="fade-in">
                            <div className="glass-card" style={{ maxWidth: 700 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>🆕 Input Laporan Bencana Baru</h3>
                                {formError && <div className="login-error" style={{ marginBottom: 16 }}>⚠️ {formError}</div>}
                                <form onSubmit={handleCreateReport} className="dash-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Jenis Bencana *</label>
                                            <div className="radio-group">
                                                {disasterTypes.map(d => (
                                                    <label key={d.value} className={`radio-card ${formData.disaster_type === d.value ? 'selected' : ''}`}>
                                                        <input type="radio" name="disaster_type" value={d.value} checked={formData.disaster_type === d.value}
                                                            onChange={e => setFormData(p => ({ ...p, disaster_type: e.target.value }))} />
                                                        <span>{d.icon} {d.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Tingkat Keparahan *</label>
                                            <div className="radio-group">
                                                {severityOptions.map(s => (
                                                    <label key={s.value} className={`radio-card ${formData.severity === s.value ? 'selected' : ''}`}>
                                                        <input type="radio" name="severity" value={s.value} checked={formData.severity === s.value}
                                                            onChange={e => setFormData(p => ({ ...p, severity: e.target.value }))} />
                                                        <span>{s.icon} {s.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label>💧 Ketinggian Air (cm)</label>
                                            <input type="number" placeholder="Contoh: 50" value={formData.water_level_cm}
                                                onChange={e => setFormData(p => ({ ...p, water_level_cm: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label>👥 Jumlah Terdampak</label>
                                            <input type="number" placeholder="Contoh: 100" value={formData.affected_people}
                                                onChange={e => setFormData(p => ({ ...p, affected_people: e.target.value }))} />
                                        </div>
                                    </div>

                                    {/* ===== LOKASI SECTION (user-friendly) ===== */}
                                    <div className="form-group">
                                        <label>📍 Lokasi Kejadian</label>
                                        <div className="location-picker">
                                            {formData.lat && formData.lng ? (
                                                <div className="location-status location-set">
                                                    <div className="location-status-icon">✅</div>
                                                    <div className="location-status-info">
                                                        <div className="location-status-title">Lokasi Terdeteksi</div>
                                                        <div className="location-status-coords">
                                                            {parseFloat(formData.lat).toFixed(4)}°, {parseFloat(formData.lng).toFixed(4)}°
                                                        </div>
                                                    </div>
                                                    <button type="button" className="btn btn-sm btn-outline"
                                                        onClick={handleUseMyLocation} disabled={gettingLocation}>
                                                        {gettingLocation ? '⏳' : '🔄'} Perbarui
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="location-status location-empty">
                                                    <div className="location-status-icon">📍</div>
                                                    <div className="location-status-info">
                                                        <div className="location-status-title">Lokasi belum ditentukan</div>
                                                        <div className="location-status-coords">Klik tombol untuk mendeteksi lokasi Anda saat ini</div>
                                                    </div>
                                                </div>
                                            )}
                                            <button type="button" className="btn btn-primary location-btn"
                                                onClick={handleUseMyLocation} disabled={gettingLocation}
                                                style={{ width: '100%', marginTop: 8 }}>
                                                {gettingLocation ? (
                                                    <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Mendeteksi lokasi GPS...</>
                                                ) : (
                                                    '📍 Gunakan Lokasi Saya Saat Ini'
                                                )}
                                            </button>
                                            <button type="button"
                                                className="btn-text"
                                                style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                onClick={() => setShowManualCoords(!showManualCoords)}>
                                                {showManualCoords ? 'Sembunyikan Peta / Input Manual' : 'Atau pilih di Peta / Isi manual →'}
                                            </button>
                                            {showManualCoords && (
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ marginBottom: 16 }}>
                                                        <LocationPickerMap
                                                            lat={formData.lat}
                                                            lng={formData.lng}
                                                            onChange={(lat, lng) => setFormData(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
                                                        />
                                                    </div>
                                                    <div className="form-row two-col">
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '0.72rem' }}>Latitude</label>
                                                            <input type="text" placeholder="-6.2088"
                                                                value={formData.lat} onChange={e => setFormData(p => ({ ...p, lat: e.target.value }))} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label style={{ fontSize: '0.72rem' }}>Longitude</label>
                                                            <input type="text" placeholder="106.8456"
                                                                value={formData.lng} onChange={e => setFormData(p => ({ ...p, lng: e.target.value }))} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-row two-col">
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" checked={formData.road_accessible}
                                                    onChange={e => setFormData(p => ({ ...p, road_accessible: e.target.checked }))} />
                                                🛣️ Jalan Dapat Diakses
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" checked={formData.needs_evacuation}
                                                    onChange={e => setFormData(p => ({ ...p, needs_evacuation: e.target.checked }))} />
                                                🚨 Perlu Evakuasi
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>📝 Deskripsi Kondisi</label>
                                        <textarea rows={4} placeholder="Jelaskan kondisi di lapangan..." value={formData.description}
                                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ width: '100%', marginTop: 8 }}>
                                        {formLoading ? 'Mengirim...' : '📤 Kirim Laporan'}
                                    </button>
                                </form>
                            </div>
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
                                                <option value="" style={{ color: '#000' }}>-- Pilih Tipe Bangunan --</option>
                                                {buildingTypes.map(bt => (
                                                    <option key={bt.id} value={bt.name} style={{ color: '#000' }}>{bt.name}</option>
                                                ))}
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
                                            {shelterFormData.lat && shelterFormData.lng ? (
                                                <div className="location-status location-set">
                                                    <div className="location-status-icon">✅</div>
                                                    <div className="location-status-info">
                                                        <div className="location-status-title">Lokasi Terdeteksi</div>
                                                        <div className="location-status-coords">
                                                            {parseFloat(shelterFormData.lat).toFixed(4)}°, {parseFloat(shelterFormData.lng).toFixed(4)}°
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="location-status location-empty">
                                                    <div className="location-status-icon">📍</div>
                                                    <div className="location-status-info">
                                                        <div className="location-status-title">Lokasi belum ditentukan</div>
                                                        <div className="location-status-coords">Klik tombol untuk deteksi</div>
                                                    </div>
                                                </div>
                                            )}
                                            <button type="button" className="btn btn-primary location-btn"
                                                onClick={() => {
                                                    if (location) {
                                                        setShelterFormData(p => ({ ...p, lat: location.lat, lng: location.lng }));
                                                    } else {
                                                        alert("GPS tidak terdeteksi. Silakan ketik lintang/bujur secara manual.");
                                                    }
                                                }}
                                                style={{ width: '100%', marginTop: 8 }}>
                                                📍 Gunakan Lokasi Saya Saat Ini
                                            </button>

                                            <div style={{ marginTop: 16, marginBottom: 16 }}>
                                                <LocationPickerMap
                                                    lat={shelterFormData.lat}
                                                    lng={shelterFormData.lng}
                                                    onChange={(lat, lng) => setShelterFormData(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
                                                />
                                            </div>

                                            <div className="form-row two-col" style={{ marginTop: 12 }}>
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

                    {/* Zones Tab */}
                    {activeTab === 'zones' && (
                        <div className="fade-in">
                            {zones.length === 0 ? (
                                <div className="empty-state"><div className="empty-icon">🗺️</div><div className="empty-text">Tidak ada zona bencana aktif.</div></div>
                            ) : (
                                <div className="report-list">
                                    {zones.map((z, i) => (
                                        <div key={z.id} className={`report-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                                            <div className="report-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: z.risk_level >= 4 ? '#ef4444' : z.risk_level >= 3 ? '#f59e0b' : '#10b981' }} />
                                                    <div className="report-title">{z.name}</div>
                                                </div>
                                                <span className={`badge ${z.risk_level >= 4 ? 'badge-danger' : z.risk_level >= 3 ? 'badge-warning' : 'badge-success'}`}>
                                                    Level {z.risk_level}/5
                                                </span>
                                            </div>
                                            <div className="report-desc">{z.description}</div>
                                            <div className="report-meta">
                                                <span>📏 {z.distance_km} km</span>
                                                <span>🏷️ {getDisasterLabel(z.disaster_type)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
