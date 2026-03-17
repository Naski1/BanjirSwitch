/**
 * Utility helpers for the app
 */
import {
    AlertCircle, AlertOctagon, AlertTriangle, CheckCircle, HelpCircle,
    Waves, BellRing, MountainSnow, Flame, CloudLightning, Home,
    Droplets, FlameKindling, Pocket, UtensilsCrossed, Settings, Stethoscope
} from 'lucide-react';

// Risk level color mapping
export function getRiskColor(level) {
    const colors = {
        1: '#10b981', // green
        2: '#06b6d4', // cyan
        3: '#f59e0b', // amber
        4: '#f97316', // orange
        5: '#ef4444', // red
    };
    return colors[level] || '#64748b';
}

export function getRiskLabel(level) {
    const labels = {
        1: 'Sangat Rendah',
        2: 'Rendah',
        3: 'Sedang',
        4: 'Tinggi',
        5: 'Sangat Tinggi',
    };
    return labels[level] || 'Tidak Diketahui';
}

export function getRiskBadgeClass(level) {
    if (level >= 4) return 'badge-danger';
    if (level === 3) return 'badge-warning';
    if (level === 2) return 'badge-info';
    return 'badge-success';
}

// Severity mapping for alerts
export function getSeverityBadgeClass(severity) {
    const map = {
        extreme: 'badge-danger',
        severe: 'badge-danger',
        moderate: 'badge-warning',
        minor: 'badge-info',
        unknown: 'badge-neutral',
    };
    return map[severity] || 'badge-neutral';
}

export function getSeverityIcon(severity) {
    const map = {
        extreme: <AlertOctagon size={16} strokeWidth={2.5} color="#ef4444" />,
        severe: <AlertCircle size={16} strokeWidth={2.5} color="#f97316" />,
        moderate: <AlertTriangle size={16} strokeWidth={2.5} color="#f59e0b" />,
        minor: <CheckCircle size={16} strokeWidth={2.5} color="#10b981" />,
    };
    return map[severity] || <HelpCircle size={16} strokeWidth={2.5} color="#64748b" />;
}

// Status mapping for reports
export function getStatusBadgeClass(status) {
    const map = {
        pending: 'badge-warning',
        verified: 'badge-info',
        resolved: 'badge-success',
        rejected: 'badge-danger',
    };
    return map[status] || 'badge-neutral';
}

// Format date
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Ensure UTC interpretation if missing 'Z'
    const safeDateStr = (!dateStr.endsWith('Z') && dateStr.includes('T')) ? `${dateStr}Z` : dateStr;
    const date = new Date(safeDateStr);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function timeAgo(dateStr) {
    if (!dateStr) return '';
    // Ensure UTC interpretation if missing 'Z'
    const safeDateStr = (!dateStr.endsWith('Z') && dateStr.includes('T')) ? `${dateStr}Z` : dateStr;
    const date = new Date(safeDateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return formatDate(dateStr);
}

// Disaster type translation
export function getDisasterLabel(type) {
    const map = {
        flood: 'Banjir',
        earthquake: 'Gempa Bumi',
        landslide: 'Tanah Longsor',
        fire: 'Kebakaran',
        tsunami: 'Tsunami',
        storm: 'Badai',
    };
    return map[type] || type;
}

export function getDisasterIcon(type) {
    const map = {
        flood: <Waves size={20} color="#ffffff" />,
        earthquake: <BellRing size={20} color="#ffffff" />,
        landslide: <MountainSnow size={20} color="#ffffff" />,
        fire: <Flame size={20} color="#ffffff" />,
        tsunami: <Waves size={20} color="#ffffff" />,
        storm: <CloudLightning size={20} color="#ffffff" />,
    };
    return map[type] || <AlertTriangle size={20} color="#ffffff" />;
}

// Shelter type translation
export function getShelterTypeLabel(type) {
    const map = {
        school: 'Sekolah',
        mosque: 'Masjid',
        community_center: 'Balai Desa',
        stadium: 'GOR / Stadion',
        hospital: 'Rumah Sakit',
    };
    return map[type] || type;
}

// Facility label
export function getFacilityLabel(fac) {
    const map = {
        toilet: { text: 'Toilet', icon: <Settings size={14} /> },
        mushola: { text: 'Mushola', icon: <Home size={14} /> },
        p3k: { text: 'P3K', icon: <Stethoscope size={14} /> },
        dapur_umum: { text: 'Dapur Umum', icon: <UtensilsCrossed size={14} /> },
        air_bersih: { text: 'Air Bersih', icon: <Droplets size={14} /> },
        lapangan: { text: 'Lapangan', icon: <Pocket size={14} /> },
        posko_kesehatan: { text: 'Posko Kesehatan', icon: <Stethoscope size={14} /> },
    };
    // If we use string concat, just return the string. We will modify this to just return the label.
    // MapPage previously didn't use this directly but we should return safe strings/objects.
    // For simplicity, returning just text right now, since emojis were mixed.
    const item = map[fac];
    return item ? `${item.text}` : fac;
}

// Default location (Jakarta)
export const DEFAULT_LOCATION = { lat: -6.2088, lng: 106.8456 };

/**
 * Calculate distance between two GPS points using Haversine formula
 * @returns distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Get fill opacity for radius circle based on risk level
 */
export function getRadiusFillOpacity(riskLevel) {
    const map = { 1: 0.06, 2: 0.08, 3: 0.10, 4: 0.14, 5: 0.18 };
    return map[riskLevel] || 0.10;
}
