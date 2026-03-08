/**
 * Utility helpers for the app
 */

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
        extreme: '🔴',
        severe: '🟠',
        moderate: '🟡',
        minor: '🟢',
    };
    return map[severity] || '⚪';
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
    const date = new Date(dateStr);
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
    const date = new Date(dateStr);
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
        flood: '🌊',
        earthquake: '🔔',
        landslide: '⛰️',
        fire: '🔥',
        tsunami: '🌊',
        storm: '⛈️',
    };
    return map[type] || '⚠️';
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
        toilet: '🚻 Toilet',
        mushola: '🕌 Mushola',
        p3k: '🏥 P3K',
        dapur_umum: '🍳 Dapur Umum',
        air_bersih: '💧 Air Bersih',
        lapangan: '🏟️ Lapangan',
        posko_kesehatan: '⚕️ Posko Kesehatan',
    };
    return map[fac] || fac;
}

// Default location (Jakarta)
export const DEFAULT_LOCATION = { lat: -6.2088, lng: 106.8456 };
