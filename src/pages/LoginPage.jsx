import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { loadUser } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await apiLogin(phone, password);
            await loadUser();
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login gagal. Periksa nomor telepon dan password.');
        }
        setLoading(false);
    }

    return (
        <div className="login-page">
            <div className="login-bg-pattern" />
            <div className="login-container fade-in">
                <div className="login-card glass-card">
                    {/* Logo */}
                    <div className="login-header">
                        <div className="login-logo">🌊</div>
                        <h1 className="login-title">BanjirWatch</h1>
                        <p className="login-subtitle">Portal Admin & Petugas Lapangan</p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="phone">📱 Nomor Telepon</label>
                            <input
                                id="phone"
                                type="text"
                                placeholder="Contoh: 081234567890"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">🔒 Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Memproses...</>
                            ) : (
                                '🔑 Masuk'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Hanya untuk <strong>Admin</strong> dan <strong>Petugas Lapangan</strong></p>
                        <a href="/" className="login-back-link">← Kembali ke Portal Warga</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
