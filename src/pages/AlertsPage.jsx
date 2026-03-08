import { useState, useEffect } from 'react';
import { getActiveAlerts } from '../services/api';
import {
    getSeverityBadgeClass, getSeverityIcon, getDisasterLabel,
    getDisasterIcon, formatDate, timeAgo
} from '../utils/helpers';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        loadAlerts();
        // Auto-refresh every 60s
        const interval = setInterval(loadAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    async function loadAlerts() {
        try {
            const data = await getActiveAlerts({ limit: 50 });
            setAlerts(data || []);
            setError(null);
        } catch (err) {
            setError('Gagal memuat peringatan. Pastikan backend berjalan.');
            console.error(err);
        }
        setLoading(false);
    }

    const filtered = filter === 'all'
        ? alerts
        : alerts.filter(a => a.severity === filter);

    const severityCounts = {
        extreme: alerts.filter(a => a.severity === 'extreme').length,
        severe: alerts.filter(a => a.severity === 'severe').length,
        moderate: alerts.filter(a => a.severity === 'moderate').length,
        minor: alerts.filter(a => a.severity === 'minor').length,
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <span className="loading-text">Memuat peringatan aktif...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">🚨 Peringatan Aktif</h1>
                <p className="page-description">
                    Peringatan darurat bencana yang sedang berlangsung. Data diperbarui otomatis setiap 60 detik.
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid fade-in fade-in-1">
                <div className="stat-card">
                    <div className="stat-icon danger">🔴</div>
                    <div>
                        <div className="stat-value">{alerts.length}</div>
                        <div className="stat-label">Total Peringatan</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">⚠️</div>
                    <div>
                        <div className="stat-value">{severityCounts.extreme + severityCounts.severe}</div>
                        <div className="stat-label">Kritis & Parah</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">🟡</div>
                    <div>
                        <div className="stat-value">{severityCounts.moderate}</div>
                        <div className="stat-label">Sedang</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">🟢</div>
                    <div>
                        <div className="stat-value">{severityCounts.minor}</div>
                        <div className="stat-label">Minor</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="tabs fade-in fade-in-2" style={{ marginTop: 24 }}>
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'extreme', label: 'Extreme' },
                    { key: 'severe', label: 'Severe' },
                    { key: 'moderate', label: 'Moderate' },
                    { key: 'minor', label: 'Minor' },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`tab ${filter === t.key ? 'active' : ''}`}
                        onClick={() => setFilter(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="glass-card fade-in" style={{ textAlign: 'center', color: 'var(--color-danger)', marginBottom: 16 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Alert list */}
            {filtered.length === 0 ? (
                <div className="empty-state fade-in">
                    <div className="empty-icon">✅</div>
                    <div className="empty-text">
                        {filter === 'all'
                            ? 'Tidak ada peringatan aktif saat ini. Situasi aman.'
                            : `Tidak ada peringatan dengan severity "${filter}".`}
                    </div>
                </div>
            ) : (
                <div className="alert-list">
                    {filtered.map((alert, i) => (
                        <div
                            key={alert.id}
                            className={`alert-card severity-${alert.severity} fade-in fade-in-${Math.min(i + 1, 5)}`}
                            onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                        >
                            <div
                                className="alert-severity-icon"
                                style={{
                                    background: alert.severity === 'extreme' ? 'var(--color-danger-bg)' :
                                        alert.severity === 'severe' ? 'rgba(249,115,22,0.12)' :
                                            alert.severity === 'moderate' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)'
                                }}
                            >
                                {getSeverityIcon(alert.severity)}
                            </div>
                            <div className="alert-content">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span className={`badge ${getSeverityBadgeClass(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                    {alert.event_type && (
                                        <span className="badge badge-neutral">
                                            {getDisasterIcon(alert.event_type)} {getDisasterLabel(alert.event_type)}
                                        </span>
                                    )}
                                </div>
                                <div className="alert-headline">{alert.headline}</div>
                                <div className="alert-description">{alert.description}</div>

                                {expandedId === alert.id && (
                                    <div style={{ marginTop: 12, padding: 12, background: 'var(--color-surface)', borderRadius: 8 }}>
                                        {alert.instruction && (
                                            <div style={{ marginBottom: 8 }}>
                                                <strong style={{ color: 'var(--color-warning)', fontSize: '0.8rem' }}>📋 Instruksi:</strong>
                                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{alert.instruction}</p>
                                            </div>
                                        )}
                                        {alert.affected_areas && alert.affected_areas.length > 0 && (
                                            <div style={{ marginBottom: 8 }}>
                                                <strong style={{ fontSize: '0.8rem' }}>📍 Wilayah Terdampak:</strong>
                                                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                                                    {alert.affected_areas.join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        {alert.source && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                Sumber: {alert.source}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="alert-meta">
                                    <span>🕐 {timeAgo(alert.sent_at)}</span>
                                    {alert.expires_at && <span>⏰ Exp: {formatDate(alert.expires_at)}</span>}
                                    {alert.zone_id && <span>📍 Zone #{alert.zone_id}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
