import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getUsers, getPetugasCoverage, getActiveAlerts,
    getNearbyZones, getFieldReports, createShelter,
    createUser, updateUser, deleteUser, getShelters,
    assignPetugasToShelter, unassignPetugasFromShelter, deleteShelter,
    deleteFieldReport
} from '../services/api';
import LocationPickerMap from '../components/LocationPickerMap';
import RegionPicker from '../components/RegionPicker';
import { formatDate, timeAgo, getDisasterLabel, getDisasterIcon } from '../utils/helpers';
import { 
    Edit, Trash2, LayoutDashboard, Users, UserCog, FileText, 
    Bell, Building, PlusCircle, Search, LogOut, Settings, 
    MoreHorizontal, MapPin, Activity, ShieldCheck, ChevronRight,
    Command, HelpCircle, User, Briefcase, AlertTriangle, Droplets,
    HardHat, Calendar, Phone, Menu, X
} from 'lucide-react';

// Removed shadcn/ui imports to align with PetugasDashboard design system

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [coverage, setCoverage] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [fieldReports, setFieldReports] = useState([]);
    const [zones, setZones] = useState([]);
    const [buildingTypes, setBuildingTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userFilter, setUserFilter] = useState('all');

    // Time filter states
    const [timeFilter, setTimeFilter] = useState('this_month');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    const [shelterFormData, setShelterFormData] = useState({
        name: '', address: '', lat: '', lng: '', capacity: '',
        type: 'community_center', facilities: [], contact: '', is_open: true
    });
    const [shelterFormLoading, setShelterFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    
    // New states for shelters list
    const [shelters, setShelters] = useState([]);
    const [sheltersLoading, setSheltersLoading] = useState(false);
    const [sheltersPage, setSheltersPage] = useState(0);
    const [hasMoreShelters, setHasMoreShelters] = useState(true);
    const [showShelterForm, setShowShelterForm] = useState(false);
    const [assignLoading, setAssignLoading] = useState(null);
    const [assignMsg, setAssignMsg] = useState('');

    const [bTypeForm, setBTypeForm] = useState({ id: null, name: '', description: '', icon: '' });
    const [bTypeLoading, setBTypeLoading] = useState(false);

    // New states for coverage list view
    const [coverageSearch, setCoverageSearch] = useState('');
    const [coveragePage, setCoveragePage] = useState(1);
    const [expandedCoverageId, setExpandedCoverageId] = useState(null);
    const itemsPerPage = 10;
    
    // New states for reports list view
    const [reportsSearch, setReportsSearch] = useState('');
    const [reportsPage, setReportsPage] = useState(1);
    
    const [userForm, setUserForm] = useState({
        id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas',
        province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001',
        is_active: true
    });
    const [userFormLoading, setUserFormLoading] = useState(false);
    
    // Responsive states
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (activeTab === 'shelter') {
            fetchShelters(0);
        }
    }, [activeTab]);

    async function fetchShelters(page = 0) {
        setSheltersLoading(true);
        try {
            const limit = 10;
            const res = await getShelters({ limit, skip: page * limit });
            setShelters(res);
            setSheltersPage(page);
            setHasMoreShelters(res.length === limit);
        } catch (err) {
            console.error("Failed to load shelters", err);
        }
        setSheltersLoading(false);
    }

    async function loadData() {
        setLoading(true);
        try {
            const apiFetch = async (endpoint) => {
                const token = localStorage.getItem('access_token');
                const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'}${endpoint}`, { headers });
                if (!res.ok) throw new Error('API Error');
                return res.json();
            };

            const results = await Promise.allSettled([
                getUsers(), getPetugasCoverage(), getActiveAlerts({ limit: 50 }),
                getFieldReports(), getNearbyZones(-6.2088, 106.8456, 50), apiFetch('/building-types/')
            ]);

            if (results[0].status === 'fulfilled') setUsers(results[0].value || []);
            if (results[1].status === 'fulfilled') setCoverage(results[1].value || []);
            if (results[2].status === 'fulfilled') setAlerts(results[2].value || []);
            if (results[3].status === 'fulfilled') setFieldReports(results[3].value || []);
            if (results[4].status === 'fulfilled') setZones(results[4].value || []);
            if (results[5].status === 'fulfilled') setBuildingTypes(results[5].value || []);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }

    async function handleCreateShelter(e) {
        e.preventDefault();
        setFormError(''); setFormSuccess(''); setShelterFormLoading(true);
        try {
            const payload = { ...shelterFormData, capacity: parseInt(shelterFormData.capacity) || 0 };
            if (!payload.lat || !payload.lng) throw new Error("Lengkapi koordinat lokasi shelter.");
            payload.lat = parseFloat(payload.lat); payload.lng = parseFloat(payload.lng);
            await createShelter(payload);
            setFormSuccess('✅ Shelter berhasil ditambahkan!');
            setShelterFormData({ name: '', address: '', lat: '', lng: '', capacity: '', type: 'community_center', facilities: [], contact: '', is_open: true });
            setShowShelterForm(false);
            fetchShelters(0);
        } catch (err) { setFormError(err.message || 'Gagal membuat shelter'); }
        setShelterFormLoading(false);
    }

    async function handleSaveBuildingType(e) {
        e.preventDefault();
        setBTypeLoading(true); setFormError('');
        const token = localStorage.getItem('access_token');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' };
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

        try {
            const method = bTypeForm.id ? 'PUT' : 'POST';
            const url = bTypeForm.id ? `${apiUrl}/building-types/${bTypeForm.id}` : `${apiUrl}/building-types/`;
            const payload = { ...bTypeForm }; delete payload.id;
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(await res.text());
            setBTypeForm({ id: null, name: '', description: '', icon: '' });
            loadData();
        } catch (error) { setFormError('Gagal menyimpan tipe bangunan: ' + error.message); }
        setBTypeLoading(false);
    }

    async function handleDeleteBuildingType(id) {
        if (!confirm('Hapus tipe bangunan master ini?')) return;
        const token = localStorage.getItem('access_token');
        try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'}/building-types/${id}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            loadData();
        } catch (error) { alert('Gagal menghapus: ' + error.message); }
    }

    async function handleSaveUser(e) {
        e.preventDefault();
        setUserFormLoading(true); setFormError('');
        try {
            const payload = { ...userForm };
            if (!payload.email) delete payload.email;
            if (userForm.id) {
                if (!payload.password) delete payload.password;
                delete payload.id;
                await updateUser(userForm.id, payload);
            } else {
                delete payload.id;
                await createUser(payload);
            }
            setActiveTab('users');
            setUserForm({ id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas', province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001', is_active: true });
            loadData();
        } catch (error) { setFormError(`Gagal ${userForm.id ? 'mengubah' : 'membuat'} user: ` + error.message); }
        setUserFormLoading(false);
    }

    async function handleDeleteUser(id) {
        if (!confirm('Hapus pengguna ini secara permanen?')) return;
        try { await deleteUser(id); loadData(); } catch (error) { alert('Gagal menghapus pengguna: ' + error.message); }
    }

    async function handleDeleteFieldReport(id) {
        if (!confirm('Hapus laporan lapangan ini permanen?')) return;
        try {
            await deleteFieldReport(id);
            setFormSuccess('Laporan berhasil dihapus');
            loadData();
        } catch (err) {
            alert('Gagal menghapus laporan: ' + err.message);
        }
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    const petugasCount = users.filter(u => u.role === 'petugas').length;
    const userCount = users.filter(u => u.role === 'user').length;
    const filteredUsers = userFilter === 'all' ? users : users.filter(u => u.role === userFilter);

    // Time filter helper
    function getTimeRange(preset) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (preset) {
            case 'today': return { from: startOfDay, to: now };
            case 'this_week': {
                const day = now.getDay();
                const diff = day === 0 ? 6 : day - 1; // Monday start
                const monday = new Date(startOfDay); monday.setDate(startOfDay.getDate() - diff);
                return { from: monday, to: now };
            }
            case 'this_month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
            case 'last_month': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
            case 'this_year': return { from: new Date(now.getFullYear(), 0, 1), to: now };
            case 'last_year': return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
            case 'custom': {
                const from = customDateFrom ? new Date(customDateFrom) : null;
                const to = customDateTo ? new Date(customDateTo + 'T23:59:59') : null;
                return { from, to };
            }
            default: return { from: null, to: null };
        }
    }

    function filterByTime(items, timestampKey = 'timestamp') {
        if (timeFilter === 'all') return items;
        const { from, to } = getTimeRange(timeFilter);
        return items.filter(item => {
            const ts = new Date(item[timestampKey] || item.created_at || item.sent_at);
            if (from && ts < from) return false;
            if (to && ts > to) return false;
            return true;
        });
    }

    const timeFilteredReports = filterByTime(fieldReports);
    const timeFilteredAlerts = filterByTime(alerts, 'sent_at');
    const activeFieldReports = timeFilteredReports.filter(r => r.status === 'active');

    const timePresets = [
        { id: 'all', label: 'Semua' },
        { id: 'today', label: 'Hari Ini' },
        { id: 'this_week', label: 'Minggu Ini' },
        { id: 'this_month', label: 'Bulan Ini' },
        { id: 'last_month', label: 'Bulan Kemarin' },
        { id: 'this_year', label: 'Tahun Ini' },
        { id: 'last_year', label: 'Tahun Kemarin' },
        { id: 'custom', label: 'Kustom' },
    ];

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

    const navItems = [
        { id: 'overview', icon: LayoutDashboard, label: 'Dasbor' },
        { id: 'users', icon: Users, label: 'Pengguna' },
        { id: 'coverage', icon: Briefcase, label: 'Penugasan Petugas' },
        { id: 'reports', icon: FileText, label: 'Laporan Lapangan' },
        { id: 'alerts', icon: Bell, label: 'Peringatan Aktif' },
        { id: 'building_types', icon: Building, label: 'Tipe Bangunan' },
        { id: 'shelter', icon: PlusCircle, label: 'Input Posko' },
    ];

    return (
        <div className="dashboard-layout">
            <div className={`dashboard-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="dashboard-sidebar-header">
                    <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={18} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>Resilience HQ</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Panel Operasi Admin</div>
                    </div>
                </div>

                <nav className="dashboard-sidebar-menu">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <span className="sidebar-icon"><item.icon size={20} /></span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{ padding: '20px' }}>
                    <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'var(--color-bg-card)', width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                            {user?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }} className="truncate">{user?.full_name || 'Admin'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sedang Bertugas</div>
                        </div>
                    </div>
                    <button className="btn btn-outline" onClick={logout} style={{ width: '100%', justifyContent: 'center', gap: '8px' }}>
                        <LogOut size={16} /> Keluar
                    </button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
                        <button 
                            className="btn-icon mobile-toggle" 
                            style={{ marginRight: 12, background: 'none', border: 'none', color: 'var(--color-primary)' }}
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                {activeTab === 'user_form' ? 'Kelola Pengguna' : navItems.find(n => n.id === activeTab)?.label}
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                Selamat bekerja, {user?.full_name || 'Administrator'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
                            <span className="badge badge-success">Sistem Normal</span>
                            <div style={{ h: 32, w: 1, background: 'var(--color-border)' }} />
                            <button className="btn-icon" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                                <Bell size={20} />
                                <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, background: 'var(--color-danger)', borderRadius: '50%', border: '2px solid #ffffff' }}></span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        
                        {activeTab === 'overview' && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                {/* Time Filter Bar */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <label htmlFor="timeFilterSelect" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginRight: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={16} />
                                            Filter Waktu:
                                        </label>
                                        <select
                                            id="timeFilterSelect"
                                            className="overview-time-select"
                                            value={timeFilter}
                                            onChange={(e) => setTimeFilter(e.target.value)}
                                        >
                                            {timePresets.map(preset => (
                                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                                            ))}
                                        </select>

                                        {timeFilter === 'custom' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid #e5e7eb' }}>
                                                <input
                                                    type="date"
                                                    className="overview-time-date-input"
                                                    value={customDateFrom}
                                                    onChange={e => setCustomDateFrom(e.target.value)}
                                                />
                                                <span style={{ color: '#9ca3af' }}>-</span>
                                                <input
                                                    type="date"
                                                    className="overview-time-date-input"
                                                    value={customDateTo}
                                                    onChange={e => setCustomDateTo(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* KPI Grid - 4 cards in a row */}
                                <div className="overview-kpi-grid">
                                    <div className="overview-kpi-card">
                                        <div className="overview-kpi-icon overview-kpi-icon--red">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <p className="overview-kpi-value">{activeFieldReports.length.toLocaleString()}</p>
                                            <p className="overview-kpi-label">Laporan Aktif</p>
                                        </div>
                                    </div>
                                    <div className="overview-kpi-card">
                                        <div className="overview-kpi-icon overview-kpi-icon--yellow">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="overview-kpi-value">{coverage.length.toLocaleString()}</p>
                                            <p className="overview-kpi-label">Wilayah Tugas</p>
                                        </div>
                                    </div>
                                    <div className="overview-kpi-card">
                                        <div className="overview-kpi-icon overview-kpi-icon--green">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <p className="overview-kpi-value">{petugasCount.toLocaleString()}</p>
                                            <p className="overview-kpi-label">Petugas Lapangan</p>
                                        </div>
                                    </div>
                                    <div className="overview-kpi-card">
                                        <div className="overview-kpi-icon overview-kpi-icon--blue">
                                            <Droplets size={24} />
                                        </div>
                                        <div>
                                            <p className="overview-kpi-value">
                                                {timeFilteredReports.length > 0
                                                    ? (timeFilteredReports.reduce((acc, r) => acc + (r.water_level_cm || 0), 0) / (timeFilteredReports.length * 100)).toFixed(2)
                                                    : '0.00'}
                                            </p>
                                            <p className="overview-kpi-label">Rata² Tinggi Air (m)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mid Section: Reports (2/3) + Distribution (1/3) */}
                                <div className="overview-mid-section">
                                    {/* Left Column: Recent Field Reports */}
                                    <div className="overview-reports-col">
                                        <div className="overview-section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="overview-section-icon">
                                                    <Search size={20} />
                                                </span>
                                                <h3 className="overview-section-title">Laporan Lapangan Terbaru</h3>
                                            </div>
                                            <button className="overview-link-btn" onClick={() => setActiveTab('reports')}>LIHAT SEMUA</button>
                                        </div>

                                        <div className="overview-report-card-wrapper">
                                            <div style={{ padding: 24 }}>
                                                {timeFilteredReports.slice(0, 5).map((r, i) => (
                                                    <div key={r.id} className={`overview-report-item fade-in fade-in-${Math.min(i + 1, 5)}`} style={{ borderBottom: i < Math.min(fieldReports.length, 5) - 1 ? '1px solid #f8fafc' : 'none', paddingBottom: i < Math.min(fieldReports.length, 5) - 1 ? 24 : 0, marginBottom: i < Math.min(fieldReports.length, 5) - 1 ? 24 : 0 }}>
                                                        <div className="overview-report-header">
                                                            <div className="overview-report-info">
                                                                <h4 className="overview-report-title">{r.location_name}</h4>
                                                                <p className="overview-report-subtitle">{r.kelurahan || r.kecamatan || '-'}</p>
                                                                <div className="overview-report-meta">
                                                                    <span className="overview-report-meta-item">
                                                                        <User size={14} />
                                                                        Petugas: <strong>{r.reporter_name || r.reporter_id}</strong>
                                                                    </span>
                                                                    <span className="overview-report-meta-item">
                                                                        📅 {formatDate(r.timestamp || r.created_at)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="overview-report-badges">
                                                                <span className={`overview-badge ${r.status === 'active' ? 'overview-badge--red' : 'overview-badge--green'}`}>
                                                                    {r.status === 'active' ? 'Aktif' : 'Selesai'}
                                                                </span>
                                                                <span className="overview-badge overview-badge--gray">{r.severity || 'Moderate'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {timeFilteredReports.length === 0 && (
                                                    <div style={{ textAlign: 'center', padding: 16 }}>
                                                        <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>Belum ada laporan terbaru lainnya.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: User Distribution */}
                                    <div className="overview-distribution-col">
                                        <h3 className="overview-section-title" style={{ marginBottom: 24 }}>Distribusi Pengguna</h3>
                                        <div className="overview-distribution-stack">
                                            {[
                                                { label: 'Warga Terdaftar', count: userCount, icon: Users, color: '#4f46e5', bgColor: '#eef2ff', textColor: '#4f46e5' },
                                                { label: 'Petugas Lapangan', count: petugasCount, icon: User, color: '#f97316', bgColor: '#fff7ed', textColor: '#f97316' },
                                                { label: 'Administrator', count: adminCount, icon: ShieldCheck, color: '#2563eb', bgColor: '#eff6ff', textColor: '#2563eb' }
                                            ].map((stat, i) => (
                                                <div key={i} className="overview-dist-card">
                                                    <div className="overview-dist-header">
                                                        <div className="overview-dist-icon" style={{ background: stat.bgColor, color: stat.textColor }}>
                                                            <stat.icon size={20} />
                                                        </div>
                                                        <span className="overview-dist-pct">{Math.round((stat.count / (users.length || 1)) * 100)}%</span>
                                                    </div>
                                                    <p className="overview-dist-value">{stat.count}</p>
                                                    <p className="overview-dist-label">{stat.label}</p>
                                                    <div className="overview-dist-bar">
                                                        <div className="overview-dist-bar-fill" style={{ width: `${users.length ? (stat.count / users.length) * 100 : 0}%`, background: stat.color }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Alerts Section - Large centered card */}
                                <div className="overview-alerts-section">
                                    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                        <div className="overview-alerts-icon-wrapper">
                                            {timeFilteredAlerts.length === 0 ? <ShieldCheck size={40} /> : <AlertTriangle size={40} />}
                                        </div>
                                        <h3 className="overview-alerts-title">
                                            {timeFilteredAlerts.length === 0 ? 'Sistem Aman' : `${timeFilteredAlerts.length} Peringatan Aktif`}
                                        </h3>
                                        <p className="overview-alerts-desc">
                                            {timeFilteredAlerts.length === 0
                                                ? 'Tidak ada ancaman terdeteksi saat ini.'
                                                : 'Beberapa wilayah memerlukan tindakan segera. Tinjau daftar peringatan untuk mitigasi bencana yang tepat waktu.'}
                                        </p>
                                        <button className="overview-alerts-btn" onClick={() => setActiveTab('alerts')}>
                                            CEK PERINGATAN
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}

                            {activeTab !== 'overview' && (
                                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                {/* Users Tab */}
                                {activeTab === 'users' && (
                                    <div className="fade-in">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Direktori Pengguna</h2>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <div style={{ background: 'var(--color-bg-secondary)', padding: 4, borderRadius: 12, display: 'flex' }}>
                                                    {['all', 'admin', 'petugas', 'user'].map(f => (
                                                        <button 
                                                            key={f} 
                                                            className={`btn btn-sm ${userFilter === f ? 'active' : ''}`} 
                                                            style={{ border: 'none', background: userFilter === f ? '#ffffff' : 'transparent', boxShadow: userFilter === f ? 'var(--shadow-sm)' : 'none', color: userFilter === f ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                                                            onClick={() => setUserFilter(f)}
                                                        >
                                                            {f === 'all' ? 'Semua' : f.charAt(0).toUpperCase() + f.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button className="btn btn-primary" onClick={() => {
                                                    setUserForm({ id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas', province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001', is_active: true });
                                                    setActiveTab('user_form');
                                                }}>
                                                    + TAMBAH USER
                                                </button>
                                            </div>
                                        </div>

                                        {formError && <div className="badge badge-danger" style={{ width: '100%', padding: 16, marginBottom: 24, borderRadius: 12 }}>{formError}</div>}
                                        
                                        <div className="glass-card" style={{ padding: 0, border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
                                            <div className="responsive-table-wrapper">
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                                            <th style={{ padding: '16px 24px' }}>Nama</th>
                                                            <th style={{ padding: '16px 24px' }}>Role</th>
                                                            <th style={{ padding: '16px 24px' }}>Wilayah</th>
                                                            <th style={{ padding: '16px 24px' }}>Status</th>
                                                            <th style={{ padding: '16px 24px' }}>Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody style={{ background: '#fff' }}>
                                                    {filteredUsers.map(u => (
                                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{u.full_name || '-'}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.phone}</div>
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <span className={`badge ${u.role === 'admin' ? 'badge-info' : u.role === 'petugas' ? 'badge-warning' : 'badge-neutral'}`}>
                                                                    {u.role.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', maxWidth: 200 }} className="truncate">
                                                                {u.full_address || u.village_name || '-'}
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                                    {u.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px 24px' }}>
                                                                <div style={{ display: 'flex', gap: 12, color: 'var(--color-text-muted)' }}>
                                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => {
                                                                        setUserForm({ id: u.id, phone: u.phone, password: '', full_name: u.full_name || '', email: u.email || '', role: u.role, province_id: u.province_id || '31', regency_id: u.regency_id || '3171', district_id: u.district_id || '3171010', village_id: u.village_id || '3171010001', is_active: u.is_active });
                                                                        setActiveTab('user_form');
                                                                    }}><Edit size={18} /></button>
                                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => handleDeleteUser(u.id)}><Trash2 size={18} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* User Form Tab */}
                                {activeTab === 'user_form' && (
                                    <div className="fade-in">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                                            <button className="btn-icon" onClick={() => setActiveTab('users')} style={{ background: '#f3f4f6', borderRadius: '50%', padding: 8 }}>
                                                <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                                            </button>
                                            <div>
                                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{userForm.id ? 'Edit Pengguna' : 'Daftarkan Pengguna Baru'}</h2>
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Lengkapi formulir di bawah ini untuk mengelola data pengguna.</p>
                                            </div>
                                        </div>

                                        {formError && <div className="badge badge-danger" style={{ width: '100%', padding: 16, marginBottom: 24, borderRadius: 12 }}>{formError}</div>}
                                        
                                        <div className="glass-card" style={{ background: '#ffffff', borderRadius: 24, padding: 32, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f3f4f6' }}>
                                            <form onSubmit={handleSaveUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Nama Lengkap</label>
                                                    <input type="text" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #d1d5db', outline: 'none', transition: 'all 0.2s' }} required value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Masukkan nama lengkap" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Nomor Telepon</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>+62</span>
                                                        <input type="tel" className="form-control" style={{ width: '100%', padding: '12px 16px 12px 50px', borderRadius: 12, border: '1px solid #d1d5db', outline: 'none', transition: 'all 0.2s' }} required value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value.replace(/^0+/, '') })} placeholder="8123456789" />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{userForm.id ? 'Ubah Password' : 'Password'}</label>
                                                    <input type="password" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #d1d5db', outline: 'none', transition: 'all 0.2s' }} required={!userForm.id} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={userForm.id ? 'Kosongkan jika tidak ingin diubah' : 'Minimal 6 karakter'} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Peran (Role)</label>
                                                    <select className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #d1d5db', outline: 'none', background: '#F9FAFB', color: '#111827', transition: 'all 0.2s' }} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                                        <option value="petugas">Petugas Lapangan</option>
                                                        <option value="admin">Administrator</option>
                                                        <option value="user">Warga (User)</option>
                                                    </select>
                                                </div>
                                                {userForm.id && (
                                                    <div className="form-group">
                                                        <label className="stat-label" style={{ marginBottom: 8, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Status Akun</label>
                                                        <select className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #d1d5db', outline: 'none', background: '#F9FAFB', color: '#111827', transition: 'all 0.2s' }} value={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.value === 'true' })}>
                                                            <option value="true">Aktif</option>
                                                            <option value="false">Non-aktif</option>
                                                        </select>
                                                    </div>
                                                )}
                                                
                                                <div style={{ gridColumn: '1 / -1', padding: 24, background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1', marginTop: 16 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                                        <div style={{ background: '#e0e7ff', padding: 8, borderRadius: 8, color: '#4f46e5' }}><MapPin size={20} /></div>
                                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Wilayah Penugasan</h4>
                                                    </div>
                                                    <RegionPicker value={{ province_id: userForm.province_id, regency_id: userForm.regency_id, district_id: userForm.district_id, village_id: userForm.village_id }} onChange={(region) => setUserForm(prev => ({ ...prev, ...region }))} />
                                                </div>

                                                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                                                    <button type="button" className="btn btn-outline" style={{ padding: '12px 24px', borderRadius: 12, fontWeight: 600, color: '#64748b', borderColor: '#cbd5e1' }} onClick={() => setActiveTab('users')}>Batal</button>
                                                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: 12, fontWeight: 700, background: '#4f46e5', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }} disabled={userFormLoading}>
                                                        {userFormLoading ? 'Menyimpan...' : (userForm.id ? 'Simpan Perubahan' : 'Buat Pengguna')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
              
                                {/* Coverage Tab */}
                                {activeTab === 'coverage' && (() => {
                                    // Calculate filtered and paginated coverage
                                    const filteredCoverage = coverage.filter(c => 
                                        c.village_name?.toLowerCase().includes(coverageSearch.toLowerCase()) || 
                                        c.district_name?.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                                        c.regency_name?.toLowerCase().includes(coverageSearch.toLowerCase())
                                    );
                                    
                                    const totalCoveragePages = Math.ceil(filteredCoverage.length / itemsPerPage) || 1;
                                    const paginatedCoverage = filteredCoverage.slice((coveragePage - 1) * itemsPerPage, coveragePage * itemsPerPage);

                                    return (
                                        <div className="fade-in">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Cakupan Wilayah</h2>
                                                <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                                                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        placeholder="Cari desa atau kecamatan..." 
                                                        style={{ paddingLeft: 44, width: '100%', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} 
                                                        value={coverageSearch}
                                                        onChange={(e) => {
                                                            setCoverageSearch(e.target.value);
                                                            setCoveragePage(1); // Reset page on search
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 16 }}>
                                                <div className="responsive-table-wrapper">
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Lokasi / Wilayah</th>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700, textAlign: 'center' }}>Total Petugas</th>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700, width: 50 }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody style={{ background: '#fff' }}>
                                                        {paginatedCoverage.length > 0 ? paginatedCoverage.map((c, i) => {
                                                            const isExpanded = expandedCoverageId === c.village_id;
                                                            const assignedUsers = users.filter(u => u.village_id === c.village_id && u.role === 'petugas');
                                                            
                                                            return (
                                                                <React.Fragment key={i}>
                                                                    <tr style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }} 
                                                                        onClick={() => setExpandedCoverageId(isExpanded ? null : c.village_id)}
                                                                        className="hover:bg-gray-50"
                                                                    >
                                                                        <td style={{ padding: '16px 24px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: 8, borderRadius: 8 }}>
                                                                                    <MapPin size={18} />
                                                                                </div>
                                                                                <div>
                                                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{c.village_name}</div>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.district_name}, {c.regency_name}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                            <span className="badge badge-info" style={{ fontWeight: 700, padding: '6px 16px' }}>
                                                                                <Users size={14} style={{ marginRight: 6 }} /> {c.total_petugas}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                            <ChevronRight size={20} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                                                        </td>
                                                                    </tr>
                                                                    {isExpanded && (
                                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                                                                            <td colSpan={3} style={{ padding: '24px' }}>
                                                                                <div style={{ marginBottom: 12, fontWeight: 700, color: '#334155', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <UserCog size={16} /> Daftar Petugas Bertugas:
                                                                                </div>
                                                                                {assignedUsers.length > 0 ? (
                                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                                                                        {assignedUsers.map(u => (
                                                                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                                                                    {u.full_name?.charAt(0) || 'P'}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.full_name}</div>
                                                                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                                        <Phone size={12} /> {u.phone}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div style={{ marginLeft: 'auto' }}>
                                                                                                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                                                                                                        {u.is_active ? 'Aktif' : 'Non-aktif'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', padding: '16px 0' }}>
                                                                                        (Belum ada petugas spesifik yang terdaftar di wilayah ini)
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        }) : (
                                                            <tr>
                                                                <td colSpan="3" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                    Tidak ada cakupan wilayah ditemukan.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                </div>
                                                
                                                {/* Pagination Controls */}
                                                {totalCoveragePages > 1 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: '#fff' }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                            Menampilkan {((coveragePage - 1) * itemsPerPage) + 1} - {Math.min(coveragePage * itemsPerPage, filteredCoverage.length)} dari {filteredCoverage.length} wilayah
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button 
                                                                className="btn btn-outline" 
                                                                style={{ padding: '8px 12px' }} 
                                                                disabled={coveragePage === 1}
                                                                onClick={() => setCoveragePage(prev => Math.max(1, prev - 1))}
                                                            >
                                                                Sebelahnya
                                                            </button>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 8px' }}>
                                                                {Array.from({ length: totalCoveragePages }).map((_, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        style={{ 
                                                                            width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                                                                            background: coveragePage === idx + 1 ? 'var(--color-primary)' : 'transparent',
                                                                            color: coveragePage === idx + 1 ? '#fff' : 'var(--color-text-primary)',
                                                                            fontWeight: coveragePage === idx + 1 ? 700 : 500
                                                                        }}
                                                                        onClick={() => setCoveragePage(idx + 1)}
                                                                    >
                                                                        {idx + 1}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <button 
                                                                className="btn btn-outline" 
                                                                style={{ padding: '8px 12px' }} 
                                                                disabled={coveragePage === totalCoveragePages}
                                                                onClick={() => setCoveragePage(prev => Math.min(totalCoveragePages, prev + 1))}
                                                            >
                                                                Selanjutnya
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Building Types Tab */}
                                {activeTab === 'building_types' && (
                                    <div className="fade-in">
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 32 }}>Kategori Bangunan</h2>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'start' }}>
                                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem' }}>Nama Tipe</th>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem' }}>Deskripsi</th>
                                                            <th style={{ padding: '16px 24px', fontSize: '0.85rem', width: 100 }}>Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody style={{ background: '#fff' }}>
                                                        {buildingTypes.map(bt => (
                                                            <tr key={bt.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                                <td style={{ padding: '16px 24px', fontWeight: 700 }}>{bt.name}</td>
                                                                <td style={{ padding: '16px 24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{bt.description || '-'}</td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ display: 'flex', gap: 12, color: 'var(--color-text-muted)' }}>
                                                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setBTypeForm(bt)}><Edit size={18} /></button>
                                                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => handleDeleteBuildingType(bt.id)}><Trash2 size={18} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="glass-card" style={{ padding: 24, background: 'var(--color-bg-secondary)', position: 'sticky', top: 32 }}>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>{bTypeForm.id ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                                                <form onSubmit={handleSaveBuildingType} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                    <div className="form-group">
                                                        <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Nama Bangunan</label>
                                                        <input type="text" className="form-control" style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-border)', outline: 'none' }} required value={bTypeForm.name} onChange={e => setBTypeForm({ ...bTypeForm, name: e.target.value })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Deskripsi</label>
                                                        <textarea className="form-control" style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-border)', outline: 'none', resize: 'none' }} rows="3" value={bTypeForm.description || ''} onChange={e => setBTypeForm({ ...bTypeForm, description: e.target.value })}></textarea>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                                                        {bTypeForm.id && <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setBTypeForm({ id: null, name: '', description: '', icon: '' })}>Batal</button>}
                                                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={bTypeLoading}>{bTypeLoading ? 'Menyimpan...' : 'Simpan'}</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Reports Tab */}
                                {activeTab === 'reports' && (() => {
                                    const filteredFieldReports = fieldReports.filter(r => 
                                        r.location_name?.toLowerCase().includes(reportsSearch.toLowerCase()) || 
                                        r.description?.toLowerCase().includes(reportsSearch.toLowerCase()) ||
                                        r.reporter_name?.toLowerCase().includes(reportsSearch.toLowerCase()) ||
                                        r.petugas_id?.toLowerCase().includes(reportsSearch.toLowerCase())
                                    );
                                    
                                    const totalReportsPages = Math.ceil(filteredFieldReports.length / itemsPerPage) || 1;
                                    const paginatedReports = filteredFieldReports.slice((reportsPage - 1) * itemsPerPage, reportsPage * itemsPerPage);

                                    return (
                                        <div className="fade-in">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Daftar Laporan Lapangan</h2>
                                                <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
                                                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                                    <input 
                                                        type="text" 
                                                        className="form-control" 
                                                        placeholder="Cari lokasi, deskripsi, atau nama petugas..." 
                                                        style={{ paddingLeft: 44, width: '100%', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} 
                                                        value={reportsSearch}
                                                        onChange={(e) => {
                                                            setReportsSearch(e.target.value);
                                                            setReportsPage(1);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 16 }}>
                                                <div className="responsive-table-wrapper">
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                                                        <thead>
                                                            <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Lokasi & Waktu</th>
                                                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Deskripsi Singkat</th>
                                                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Data Lapangan</th>
                                                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Status</th>
                                                                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 700, textAlign: 'center' }}>Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody style={{ background: '#fff' }}>
                                                            {paginatedReports.length > 0 ? paginatedReports.map((r, i) => (
                                                                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                                                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                                            <div style={{ width: 40, height: 40, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                                                                {getDisasterIcon(r.disaster_type)}
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{r.location_name}</div>
                                                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                                                    <Calendar size={12} /> {formatDate(r.created_at || r.timestamp)}
                                                                                </div>
                                                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                                                    <User size={12} /> {(() => {
                                                                                        if (r.reporter_name) return r.reporter_name;
                                                                                        const petugas = users.find(u => u.id === r.petugas_id || u.id === r.reporter_id);
                                                                                        return petugas ? (petugas.full_name || petugas.phone) : (r.petugas_id || r.reporter_id || 'Tanpa Nama');
                                                                                    })()}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '16px 24px', verticalAlign: 'top', maxWidth: 300 }}>
                                                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                            {r.description || '-'}
                                                                        </p>
                                                                    </td>
                                                                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                            {r.water_level_cm != null && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#1e293b' }}>
                                                                                    <Droplets size={14} color="#3b82f6" />
                                                                                    <span>Air: <strong style={{ color: '#2563eb' }}>{r.water_level_cm} cm</strong></span>
                                                                                </div>
                                                                            )}
                                                                            {r.affected_people != null && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#1e293b' }}>
                                                                                    <Users size={14} color="#ef4444" />
                                                                                    <span>Terdampak: <strong>{r.affected_people} Jiwa</strong></span>
                                                                                </div>
                                                                            )}
                                                                            {(r.water_level_cm == null && r.affected_people == null) && (
                                                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tidak ada data</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                                                                        <span className={`badge ${r.status === 'active' ? 'badge-warning' : 'badge-success'}`} style={{ padding: '6px 12px', fontWeight: 700 }}>
                                                                            {r.status === 'active' ? 'AKTIF' : 'SELESAI'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '16px 24px', verticalAlign: 'top', textAlign: 'center' }}>
                                                                        <button
                                                                            className="btn btn-outline"
                                                                            style={{ padding: '6px 10px', borderColor: '#fca5a5', color: '#ef4444', backgroundColor: '#fef2f2' }}
                                                                            title="Hapus Laporan"
                                                                            onClick={() => handleDeleteFieldReport(r.id)}
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="5" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                                            <FileText size={48} color="#cbd5e1" />
                                                                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Tidak ada laporan ditemukan.</p>
                                                                            {reportsSearch && <p style={{ fontSize: '0.85rem' }}>Coba ubah kata kunci pencarian Anda.</p>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* Pagination Controls */}
                                                {totalReportsPages > 1 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: '#fff' }}>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                            Menampilkan {((reportsPage - 1) * itemsPerPage) + 1} - {Math.min(reportsPage * itemsPerPage, filteredFieldReports.length)} dari {filteredFieldReports.length} laporan
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button 
                                                                className="btn btn-outline" 
                                                                style={{ padding: '8px 12px' }} 
                                                                disabled={reportsPage === 1}
                                                                onClick={() => setReportsPage(prev => Math.max(1, prev - 1))}
                                                            >
                                                                Sebelahnya
                                                            </button>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 8px' }}>
                                                                {Array.from({ length: totalReportsPages }).map((_, idx) => {
                                                                    // Simple pagination display logic to avoid too many buttons
                                                                    if (totalReportsPages > 5) {
                                                                        if (idx !== 0 && idx !== totalReportsPages - 1 && Math.abs(idx + 1 - reportsPage) > 1) {
                                                                            if (idx + 1 === reportsPage - 2 || idx + 1 === reportsPage + 2) {
                                                                                return <span key={idx} style={{ color: '#94a3b8' }}>...</span>;
                                                                            }
                                                                            return null;
                                                                        }
                                                                    }
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            style={{ 
                                                                                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                                                                                background: reportsPage === idx + 1 ? 'var(--color-primary)' : 'transparent',
                                                                                color: reportsPage === idx + 1 ? '#fff' : 'var(--color-text-primary)',
                                                                                fontWeight: reportsPage === idx + 1 ? 700 : 500
                                                                            }}
                                                                            onClick={() => setReportsPage(idx + 1)}
                                                                        >
                                                                            {idx + 1}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <button 
                                                                className="btn btn-outline" 
                                                                style={{ padding: '8px 12px' }} 
                                                                disabled={reportsPage === totalReportsPages}
                                                                onClick={() => setReportsPage(prev => Math.min(totalReportsPages, prev + 1))}
                                                            >
                                                                Selanjutnya
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Alerts Tab */}
                                {activeTab === 'alerts' && (
                                    <div className="fade-in">
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 32 }}>Peringatan Sistem</h2>
                                        {alerts.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: 48, background: 'var(--color-bg-secondary)', borderRadius: 24 }}>
                                                <div style={{ width: 80, height: 80, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                                    <ShieldCheck size={40} />
                                                </div>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Sistem Aman</h3>
                                                <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Tidak ada peringatan aktif saat ini.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                {alerts.map(a => (
                                                    <div key={a.id} className={`glass-card ${a.severity === 'extreme' || a.severity === 'severe' ? 'border-danger' : 'border-warning'}`} style={{ padding: 24 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                                                    <span className={`badge ${a.severity === 'extreme' || a.severity === 'severe' ? 'badge-danger' : 'badge-warning'}`}>{a.severity.toUpperCase()}</span>
                                                                    {a.event_type && <span className="badge badge-neutral">{getDisasterLabel(a.event_type)}</span>}
                                                                </div>
                                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>{a.headline}</h3>
                                                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{a.description}</p>
                                                            </div>
                                                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{timeAgo(a.sent_at)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Create Shelter Tab */}
                                {activeTab === 'shelter' && (
                                    <div className="fade-in">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                                            <div>
                                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Manajemen Posko Evakuasi</h2>
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Daftar posko dan tempat pengungsian yang terdaftar di sistem.</p>
                                            </div>
                                            <button className="btn btn-primary" onClick={() => {
                                                setShowShelterForm(!showShelterForm);
                                                setFormSuccess('');
                                                setFormError('');
                                            }}>
                                                {showShelterForm ? 'BATAL TAMBAH POSKO' : '+ TAMBAH POSKO BARU'}
                                            </button>
                                        </div>

                                        {formError && <div className="badge badge-danger" style={{ width: '100%', padding: 16, marginBottom: 24, borderRadius: 12 }}>{formError}</div>}
                                        {formSuccess && <div className="badge badge-success" style={{ width: '100%', padding: 16, marginBottom: 24, borderRadius: 12 }}>{formSuccess}</div>}

                                        {showShelterForm ? (
                                        <div className="glass-card fade-in" style={{ padding: 32 }}>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 24 }}>Formulir Registrasi Posko</h3>
                                            <form onSubmit={handleCreateShelter} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Nama Posko</label>
                                                    <input type="text" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} required placeholder="Contoh: Posko Balai Desa A" value={shelterFormData.name} onChange={e => setShelterFormData(p => ({ ...p, name: e.target.value }))} />
                                                </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Tipe Bangunan</label>
                                                    <select className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none', background: '#fff' }} value={shelterFormData.type} onChange={e => setShelterFormData(p => ({ ...p, type: e.target.value }))}>
                                                        <option value="">-- Pilih Tipe --</option>
                                                        {buildingTypes.map(bt => <option key={bt.id} value={bt.name}>{bt.name}</option>)}
                                                        <option value="other">Lainnya</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Kapasitas (Orang)</label>
                                                    <input type="number" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} required min="1" value={shelterFormData.capacity} onChange={e => setShelterFormData(p => ({ ...p, capacity: e.target.value }))} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="stat-label" style={{ marginBottom: 12, display: 'block' }}>Fasilitas Tersedia</label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                                    {[{ id: 'toilet', label: 'Toilet' }, { id: 'dapur_umum', label: 'Dapur Umum' }, { id: 'p3k', label: 'P3K' }, { id: 'mushola', label: 'Mushola' }, { id: 'air_bersih', label: 'Air Bersih' }].map(f => (
                                                        <label key={f.id} className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: shelterFormData.facilities.includes(f.id) ? 'var(--color-primary)' : '#fff', color: shelterFormData.facilities.includes(f.id) ? '#fff' : 'var(--color-text-primary)' }}>
                                                            <input type="checkbox" style={{ display: 'none' }} checked={shelterFormData.facilities.includes(f.id)} onChange={e => { const checked = e.target.checked; setShelterFormData(p => ({ ...p, facilities: checked ? [...p.facilities, f.id] : p.facilities.filter(x => x !== f.id) })); }} />
                                                            {f.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="glass-card" style={{ background: 'var(--color-bg-secondary)', padding: 24 }}>
                                                <label className="stat-label" style={{ marginBottom: 16, display: 'block', color: 'var(--color-primary)' }}>📍 Titik Koordinat Posko</label>
                                                <button type="button" className="btn btn-outline" style={{ width: '100%', marginBottom: 16 }} onClick={() => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition(pos => setShelterFormData(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })), err => alert("Gagal mendapatkan lokasi GPS.")); } else alert("GPS tidak didukung."); }}>
                                                    Gunakan Lokasi Saat Ini
                                                </button>

                                                <div style={{ height: 250, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', marginBottom: 16 }}>
                                                    <LocationPickerMap lat={shelterFormData.lat} lng={shelterFormData.lng} onChange={(lat, lng) => setShelterFormData(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))} />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                                                    <div className="form-group">
                                                        <label className="stat-label" style={{ marginBottom: 4 }}>Latitude</label>
                                                        <input type="text" className="form-control" style={{ width: '100%', padding: '8px 12px', background: '#fff', outline: 'none' }} required value={shelterFormData.lat} onChange={e => setShelterFormData(p => ({ ...p, lat: e.target.value }))} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="stat-label" style={{ marginBottom: 4 }}>Longitude</label>
                                                        <input type="text" className="form-control" style={{ width: '100%', padding: '8px 12px', background: '#fff', outline: 'none' }} required value={shelterFormData.lng} onChange={e => setShelterFormData(p => ({ ...p, lng: e.target.value }))} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Alamat Lengkap</label>
                                                <input type="text" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} placeholder="Jl. Raya Desa No. 123..." value={shelterFormData.address} onChange={e => setShelterFormData(p => ({ ...p, address: e.target.value }))} />
                                            </div>

                                            <div className="form-group">
                                                <label className="stat-label" style={{ marginBottom: 8, display: 'block' }}>Kontak Darurat</label>
                                                <input type="tel" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', outline: 'none' }} placeholder="0812..." value={shelterFormData.contact} onChange={e => setShelterFormData(p => ({ ...p, contact: e.target.value }))} />
                                            </div>

                                            <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                                                <span style={{ fontWeight: 700 }}>Status Posko Buka</span>
                                                <input type="checkbox" checked={shelterFormData.is_open} onChange={e => setShelterFormData(p => ({ ...p, is_open: e.target.checked }))} style={{ width: 24, height: 24 }} />
                                            </div>

                                                <button type="submit" className="btn btn-primary" style={{ padding: '16px', fontSize: '1.1rem' }} disabled={shelterFormLoading}>
                                                    {shelterFormLoading ? 'Memproses...' : 'DAFTARKAN POSKO'}
                                                </button>
                                            </form>
                                        </div>
                                        ) : (
                                        <div className="glass-card fade-in" style={{ padding: 0, border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
                                            <div className="responsive-table-wrapper">
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                                            <th style={{ padding: '16px 24px' }}>Nama Posko & Alamat</th>
                                                            <th style={{ padding: '16px 24px' }}>Tipe</th>
                                                            <th style={{ padding: '16px 24px' }}>Kapasitas</th>
                                                            <th style={{ padding: '16px 24px' }}>Status</th>
                                                            <th style={{ padding: '16px 24px' }}>Petugas</th>
                                                            <th style={{ padding: '16px 24px' }}>Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody style={{ background: '#fff' }}>
                                                        {sheltersLoading ? (
                                                            <tr>
                                                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center' }}>
                                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                                                </td>
                                                            </tr>
                                                        ) : shelters.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                                    Belum ada data posko.
                                                                </td>
                                                            </tr>
                                                        ) : shelters.map(s => (
                                                            <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.name}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{s.address || 'Alamat tidak diisi'}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>📍 {s.lat}, {s.lng}</div>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                                                                        {(() => {
                                                                            const bType = buildingTypes.find(bt => bt.name === s.type || bt.id === s.type);
                                                                            return bType ? bType.name : s.type.replace('_', ' ');
                                                                        })()}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <Users size={14} color="var(--color-text-secondary)" /> 
                                                                        <span style={{ fontWeight: 600 }}>{s.current_occupancy} / {s.capacity}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <span className={`badge ${s.is_open ? 'badge-success' : 'badge-danger'}`}>
                                                                        {s.is_open ? 'BUKA' : 'TUTUP'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    {(() => {
                                                                        const assignedPetugas = users.filter(u => u.assigned_shelter_id === s.id);
                                                                        return assignedPetugas.length > 0 ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                                {assignedPetugas.map(p => (
                                                                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                                                                                        <span style={{ fontWeight: 600 }}>{p.full_name || p.phone}</span>
                                                                                        <button
                                                                                            className="badge badge-danger"
                                                                                            style={{ cursor: 'pointer', fontSize: '0.65rem', padding: '2px 6px' }}
                                                                                            onClick={async () => {
                                                                                                setAssignLoading(s.id);
                                                                                                try {
                                                                                                    await unassignPetugasFromShelter(s.id, p.id);
                                                                                                    setAssignMsg('Petugas berhasil dihapus');
                                                                                                    fetchShelters(sheltersPage);
                                                                                                    loadData();
                                                                                                } catch (e) { setAssignMsg(e.message); }
                                                                                                setAssignLoading(null);
                                                                                            }}
                                                                                            disabled={assignLoading === s.id}
                                                                                        >
                                                                                            ✕
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Belum ada</span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                        <select
                                                                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: '0.8rem', outline: 'none' }}
                                                                            disabled={assignLoading === s.id}
                                                                            defaultValue=""
                                                                            onChange={async (e) => {
                                                                                const userId = e.target.value;
                                                                                if (!userId) return;
                                                                                setAssignLoading(s.id);
                                                                                try {
                                                                                    await assignPetugasToShelter(s.id, userId);
                                                                                    setAssignMsg('Petugas berhasil ditugaskan');
                                                                                    fetchShelters(sheltersPage);
                                                                                    loadData();
                                                                                } catch (err) { setAssignMsg(err.message); }
                                                                                setAssignLoading(null);
                                                                                e.target.value = '';
                                                                            }}
                                                                        >
                                                                            <option value="">+ Assign</option>
                                                                            {users.filter(u => u.role === 'petugas' && !u.assigned_shelter_id).map(u => (
                                                                                <option key={u.id} value={u.id}>{u.full_name || u.phone}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {/* Pagination */}
                                            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', background: '#fafafa' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                    Halaman {sheltersPage + 1}
                                                </div>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <button 
                                                        className="btn btn-sm btn-outline" 
                                                        disabled={sheltersPage === 0 || sheltersLoading}
                                                        onClick={() => fetchShelters(sheltersPage - 1)}
                                                    >
                                                        &#8592; Sebelumnya
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm btn-outline"
                                                        disabled={!hasMoreShelters || sheltersLoading}
                                                        onClick={() => fetchShelters(sheltersPage + 1)}
                                                    >
                                                        Selanjutnya &#8594;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

