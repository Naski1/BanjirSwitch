import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    const { user } = useAuth();

    const publicLinks = [
        { to: '/', label: 'Peta', icon: '🗺️' },
        { to: '/alerts', label: 'Peringatan', icon: '🚨' },
        { to: '/shelters', label: 'Shelter', icon: '🏠' },
        { to: '/reports', label: 'Laporan', icon: '📋' },
        { to: '/weather', label: 'Cuaca', icon: '🌤️' },
    ];

    // Hide public nav on login/dashboard pages
    const isDashboard = pathname === '/dashboard' || pathname === '/login';

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <div className="logo-icon">🌊</div>
                <div>
                    <h1>BanjirWatch</h1>
                    <span className="subtitle">Sistem Peringatan Bencana</span>
                </div>
            </Link>

            <button className="mobile-menu-btn" onClick={() => setOpen(!open)}>
                {open ? '✕' : '☰'}
            </button>

            <div className={`navbar-nav ${open ? 'open' : ''}`}>
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

                {/* Separator */}
                {!isDashboard && <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 4px' }} />}

                {user ? (
                    <Link
                        to="/dashboard"
                        className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                        onClick={() => setOpen(false)}
                    >
                        <span className="nav-icon">{user.role === 'admin' ? '👑' : '👷'}</span>
                        Dashboard
                    </Link>
                ) : (
                    <Link
                        to="/login"
                        className={`nav-link ${pathname === '/login' ? 'active' : ''}`}
                        onClick={() => setOpen(false)}
                        style={{ background: 'var(--color-accent-glow)', borderRadius: 'var(--radius-sm)' }}
                    >
                        <span className="nav-icon">🔑</span>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}
