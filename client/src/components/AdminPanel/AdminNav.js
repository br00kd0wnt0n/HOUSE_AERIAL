// client/src/components/AdminPanel/AdminNav.js - Admin navigation component

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './AdminNav.css';

const AdminNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if a path is active
  const isActive = (path) => {
    return location.pathname === path || 
           (location.pathname === '/' && path === '/admin/assets');
  };

  // Handle exit admin mode
  const handleExitAdmin = () => {
    // Navigate to the root path
    navigate('/');
    // The App component will handle the admin mode toggle
  };
  
  return (
    <div className="admin-nav">
      <div className="admin-nav-header">
        <h2>Netflix House Admin</h2>
      </div>
      
      <nav className="admin-nav-tabs">
        <Link 
          to="/admin/assets" 
          className={`nav-tab ${isActive('/admin/assets') ? 'active' : ''}`}
        >
          <span className="tab-icon assets-icon"></span>
          <span className="tab-text">Assets</span>
        </Link>
        
        <Link 
          to="/admin/ui-assets" 
          className={`nav-tab ${isActive('/admin/ui-assets') ? 'active' : ''}`}
        >
          <span className="tab-icon ui-assets-icon"></span>
          <span className="tab-text">UI Assets</span>
        </Link>
        
        <Link 
          to="/admin/hotspots" 
          className={`nav-tab ${isActive('/admin/hotspots') ? 'active' : ''}`}
        >
          <span className="tab-icon hotspots-icon"></span>
          <span className="tab-text">Hotspots</span>
        </Link>
        
        <Link 
          to="/admin/playlists" 
          className={`nav-tab ${isActive('/admin/playlists') ? 'active' : ''}`}
        >
          <span className="tab-icon playlists-icon"></span>
          <span className="tab-text">Playlists</span>
        </Link>
      </nav>
      
      <div className="admin-nav-footer">
        <button onClick={handleExitAdmin} className="exit-admin-link">
          Exit Admin Mode
        </button>
      </div>
    </div>
  );
};

export default AdminNav;
