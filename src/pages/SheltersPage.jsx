import { useState, useEffect } from 'react';
import { getNearbyShelters } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { getShelterTypeLabel, getFacilityLabel, DEFAULT_LOCATION } from '../utils/helpers';

export default function SheltersPage() {
    const { location, loading: geoLoading } = useGeolocation();
    const [shelters, setShelters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        if (location) loadShelters(location.lat, location.lng);
    }, [location]);

    async function loadShelters(lat, lng) {
        setLoading(true);
        try {
            const data = await getNearbyShelters(lat, lng, 30);
            setShelters(data || []);
            setError(null);
        } catch (err) {
            setError('Gagal memuat data shelter. Pastikan backend berjalan.');
            console.error(err);
        }
        setLoading(false);
    }

    const types = [...new Set(shelters.map(s => s.type))];
    const filtered = typeFilter === 'all'
        ? shelters
        : shelters.filter(s => s.type === typeFilter);

    const getCapacityColor = (curr, max) => {
        const ratio = curr / max;
        if (ratio >= 0.9) return 'var(--color-danger)';
        if (ratio >= 0.7) return 'var(--color-warning)';
        return 'var(--color-success)';
    };

    const totalCapacity = shelters.reduce((s, sh) => s + sh.capacity, 0);
    const totalOccupancy = shelters.reduce((s, sh) => s + sh.current_occupancy, 0);

    if (loading || geoLoading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <span className="loading-text">Mencari shelter evakuasi terdekat...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">🏠 Shelter Evakuasi</h1>
                <p className="page-description">
                    Tempat evakuasi darurat terdekat dari lokasi Anda. Klik "Navigasi" untuk petunjuk arah.
                </p>
            </div>

            {/* Stats */}
            <div className="stats-grid fade-in fade-in-1">
                <div className="stat-card">
                    <div className="stat-icon success">🏠</div>
                    <div>
                        <div className="stat-value">{shelters.length}</div>
                        <div className="stat-label">Shelter Tersedia</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">👥</div>
                    <div>
                        <div className="stat-value">{totalCapacity.toLocaleString()}</div>
                        <div className="stat-label">Total Kapasitas</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">🏃</div>
                    <div>
                        <div className="stat-value">{totalOccupancy.toLocaleString()}</div>
                        <div className="stat-label">Terisi Saat Ini</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">✅</div>
                    <div>
                        <div className="stat-value">{(totalCapacity - totalOccupancy).toLocaleString()}</div>
                        <div className="stat-label">Kapasitas Tersisa</div>
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
                            {getShelterTypeLabel(t)}
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
                    <div className="empty-icon">🏠</div>
                    <div className="empty-text">Tidak ada shelter ditemukan di area pencarian.</div>
                </div>
            ) : (
                <div className="shelter-grid">
                    {filtered.map((shelter, i) => (
                        <div key={shelter.id} className={`shelter-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                            <div className="shelter-header">
                                <div>
                                    <div className="shelter-name">🏠 {shelter.name}</div>
                                    <span className={`badge ${shelter.is_open ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: 4 }}>
                                        {shelter.is_open ? '✅ Buka' : '🔒 Tutup'}
                                    </span>
                                </div>
                                {shelter.distance_km != null && (
                                    <div className="shelter-distance">📏 {shelter.distance_km} km</div>
                                )}
                            </div>

                            {shelter.address && (
                                <div className="shelter-address">📍 {shelter.address}</div>
                            )}

                            <div className="shelter-stats">
                                <div className="shelter-stat">
                                    <div className="shelter-stat-value">{shelter.capacity}</div>
                                    <div className="shelter-stat-label">Kapasitas</div>
                                </div>
                                <div className="shelter-stat">
                                    <div className="shelter-stat-value" style={{ color: getCapacityColor(shelter.current_occupancy, shelter.capacity) }}>
                                        {shelter.current_occupancy}
                                    </div>
                                    <div className="shelter-stat-label">Terisi</div>
                                </div>
                                <div className="shelter-stat">
                                    <div className="shelter-stat-value" style={{ color: 'var(--color-success)' }}>
                                        {shelter.capacity - shelter.current_occupancy}
                                    </div>
                                    <div className="shelter-stat-label">Tersisa</div>
                                </div>
                            </div>

                            {/* Capacity bar */}
                            <div className="capacity-bar">
                                <div
                                    className="capacity-fill"
                                    style={{
                                        width: `${Math.min((shelter.current_occupancy / shelter.capacity) * 100, 100)}%`,
                                        background: getCapacityColor(shelter.current_occupancy, shelter.capacity),
                                    }}
                                />
                            </div>

                            {/* Facilities */}
                            {shelter.facilities && shelter.facilities.length > 0 && (
                                <div className="shelter-facilities" style={{ marginTop: 12 }}>
                                    {shelter.facilities.map((f, fi) => (
                                        <span key={fi} className="facility-tag">{getFacilityLabel(f)}</span>
                                    ))}
                                </div>
                            )}

                            {/* Type */}
                            <div style={{ marginBottom: 12 }}>
                                <span className="badge badge-info">{getShelterTypeLabel(shelter.type)}</span>
                            </div>

                            {/* Actions */}
                            <div className="shelter-actions">
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1 }}
                                >
                                    🧭 Navigasi
                                </a>
                                {shelter.contact && (
                                    <a
                                        href={`tel:${shelter.contact}`}
                                        className="btn btn-outline btn-sm"
                                        style={{ flex: 1 }}
                                    >
                                        📞 {shelter.contact}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
