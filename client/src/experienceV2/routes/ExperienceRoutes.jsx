import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Experience from '../pages/Experience';
import { ExperienceProvider } from '../context/ExperienceContext';
import { Toaster } from '../../components/ui/use-toast';

/**
 * ExperienceRoutes.jsx - Routes for the v2 experience
 * Provides routing and context wrapping for the v2 experience
 */
const ExperienceRoutes = () => {
  return (
    <ExperienceProvider>
      <div className="min-h-screen bg-netflix-black text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/experience/:locationId" element={<Experience />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </div>
    </ExperienceProvider>
  );
};

export default ExperienceRoutes; 