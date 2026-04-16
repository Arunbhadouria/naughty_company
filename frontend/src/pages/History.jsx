import { useState, useEffect } from 'react';
import { History as HistoryIcon, Search, Calendar, Shield, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import { authService } from '../services/api';

const History = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await authService.getMe();
        if (res.success) {
          setUser(res.data);
        }
      } catch (err) {
        setError('Failed to load history protocol. Access denied.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed');
    }
  };

  if (loading) return (
    <div className="history-page loading">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="loader-container">
        <div className="cyber-loader"></div>
        <span>DECRYPTING HISTORY DATA...</span>
      </div>
    </div>
  );

  return (
    <div className="history-page">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="container history-content">
        <header className="page-header">
          <div className="header-title">
            <HistoryIcon className="header-icon" size={32} />
            <h1>SCAN ARCHIVES</h1>
          </div>
          <p className="page-subtitle">Historical analysis records for {user?.email}</p>
        </header>

        {user?.scanHistory?.length > 0 ? (
          <div className="history-grid">
            {user.scanHistory.slice().reverse().map((scan, index) => (
              <div key={index} className="history-card glass-card">
                <div className="card-top">
                  <div className="entity-tag">
                    <Shield size={16} />
                    <span>{scan.query}</span>
                  </div>
                  <div className={`risk-tag ${scan.result.label.replace(' ', '-').toLowerCase()}`}>
                    {scan.result.label}
                  </div>
                </div>

                <div className="card-body">
                  <div className="score-display">
                    <span className="score-num">{scan.result.risk_score}%</span>
                    <span className="score-label">RISK</span>
                  </div>
                  <p className="reason-summary">{scan.result.reason}</p>
                </div>

                <div className="card-footer">
                  <div className="date-info">
                    <Calendar size={14} />
                    <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                  </div>
                  <button className="view-link" onClick={() => window.location.href = `/results?scanId=${scan._id}`}>
                    VIEW DETAILS <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-history glass-card">
            <Search size={48} className="empty-icon" />
            <h3>NO RECORDS FOUND</h3>
            <p>You haven't initialized any digital analysis protocols yet.</p>
            <a href="/" className="btn-primary mt-4">START FIRST SCAN</a>
          </div>
        )}
      </main>

      <style jsx>{`
        .history-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .history-content {
          padding: 3rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }
        .page-header {
          margin-bottom: 3rem;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 0.5rem;
        }
        .header-icon {
          color: var(--primary);
        }
        .page-subtitle {
          color: var(--on-surface-variant);
          font-family: var(--font-display);
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }
        .history-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: var(--transition-smooth);
        }
        .history-card:hover {
          transform: translateY(-5px);
          border-color: var(--primary);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .entity-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--on-surface);
          font-family: var(--font-display);
          font-weight: 600;
        }
        .risk-tag {
          font-size: 0.7rem;
          font-family: var(--font-display);
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 700;
          color: #0b2a35;
        }
        .risk-tag.high-risk { background-color: var(--accent); }
        .risk-tag.medium-risk { background-color: #FFB800; }
        .risk-tag.low-risk { background-color: var(--secondary); }

        .card-body {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .score-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          min-width: 80px;
        }
        .score-num {
          font-size: 1.5rem;
          font-family: var(--font-display);
          color: var(--primary);
          font-weight: 700;
        }
        .score-label {
          font-size: 0.6rem;
          letter-spacing: 1px;
          color: var(--on-surface-variant);
        }
        .reason-summary {
          font-size: 0.85rem;
          color: var(--on-surface-variant);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid var(--outline-variant);
        }
        .date-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--on-surface-variant);
        }
        .view-link {
          background: transparent;
          border: none;
          color: var(--primary);
          font-family: var(--font-display);
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .empty-history {
          padding: 5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .empty-icon { color: var(--on-surface-variant); opacity: 0.3; }
        .loader-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
        }
        .cyber-loader {
          width: 60px;
          height: 60px;
          border: 4px solid var(--surface-highest);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .history-content {
            padding: 1.5rem 1rem;
          }
          .page-header h1 {
            font-size: 1.8rem;
          }
          .history-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .history-card {
            padding: 1.25rem;
          }
          .score-num {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default History;
