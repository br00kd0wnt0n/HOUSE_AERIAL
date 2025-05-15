// client/src/App.js - Main application component

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { VideoProvider } from './context/VideoContext';
import { AdminProvider } from './context/AdminContext';
import Menu from './pages/Menu';
import Experience from './pages/Experience';
import Assets from './pages/Admin/Assets';
import Hotspots from './pages/Admin/Hotspots';
import Playlists from './pages/Admin/Playlists';
import AssetManager from './components/admin/AssetManager';
import AdminNav from './components/AdminPanel/AdminNav';
import api from './utils/api';
import './styles/App.css';

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

  // Handle loading state
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="netflix-spinner">
          <div className="netflix-spinner-inner"></div>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {isAdminMode ? (
        <AdminProvider>
          <div className="admin-container">
            <AdminNav />
            <main className="admin-content">
              <Routes>
                <Route path="/admin/ui-assets" element={<AssetManager />} />
                <Route path="/admin/hotspots" element={<Hotspots />} />
                <Route path="/admin/playlists" element={<Playlists />} />
                <Route path="/admin/assets" element={<Assets />} />
                <Route path="/admin" element={<Assets />} />
                <Route path="*" element={<Navigate to="/admin/assets" replace />} />
              </Routes>
            </main>
          </div>
        </AdminProvider>
      ) : (
        <VideoProvider>
          <Routes>
            {hasConfig ? (
              <>
                <Route path="/experience/:locationId" element={<Experience />} />
                <Route path="/" element={<Menu />} />
              </>
            ) : (
              <Route path="*" element={
                <div className="no-config-message">
                  <h2>Netflix House Experience Setup Required</h2>
                  <p>This experience needs to be configured in the admin panel before it can be used.</p>
                  <p>Press Ctrl+Shift+A to access the admin panel and complete the setup.</p>
                </div>
              } />
            )}
          </Routes>
        </VideoProvider>
      )}
    </div>
  );
}

export default App;
