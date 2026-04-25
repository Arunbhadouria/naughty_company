import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AuthPages from './pages/AuthPages';
import History from './pages/History';
import Loader from './components/Loader';
import api from './services/api';

function App() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 1. Detect token from URL (OAuth callback fallback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Clean up URL
      const url = new URL(window.location);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url);
    }

    // 2. Pre-warm Backend (Render cold-start mitigation)
    api.get('/health').catch(() => console.log('Waking up server...'));

    // 3. Show animation for 2 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Wait for fade animation to complete before removing from DOM
      setTimeout(() => setLoading(false), 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loader fadeOut={fadeOut} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/results" element={<Dashboard />} />
        <Route path="/login" element={<AuthPages mode="login" />} />
        <Route path="/register" element={<AuthPages mode="register" />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;
