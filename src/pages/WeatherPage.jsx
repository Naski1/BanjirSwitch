import { useState, useEffect } from 'react';
import { getWeatherForecast } from '../services/api';
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



export default function WeatherPage() {
    const { location, loading: geoLoading, error: geoError } = useGeolocation();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            const weatherData = await getWeatherForecast(lat, lng);
            setWeather(weatherData);
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
                    <span className="loading-text">Memuat data cuaca...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">🌤️ Informasi Cuaca</h1>
                <p className="page-description">
                    Prakiraan cuaca saat ini secara real-time.
                </p>
            </div>

            {error && (
                <div className="glass-card" style={{ textAlign: 'center', color: 'var(--color-danger)', marginBottom: 16 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Weather Content */}
            <div className="fade-in">
                {weather ? (
                    <div>
                        {/* Main weather widget */}
                        <div className="weather-widget" style={{ marginBottom: 24, color: '#fff' }}>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontWeight: 500 }}>
                                📍 {weather.location?.name || weather.location?.province || 'Indonesia'}
                            </div>
                            <div className="weather-main">
                                <div className="weather-icon">
                                    {getWeatherIcon(weather.current?.weather_desc || weather.forecasts?.[0]?.weather_desc)}
                                </div>
                                <div>
                                    <div className="weather-temp" style={{ color: '#fff' }}>
                                        {weather.current?.temperature || weather.forecasts?.[0]?.temperature_max || '--'}°C
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', marginTop: 4, fontWeight: 500 }}>
                                        {weather.current?.weather_desc || weather.forecasts?.[0]?.weather_desc || 'Data tidak tersedia'}
                                    </div>
                                </div>
                            </div>

                            <div className="weather-details" style={{ color: '#fff' }}>
                                <div className="weather-detail">
                                    <div className="weather-detail-value" style={{ color: '#fff' }}>
                                        💧 {weather.current?.humidity || weather.forecasts?.[0]?.humidity || '--'}%
                                    </div>
                                    <div className="weather-detail-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Kelembaban</div>
                                </div>
                                <div className="weather-detail">
                                    <div className="weather-detail-value" style={{ color: '#fff' }}>
                                        💨 {weather.current?.wind_speed || weather.forecasts?.[0]?.wind_speed || '--'} km/h
                                    </div>
                                    <div className="weather-detail-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Angin</div>
                                </div>
                                <div className="weather-detail">
                                    <div className="weather-detail-value" style={{ color: '#fff' }}>
                                        🌧️ {weather.current?.visibility || weather.forecasts?.[0]?.visibility || '--'} km
                                    </div>
                                    <div className="weather-detail-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Jarak Pandang</div>
                                </div>
                            </div>
                        </div>

                        {/* Forecast list */}
                        {weather.forecasts && weather.forecasts.length > 0 && (
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: 'var(--color-text)' }}>📅 Prakiraan Mendatang</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                                    {weather.forecasts.slice(0, 8).map((fc, i) => (
                                        <div key={i} className="glass-card" style={{ padding: 16 }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>
                                                {fc.datetime || fc.local_datetime || `T+${(i + 1) * 6}h`}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: '2rem' }}>{getWeatherIcon(fc.weather_desc)}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                                                        {fc.temperature_min || fc.temperature}° - {fc.temperature_max || fc.temperature}°C
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                                        {fc.weather_desc || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            {fc.humidity && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
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
        </div>
    );
}
