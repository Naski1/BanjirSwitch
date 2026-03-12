import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import MapPage from './pages/MapPage';
import AlertsPage from './pages/AlertsPage';
import SheltersPage from './pages/SheltersPage';
import ReportsPage from './pages/ReportsPage';
import WeatherPage from './pages/WeatherPage';
import LoginPage from './pages/LoginPage';
import DashboardRouter from './components/DashboardRouter';
import ChatbotWidget from './components/ChatbotWidget';
import './index.css';

function AppRoutes() {
    const { pathname } = useLocation();
    const isDashboard = pathname.startsWith('/dashboard');

    // Dashboard gets its own full-screen layout (no Navbar, no wrapper constraints)
    if (isDashboard) {
        return <DashboardRouter />;
    }

    // Public pages use the standard app-layout with Navbar
    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<MapPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/shelters" element={<SheltersPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/weather" element={<WeatherPage />} />
                    <Route path="/login" element={<LoginPage />} />
                </Routes>
            </main>
            <ChatbotWidget />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
