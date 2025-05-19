// client/src/components/AdminPanel/AdminNav.js - Admin navigation component

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

// Import Lucide icons
import { 
  Film, 
  MapPin, 
  Target, 
  ListMusic, 
  Settings, 
  LogOut, 
  PanelLeft
} from 'lucide-react';

const AdminNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAdminMode } = useAdmin();
  const { logout } = useAuth();
  
  // Check if a path is active
  const isActive = (path) => {
    return location.pathname === path || 
           (location.pathname === '/admin' && path === '/admin/locations');
  };

  // Handle exit admin mode
  const handleExitAdmin = () => {
    // Logout the user when exiting admin mode
    logout();
    // Set admin mode to false
    setIsAdminMode(false);
    // Navigate to the root path
    navigate('/');
  };

  return (
    <div className="fixed top-0 left-0 h-full bg-netflix-black border-r border-white/10 text-white z-10 flex flex-col w-44">
      <div className="p-4 border-b border-white/10 flex items-center" style={{ height: '64px' }}>
        <PanelLeft className="mr-2 text-netflix-red" size={20} />
        <h2 className="text-netflix-red text-xl font-bold">Admin</h2>
      </div>
      
      <nav className="flex-1 mt-4 overflow-y-auto">
        <ul className="space-y-1">
          <li>
            <Link
              to="/admin/locations"
              className={`flex items-center px-3 py-3 transition-colors ${
                isActive('/admin/locations') 
                  ? 'bg-netflix-red text-white font-medium' 
                  : 'text-gray-300 hover:bg-netflix-dark-gray hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              <span>Locations</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/admin/assets"
              className={`flex items-center px-3 py-3 transition-colors ${
                isActive('/admin/assets') 
                  ? 'bg-netflix-red text-white font-medium' 
                  : 'text-gray-300 hover:bg-netflix-dark-gray hover:text-white'
              }`}
            >
              <Film className="w-4 h-4 mr-2" />
              <span>Assets</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/admin/hotspots"
              className={`flex items-center px-3 py-3 transition-colors ${
                isActive('/admin/hotspots') 
                  ? 'bg-netflix-red text-white font-medium' 
                  : 'text-gray-300 hover:bg-netflix-dark-gray hover:text-white'
              }`}
            >
              <Target className="w-4 h-4 mr-2" />
              <span>Hotspots</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/admin/playlists"
              className={`flex items-center px-3 py-3 transition-colors ${
                isActive('/admin/playlists') 
                  ? 'bg-netflix-red text-white font-medium' 
                  : 'text-gray-300 hover:bg-netflix-dark-gray hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4 mr-2" />
              <span>Playlists</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/admin/settings"
              className={`flex items-center px-3 py-3 transition-colors ${
                isActive('/admin/settings') 
                  ? 'bg-netflix-red text-white font-medium' 
                  : 'text-gray-300 hover:bg-netflix-dark-gray hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleExitAdmin}
          className="flex items-center justify-center w-full px-3 py-2 text-gray-300 hover:bg-netflix-red hover:text-white rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
};

export default AdminNav;
