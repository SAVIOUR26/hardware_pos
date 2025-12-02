import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Log startup info
console.log('=== Hardware Manager Pro - Frontend Starting ===');
console.log('React version:', React.version);
console.log('window.api available:', typeof window.api !== 'undefined');

// Check if API is available
if (typeof window.api === 'undefined') {
  console.error('ERROR: window.api is not defined! Preload script may have failed.');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #e74c3c;">Application Error</h1>
      <p>The Electron API (window.api) is not available.</p>
      <p>The preload script may have failed to load.</p>
      <p>Please check the error log at: <code>C:\\Users\\[YourUser]\\AppData\\Roaming\\hardware-manager-pro\\error.log</code></p>
    </div>
  `;
} else {
  console.log('API test result:', window.api.test());
  console.log('Mounting React app...');

  try {
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    console.log('React app mounted successfully');
  } catch (error) {
    console.error('Failed to mount React app:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #e74c3c;">React Mount Error</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <p>Check the console for more details.</p>
      </div>
    `;
  }
}
