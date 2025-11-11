import React, { useState, useMemo } from 'react'; 
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

// Authentication and Context
import useAuth from './hooks/useAuth'; 
import { MusicProvider } from './context/MusicContext';
import VideoViewer from './components/VideoViewer'; // Already imported by you

// Pages and Components
import LoginPage from './pages/Auth/Login'; 
import Home from './pages/Home';


// --- PrivateRoute Component (Remains the same) ---
const PrivateRoute = ({ children, darkMode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();

    if (!isAuthReady) {
        return (
            <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 5s linear infinite; }`}</style>
                <Disc3 className="h-12 w-12 text-indigo-500 animate-spin-slow" />
            </div>
        );
    }
    
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};


// --- Main App Component (Root) ---
const App = () => {
    const [darkMode, setDarkMode] = useState(true);
    const currentTheme = darkMode ? 'dark' : 'light';
    
    // ✅ FIX: Memoize the element passed to the private route.
    // This now renders the VideoViewer alongside the Home component.
    const privateRouteElement = useMemo(() => (
        <PrivateRoute darkMode={darkMode}>
            {/* Use a Fragment to render multiple siblings inside the PrivateRoute */}
            <React.Fragment>
                {/* 1. VideoViewer: Renders the video if the current track is YouTube. 
                  It manages its own position (e.g., fixed or absolute) via CSS.
                */}
                <VideoViewer /> 
                
                {/* 2. Home: The main application content */}
                <Home darkMode={darkMode} setDarkMode={setDarkMode} /> 
            </React.Fragment>
        </PrivateRoute>
    ), [darkMode, setDarkMode]); 
    
    return (
        <div className={`${currentTheme}`} style={{ fontFamily: 'Inter, sans-serif' }}>
            <div 
                className={`
                    min-h-screen 
                    transition-colors duration-500 
                    ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}
                `}
            >
                {/* MusicProvider must wrap all components that need context */}
                <MusicProvider> 
                    <Router> 
                        <Routes>
                            {/* Public Route: Login */}
                            <Route 
                                path="/login" 
                                element={
                                    <main className="p-4 sm:p-8 flex flex-col items-center min-h-screen justify-center">
                                        <LoginPage darkMode={darkMode} /> 
                                    </main>
                                }
                            />

                            {/* Private Routes: Use the memoized element */}
                            <Route 
                                path="/*" // Catches all private paths
                                element={privateRouteElement} 
                            />
                        </Routes>
                    </Router>
                </MusicProvider>
            </div>
        </div>
    );
};

export default App;