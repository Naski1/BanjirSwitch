import { useState, useEffect } from 'react';
import { getNearbyReports } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import {
    getStatusBadgeClass, getDisasterLabel, getDisasterIcon,
    timeAgo, formatDate
} from '../utils/helpers';

export default function ReportsPage() {
    const { location, loading: geoLoading } = useGeolocation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        if (location) loadReports(location.lat, location.lng);
    }, [location]);

    async function loadReports(lat, lng) {
        setLoading(true);
        try {
            const data = await getNearbyReports(lat, lng, 25);
            setReports(data || []);
            setError(null);
        } catch (err) {
            setError('Gagal memuat laporan. Pastikan backend berjalan.');
            console.error(err);
        }
        setLoading(false);
    }

    const types = [...new Set(reports.map(r => r.type))];
    const filtered = typeFilter === 'all'
        ? reports
        : reports.filter(r => r.type === typeFilter);

    const statusCounts = {
        pending: reports.filter(r => r.status === 'pending').length,
        verified: reports.filter(r => r.status === 'verified').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
    };

    if (loading || geoLoading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <span className="loading-text">Memuat laporan bencana terdekat...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">📋 Laporan Bencana</h1>
                <p className="page-description">
                    Laporan kejadian bencana di sekitar lokasi Anda. Dikumpulkan dari warga & petugas lapangan.
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid fade-in fade-in-1">
                <div className="stat-card">
                    <div className="stat-icon info">📋</div>
                    <div>
                        <div className="stat-value">{reports.length}</div>
                        <div className="stat-label">Total Laporan</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">⏳</div>
                    <div>
                        <div className="stat-value">{statusCounts.pending}</div>
                        <div className="stat-label">Menunggu Verifikasi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">✅</div>
                    <div>
                        <div className="stat-value">{statusCounts.verified}</div>
                        <div className="stat-label">Terverifikasi</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">🏁</div>
                    <div>
                        <div className="stat-value">{statusCounts.resolved}</div>
                        <div className="stat-label">Terselesaikan</div>
                    </div>
                </div>
            </div>

            {/* Type filter */}
            {types.length > 0 && (
                <div className="tabs fade-in fade-in-2" style={{ marginTop: 24 }}>
                    <button
                        className={`tab ${typeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setTypeFilter('all')}
                    >
                        Semua
                    </button>
                    {types.map(t => (
                        <button
                            key={t}
                            className={`tab ${typeFilter === t ? 'active' : ''}`}
                            onClick={() => setTypeFilter(t)}
                        >
                            {getDisasterIcon(t)} {getDisasterLabel(t)}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="glass-card" style={{ textAlign: 'center', color: 'var(--color-danger)', marginBottom: 16 }}>
                    ⚠️ {error}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="empty-state fade-in">
                    <div className="empty-icon">📋</div>
                    <div className="empty-text">Tidak ada laporan bencana di sekitar lokasi Anda.</div>
                </div>
            ) : (
                <div className="report-list">
                    {filtered.map((report, i) => (
                        <div key={report.id} className={`report-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                            <div className="report-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{getDisasterIcon(report.type)}</span>
                                    <div className="report-title">{report.title}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span className={`badge ${getStatusBadgeClass(report.status)}`}>
                                        {report.status}
                                    </span>
                                    <span className="badge badge-neutral">
                                        {getDisasterLabel(report.type)}
                                    </span>
                                </div>
                            </div>

                            <div className="report-desc">{report.description}</div>

                            {report.address && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                    📍 {report.address}
                                </div>
                            )}

                            {/* AI Analysis */}
                            {report.ai_damage_analysis && (
                                <div style={{
                                    padding: '8px 12px',
                                    background: 'var(--color-surface)',
                                    borderRadius: 8,
                                    marginBottom: 8,
                                    fontSize: '0.8rem'
                                }}>
                                    <span style={{ fontWeight: 600, color: 'var(--color-accent-light)' }}>🤖 Analisis AI: </span>
                                    {report.ai_damage_analysis.damage_level && (
                                        <span>Tingkat kerusakan: <strong>{report.ai_damage_analysis.damage_level}</strong></span>
                                    )}
                                    {report.ai_damage_analysis.water_level_cm != null && (
                                        <span> | Ketinggian air: <strong>{report.ai_damage_analysis.water_level_cm} cm</strong></span>
                                    )}
                                    {report.ai_damage_analysis.affected_people != null && (
                                        <span> | Terdampak: <strong>{report.ai_damage_analysis.affected_people} orang</strong></span>
                                    )}
                                </div>
                            )}

                            <div className="report-meta">
                                <span>🕐 {timeAgo(report.created_at)}</span>
                                {report.distance_km != null && <span>📏 {report.distance_km} km</span>}
                                {report.priority && <span>⚡ Prioritas: {report.priority}</span>}
                                {report.ai_analyzed && <span>🤖 AI Analyzed</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
