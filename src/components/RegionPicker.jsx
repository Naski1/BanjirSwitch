import React, { useState, useEffect } from 'react';
import { getProvinces, getCities, getDistricts, getVillages } from '../services/api';

/**
 * Controlled Region Picker Component
 * Fetching options automatically when parent criteria changes.
 * 
 * @param {Object} value - The current selected region IDs { province_id, regency_id, district_id, village_id }
 * @param {Function} onChange - Callback returning the updated region object when a selection changes
 */
export default function RegionPicker({ value, onChange }) {
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);

    const [loading, setLoading] = useState({ prov: false, city: false, dist: false, vill: false });
    const [errors, setErrors] = useState({ prov: false, city: false, dist: false, vill: false });
    const [retryKey, setRetryKey] = useState({ prov: 0, city: 0, dist: 0, vill: 0 });

    // Ensure value object has initialized properties to prevent uncontrolled component warnings
    const safeValue = {
        province_id: value?.province_id || '',
        regency_id: value?.regency_id || '',
        district_id: value?.district_id || '',
        village_id: value?.village_id || ''
    };

    // 1. Fetch Provinces on Mount (or retry)
    useEffect(() => {
        let isMounted = true;
        const fetchProv = async () => {
            setLoading(p => ({ ...p, prov: true }));
            setErrors(p => ({ ...p, prov: false }));
            try {
                const res = await getProvinces();
                const dataList = Array.isArray(res) ? res : (res?.data || []);
                if (isMounted) {
                    setProvinces(dataList || []);
                    if (!dataList || dataList.length === 0) setErrors(p => ({ ...p, prov: true }));
                }
            } catch (err) {
                console.error("Failed to load provinces:", err);
                if (isMounted) setErrors(p => ({ ...p, prov: true }));
            } finally {
                if (isMounted) setLoading(p => ({ ...p, prov: false }));
            }
        };
        fetchProv();
        return () => { isMounted = false; };
    }, [retryKey.prov]);

    // 2. Fetch Cities when Province changes
    useEffect(() => {
        let isMounted = true;
        if (!safeValue.province_id) {
            setCities([]);
            return;
        }
        const fetchCt = async () => {
            setLoading(p => ({ ...p, city: true }));
            setErrors(p => ({ ...p, city: false }));
            try {
                const res = await getCities(safeValue.province_id);
                const dataList = Array.isArray(res) ? res : (res?.data || []);
                if (isMounted) {
                    setCities(dataList || []);
                    if (!dataList || dataList.length === 0) setErrors(p => ({ ...p, city: true }));
                }
            } catch (err) {
                console.error("Failed to load cities:", err);
                if (isMounted) setErrors(p => ({ ...p, city: true }));
            } finally {
                if (isMounted) setLoading(p => ({ ...p, city: false }));
            }
        };
        fetchCt();
        return () => { isMounted = false; };
    }, [safeValue.province_id, retryKey.city]);

    // 3. Fetch Districts when City changes
    useEffect(() => {
        let isMounted = true;
        if (!safeValue.regency_id) {
            setDistricts([]);
            return;
        }
        const fetchDist = async () => {
            setLoading(p => ({ ...p, dist: true }));
            setErrors(p => ({ ...p, dist: false }));
            try {
                const res = await getDistricts(safeValue.regency_id);
                const dataList = Array.isArray(res) ? res : (res?.data || []);
                if (isMounted) {
                    setDistricts(dataList || []);
                    if (!dataList || dataList.length === 0) setErrors(p => ({ ...p, dist: true }));
                }
            } catch (err) {
                console.error("Failed to load districts:", err);
                if (isMounted) setErrors(p => ({ ...p, dist: true }));
            } finally {
                if (isMounted) setLoading(p => ({ ...p, dist: false }));
            }
        };
        fetchDist();
        return () => { isMounted = false; };
    }, [safeValue.regency_id, retryKey.dist]);

    // 4. Fetch Villages when District changes
    useEffect(() => {
        let isMounted = true;
        if (!safeValue.district_id) {
            setVillages([]);
            return;
        }
        const fetchVill = async () => {
            setLoading(p => ({ ...p, vill: true }));
            setErrors(p => ({ ...p, vill: false }));
            try {
                const res = await getVillages(safeValue.district_id);
                const dataList = Array.isArray(res) ? res : (res?.data || []);
                if (isMounted) {
                    setVillages(dataList || []);
                    if (!dataList || dataList.length === 0) setErrors(p => ({ ...p, vill: true }));
                }
            } catch (err) {
                console.error("Failed to load villages:", err);
                if (isMounted) setErrors(p => ({ ...p, vill: true }));
            } finally {
                if (isMounted) setLoading(p => ({ ...p, vill: false }));
            }
        };
        fetchVill();
        return () => { isMounted = false; };
    }, [safeValue.district_id, retryKey.vill]);


    // Handlers
    const handleProvChange = (e) => {
        const provId = e.target.value;
        onChange({ province_id: provId, regency_id: '', district_id: '', village_id: '' });
    };

    const handleCityChange = (e) => {
        const cityId = e.target.value;
        onChange({ ...safeValue, regency_id: cityId, district_id: '', village_id: '' });
    };

    const handleDistChange = (e) => {
        const distId = e.target.value;
        onChange({ ...safeValue, district_id: distId, village_id: '' });
    };

    const handleVillChange = (e) => {
        const villId = e.target.value;
        onChange({ ...safeValue, village_id: villId });
    };

    const selectStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 0, 0, 0.15)',
        background: '#fff',
        color: '#333',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s',
        minHeight: '42px',
    };

    const retryBtnStyle = {
        display: 'inline-block',
        marginTop: 4,
        padding: '4px 10px',
        fontSize: '0.75rem',
        cursor: 'pointer',
        background: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Provinsi */}
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                    Provinsi * {loading.prov && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>⏳ Memuat...</span>}
                </label>
                <select
                    style={selectStyle}
                    value={safeValue.province_id}
                    onChange={handleProvChange}
                    required
                >
                    <option value="" disabled>-- Pilih Provinsi --</option>
                    {provinces.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {errors.prov && !loading.prov && (
                    <button type="button" style={retryBtnStyle} onClick={() => setRetryKey(k => ({ ...k, prov: k.prov + 1 }))}>🔄 Muat Ulang Provinsi</button>
                )}
            </div>

            {/* Kota / Kabupaten */}
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                    Kota/Kabupaten * {loading.city && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>⏳ Memuat...</span>}
                </label>
                <select
                    style={selectStyle}
                    value={safeValue.regency_id}
                    onChange={handleCityChange}
                    disabled={!safeValue.province_id || loading.prov}
                    required
                >
                    <option value="" disabled>{safeValue.province_id ? '-- Pilih Kota/Kab --' : 'Pilih Provinsi Dahulu'}</option>
                    {cities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {errors.city && !loading.city && safeValue.province_id && (
                    <button type="button" style={retryBtnStyle} onClick={() => setRetryKey(k => ({ ...k, city: k.city + 1 }))}>🔄 Muat Ulang Kota</button>
                )}
            </div>

            {/* Kecamatan */}
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                    Kecamatan * {loading.dist && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>⏳ Memuat...</span>}
                </label>
                <select
                    style={selectStyle}
                    value={safeValue.district_id}
                    onChange={handleDistChange}
                    disabled={!safeValue.regency_id || loading.city}
                    required
                >
                    <option value="" disabled>{safeValue.regency_id ? '-- Pilih Kecamatan --' : 'Pilih Kota Dahulu'}</option>
                    {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                {errors.dist && !loading.dist && safeValue.regency_id && (
                    <button type="button" style={retryBtnStyle} onClick={() => setRetryKey(k => ({ ...k, dist: k.dist + 1 }))}>🔄 Muat Ulang Kecamatan</button>
                )}
            </div>

            {/* Kelurahan */}
            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                    Kelurahan/Desa * {loading.vill && <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>⏳ Memuat...</span>}
                </label>
                <select
                    style={selectStyle}
                    value={safeValue.village_id}
                    onChange={handleVillChange}
                    disabled={!safeValue.district_id || loading.dist}
                    required
                >
                    <option value="" disabled>{safeValue.district_id ? '-- Pilih Kelurahan --' : 'Pilih Kecamatan Dahulu'}</option>
                    {villages.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
                {errors.vill && !loading.vill && safeValue.district_id && (
                    <button type="button" style={retryBtnStyle} onClick={() => setRetryKey(k => ({ ...k, vill: k.vill + 1 }))}>🔄 Muat Ulang Kelurahan</button>
                )}
            </div>
        </div>
    );
}
