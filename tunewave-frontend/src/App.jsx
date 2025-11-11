import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

// Authentication and Context
import useAuth from './hooks/useAuth';
import { MusicProvider } from './context/MusicContext';

// Pages and Components
import LoginPage from './pages/Auth/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import PlaylistPage from './pages/Playlist'; // 🆕 NEW: Import PlaylistPage
import Sidebar from './components/music/Sidebar';
import MusicPlayer from './components/music/MusicPlayer';
import VideoViewer from './components/VideoViewer';

// --- PrivateRoute Component ---
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

// --- Protected Layout with Nested Routes ---
const PrivateAppLayout = ({ darkMode, setDarkMode }) => {
    const { logout } = useAuth();
    
    return (
        <div className="app-container flex h-screen overflow-hidden">
            <Sidebar logout={logout} darkMode={darkMode} />
            
            <div className="flex flex-col flex-grow overflow-hidden">
                <main className="flex-grow overflow-y-auto">
                    <Routes>
                        <Route path="/" element={<Home darkMode={darkMode} setDarkMode={setDarkMode} />} />
                        <Route path="/search" element={<Search darkMode={darkMode} />} />
                        <Route path="/library" element={<Library darkMode={darkMode} />} />
                        
                        {/* 🌟 NEW: Playlist Detail Route */}
                        <Route 
                            path="/playlist/:playlistId" 
                            element={<PlaylistPage darkMode={darkMode} />} 
                        />
                        
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>

            <VideoViewer />
            <MusicPlayer darkMode={darkMode} />
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [darkMode, setDarkMode] = useState(true);
    const currentTheme = darkMode ? 'dark' : 'light';
    
    const privateLayoutElement = useMemo(() => (
        <PrivateRoute darkMode={darkMode}>
            <PrivateAppLayout darkMode={darkMode} setDarkMode={setDarkMode} />
        </PrivateRoute>
    ), [darkMode]);
    
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
                            <Route 
                                path="/login" 
                                element={
                                    <main className="p-4 sm:p-8 flex flex-col items-center min-h-screen justify-center">
                                        <LoginPage darkMode={darkMode} /> 
                                    </main>
                                }
                            />

                            <Route 
                                path="/*" 
                                element={privateLayoutElement} 
                            />
                        </Routes>
                    </Router>
                </MusicProvider>
            </div>
        </div>
    );
};

export default App;
