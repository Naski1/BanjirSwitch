import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LOCATION } from '../utils/helpers';

/**
 * Custom hook to get user's geolocation
 */
export function useGeolocation() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const requestLocation = useCallback(() => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation tidak didukung browser Anda');
            setLocation(DEFAULT_LOCATION);
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                setError('Tidak dapat mengakses lokasi. Menggunakan lokasi default.');
                setLocation(DEFAULT_LOCATION);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }, []);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    return { location, error, loading, requestLocation };
}
