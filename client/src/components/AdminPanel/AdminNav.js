// client/src/components/AdminPanel/AdminNav.js - Admin navigation component

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  AssetsIcon,
  HotspotsIcon,
  PlaylistsIcon,
  ExitIcon,
  LocationsIcon
} from '../ui/icons/AdminIcons';

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
    <div className="w-64 min-h-screen bg-netflix-black border-r border-white/10 flex flex-col fixed">
      <div className="p-5 pb-2">
        <h2 className="text-xl font-bold text-white mb-2">Netflix House Admin</h2>
      </div>
      
      <nav className="flex-1 py-1">
        <Link 
          to="/admin/locations" 
          className={`flex items-center px-5 py-3 mb-2 transition-colors ${
            isActive('/admin/locations') 
              ? 'text-netflix-red bg-netflix-red/10' 
              : 'text-netflix-lightgray hover:text-white hover:bg-white/10'
          }`}
          title=""
        >
          <span className="mr-3">
            <LocationsIcon />
          </span>
          <span>Locations</span>
        </Link>
        
        <Link 
          to="/admin/assets" 
          className={`flex items-center px-5 py-3 mb-2 transition-colors ${
            isActive('/admin/assets') 
              ? 'text-netflix-red bg-netflix-red/10' 
              : 'text-netflix-lightgray hover:text-white hover:bg-white/10'
          }`}
          title=""
        >
          <span className="mr-3">
            <AssetsIcon />
          </span>
          <span>Assets</span>
        </Link>
        
        <Link 
          to="/admin/hotspots" 
          className={`flex items-center px-5 py-3 mb-2 transition-colors ${
            isActive('/admin/hotspots') 
              ? 'text-netflix-red bg-netflix-red/10' 
              : 'text-netflix-lightgray hover:text-white hover:bg-white/10'
          }`}
          title=""
        >
          <span className="mr-3">
            <HotspotsIcon />
          </span>
          <span>Hotspots</span>
        </Link>
        
        <Link 
          to="/admin/playlists" 
          className={`flex items-center px-5 py-3 mb-2 transition-colors ${
            isActive('/admin/playlists') 
              ? 'text-netflix-red bg-netflix-red/10' 
              : 'text-netflix-lightgray hover:text-white hover:bg-white/10'
          }`}
          title=""
        >
          <span className="mr-3">
            <PlaylistsIcon />
          </span>
          <span>Playlists</span>
        </Link>
      </nav>
      
      <div className="p-5 mt-auto border-t border-white/10">
        <button 
          onClick={handleExitAdmin} 
          className="w-full flex items-center text-netflix-lightgray hover:text-white transition-colors py-2 px-3 text-left"
          title=""
        >
          <span className="mr-3">
            <ExitIcon />
          </span>
          <span>Exit Admin Mode</span>
        </button>
      </div>
    </div>
  );
};

export default AdminNav;
