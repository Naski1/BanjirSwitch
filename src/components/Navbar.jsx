import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Map,
    AlertTriangle,
    Home,
    FileText,
    CloudSun,
    Waves,
    ShieldAlert,
    HardHat,
    LogIn,
    Menu,
    X
} from 'lucide-react';

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const { user } = useAuth();

    const publicLinks = [
        { to: '/', label: 'Peta', icon: <Map size={18} /> },
        { to: '/alerts', label: 'Peringatan', icon: <AlertTriangle size={18} /> },
        { to: '/shelters', label: 'Posko', icon: <Home size={18} /> },
        { to: '/reports', label: 'Laporan', icon: <FileText size={18} /> },
        { to: '/weather', label: 'Cuaca', icon: <CloudSun size={18} /> },
    ];

    // Hide public nav on login/dashboard pages
    const isDashboard = pathname.startsWith('/dashboard') || pathname === '/login';

    if (pathname.startsWith('/dashboard')) {
        return null;
    }

    return (
        <nav className="navbar">
            <div className="navbar-brand-container">
                <Link to="/" className="navbar-brand">
                    <div className="logo-icon"><Waves size={22} color="#ffffff" strokeWidth={2.5} /></div>
                    <div className="brand-text">
                        <h1>BanjirWatch</h1>
                        <span className="subtitle">Sistem Peringatan Bencana</span>
                    </div>
                </Link>
            </div>

            <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
                {open ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className={`navbar-menu ${open ? 'open' : ''}`}>
                <div className="navbar-center">
                    {!isDashboard && publicLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${pathname === link.to ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <span className="nav-icon">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="navbar-right">
                    {user ? (
                        <Link
                            to="/dashboard"
                            className={`nav-link btn-dashboard ${pathname === '/dashboard' ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <span className="nav-icon">{user.role === 'admin' ? <ShieldAlert size={18} /> : <HardHat size={18} />}</span>
                            Dashboard
                        </Link>
                    ) : (
                        <Link
                            to="/login"
                            className={`nav-link btn-login ${pathname === '/login' ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <span className="nav-icon" style={{ color: 'currentColor' }}><LogIn size={18} /></span>
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
