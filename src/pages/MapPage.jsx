import { useState, useEffect, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl } from 'react-leaflet';
import { Compass, MapPin, Search, Home, BarChart2, Ruler, Tag, Megaphone, HardHat, Droplet, Activity, Map as MapIcon, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getNearbyZones, getNearbyShelters, checkProximity } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import {
    getRiskColor, getRiskLabel, getRiskBadgeClass, getDisasterLabel,
    getDisasterIcon, getShelterTypeLabel, DEFAULT_LOCATION, getRadiusFillOpacity
} from '../utils/helpers';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createDivIcon(iconNode, bgColor) {
    const iconHtml = typeof iconNode === 'string' ? iconNode : renderToStaticMarkup(iconNode);
    return L.divIcon({
        html: `<div style="
      background:${bgColor};
      width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color: white;
      font-size:16px;border:2px solid rgba(255,255,255,0.3);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    ">${iconHtml}</div>`,
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
    const [proximityAlert, setProximityAlert] = useState(null);

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
        
        // 4. Check Proximity if we are fetching around user's exact location
        if (lat && lng && location && Math.abs(lat - location.lat) < 0.001) {
            try {
                const proximityData = await checkProximity(lat, lng);
                if (proximityData && proximityData.in_danger_zone && proximityData.warnings.length > 0) {
                    setProximityAlert(proximityData.warnings[0]); // Show the closest warning
                } else {
                    setProximityAlert(null);
                }
            } catch (err) {
                console.error('Error checking proximity:', err);
            }
        }
    }, [location]);

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
                    zoomControl={false}
                >
                    <ZoomControl position="bottomright" />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <MapCenter center={mapCenter || location} />

                    {/* User location marker */}
                    {location && (
                        <Marker position={[location.lat, location.lng]} icon={userIcon}>
                            <Popup>
                                <div className="popup-title"><MapPin size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Lokasi Anda</div>
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
                                    <span><BarChart2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Risiko: {getRiskLabel(zone.risk_level)}</span>
                                    <span><Ruler size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Jarak: {zone.distance_km} km</span>
                                    <span><Tag size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Tipe: {getDisasterLabel(zone.disaster_type)}</span>
                                    {zone.description && (
                                        <span style={{ marginTop: 4, fontSize: '0.78rem', opacity: 0.8 }}>
                                            {zone.description}
                                        </span>
                                    )}
                                    {zone.sensor_data?.road_accessible !== undefined && (
                                        <span style={{ marginTop: 4, fontSize: '0.8rem', fontWeight: 'bold', color: zone.sensor_data.road_accessible ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                            {zone.sensor_data.road_accessible ? '🛣️ Jalan Dapat Diakses' : '🛣️ Jalan Terputus/Rusak'}
                                        </span>
                                    )}
                                    {zone.sensor_data?.needs_evacuation && (
                                        <span className="pulse" style={{ marginTop: 2, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                                            🚨 BUTUH EVAKUASI SEGERA
                                        </span>
                                    )}
                                    <span style={{ marginTop: 4, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <Activity size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> Radius Dampak: {zone.impact_radius_km || 5.0} km
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Zone risk circles */}
                    {zones.map((zone) => (
                        <Circle
                            key={`circle-${zone.id}`}
                            center={[zone.center_lat, zone.center_lng]}
                            radius={(zone.impact_radius_km || 5.0) * 1000} // Radius in meters
                            pathOptions={{
                                color: getRiskColor(zone.risk_level),
                                fillColor: getRiskColor(zone.risk_level),
                                fillOpacity: getRadiusFillOpacity(zone.risk_level),
                                weight: 1.5,
                            }}
                        />
                    ))}

                    {/* Shelter markers */}
                    {shelters.map((shelter) => (
                        <Marker
                            key={`shelter-${shelter.id}`}
                            position={[shelter.lat, shelter.lng]}
                            icon={createDivIcon(<Home size={18} color="#ffffff" />, '#10b981')}
                        >
                            <Popup>
                                <div className="popup-title"><Home size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {shelter.name}</div>
                                <div className="popup-info">
                                    <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {shelter.address || '-'}</span>
                                    <span>👥 Kapasitas: {shelter.current_occupancy}/{shelter.capacity}</span>
                                    <span><Ruler size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Jarak: {shelter.distance_km} km</span>
                                    <span><Tag size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Tipe: {getShelterTypeLabel(shelter.type)}</span>
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
                                    <div className="popup-title"><Megaphone size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {report.title}</div>
                                    <div className="popup-info">
                                        <span><Tag size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {getDisasterLabel(report.type)}</span>
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
                                    <div className="popup-title"><HardHat size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Laporan Petugas</div>
                                    <div className="popup-info">
                                        <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {report.location_name}</span>
                                        <span><Tag size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> {getDisasterLabel(report.disaster_type)}</span>
                                        <span>Status: {report.status} (<Activity size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {report.severity})</span>
                                        {report.water_level_cm != null && <span><Droplet size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Air: {report.water_level_cm} cm</span>}
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </div>

            {/* Map UI Overlays Layer */}
            <div className="map-ui-layer">
                {/* Proximity Alert Toast */}
                {proximityAlert && (
                    <div className="proximity-alert-toast" style={{
                        position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--color-danger)', color: 'white', padding: '12px 20px',
                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                        display: 'flex', alignItems: 'flex-start', gap: '12px', zIndex: 1000,
                        maxWidth: '90%', width: '400px'
                    }}>
                        <div style={{ marginTop: '2px' }}><AlertTriangle size={24} /></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '1rem' }}>Peringatan Bahaya</div>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{proximityAlert.message}</div>
                        </div>
                        <button onClick={() => setProximityAlert(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Search bar floating pill */}
                <div className="map-search-pill">
                    <span className="search-icon" style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}><Search size={20} /></span>
                    <form onSubmit={handleSearch} style={{ margin: 0, width: '100%' }}>
                        <input
                            type="text"
                            placeholder={searching ? "Mencari lokasi..." : "Cari lokasi daerah atau kota"}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            disabled={searching}
                            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}
                        />
                    </form>
                </div>

                {/* Right Panel (Legend & Nearby Shelters) */}
                <div className="map-right-panel">
                    <div className="right-panel-section">
                        <div className="right-panel-title">
                            Tingkat Banjir Saat Ini
                            <span style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>^</span>
                        </div>
                        <div className="legend-list">
                            <div className="legend-item-row">
                                <div className="legend-color-box" style={{ background: '#ef4444' }}></div>
                                <span>Sangat Tinggi</span>
                            </div>
                            <div className="legend-item-row">
                                <div className="legend-color-box" style={{ background: '#f97316' }}></div>
                                <span>Tinggi</span>
                            </div>
                            <div className="legend-item-row">
                                <div className="legend-color-box" style={{ background: '#f59e0b' }}></div>
                                <span>Sedang</span>
                            </div>
                            <div className="legend-item-row">
                                <div className="legend-color-box" style={{ background: '#06b6d4' }}></div>
                                <span>Rendah</span>
                            </div>
                            <div className="legend-item-row">
                                <div className="legend-color-box" style={{ background: '#10b981' }}></div>
                                <span>Sangat Rendah</span>
                            </div>
                        </div>
                    </div>

                    <div className="right-panel-section">
                        <div className="right-panel-title">
                            Posko Pengungsian Terdekat
                            <span style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>^</span>
                        </div>
                        <div className="shelter-list-compact">
                            {/* Render up to 2 actual closest shelters if available */}
                            {shelters.slice(0, 2).map(shelter => (
                                <div key={shelter.id} className="shelter-item-compact">
                                    <div className="legend-icon-box" style={{ color: '#10b981' }}>
                                        <Home size={16} />
                                    </div>
                                    <span>{shelter.name}</span>
                                </div>
                            ))}
                            {shelters.length === 0 && (
                                <div className="shelter-item-compact" style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                    Tidak ada shelter aktif di sekitar radius.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Left Shelter Indicator */}
                {shelters.length > 0 && (
                    <div className="map-bottom-left-pill">
                        <span><Home size={18} style={{ display: 'block' }} color="var(--color-success)" /></span>
                        <span>Posko Pengungsian ({shelters.length}): <span style={{ fontWeight: 400 }}>{shelters[0]?.distance_km} km</span></span>
                    </div>
                )}
            </div>

            {/* Prominent floating action button */}
            <button className="fab-locate" onClick={() => {
                requestLocation();
                setMapCenter(null);
                if (location) fetchData(location.lat, location.lng);
            }}>
                <span className="icon" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}><Compass size={22} /></span> <span style={{ marginLeft: 6 }}>Lokasi Saya</span>
            </button>
        </div>
    );
}
