import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getNearbyZones, getNearbyShelters } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import {
    getRiskColor, getRiskLabel, getRiskBadgeClass, getDisasterLabel,
    getDisasterIcon, getShelterTypeLabel, DEFAULT_LOCATION
} from '../utils/helpers';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createDivIcon(emoji, bgColor) {
    return L.divIcon({
        html: `<div style="
      background:${bgColor};
      width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    ">${emoji}</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

const userIcon = L.divIcon({
    html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#3b82f6;border:3px solid #fff;
    box-shadow:0 0 12px rgba(59,130,246,0.6);
  "></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

function MapCenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView([center.lat, center.lng], 13, { animate: true });
    }, [center, map]);
    return null;
}

export default function MapPage() {
    const { location, loading: geoLoading, requestLocation } = useGeolocation();
    const [zones, setZones] = useState([]);
    const [shelters, setShelters] = useState([]);
    const [publicReports, setPublicReports] = useState([]);
    const [fieldReports, setFieldReports] = useState([]);

    const [loadingData, setLoadingData] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [mapCenter, setMapCenter] = useState(null);
    const [showSidebar, setShowSidebar] = useState(true);

    const fetchData = useCallback(async (lat, lng) => {
        setLoadingData(true);
        try {
            // Fetch public and basic map data
            const [zonesData, sheltersData, reportsData] = await Promise.all([
                getNearbyZones(lat, lng, 20),
                getNearbyShelters(lat, lng, 20),
                import('../services/api').then(m => m.getNearbyReports(lat, lng, 20)).catch(() => [])
            ]);
            setZones(zonesData || []);
            setShelters(sheltersData || []);
            setPublicReports(reportsData || []);

            // Attempt to fetch officer's field reports if logged in
            try {
                const token = localStorage.getItem('access_token');
                if (token) {
                    const response = await fetch('/api/v1/petugas/field-reports', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.ok) {
                        const fieldData = await response.json();
                        setFieldReports(fieldData || []);
                    }
                }
            } catch (err) {
                // Ignore err
            }
        } catch (err) {
            console.error('Error fetching map data:', err);
        }
        setLoadingData(false);
    }, []);

    useEffect(() => {
        if (location) {
            fetchData(location.lat, location.lng);
        }
    }, [location, fetchData]);

    const [searching, setSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchText.trim()) return;

        // 1. Try parsing as coordinates first: "lat, lng"
        const parts = searchText.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const newLoc = { lat: parts[0], lng: parts[1] };
            setMapCenter(newLoc);
            fetchData(newLoc.lat, newLoc.lng);
            return;
        }

        // 2. Search by place name using Nominatim
        setSearching(true);
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchText)}&format=json&limit=1&countrycodes=id&accept-language=id`,
                { headers: { 'User-Agent': 'AquaSentinel-DisasterApp/1.0' } }
            );
            const results = await resp.json();
            if (results && results.length > 0) {
                const newLoc = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
                setMapCenter(newLoc);
                fetchData(newLoc.lat, newLoc.lng);
            } else {
                alert('Lokasi tidak ditemukan. Coba nama daerah yang lebih spesifik.');
            }
        } catch (err) {
            console.error('Search error:', err);
            alert('Gagal mencari lokasi. Periksa koneksi internet Anda.');
        }
        setSearching(false);
    };

    const center = mapCenter || location || DEFAULT_LOCATION;

    return (
        <div className="map-page">
            <div className="map-container">
                <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <MapCenter center={mapCenter || location} />

                    {/* User location marker */}
                    {location && (
                        <Marker position={[location.lat, location.lng]} icon={userIcon}>
                            <Popup>
                                <div className="popup-title">📍 Lokasi Anda</div>
                                <div className="popup-info">
                                    <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Zone markers */}
                    {zones.map((zone) => (
                        <Marker
                            key={`zone-${zone.id}`}
                            position={[zone.center_lat, zone.center_lng]}
                            icon={createDivIcon(
                                getDisasterIcon(zone.disaster_type),
                                getRiskColor(zone.risk_level)
                            )}
                            eventHandlers={{
                                click: () => setSelectedZone(zone),
                            }}
                        >
                            <Popup>
                                <div className="popup-title">{zone.name}</div>
                                <div className="popup-info">
                                    <span>📊 Risiko: {getRiskLabel(zone.risk_level)}</span>
                                    <span>📏 Jarak: {zone.distance_km} km</span>
                                    <span>🏷️ Tipe: {getDisasterLabel(zone.disaster_type)}</span>
                                    {zone.description && (
                                        <span style={{ marginTop: 4, fontSize: '0.78rem', opacity: 0.8 }}>
                                            {zone.description}
                                        </span>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Zone risk circles */}
                    {zones.map((zone) => (
                        <Circle
                            key={`circle-${zone.id}`}
                            center={[zone.center_lat, zone.center_lng]}
                            radius={800}
                            pathOptions={{
                                color: getRiskColor(zone.risk_level),
                                fillColor: getRiskColor(zone.risk_level),
                                fillOpacity: 0.12,
                                weight: 1.5,
                            }}
                        />
                    ))}

                    {/* Shelter markers */}
                    {shelters.map((shelter) => (
                        <Marker
                            key={`shelter-${shelter.id}`}
                            position={[shelter.lat, shelter.lng]}
                            icon={createDivIcon('🏠', '#10b981')}
                        >
                            <Popup>
                                <div className="popup-title">🏠 {shelter.name}</div>
                                <div className="popup-info">
                                    <span>📍 {shelter.address || '-'}</span>
                                    <span>👥 Kapasitas: {shelter.current_occupancy}/{shelter.capacity}</span>
                                    <span>📏 Jarak: {shelter.distance_km} km</span>
                                    <span>📋 Tipe: {getShelterTypeLabel(shelter.type)}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Public Reports markers */}
                    {publicReports.filter(r => r.status === 'active').map((report) => (
                        report.latitude && report.longitude && (
                            <Marker
                                key={`report-${report.id}`}
                                position={[report.latitude, report.longitude]}
                                icon={createDivIcon(getDisasterIcon(report.type), '#f59e0b')}
                            >
                                <Popup>
                                    <div className="popup-title">📢 {report.title}</div>
                                    <div className="popup-info">
                                        <span>🏷️ {getDisasterLabel(report.type)}</span>
                                        <span>Status: {report.status}</span>
                                        {report.distance_km && <span>Jarak: {report.distance_km?.toFixed(2)} km</span>}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}

                    {/* Field Reports markers (Petugas) */}
                    {fieldReports.filter(r => r.status === 'active').map((report) => (
                        report.lat && report.lng && (
                            <Marker
                                key={`field-${report.id}`}
                                position={[report.lat, report.lng]}
                                icon={createDivIcon(getDisasterIcon(report.disaster_type), getRiskColor(report.severity === 'extreme' ? 4 : report.severity === 'severe' ? 3 : report.severity === 'moderate' ? 2 : 1))}
                            >
                                <Popup>
                                    <div className="popup-title">👷 Laporan Petugas</div>
                                    <div className="popup-info">
                                        <span>📍 {report.location_name}</span>
                                        <span>🏷️ {getDisasterLabel(report.disaster_type)}</span>
                                        <span>Status: {report.status} (Keparahan: {report.severity})</span>
                                        {report.water_level_cm != null && <span>💧 Air: {report.water_level_cm} cm</span>}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </div>

            {/* Search bar */}
            <div className="location-search-panel">
                <form onSubmit={handleSearch} className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={searching ? "Mencari lokasi..." : "Cari lokasi: ketik nama daerah, kecamatan, atau kota"}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        disabled={searching}
                    />
                </form>
            </div>

            {/* Zone sidebar */}
            {showSidebar && zones.length > 0 && (
                <div className="map-sidebar" style={{ top: 70 }}>
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                ⚠️ Zona Bencana Terdekat ({zones.length})
                            </h3>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setShowSidebar(false)}
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            >✕</button>
                        </div>
                        <div className="zone-list">
                            {zones.slice(0, 10).map((zone, i) => (
                                <div
                                    key={zone.id}
                                    className={`zone-item fade-in fade-in-${i + 1}`}
                                    onClick={() => {
                                        setMapCenter({ lat: zone.center_lat, lng: zone.center_lng });
                                        setSelectedZone(zone);
                                    }}
                                >
                                    <div className="zone-risk-dot" style={{ background: getRiskColor(zone.risk_level) }} />
                                    <span className="zone-item-name">{zone.name}</span>
                                    <span className="zone-item-distance">{zone.distance_km} km</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shelter count */}
                    {shelters.length > 0 && (
                        <div className="glass-card" style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                                🏠 {shelters.length} Shelter Tersedia Terdekat
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="map-legend">
                <div className="glass-card" style={{ padding: 0 }}>
                    <div className="legend-items">
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} />Risiko Sangat Tinggi</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#f97316' }} />Risiko Tinggi</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }} />Risiko Sedang</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#06b6d4' }} />Risiko Rendah</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }} />Shelter</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: '#3b82f6' }} />Lokasi Anda</div>
                    </div>
                </div>
            </div>

            {/* Locate button */}
            <button className="locate-btn" onClick={() => {
                requestLocation();
                setMapCenter(null);
                if (location) fetchData(location.lat, location.lng);
                setShowSidebar(true);
            }}>
                📍 Lokasi Saya
            </button>
        </div>
    );
}
