import { useState, useEffect } from 'react';
import { getWeatherForecast, getRivers, getFloodStatus } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const weatherIcons = {
    'Cerah': '☀️',
    'Cerah Berawan': '🌤️',
    'Berawan': '☁️',
    'Berawan Tebal': '🌥️',
    'Hujan Ringan': '🌦️',
    'Hujan Sedang': '🌧️',
    'Hujan Lebat': '⛈️',
    'Hujan Petir': '🌩️',
    'Kabut': '🌫️',
};

function getWeatherIcon(desc) {
    if (!desc) return '🌡️';
    for (const [key, icon] of Object.entries(weatherIcons)) {
        if (desc.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return '🌡️';
}

const statusColors = {
    normal: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'Normal' },
    waspada: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Waspada' },
    siaga: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Siaga' },
    awas: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', label: 'Awas' },
};

export default function WeatherPage() {
    const { location, loading: geoLoading, error: geoError } = useGeolocation();
    const [weather, setWeather] = useState(null);
    const [rivers, setRivers] = useState([]);
    const [floodStatus, setFloodStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('weather');

    useEffect(() => {
        if (geoError) {
            setError(`Gagal mendapatkan lokasi: ${geoError.message}. Menampilkan data default.`);
            loadData(null, null); // Load data without specific lat/lng
        } else if (location) {
            loadData(location.lat, location.lng);
        }
    }, [location, geoError]);

    async function loadData(lat, lng) {
        setLoading(true);
        try {
            const [weatherData, riversData, floodData] = await Promise.allSettled([
                getWeatherForecast(lat, lng),
                getRivers(),
                getFloodStatus('jkt'),
            ]);

            if (weatherData.status === 'fulfilled') setWeather(weatherData.value);
            if (riversData.status === 'fulfilled') setRivers(riversData.value || []);
            if (floodData.status === 'fulfilled') setFloodStatus(floodData.value);
        } catch (err) {
            setError('Gagal memuat data. Pastikan backend berjalan.');
            console.error(err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <span className="loading-text">Memuat data cuaca & monitoring sungai...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">🌤️ Informasi Cuaca & Sungai</h1>
                <p className="page-description">
                    Prakiraan cuaca dan monitoring kondisi sungai secara real-time.
                </p>
            </div>

            {/* Tabs */}
            <div className="tabs fade-in fade-in-1">
                <button
                    className={`tab ${activeTab === 'weather' ? 'active' : ''}`}
                    onClick={() => setActiveTab('weather')}
                >
                    ☀️ Cuaca
                </button>
                <button
                    className={`tab ${activeTab === 'rivers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rivers')}
                >
                    🏞️ Sungai ({rivers.length})
                </button>
                <button
                    className={`tab ${activeTab === 'flood' ? 'active' : ''}`}
                    onClick={() => setActiveTab('flood')}
                >
                    🌊 Status Banjir
                </button>
            </div>

            {error && (
                <div className="glass-card" style={{ textAlign: 'center', color: 'var(--color-danger)', marginBottom: 16 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Weather Tab */}
            {activeTab === 'weather' && (
                <div className="fade-in">
                    {weather ? (
                        <div>
                            {/* Main weather widget */}
                            <div className="weather-widget" style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                    📍 {weather.location?.name || weather.location?.province || 'Indonesia'}
                                </div>
                                <div className="weather-main">
                                    <div className="weather-icon">
                                        {getWeatherIcon(weather.current?.weather_desc || weather.forecasts?.[0]?.weather_desc)}
                                    </div>
                                    <div>
                                        <div className="weather-temp">
                                            {weather.current?.temperature || weather.forecasts?.[0]?.temperature_max || '--'}°C
                                        </div>
                                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
                                            {weather.current?.weather_desc || weather.forecasts?.[0]?.weather_desc || 'Data tidak tersedia'}
                                        </div>
                                    </div>
                                </div>

                                <div className="weather-details">
                                    <div className="weather-detail">
                                        <div className="weather-detail-value">
                                            💧 {weather.current?.humidity || weather.forecasts?.[0]?.humidity || '--'}%
                                        </div>
                                        <div className="weather-detail-label">Kelembaban</div>
                                    </div>
                                    <div className="weather-detail">
                                        <div className="weather-detail-value">
                                            💨 {weather.current?.wind_speed || weather.forecasts?.[0]?.wind_speed || '--'} km/h
                                        </div>
                                        <div className="weather-detail-label">Angin</div>
                                    </div>
                                    <div className="weather-detail">
                                        <div className="weather-detail-value">
                                            🌧️ {weather.current?.visibility || weather.forecasts?.[0]?.visibility || '--'} km
                                        </div>
                                        <div className="weather-detail-label">Jarak Pandang</div>
                                    </div>
                                </div>
                            </div>

                            {/* Forecast list */}
                            {weather.forecasts && weather.forecasts.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>📅 Prakiraan Mendatang</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                                        {weather.forecasts.slice(0, 8).map((fc, i) => (
                                            <div key={i} className="glass-card" style={{ padding: 16 }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                                    {fc.datetime || fc.local_datetime || `T+${(i + 1) * 6}h`}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ fontSize: '2rem' }}>{getWeatherIcon(fc.weather_desc)}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>
                                                            {fc.temperature_min || fc.temperature}° - {fc.temperature_max || fc.temperature}°C
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                                                            {fc.weather_desc || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {fc.humidity && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                                                        💧 {fc.humidity}% | 💨 {fc.wind_speed || '-'} km/h
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">☀️</div>
                            <div className="empty-text">Data cuaca tidak tersedia saat ini.</div>
                        </div>
                    )}
                </div>
            )}

            {/* Rivers Tab */}
            {activeTab === 'rivers' && (
                <div className="fade-in">
                    {rivers.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🏞️</div>
                            <div className="empty-text">Belum ada data monitoring sungai.</div>
                        </div>
                    ) : (
                        <div className="river-grid">
                            {rivers.map((river, i) => {
                                const st = statusColors[river.status] || statusColors.normal;
                                return (
                                    <div key={river.id} className={`river-card fade-in fade-in-${Math.min(i + 1, 5)}`}>
                                        <div className="river-name">
                                            🏞️ {river.name}
                                            <span className="badge" style={{
                                                background: st.bg, color: st.color,
                                                border: `1px solid ${st.color}33`, fontSize: '0.7rem'
                                            }}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {river.location_description && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                                📍 {river.location_description}
                                            </div>
                                        )}

                                        <div className="river-stats">
                                            <div className="river-stat">
                                                <div className="stat-value" style={{ fontSize: '1.2rem', color: st.color }}>
                                                    {river.current_level ?? '--'} m
                                                </div>
                                                <div className="stat-label" style={{ fontSize: '0.68rem' }}>Ketinggian</div>
                                            </div>
                                            <div className="river-stat">
                                                <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                                                    {river.normal_level ?? '--'} m
                                                </div>
                                                <div className="stat-label" style={{ fontSize: '0.68rem' }}>Normal</div>
                                            </div>
                                        </div>

                                        {river.thresholds && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                                                🟡 Waspada: {river.thresholds.waspada ?? '-'}m &nbsp;
                                                🟠 Siaga: {river.thresholds.siaga ?? '-'}m &nbsp;
                                                🔴 Awas: {river.thresholds.awas ?? '-'}m
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Flood Status Tab */}
            {activeTab === 'flood' && (
                <div className="fade-in">
                    {floodStatus ? (
                        <div className="glass-card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
                                🌊 Status Banjir Real-time
                            </h3>
                            <pre style={{
                                fontSize: '0.8rem',
                                color: 'var(--color-text-secondary)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                background: 'var(--color-surface)',
                                padding: 16,
                                borderRadius: 8,
                                maxHeight: 400,
                                overflow: 'auto',
                            }}>
                                {JSON.stringify(floodStatus, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">🌊</div>
                            <div className="empty-text">Data status banjir tidak tersedia.</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
