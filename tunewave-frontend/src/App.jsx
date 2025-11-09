import React, { useState, useMemo } from 'react'; // ✅ Import useMemo
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

// Authentication and Context
import useAuth from './hooks/useAuth'; 
import { MusicProvider } from './context/MusicContext';

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
    // This ensures <Home> and <PrivateRoute> only re-render if darkMode changes.
    const privateRouteElement = useMemo(() => (
        <PrivateRoute darkMode={darkMode}>
            <Home darkMode={darkMode} setDarkMode={setDarkMode} /> 
        </PrivateRoute>
    ), [darkMode, setDarkMode]); 
    // setDarkMode is stable, so changes are only driven by the darkMode state.
    
    return (
        <div className={`${currentTheme}`} style={{ fontFamily: 'Inter, sans-serif' }}>
            <div 
                className={`
                    min-h-screen 
                    transition-colors duration-500 
                    ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}
                `}
            >
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