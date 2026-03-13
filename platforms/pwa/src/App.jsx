import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ScannerEnhanced from './pages/ScannerEnhanced';
import AnalysisResult from './pages/AnalysisResult';
import Recommendations from './pages/Recommendations';
import Profile from './pages/Profile';
import History from './pages/History';
import Products from './pages/Products';
import Education from './pages/Education';
import ProductDetail from './pages/ProductDetail';
import ArticleDetail from './pages/ArticleDetail';
import Settings from './pages/Settings';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { cleanOldTokens } from './utils/tokenSystem';
import apiService from './services/api';

function App() {
  // Clean old tokens on app start
  useEffect(() => {
    cleanOldTokens();

    const applyPublicSettings = async () => {
      try {
        const response = await apiService.getPublicSettings();
        const map = response?.map || {};
        localStorage.setItem('cantik_public_settings', JSON.stringify(map));

        const root = document.documentElement;
        if (map['theme.primary_color']) root.style.setProperty('--primary-color', map['theme.primary_color']);
        if (map['theme.primary_hover']) root.style.setProperty('--primary-hover', map['theme.primary_hover']);
        if (map['theme.primary_light']) root.style.setProperty('--primary-light', map['theme.primary_light']);
      } catch (error) {
        console.warn('Public settings not loaded:', error.message);
      }
    };

    applyPublicSettings();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/scan" element={<ScannerEnhanced />} />
        <Route path="/result" element={<AnalysisResult />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/education" element={<Education />} />
        <Route path="/education/:id" element={<ArticleDetail />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Protected Routes - Require Login */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
