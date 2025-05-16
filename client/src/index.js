import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/index.css';
import './styles/ErrorBoundary.css';

const container = document.getElementById('root');
const root = createRoot(container);

// Temporarily disabling StrictMode for debugging
// Re-enable for production and regular development
root.render(
  // <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  // </React.StrictMode>
);