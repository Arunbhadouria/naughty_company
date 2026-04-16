import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ScanForm from '../components/ScanForm';
import RiskCard from '../components/RiskCard';
import CatLogo from '../components/CatLogo';
import { analyzerService, authService } from '../services/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initPage = async () => {
      // 1. Fetch User Identity
      try {
        const res = await authService.getMe();
        if (res.success) {
          setUser(res.data);
        }
      } catch (err) {
        console.log('Not logged in or session expired');
      }

      // 2. Check for deep-link (from History or direct link)
      const params = new URLSearchParams(window.location.search);
      const scanId = params.get('scanId');
      const urlQuery = params.get('query');
      
      if (scanId) {
        handleLoadHistoryScan(scanId);
      } else if (urlQuery) {
        handleScan(urlQuery);
      }
    };
    
    initPage();
  }, []);

  const handleLoadHistoryScan = async (id) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await analyzerService.getScanById(id);
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      setError({
        message: 'Failed to retrieve scan from archives. It may have been deleted.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (query) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await analyzerService.analyze(query);
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError({
          message: err.response.data.error.message,
          code: 'LOGIN_REQUIRED'
        });
      } else {
        setError({
          message: 'An error occurred during analysis. Please try again later.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.reload();
    } catch (err) {
      console.error('Logout failed');
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="container main-content">
        <section className="hero-section">
          <CatLogo size={80} className="hero-logo" />
          <h1>NAUGHTY COMPANY</h1>
          <p className="subtitle">Whiskered Intelligence. Precision Scam Detection.</p>
        </section>

        <ScanForm onScan={handleScan} isLoading={loading} />

        {error && (
          <div className="error-alert glass-card">
            <span className="error-message">{error.message}</span>
            {error.code === 'LOGIN_REQUIRED' && (
              <button className="btn-primary" onClick={() => window.location.href = '/login'}>
                PROCEED TO LOGIN
              </button>
            )}
          </div>
        )}

        {result && <RiskCard result={result} />}
      </main>

      <style jsx>{`
        .dashboard-page {
          min-height: 100vh;
        }
        .main-content {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hero-section {
          text-align: center;
          margin: 4rem 0 2rem;
        }
        .hero-section h1 {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(180deg, var(--on-surface) 0%, rgba(236, 237, 246, 0.6) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-family: var(--font-display);
          letter-spacing: 3px;
          font-size: 0.9rem;
          text-transform: uppercase;
        }
        .error-alert {
          margin: 2rem auto;
          padding: 1.5rem 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          border-left: 4px solid var(--accent);
          max-width: 600px;
          text-align: center;
        }
        .error-message {
          color: var(--on-surface);
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .hero-section h1 {
            font-size: 2.2rem;
          }
          .subtitle {
            font-size: 0.75rem;
            letter-spacing: 2px;
          }
          .main-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
