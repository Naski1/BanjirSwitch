import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
    return (
        <AuthProvider>
            <Router>
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
                            <Route path="/dashboard" element={<DashboardRouter />} />
                        </Routes>
                    </main>
                    <ChatbotWidget />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
