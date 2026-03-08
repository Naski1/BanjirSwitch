import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon for leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ lat, lng, onChange }) {
    useMapEvents({
        click(e) {
            if (onChange) {
                onChange(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

function MapUpdater({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 14, { animate: true, duration: 0.5 });
        }
    }, [lat, lng, map]);
    return null;
}

export default function LocationPickerMap({
    lat,
    lng,
    onChange,
    defaultLocation = { lat: -6.2088, lng: 106.8456 } // Jakarta 
}) {
    const initialLat = parseFloat(lat) || defaultLocation.lat;
    const initialLng = parseFloat(lng) || defaultLocation.lng;

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}>
            <MapContainer
                center={[initialLat, initialLng]}
                zoom={12}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker lat={lat ? parseFloat(lat) : null} lng={lng ? parseFloat(lng) : null} onChange={onChange} />
                <MapUpdater lat={lat ? parseFloat(lat) : null} lng={lng ? parseFloat(lng) : null} />
            </MapContainer>
            <div style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: '0.8rem', pointerEvents: 'none' }}>
                📍 Klik di mana saja pada peta untuk menempatkan jarum
            </div>
        </div>
    );
}
