// client/src/App.js - Main application component

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { VideoProvider } from './context/VideoContext';
import { AdminProvider } from './context/AdminContext';
import { Toaster } from './components/ui/use-toast';
import Menu from './pages/Menu';
import Experience from './pages/Experience';
import Assets from './pages/Admin/Assets';
import Locations from './pages/Admin/Locations';
import Hotspots from './pages/Admin/Hotspots';
import Playlists from './pages/Admin/Playlists';
import AdminNav from './components/AdminPanel/AdminNav';
import api from './utils/api';
import './styles/index.css'; // Only import the main Tailwind CSS file

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);

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
    
    // Check if we're on an admin route
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      setIsAdminMode(true);
    }
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // If loading, always show loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-netflix-black text-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="w-full h-full border-4 border-netflix-red border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // If in admin mode, always render admin panel regardless of hasConfig
  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-netflix-black text-white">
        <AdminProvider>
          <div className="flex min-h-screen">
            <AdminNav />
            <main className="flex-1 pl-64">
              <Routes>
                <Route path="/admin/locations" element={<Locations />} />
                <Route path="/admin/hotspots" element={<Hotspots />} />
                <Route path="/admin/playlists" element={<Playlists />} />
                <Route path="/admin/assets" element={<Assets />} />
                {/* Default admin route */}
                <Route path="/admin" element={<Navigate to="/admin/assets" replace />} />
                 {/* Fallback for any other admin paths */}
                <Route path="/admin/*" element={<Navigate to="/admin/assets" replace />} />
              </Routes>
            </main>
          </div>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </AdminProvider>
      </div>
    );
  }

  // For non-admin routes, check hasConfig
  return (
    <div className="min-h-screen bg-netflix-black text-white">
      <VideoProvider>
        <Routes>
          {hasConfig ? (
            <>
              <Route path="/experience/:locationId" element={<Experience />} />
              <Route path="/" element={<Menu />} />
            </>
          ) : (
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
                <h2 className="text-2xl font-bold text-netflix-red mb-4">Netflix House Experience Setup Required</h2>
                <p className="text-netflix-lightgray mb-2">This experience needs to be configured in the admin panel before it can be used.</p>
                <p className="text-netflix-lightgray">Press Ctrl+Shift+A to access the admin panel and complete the setup.</p>
              </div>
            } />
          )}
        </Routes>
      </VideoProvider>
    </div>
  );
}

export default App;
