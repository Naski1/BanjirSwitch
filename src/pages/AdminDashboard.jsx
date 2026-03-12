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
import { 
    Edit, Trash2, LayoutDashboard, Users, UserCog, FileText, 
    Bell, Building, PlusCircle, Search, LogOut, Settings, 
    MoreHorizontal, MapPin, Activity, ShieldCheck, ChevronRight,
    Command, HelpCircle, User, Briefcase, AlertTriangle, Droplets
} from 'lucide-react';

import { 
    SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, 
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel,
    SidebarInset, SidebarTrigger, SidebarRail 
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
    DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

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
        { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'users', icon: Users, label: 'Users' },
        { id: 'coverage', icon: Briefcase, label: 'Staff Assignments' },
        { id: 'reports', icon: FileText, label: 'Reports' },
        { id: 'alerts', icon: Bell, label: 'Active Alerts' },
        { id: 'building_types', icon: Building, label: 'Building Types' },
        { id: 'create_shelter', icon: PlusCircle, label: 'Post Input' },
    ];

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
                <Sidebar collapsible="icon" className="border-r border-slate-200 dark:border-slate-800">
                    <SidebarHeader className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                                <span className="font-bold text-sm">Resilience HQ</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Admin Panel</span>
                            </div>
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
                            <SidebarMenu>
                                {navItems.map((item) => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={activeTab === item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            tooltip={item.label}
                                            className="px-4 py-6 rounded-xl"
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="font-semibold">{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>
                    <SidebarFooter className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 px-2 py-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent">
                            <Avatar className="h-9 w-9 border-2 border-primary/20">
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>SA</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-bold truncate">{user?.full_name || 'Super Admin'}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Active Duty</span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 group-data-[collapsible=icon]:hidden">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="rounded-lg gap-2">
                                        <User className="h-4 w-4" /> Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-lg gap-2">
                                        <Settings className="h-4 w-4" /> Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="rounded-lg gap-2 text-destructive focus:text-destructive">
                                        <LogOut className="h-4 w-4" /> Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </SidebarFooter>
                    <SidebarRail />
                </Sidebar>

                <SidebarInset className="flex flex-col flex-1 overflow-hidden">
                    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="rounded-lg font-bold">
                                    V1.0.4
                                </Badge>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider hidden md:inline-block">System Status: Nominal</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:flex items-center">
                                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search command..." 
                                    className="w-72 pl-9 bg-slate-100/50 dark:bg-slate-900/50 border-none rounded-xl focus-visible:ring-primary/20 h-9 font-semibold text-sm"
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-xl relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-xl">
                                        <Settings className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                    <DropdownMenuLabel>Global Settings</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="rounded-lg">Dark Mode</DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-lg">System Logs</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    <ScrollArea className="flex-1">
                        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
                            {/* Page Header */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.3em]">
                                    <Separator className="w-8 bg-primary" />
                                    Operational Intelligence
                                </div>
                                <h1 className="text-4xl font-display font-black tracking-tight pt-2">
                                    Officer, <span className="text-primary">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
                                </h1>
                                <p className="text-muted-foreground font-medium">Coordinate crisis response across all monitored sectors.</p>
                            </div>

                            {activeTab === 'overview' && (
                                <div className="space-y-10">
                                    {/* KPI Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white overflow-hidden relative group transition-transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Laporan Aktif</CardTitle>
                                                <AlertTriangle className="h-5 w-5 opacity-80" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-4xl font-black">{activeFieldReports.length.toLocaleString()}</div>
                                                <p className="text-[10px] font-bold mt-2 opacity-80 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" /> Critical Response Required
                                                </p>
                                            </CardContent>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                                        </Card>

                                        <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative group transition-transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Wilayah Terdampak</CardTitle>
                                                <MapPin className="h-5 w-5 opacity-80" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-4xl font-black">{coverage.length.toLocaleString()}</div>
                                                <p className="text-[10px] font-bold mt-2 opacity-80 flex items-center gap-1">
                                                    <ShieldCheck className="h-3 w-3" /> 3 Zones Under Warning
                                                </p>
                                            </CardContent>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                                        </Card>

                                        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative group transition-transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Relawan Siaga</CardTitle>
                                                <Users className="h-5 w-5 opacity-80" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-4xl font-black">{petugasCount.toLocaleString()}</div>
                                                <p className="text-[10px] font-bold mt-2 opacity-80 flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3" /> 24h Deployment Ready
                                                </p>
                                            </CardContent>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                                        </Card>

                                        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative group transition-transform hover:-translate-y-1">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Tinggi Air (m)</CardTitle>
                                                <Droplets className="h-5 w-5 opacity-80" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-4xl font-black">
                                                    {fieldReports.length > 0
                                                        ? (fieldReports.reduce((acc, r) => acc + (r.water_level_cm || 0), 0) / (fieldReports.length * 100)).toFixed(2)
                                                        : '0.00'}
                                                </div>
                                                <p className="text-[10px] font-bold mt-2 opacity-80 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" /> Sensor Health: Optimal
                                                </p>
                                            </CardContent>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                                        </Card>
                                    </div>
                                    {/* Main Grid: Left (Col 1-2) / Right (Col 3) */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                        {/* Recent Reports List */}
                                        <div className="lg:col-span-2 space-y-8">
                                            <Card className="border-none shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                                <CardHeader className="flex flex-row items-center justify-between p-6 bg-slate-100/30 dark:bg-slate-800/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                                                        <CardTitle className="text-xl font-black">Recent Field Intelligence</CardTitle>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={() => setActiveTab('reports')} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Audit All</Button>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                                        {fieldReports.slice(0, 4).map((r) => (
                                                            <div key={r.id} className="p-6 flex items-center justify-between hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 group/item">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-inner group-hover/item:scale-110 transition-transform">
                                                                        <Activity className="h-6 w-6 text-slate-400 group-hover/item:text-primary transition-colors" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="font-bold text-slate-900 dark:text-white group-hover/item:text-primary transition-colors">{r.location_name}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                                                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.reporter_id}</span>
                                                                            <Separator orientation="vertical" className="h-2" />
                                                                            <span className="font-black text-primary">{r.severity}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end gap-2">
                                                                    <Badge variant={r.status === 'active' ? 'destructive' : 'secondary'} className="rounded-lg font-black uppercase tracking-widest text-[9px] px-2 py-0.5">
                                                                        {r.status}
                                                                    </Badge>
                                                                    <p className="text-[10px] font-bold text-muted-foreground">{timeAgo(r.timestamp)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {fieldReports.length === 0 && (
                                                            <div className="p-12 text-center text-muted-foreground font-medium">No intelligence reported yet.</div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* User Distribution Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {[
                                                    { label: 'Citizens', count: userCount, icon: Users, color: 'bg-primary' },
                                                    { label: 'Staff', count: petugasCount, icon: UserCog, color: 'bg-blue-500' },
                                                    { label: 'Admins', count: adminCount, icon: ShieldCheck, color: 'bg-slate-900' }
                                                ].map((stat, i) => (
                                                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                                                        <CardContent className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 group-hover:scale-110 transition-transform">
                                                                    <stat.icon className="h-5 w-5" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-muted-foreground">{Math.round((stat.count / (users.length || 1)) * 100)}%</span>
                                                            </div>
                                                            <div className="text-2xl font-black">{stat.count}</div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                                                            <div className="mt-4 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${users.length ? (stat.count / users.length) * 100 : 0}%` }}></div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Column: Alerts & Monitoring */}
                                        <div className="space-y-8">
                                            <Card className={`border-none shadow-sm overflow-hidden text-center p-8 flex flex-col items-center justify-center min-h-[350px] transition-all group ${alerts.length === 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-destructive/5'}`}>
                                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 relative ${alerts.length === 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-destructive/10'}`}>
                                                    {alerts.length === 0 ? (
                                                        <ShieldCheck className="h-12 w-12 text-emerald-600 dark:text-emerald-400 z-10" />
                                                    ) : (
                                                        <AlertTriangle className="h-12 w-12 text-destructive z-10" />
                                                    )}
                                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${alerts.length === 0 ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                                                </div>
                                                <CardTitle className="text-2xl font-black">{alerts.length === 0 ? 'System Nominal' : `${alerts.length} Active Alerts`}</CardTitle>
                                                <p className="text-sm font-medium text-muted-foreground mt-4 max-w-[200px]">
                                                    {alerts.length === 0 ? 'Secure environment confirmed across all sectors.' : 'Priority response required in multiple sectors.'}
                                                </p>
                                                <Button variant="outline" className="mt-8 w-full rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setActiveTab('alerts')}>Audit Alerts</Button>
                                            </Card>

                                            <Card className="border-none shadow-xl bg-primary text-white overflow-hidden relative group p-8">
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-bold text-lg tracking-tight">Real-time Coverage</h4>
                                                        <Activity className="h-5 w-5 opacity-50" />
                                                    </div>
                                                    <div className="flex items-end gap-2 h-24">
                                                        {[30, 60, 45, 80, 55, 90, 70].map((h, i) => (
                                                            <div key={i} className="flex-1 bg-white/20 rounded-full hover:bg-white/40 transition-all cursor-crosshair" style={{ height: `${h}%` }} />
                                                        ))}
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Global Index Status</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]" />
                                                            <span className="text-sm font-black">Optimal Sync</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab !== 'overview' && (
                                <Card className="border-none shadow-sm p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
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
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}

