import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// 💡 IMPORTANT: Assuming you have an index.css or equivalent to import global styles
// import './index.css'; 

// 1. Import the AuthProvider component
// Note: We use .jsx here because we renamed useAuth.js to useAuth.jsx earlier to fix a parsing error.
import { AuthProvider } from './hooks/useAuth.jsx'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap the App component with the AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);