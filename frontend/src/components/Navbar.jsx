import { useState } from 'react';
import { User, LogOut, History, Menu, X } from 'lucide-react';
import CatLogo from './CatLogo';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <>
      <nav className="navbar glass-card">
        <div className="nav-container">
          <div className="nav-logo">
            <CatLogo size={32} />
            <h1>NAUGHTY CO.</h1>
          </div>

          <div className="nav-links desktop-only">
            <a href="/" className="nav-link active">DASHBOARD</a>
            {user && (
              <a href="/history" className="nav-link">
                <History size={18} />
                HISTORY
              </a>
            )}
          </div>

          <div className="nav-auth desktop-only">
            {user ? (
              <div className="user-profile">
                <span className="welcome-text">WELCOME, {user.displayName || user.email}</span>
                <button onClick={onLogout} className="logout-btn" title="Logout">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <a href="/login" className="login-link">LOGIN</a>
                <button className="btn-primary" onClick={() => window.location.href='/register'}>GET STARTED</button>
              </div>
            )}
          </div>

          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}>
        <div className={`sidebar-content ${isSidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <div className="nav-logo">
              <CatLogo size={32} />
              <h1>NAUGHTY CO.</h1>
            </div>
            <button className="close-btn" onClick={toggleSidebar}>
              <X size={28} />
            </button>
          </div>

          <div className="sidebar-links">
            <a href="/" className="sidebar-link active" onClick={toggleSidebar}>
              DASHBOARD
            </a>
            {user && (
              <a href="/history" className="sidebar-link" onClick={toggleSidebar}>
                <History size={18} />
                HISTORY
              </a>
            )}
            
            <div className="sidebar-divider"></div>
            
            {user ? (
              <div className="sidebar-user-section">
                <div className="user-info">
                  <User size={20} />
                  <span>{user.displayName || user.email}</span>
                </div>
                <button onClick={() => { onLogout(); toggleSidebar(); }} className="sidebar-logout-btn">
                  <LogOut size={18} /> LOGOUT PROTOCOL
                </button>
              </div>
            ) : (
              <div className="sidebar-auth-btns">
                <a href="/login" className="btn-secondary" onClick={toggleSidebar}>LOGIN</a>
                <a href="/register" className="btn-primary" onClick={toggleSidebar}>GET STARTED</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
