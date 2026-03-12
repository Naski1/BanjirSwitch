import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    getUsers, getPetugasCoverage, getActiveAlerts,
    getNearbyZones, getFieldReports, createShelter,
    createUser, updateUser, deleteUser
} from '../services/api';
import LocationPickerMap from '../components/LocationPickerMap';
import RegionPicker from '../components/RegionPicker';
import { formatDate, timeAgo, getDisasterLabel, getDisasterIcon } from '../utils/helpers';
import { Edit, Trash2 } from 'lucide-react';

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

    const [shelterFormData, setShelterFormData] = useState({
        name: '', address: '', lat: '', lng: '', capacity: '',
        type: 'community_center', facilities: [], contact: '', is_open: true
    });
    const [shelterFormLoading, setShelterFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const [bTypeForm, setBTypeForm] = useState({ id: null, name: '', description: '', icon: '' });
    const [bTypeLoading, setBTypeLoading] = useState(false);

    const [showUserForm, setShowUserForm] = useState(false);
    const [userForm, setUserForm] = useState({
        id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas',
        province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001',
        is_active: true
    });
    const [userFormLoading, setUserFormLoading] = useState(false);

    useEffect(() => { loadData(); }, []);

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
            setFormSuccess('âœ… Shelter berhasil ditambahkan!');
            setShelterFormData({ name: '', address: '', lat: '', lng: '', capacity: '', type: 'community_center', facilities: [], contact: '', is_open: true });
            setActiveTab('overview');
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
            setShowUserForm(false);
            setUserForm({ id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas', province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001', is_active: true });
            loadData();
        } catch (error) { setFormError(`Gagal ${userForm.id ? 'mengubah' : 'membuat'} user: ` + error.message); }
        setUserFormLoading(false);
    }

    async function handleDeleteUser(id) {
        if (!confirm('Hapus pengguna ini secara permanen?')) return;
        try { await deleteUser(id); loadData(); } catch (error) { alert('Gagal menghapus pengguna: ' + error.message); }
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    const petugasCount = users.filter(u => u.role === 'petugas').length;
    const userCount = users.filter(u => u.role === 'user').length;
    const filteredUsers = userFilter === 'all' ? users : users.filter(u => u.role === userFilter);
    const activeFieldReports = fieldReports.filter(r => r.status === 'active');

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

    const navItems = [
        { id: 'overview', icon: 'dashboard', label: 'Dashboard' },
        { id: 'users', icon: 'group', label: 'Users' },
        { id: 'coverage', icon: 'assignment_ind', label: 'Staff Assignments' },
        { id: 'reports', icon: 'description', label: 'Reports' },
        { id: 'alerts', icon: 'notifications_active', label: 'Active Alerts' },
        { id: 'building_types', icon: 'apartment', label: 'Building Types' },
        { id: 'create_shelter', icon: 'post_add', label: 'Post Input' },
    ];

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-300">
            {/* Sidebar Navigation */}
            <aside className="w-72 bg-background-dark dark:bg-slate-950 flex flex-col h-screen sticky top-0 shrink-0 shadow-2xl z-50">
                <div className="flex items-center gap-4 px-8 py-10">
                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-indigo-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30 transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                        <span className="material-symbols-outlined text-3xl font-light">tsunami</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-display font-black tracking-tight text-white leading-none">Resilience</span>
                        <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase mt-1">Command HQ</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 mt-2 px-6 overflow-y-auto scrollbar-hide">
                    <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Main Menu</p>
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                                ? 'bg-primary text-white shadow-xl shadow-primary/30 translate-x-1'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-2xl transition-transform group-hover:scale-110 ${activeTab === item.id ? 'fill-1' : ''}`}>{item.icon}</span>
                            <span className="text-sm font-bold tracking-wide">{item.label}</span>
                            {activeTab === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                            )}
                        </a>
                    ))}
                </nav>

                <div className="p-6 mt-auto">
                    <div className="p-5 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-colors"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full border-2 border-primary/30 p-0.5 shadow-inner">
                                <img className="w-full h-full rounded-full object-cover" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1mRR3N9Y9uxBSphsZRgTa-3eI_oeooJlJCzk565FyY1J6Wjr_MDwLxbfZErDIvXIRA-9YPD9P7UGm7QSwaPuzysUjxn-Q2W5g8uj2JXoDpbRPZYH8hr9NeuFDPfPStiJImQmxzzbxmNiB8yIhC31tLxiatxbkdnld34a1cTGsLY1OGbUtiwuNXLeFeQs0imePrBjpXMpcmYZ9kkZ1B6X3BV2COGqudgBBMmgyGfADphsWwil2m08Vw6xtGlryWxJr4kA9QD_VWn1r" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white truncate">{user?.full_name || 'Super Admin'}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate">Director of Operations</p>
                            </div>
                        </div>
                        <button onClick={logout} className="w-full mt-4 py-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-xs">logout</span> Secure Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto scroll-smooth">
                <div className="p-10 lg:p-14 max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
                                <span className="w-8 h-[2px] bg-primary"></span>
                                Operations Overview
                            </div>
                            <h1 className="text-5xl font-display font-black tracking-tight text-slate-900 dark:text-white pt-2">
                                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">{user?.full_name?.split(' ')[0] || 'Admiral'}</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Monitoring the frontlines of disaster relief coordination.</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">search</span>
                                <input className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all w-80 text-sm font-bold shadow-sm" placeholder="Search database indexes..." type="text" />
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-primary hover:border-primary/30 hover:shadow-xl transition-all relative">
                                    <span className="material-symbols-outlined">notifications</span>
                                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                                </button>
                                <button className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-primary hover:border-primary/30 hover:shadow-xl transition-all">
                                    <span className="material-symbols-outlined">settings</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {activeTab === 'overview' && (
                        <>
                            {/* KPI Cards */}
                {/* KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    {/* Active Reports Card */}
                    <div className="glass hover:glass-dark group transition-all duration-500 rounded-[2.5rem] p-8 relative overflow-hidden cursor-pointer border-indigo-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl font-light">notification_important</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Critical</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-2">ID: E-229</span>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.15em]">Laporan Aktif</p>
                        <h3 className="text-4xl font-display font-black mt-2 text-slate-900 dark:text-white leading-none tracking-tight">
                            {activeFieldReports.length.toLocaleString()}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="material-symbols-outlined text-xs text-green-500">trending_up</span>
                            <span className="text-green-500">+12%</span> vs last period
                        </div>
                    </div>

                    {/* Affected Coverage Card */}
                    <div className="glass hover:glass-dark group transition-all duration-500 rounded-[2.5rem] p-8 relative overflow-hidden cursor-pointer border-purple-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-purple-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl font-light">map_visualize</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Warning</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-2">3 Zones</span>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.15em]">Wilayah Terdampak</p>
                        <h3 className="text-4xl font-display font-black mt-2 text-slate-900 dark:text-white leading-none tracking-tight">
                            {coverage.length.toLocaleString()}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="material-symbols-outlined text-xs text-amber-500">emergency</span>
                            Current Alert Level: <span className="text-amber-500">Orange</span>
                        </div>
                    </div>

                    {/* Relawan Card */}
                    <div className="glass hover:glass-dark group transition-all duration-500 rounded-[2.5rem] p-8 relative overflow-hidden cursor-pointer border-green-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-green-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-green-50 dark:bg-green-950 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl font-light">volunteer_activism</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Active</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-2">24h Shift</span>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.15em]">Relawan Siaga</p>
                        <h3 className="text-4xl font-display font-black mt-2 text-slate-900 dark:text-white leading-none tracking-tight">
                            {petugasCount.toLocaleString()}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="material-symbols-outlined text-xs text-blue-500">info</span>
                            Response Capacity: <span className="text-blue-500">High</span>
                        </div>
                    </div>

                    {/* Water Level Card */}
                    <div className="glass hover:glass-dark group transition-all duration-500 rounded-[2.5rem] p-8 relative overflow-hidden cursor-pointer border-amber-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-500/20 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl font-light">water_drop</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Normal</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-2">Real-time</span>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-[0.15em]">Tinggi Air (m)</p>
                        <h3 className="text-4xl font-display font-black mt-2 text-slate-900 dark:text-white leading-none tracking-tight">
                            {fieldReports.length > 0
                                ? (fieldReports.reduce((acc, r) => acc + (r.water_level_cm || 0), 0) / (fieldReports.length * 100)).toFixed(2)
                                : '0.00'}
                        </h3>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="material-symbols-outlined text-xs text-slate-400">monitor_heart</span>
                            Sensor Status: <span className="text-green-500 font-black">ACTIVE</span>
                        </div>
                    </div>
                </div>                            {/* Main Grid: Left (Col 1-2) / Right (Col 3) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                                {/* Recent Reports List */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-premium group">
                                        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                                <h2 className="text-2xl font-display font-black tracking-tight text-slate-900 dark:text-white">Recent Field Reports</h2>
                                            </div>
                                            <button onClick={() => setActiveTab('reports')} className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:shadow-lg transition-all">View Intelligence</button>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {fieldReports.slice(0, 3).map((r) => (
                                                <div key={r.id} className="p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 group/item">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden group-hover/item:scale-110 transition-transform shadow-inner">
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 group-hover/item:text-primary transition-colors">
                                                                {getDisasterIcon(r.disaster_type)}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-lg font-black text-slate-900 dark:text-white group-hover/item:text-primary transition-colors">{r.location_name}</p>
                                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> {r.reporter_id}</span>
                                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                                <span className="flex items-center gap-1 font-black text-primary">{r.severity}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right space-y-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time Reported</p>
                                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 1 hari lalu</p>
                                                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'active' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{r.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {fieldReports.length === 0 && (
                                                <div className="p-20 text-center space-y-4">
                                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                                    </div>
                                                    <p className="text-slate-400 font-bold tracking-tight">No intelligence reports documented yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* User Distribution Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { label: 'Registered Citizens', count: userCount, icon: 'diversity_3', color: 'bg-primary', lightColor: 'bg-indigo-50' },
                                            { label: 'Field Staff', count: petugasCount, icon: 'clinical_notes', color: 'bg-blue-500', lightColor: 'bg-blue-50' },
                                            { label: 'Administrators', count: adminCount, icon: 'admin_panel_settings', color: 'bg-slate-900', lightColor: 'bg-slate-50' }
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium hover:-translate-y-1 transition-transform group">
                                                <div className={`w-12 h-12 ${stat.lightColor} dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 mb-6 group-hover:scale-110 transition-transform`}>
                                                    <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                                                </div>
                                                <h4 className="text-3xl font-display font-black text-slate-900 dark:text-white leading-none">{stat.count}</h4>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
                                                <div className="mt-6 w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${users.length ? (stat.count / users.length) * 100 : 0}%` }}></div>
                                                </div>
                                                <p className="mt-3 text-[10px] font-bold text-slate-400">{users.length ? Math.round((stat.count / users.length) * 100) : 0}% of global index</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Alerts & Health Monitor (Right Column) */}
                                <div className="space-y-8">
                                    <div className="glass hover:glass-dark transition-all duration-500 p-10 rounded-[2.5rem] flex flex-col items-center justify-center min-h-[450px] text-center border-indigo-500/10 group">
                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 relative ${alerts.length === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${alerts.length === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className={`material-symbols-outlined text-6xl relative z-10 ${alerts.length === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {alerts.length === 0 ? 'verified_user' : 'warning_off'}
                                            </span>
                                        </div>
                                        <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">{alerts.length === 0 ? 'System Nominal' : `${alerts.length} Active Alerts`}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-medium">
                                            {alerts.length === 0
                                                ? "Current status indicates absolute clearance across all monitored zones."
                                                : "Active alerts detected. Response coordination is advised immediately."}
                                        </p>
                                        <button onClick={() => setActiveTab('alerts')} className="mt-10 w-full py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-xl hover:text-primary transition-all">Audit History</button>
                                    </div>

                                    <div className="bg-primary p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-primary/20">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                        <div className="relative z-10 flex flex-col gap-6">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-white font-display font-black text-xl tracking-tight leading-none group-hover:translate-x-1 transition-transform">Real-time Coverage</h4>
                                                <span className="material-symbols-outlined text-white/50 text-2xl group-hover:rotate-12 transition-transform">monitoring</span>
                                            </div>
                                            <div className="flex items-end gap-3 h-24">
                                                {[30, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-white/20 rounded-full relative group/bar hover:bg-white/40 transition-all" style={{ height: `${h}%` }}>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-primary text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">72%</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Network Health Status</p>
                                                <p className="text-white font-bold text-sm mt-1 flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"></span>
                                                    Optimal Performance
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sub-Tabs Wrapper for spacing consistency */}
                    {activeTab !== 'overview' && (
                        <div className="bg-white rounded-[1.5rem] shadow-sm p-8 pb-12 border border-slate-100/50">
                            {/* Users Tab */}
                            {activeTab === 'users' && (
                                <div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-2xl font-bold">Users Directory</h2>
                                        <div className="flex gap-4">
                                            <div className="bg-slate-50 p-1 rounded-xl flex">
                                                {['all', 'admin', 'petugas', 'user'].map(f => (
                                                    <button key={f} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${userFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`} onClick={() => setUserFilter(f)}>
                                                        {f === 'all' ? 'All Roles' : f.charAt(0).toUpperCase() + f.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 shadow-sm transition-colors" onClick={() => {
                                                if (!showUserForm) setUserForm({ id: null, phone: '', password: '', full_name: '', email: '', role: 'petugas', province_id: '31', regency_id: '3171', district_id: '3171010', village_id: '3171010001', is_active: true });
                                                setShowUserForm(!showUserForm);
                                            }}>
                                                + Add User
                                            </button>
                                        </div>
                                    </div>

                                    {formError && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold">{formError}</div>}
                                    {showUserForm && (
                                        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <h3 className="text-lg font-bold mb-4">{userForm.id ? 'Edit User' : 'Register New User'}</h3>
                                            <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                                                    <input type="tel" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="08..." />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{userForm.id ? 'New Password' : 'Password'}</label>
                                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required={!userForm.id} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={userForm.id ? '(Leave blank to keep current)' : ''} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Role</label>
                                                    <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                                        <option value="petugas">Field Staff (Petugas)</option>
                                                        <option value="admin">Administrator</option>
                                                        <option value="user">Citizen (User)</option>
                                                    </select>
                                                </div>
                                                {userForm.id && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                                                        <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white" value={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.value === 'true' })}>
                                                            <option value="true">Active</option>
                                                            <option value="false">Inactive</option>
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="col-span-1 md:col-span-2 p-5 bg-white rounded-2xl shadow-sm border border-slate-100 mt-2">
                                                    <h4 className="text-sm font-extrabold mb-4 border-b border-slate-100 pb-3">ðŸ“ Assignment Region</h4>
                                                    <RegionPicker value={{ province_id: userForm.province_id, regency_id: userForm.regency_id, district_id: userForm.district_id, village_id: userForm.village_id }} onChange={(region) => setUserForm(prev => ({ ...prev, ...region }))} />
                                                </div>
                                                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4">
                                                    <button type="button" className="px-6 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-white shadow-sm" onClick={() => setShowUserForm(false)}>Cancel</button>
                                                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm" disabled={userFormLoading}>
                                                        {userFormLoading ? 'Saving...' : (userForm.id ? 'Save Changes' : 'Create User')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                                                <tr>
                                                    <th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Region</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredUsers.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-4 font-bold text-slate-800">
                                                            {u.full_name || '-'}
                                                            <div className="text-xs font-normal text-slate-500 mt-0.5">{u.phone}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : u.role === 'petugas' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                {u.role.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 font-medium max-w-[200px] truncate">{u.full_address || u.village_name || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full ${u.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2 text-slate-400">
                                                                <button className="hover:text-indigo-600 transition-colors" onClick={() => {
                                                                    setUserForm({ id: u.id, phone: u.phone, password: '', full_name: u.full_name || '', email: u.email || '', role: u.role, province_id: u.province_id || '31', regency_id: u.regency_id || '3171', district_id: u.district_id || '3171010', village_id: u.village_id || '3171010001', is_active: u.is_active });
                                                                    setShowUserForm(true);
                                                                }}><Edit size={18} /></button>
                                                                <button className="hover:text-red-500 transition-colors" onClick={() => handleDeleteUser(u.id)}><Trash2 size={18} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Coverage Tab */}
                            {activeTab === 'coverage' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-8">Staff Coverage Areas</h2>
                                    {coverage.length === 0 ? <p className="text-slate-500 py-10 font-medium text-center">No data found.</p> : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {coverage.map((c, i) => (
                                                <div key={i} className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:shadow-sm transition-shadow">
                                                    <div className="font-extrabold text-[15px] mb-1 leading-tight">ðŸ“ {c.village_name}</div>
                                                    <div className="text-sm font-medium text-slate-500 mb-5">{c.district_name}, {c.regency_name}</div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-indigo-500 bg-white p-2 rounded-xl border border-slate-100">engineering</span>
                                                        <div>
                                                            <div className="text-2xl font-extrabold text-slate-900 leading-none">{c.total_petugas}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Building Types Tab */}
                            {activeTab === 'building_types' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-8">Building Categories</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 border border-slate-100 rounded-2xl overflow-hidden self-start">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                                                    <tr><th className="px-6 py-4">Type Name</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 w-24">Actions</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-medium">
                                                    {buildingTypes.map(bt => (
                                                        <tr key={bt.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4 font-bold max-w-[150px]">{bt.name}</td>
                                                            <td className="px-6 py-4 text-slate-500 max-w-[300px] truncate">{bt.description || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex gap-3 text-slate-400">
                                                                    <button className="hover:text-indigo-600" onClick={() => setBTypeForm(bt)}><Edit size={18} /></button>
                                                                    <button className="hover:text-red-500" onClick={() => handleDeleteBuildingType(bt.id)}><Trash2 size={18} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {buildingTypes.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">No building types registered yet.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit sticky top-6">
                                            <h3 className="font-bold text-lg mb-4">{bTypeForm.id ? 'Edit Category' : 'Register Category'}</h3>
                                            <form onSubmit={handleSaveBuildingType} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Building Name *</label>
                                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium" required value={bTypeForm.name} onChange={e => setBTypeForm({ ...bTypeForm, name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                                                    <textarea className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium text-sm block" rows="3" value={bTypeForm.description || ''} onChange={e => setBTypeForm({ ...bTypeForm, description: e.target.value })}></textarea>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    {bTypeForm.id && <button type="button" className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-white" onClick={() => setBTypeForm({ id: null, name: '', description: '', icon: '' })}>Cancel</button>}
                                                    <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold border border-indigo-700 hover:bg-indigo-700 shadow-sm" disabled={bTypeLoading}>{bTypeLoading ? 'Saving...' : 'Save Category'}</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reports Tab */}
                            {activeTab === 'reports' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-8">All Field Reports</h2>
                                    {fieldReports.length === 0 ? <p className="text-slate-500 py-10 font-medium text-center">No reports documented yet.</p> : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {fieldReports.map((r) => (
                                                <div key={r.id} className="p-6 border border-slate-100 rounded-[1.5rem] hover:shadow-sm transition-shadow bg-slate-50/50">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400">
                                                                {getDisasterIcon(r.disaster_type)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[15px] max-w-[200px] truncate">{r.location_name}</h4>
                                                                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mt-1">{timeAgo(r.created_at)}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 text-[10px] font-extrabold rounded-full ${r.status === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                                            {r.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-5 leading-relaxed font-medium">{r.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"><span className="material-symbols-outlined text-[15px]">badge</span> {r.petugas_id}</span>
                                                        {r.water_level_cm != null && <span className="px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"><span className="material-symbols-outlined text-[15px]">water_drop</span> {r.water_level_cm} cm</span>}
                                                        {r.affected_people != null && <span className="px-3 py-1.5 bg-white border border-slate-200 text-orange-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"><span className="material-symbols-outlined text-[15px]">group</span> {r.affected_people}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Alerts Tab */}
                            {activeTab === 'alerts' && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-8">Active System Alerts</h2>
                                    {alerts.length === 0 ? (
                                        <div className="p-16 rounded-[2rem] border border-slate-100 text-center bg-slate-50 flex flex-col items-center">
                                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6 border-4 border-white shadow-sm">
                                                <span className="material-symbols-outlined text-4xl leading-none">verified_user</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">All Clear</h3>
                                            <p className="text-slate-500 mt-2 font-medium">There are currently no active high-priority alerts.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {alerts.map(a => (
                                                <div key={a.id} className={`p-6 rounded-[1.5rem] border ${a.severity === 'extreme' || a.severity === 'severe' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex gap-2 mb-3">
                                                                <span className={`px-3 py-1 text-[11px] font-extrabold rounded-full ${a.severity === 'extreme' || a.severity === 'severe' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.severity.toUpperCase()}</span>
                                                                {a.event_type && <span className="px-3 py-1 text-[11px] font-extrabold rounded-full bg-white text-slate-600 border border-slate-200">{getDisasterLabel(a.event_type)}</span>}
                                                            </div>
                                                            <h3 className="text-lg font-bold text-slate-900 mb-1">{a.headline}</h3>
                                                            <p className="text-[13px] font-medium text-slate-600">{a.description}</p>
                                                        </div>
                                                        <span className="text-[11px] font-extrabold text-slate-400 whitespace-nowrap bg-white px-3 py-1.5 border border-slate-200 rounded-lg">{timeAgo(a.sent_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Create Shelter Tab */}
                            {activeTab === 'create_shelter' && (
                                <div className="max-w-3xl">
                                    <h2 className="text-2xl font-bold mb-2">Register Evacuation Shelter</h2>
                                    <p className="text-sm font-medium text-slate-500 mb-8 pb-6 border-b border-slate-100">Add new evacuation shelter data to be displayed on the public map.</p>

                                    {formError && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold text-sm">âš ï¸ {formError}</div>}
                                    {formSuccess && <div className="p-4 mb-6 bg-green-50 text-green-600 rounded-xl border border-green-100 font-bold text-sm">âœ… {formSuccess}</div>}

                                    <form onSubmit={handleCreateShelter} className="space-y-7">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Shelter Name *</label>
                                            <input type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-colors" required placeholder="Ex: Posko Pengungsian Balai Desa" value={shelterFormData.name} onChange={e => setShelterFormData(p => ({ ...p, name: e.target.value }))} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Building Type *</label>
                                                <select className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-colors" value={shelterFormData.type} onChange={e => setShelterFormData(p => ({ ...p, type: e.target.value }))}>
                                                    <option value="">-- Select Type --</option>
                                                    {buildingTypes.map(bt => <option key={bt.id} value={bt.name}>{bt.name}</option>)}
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Capacity *</label>
                                                <input type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-colors" required min="1" placeholder="Ex: 200" value={shelterFormData.capacity} onChange={e => setShelterFormData(p => ({ ...p, capacity: e.target.value }))} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-3">Available Facilities</label>
                                            <div className="flex flex-wrap gap-3">
                                                {[{ id: 'toilet', label: 'Toilet' }, { id: 'dapur_umum', label: 'Public Kitchen' }, { id: 'p3k', label: 'Medical / First Aid' }, { id: 'mushola', label: 'Prayer Room' }, { id: 'air_bersih', label: 'Clean Water' }].map(f => (
                                                    <label key={f.id} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                                        <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" checked={shelterFormData.facilities.includes(f.id)} onChange={e => { const checked = e.target.checked; setShelterFormData(p => ({ ...p, facilities: checked ? [...p.facilities, f.id] : p.facilities.filter(x => x !== f.id) })); }} />
                                                        {f.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                                            <label className="block text-sm font-extrabold text-slate-900 mb-4 border-b border-slate-200 pb-3">ðŸ“ Shelter Coordinates *</label>
                                            <button type="button" className="w-full py-3 mb-5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors" onClick={() => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition(pos => setShelterFormData(p => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })), err => alert("Failed to get GPS location. Error: " + err.message)); } else alert("GPS not supported."); }}>
                                                <span className="material-symbols-outlined text-lg border rounded px-0.5 border-current">my_location</span> Use Current Location
                                            </button>

                                            <div className="h-64 rounded-xl overflow-hidden border border-slate-300 mb-5 relative z-0">
                                                <LocationPickerMap lat={shelterFormData.lat} lng={shelterFormData.lng} onChange={(lat, lng) => setShelterFormData(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[11px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">Latitude</label>
                                                    <input type="text" className="w-full px-4 py-2 bg-white rounded-lg border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" required placeholder="-6.2088" value={shelterFormData.lat} onChange={e => setShelterFormData(p => ({ ...p, lat: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-widest">Longitude</label>
                                                    <input type="text" className="w-full px-4 py-2 bg-white rounded-lg border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" required placeholder="106.8456" value={shelterFormData.lng} onChange={e => setShelterFormData(p => ({ ...p, lng: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Full Address</label>
                                            <input type="text" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-colors" placeholder="Jl. Raya Desa No 123..." value={shelterFormData.address} onChange={e => setShelterFormData(p => ({ ...p, address: e.target.value }))} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Emergency Contact</label>
                                            <input type="tel" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-colors" placeholder="0812xxxxxx" value={shelterFormData.contact} onChange={e => setShelterFormData(p => ({ ...p, contact: e.target.value }))} />
                                        </div>

                                        <div className="pt-2">
                                            <label className="flex items-center justify-between p-5 bg-white border border-slate-200 shadow-sm rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                <span className="font-extrabold text-slate-800">Shelter is Currently Open</span>
                                                <input type="checkbox" className="w-6 h-6 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer" checked={shelterFormData.is_open} onChange={e => setShelterFormData(p => ({ ...p, is_open: e.target.checked }))} />
                                            </label>
                                        </div>

                                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 transition-colors mt-6 shadow-md shadow-indigo-600/20 text-lg" disabled={shelterFormLoading}>
                                            {shelterFormLoading ? 'Saving Data...' : 'Submit New Shelter Registration'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

