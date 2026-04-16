import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AuthPages from './pages/AuthPages';
import History from './pages/History';
import Loader from './components/Loader';

function App() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show animation for 2 seconds
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
