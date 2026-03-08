import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PetugasDashboard from '../pages/PetugasDashboard';
import AdminDashboard from '../pages/AdminDashboard';

export default function DashboardRouter() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <span className="loading-text">Memuat...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'admin') {
        return <AdminDashboard />;
    }

    if (user.role === 'petugas') {
        return <PetugasDashboard />;
    }

    // Regular user — shouldn't be here, redirect to home
    return <Navigate to="/" replace />;
}
