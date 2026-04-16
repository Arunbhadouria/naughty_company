import { useState } from 'react';
import { Shield, Mail, Lock, User as UserIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import { authService } from '../services/api';

const AuthPages = ({ mode = 'login' }) => {
  const [isLogin] = useState(mode === 'login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await authService.login(formData);
      } else {
        await authService.register(formData);
      }
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Authentication failed');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3000/api/v1/auth/google';
  };

  return (
    <div className="auth-page">
      <Navbar />
      
      <div className="auth-container glass-card">
        <div className="auth-header">
          <Shield className="auth-logo" size={48} />
          <h1>{isLogin ? 'ACCESS PROTOCOL' : 'IDENTITY REGISTRATION'}</h1>
          <p>{isLogin ? 'Verify credentials to proceed' : 'Create new digital identity'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-group">
              <UserIcon size={20} />
              <input
                type="text"
                placeholder="DISPLAY NAME"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                required
              />
            </div>
          )}
          <div className="auth-group">
            <Mail size={20} />
            <input
              type="email"
              placeholder="EMAIL ADDRESS"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="auth-group">
            <Lock size={20} />
            <input
              type="password"
              placeholder="PASSWORD"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary auth-btn">
            {isLogin ? 'INITIALIZE CONNECTION' : 'CREATE PROTOCOL'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <button onClick={handleGoogleLogin} className="google-btn glass-card">
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" width="20" />
          GOOGLE ACCOUNT
        </button>

        <p className="auth-switch">
          {isLogin ? "Empty identity?" : "Identity confirmed?"} 
          <a href={isLogin ? "/register" : "/login"}>
            {isLogin ? " REGISTER HERE" : " LOGIN HERE"}
          </a>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .auth-container {
          width: 100%;
          max-width: 450px;
          margin: 4rem auto;
          padding: 3rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: center;
        }
        .auth-header {
          text-align: center;
        }
        .auth-logo {
          color: var(--primary);
          margin-bottom: 1.5rem;
          filter: drop-shadow(0 0 10px var(--primary));
        }
        .auth-header h1 {
          font-size: 1.5rem;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
        }
        .auth-header p {
          color: var(--on-surface-variant);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .auth-group {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid var(--outline-variant);
          transition: var(--transition-smooth);
        }
        .auth-group:focus-within {
          border-color: var(--primary);
          background: rgba(0, 209, 255, 0.05);
          box-shadow: 0 0 15px rgba(0, 209, 255, 0.1);
        }
        .auth-group svg {
          color: var(--primary);
          opacity: 0.7;
        }
        .auth-group input {
          background: transparent;
          border: none;
          color: var(--on-surface);
          width: 100%;
          outline: none;
          font-family: var(--font-body);
          font-size: 0.95rem;
          letter-spacing: 0.5px;
        }
        .auth-btn {
          width: 100%;
          padding: 14px;
          font-size: 0.9rem;
          letter-spacing: 2px;
        }
        .auth-divider {
          width: 100%;
          text-align: center;
          border-bottom: 1px solid var(--outline-variant);
          line-height: 0.1em;
          margin: 1rem 0;
        }
        .auth-divider span {
          background: var(--bg-dark);
          padding: 0 10px;
          color: var(--on-surface-variant);
          font-size: 0.7rem;
          letter-spacing: 1px;
        }
        .google-btn {
          width: 100%;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          color: var(--on-surface);
          font-family: var(--font-display);
          font-size: 0.8rem;
          letter-spacing: 1px;
          transition: var(--transition-smooth);
        }
        .google-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .auth-error {
          color: var(--accent);
          font-size: 0.8rem;
          text-align: center;
        }
        .auth-switch {
          font-size: 0.8rem;
          color: var(--on-surface-variant);
        }
        .auth-switch a {
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default AuthPages;
