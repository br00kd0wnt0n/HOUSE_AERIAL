// client/src/App.js - Main application component

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { VideoProvider } from './context/VideoContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/use-toast';
import Menu from './pages/Menu';
import Experience from './pages/Experience';
import Assets from './pages/Admin/Assets';
import Locations from './pages/Admin/Locations';
import Hotspots from './pages/Admin/Hotspots';
import Playlists from './pages/Admin/Playlists';
import Settings from './pages/Admin/Settings';
import AdminNav from './components/AdminPanel/AdminNav';
import LoginForm from './components/AdminPanel/LoginForm';
import api from './utils/api';
import './styles/index.css'; // Only import the main Tailwind CSS file
import { Button } from './components/ui/button';

// Admin page titles
const PAGE_TITLES = {
  '/admin/assets': 'Asset Management',
  '/admin/locations': 'Locations',
  '/admin/hotspots': 'Hotspots',
  '/admin/playlists': 'Playlists',
  '/admin/settings': 'Settings',
};

// Main app content component - wrapped by AdminProvider and AuthProvider
function AppContent() {
  const { isAdminMode, setIsAdminMode } = useAdmin();
  const { isAuthenticated, isInitialized, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const location = useLocation();
  
  // Add a state to control location creation
  const [showLocationCreate, setShowLocationCreate] = useState(false);

  // Get the current page title
  const getPageTitle = () => {
    const path = Object.keys(PAGE_TITLES).find(path => 
      location.pathname === path || 
      (location.pathname === '/admin' && path === '/admin/locations')
    );
    return PAGE_TITLES[path] || 'Admin Panel';
  };

  // Check if we have configuration on load
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have locations configured
        const locationsResponse = await api.getLocations();
        
        // Check if we have assets configured
        const assetsResponse = await api.getAssets();
        
        // We have configuration if we have locations and at least one asset
        setHasConfig(
          locationsResponse.data.length > 0 && 
          assetsResponse.data.length > 0
        );
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking configuration:', error);
        setHasConfig(false);
        setIsLoading(false);
      }
    };
    
    checkConfiguration();
  }, []);

  // Toggle admin mode with keyboard shortcut (Ctrl+Shift+A) or when accessing /admin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        setIsAdminMode(prevState => !prevState);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsAdminMode]);

  // Check if we're on an admin route and update isAdminMode
  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (isAdminRoute && !isAdminMode) {
      setIsAdminMode(true);
    }
  }, [location.pathname, isAdminMode, setIsAdminMode]);

  // If loading, always show loading screen
  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-netflix-black text-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="w-full h-full border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // If in admin mode, check authentication before rendering
  if (isAdminMode) {
    // If we're in admin mode but not authenticated, show login form
    if (!isAuthenticated && isInitialized) {
      return <LoginForm />;
    }
    
    // If system is not initialized (first time), show password setup
    if (!isInitialized) {
      return <LoginForm />;
    }
    
    // If authenticated, render admin panel
    return (
      <div className="h-screen bg-netflix-black text-white flex flex-col overflow-hidden">
        <div className="flex h-full">
          <AdminNav />
          <main className="flex-1 pl-44 flex flex-col h-full overflow-hidden">
            <header className="flex items-center justify-between border-b border-white/10 p-4 h-16 bg-netflix-black sticky top-0 z-10">
              <h1 className="text-xl font-bold text-netflix-red">{getPageTitle()}</h1>
              
              {/* Conditionally show actions based on current page */}
              {location.pathname === '/admin/locations' && (
                <div className="flex items-center">
                  <Button 
                    className="bg-netflix-red hover:bg-netflix-red/80"
                    onClick={() => setShowLocationCreate(true)}
                  >
                    Add New Location
                  </Button>
                </div>
              )}
            </header>
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/admin/locations" element={<Locations showCreate={showLocationCreate} onCreateShown={() => setShowLocationCreate(false)} />} />
                <Route path="/admin/hotspots" element={<Hotspots />} />
                <Route path="/admin/playlists" element={<Playlists />} />
                <Route path="/admin/assets" element={<Assets />} />
                <Route path="/admin/settings" element={<Settings />} />
                {/* Default admin route */}
                <Route path="/admin" element={<Navigate to="/admin/locations" replace />} />
                {/* Fallback for any other admin paths */}
                <Route path="/admin/*" element={<Navigate to="/admin/locations" replace />} />
                {/* Catch any other route and redirect to admin assets when in admin mode */}
                <Route path="*" element={<Navigate to="/admin/locations" replace />} />
              </Routes>
            </div>
          </main>
        </div>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </div>
    );
  }

  // If not in admin mode, check if we have configuration
  if (!hasConfig) {
    // If no configuration but has accessed the app non-admin, show error
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-netflix-black text-white p-6 text-center">
        <h1 className="text-netflix-red text-3xl font-bold mb-4">Netflix House Aerial Experience</h1>
        <p className="text-xl mb-8">No configuration found. Please set up the system through the admin panel.</p>
        <button
          className="bg-netflix-red text-white px-6 py-3 rounded hover:bg-netflix-red/80 transition"
          onClick={() => setIsAdminMode(true)}
        >
          Go to Admin Panel
        </button>
      </div>
    );
  }

  // Show normal application view
  return (
    <VideoProvider>
      <div className="min-h-screen bg-netflix-black text-white">
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/experience/:locationId" element={<Experience />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </div>
    </VideoProvider>
  );
}

// Main App component that wraps with providers
function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
