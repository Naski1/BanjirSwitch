/**
 * API Service Layer - Extended with auth endpoints
 * Uses Vite proxy (/api -> localhost:8000) to avoid CORS issues
 */

// Gunakan environment variable VITE_API_URL jika ada (untuk hosting seperti Vercel), 
// jika tidak ada akan fallback ke '/api' (untuk development dengan proxy).
const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_URL}/api/v1`;
const HEALTH_URL = `${API_URL}/health`;

// ============ AUTH HELPERS ============
export function getToken() {
    return localStorage.getItem('access_token');
}

export function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

export function saveTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}

export function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ============ BASE FETCH ============
async function fetchAPI(endpoint, params = {}) {
    let url = `${API_BASE}${endpoint}`;
    const query = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    if (query) url += `?${query}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function fetchAuthAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(url, config);
    if (response.status === 401) {
        clearTokens();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        let msg = err.detail;
        if (Array.isArray(msg)) msg = msg.map(e => (e.loc ? e.loc.join('.') + ': ' : '') + (e.msg || e.message || JSON.stringify(e))).join(', ');
        throw new Error(msg || `Error ${response.status}`);
    }
    return response.json();
}

// ============ AUTH ============
export async function login(phone, password) {
    const formData = new URLSearchParams();
    formData.append('username', phone);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Login gagal' }));
        throw new Error(err.detail || 'Login gagal');
    }

    const data = await response.json();
    saveTokens(data.access_token, data.refresh_token);
    return data;
}

export async function getMe() {
    return fetchAuthAPI('/auth/me', { method: 'GET' });
}

export async function logout() {
    try {
        await fetchAuthAPI('/auth/logout', { method: 'POST' });
    } catch (e) {
        // ignore errors
    }
    clearTokens();
}

// ============ ZONES ============
export async function getNearbyZones(lat, lng, radius = 15, disasterType = null) {
    return fetchAPI('/zones/nearby', { lat, lng, radius, disaster_type: disasterType });
}

export async function getZoneById(zoneId) {
    return fetchAPI(`/zones/${zoneId}`);
}

export async function createZone(zoneData) {
    return fetchAuthAPI('/zones/', {
        method: 'POST',
        body: JSON.stringify(zoneData),
    });
}

// ============ ALERTS ============
export async function getActiveAlerts(options = {}) {
    return fetchAPI('/alerts/active', {
        zone_id: options.zoneId,
        severity: options.severity,
        event_type: options.eventType,
        limit: options.limit || 20,
        offset: options.offset || 0,
    });
}

export async function getAlertById(alertId) {
    return fetchAPI(`/alerts/${alertId}`);
}

export async function createAlert(alertData) {
    return fetchAuthAPI('/alerts/', {
        method: 'POST',
        body: JSON.stringify(alertData),
    });
}

// ============ EVACUATION / SHELTERS ============
export async function getNearbyShelters(lat, lng, radius = 15, type = null) {
    return fetchAPI('/evacuation/shelters/nearby', {
        lat, lng, radius, type, open_only: true,
    });
}

export async function getShelterById(shelterId, lat = null, lng = null) {
    return fetchAPI(`/evacuation/shelters/${shelterId}`, { lat, lng });
}

export async function createShelter(shelterData) {
    return fetchAuthAPI('/evacuation/shelters', {
        method: 'POST',
        body: JSON.stringify(shelterData),
    });
}

// ============ CHATBOT ============
export async function chatWithBot(message, lat = null, lng = null) {
    return fetchAuthAPI('/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ message, lat, lng })
    });
}

// ============ REPORTS ============
export async function getNearbyReports(lat, lng, radius = 10, type = null) {
    return fetchAPI('/reports/nearby', { lat, lng, radius, type, limit: 30 });
}

export async function getReportById(reportId) {
    return fetchAPI(`/reports/${reportId}`);
}

// ============ WEATHER ============
export function getWeatherForecast(lat = null, lng = null, adm4 = null) {
    const params = {};
    if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
    } else if (adm4) {
        params.adm4 = adm4;
    } else {
        // Fallback default
        params.adm4 = '35.13.12.2001';
    }
    return fetchAPI('/weather/forecast', params);
}

// ============ FLOODS ============
export async function getFloodStatus(province = 'jkt') {
    return fetchAPI('/floods/status', { province });
}

export async function getFloodReports(province = 'jkt') {
    return fetchAPI('/floods/reports', { province });
}

// ============ RIVERS ============
export async function getRivers() {
    return fetchAPI('/rivers/');
}

// ============ PETUGAS - FIELD REPORTS ============
export async function createFieldReport(data) {
    return fetchAuthAPI('/petugas/field-reports', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getFieldReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.location_name) params.append('location_name', filters.location_name);
    if (filters.status) params.append('status', filters.status);
    if (filters.disaster_type) params.append('disaster_type', filters.disaster_type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchAuthAPI(`/petugas/field-reports${qs}`, { method: 'GET' });
}

export async function updateFieldReport(reportId, data) {
    return fetchAuthAPI(`/petugas/field-reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// ============ ADMIN ============
export async function getUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchAuthAPI(`/admin/users${qs}`, { method: 'GET' });
}

export async function createUser(userData) {
    return fetchAuthAPI('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export async function getPetugasCoverage() {
    return fetchAuthAPI('/admin/petugas/coverage', { method: 'GET' });
}

// ============ HEALTH CHECK ============
export async function checkHealth() {
    const response = await fetch(HEALTH_URL);
    return response.json();
}
