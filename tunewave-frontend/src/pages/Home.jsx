import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth.jsx'; // Added .js extension
import { fetchRecommendedTracks, fetchTrackDetails } from '../api/musicService.js'; // Added .js extension
import { Disc3, MoreVertical, Upload, Loader2 } from 'lucide-react'; 

// Utility and Context Imports
import { getFullImageUrl } from '../utils/urlUtils.js'; // Added .js extension
import { useMusic } from '../context/MusicContext.jsx'; // Added .jsx extension

// --- Import Modular Components ---
// ⚠️ REMOVED: Sidebar and MusicPlayer imports, as they are globally managed by PrivateAppLayout
import Header from '../components/common/Header.jsx'; // Added .jsx extension
import UploadTrackModal from '../components/music/UploadTrackModal.jsx'; // Added .jsx extension
// ⚠️ REMOVED: Imports for SearchPage and LibraryPage, as they are managed by PrivateAppLayout's Routes


// --- Placeholder Data (Keep outside components) ---
const placeholderTracks = [
    { _id: 'ph1', title: "Midnight City", artist: "M83", cover_photo: "https://via.placeholder.com/150/4f46e5/ffffff?text=M83", filePath: "" },
    { _id: 'ph2', title: "The Less I Know The Better", artist: "Tame Impala", cover_photo: "https://via.placeholder.com/150/6366f1/ffffff?text=Tame", filePath: "" },
    { _id: 'ph3', title: "Blinding Lights", artist: "The Weeknd", cover_photo: "https://via.placeholder.com/150/818cf8/ffffff?text=Weeknd", filePath: "" },
    { _id: 'ph4', title: "Levitating", artist: "Dua Lipa", cover_photo: "https://via.placeholder.com/150/a5b4fc/ffffff?text=Dua", filePath: "" },
];


// --- TrackCard Component (Remains the same, just cleaning up imports) ---
const TrackCard = React.memo(({ track, darkMode }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    
    const { playTrack } = useMusic(); 
    const [isLoading, setIsLoading] = useState(false);

    const imageSrc = getFullImageUrl(track.cover_photo) 
        || 'https://via.placeholder.com/150/4f46e5/ffffff?text=Track';

    const handlePlayClick = async (e) => {
        e.stopPropagation(); 
        
        if (isLoading) return;

        setIsLoading(true);
        try {
            const trackId = track._id || track.id; 
            const fullTrackData = await fetchTrackDetails(trackId);
            playTrack(fullTrackData); 
        } catch (error) {
            console.error("Failed to load track for playback:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className={`
                p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 group
                ${darkMode ? 'bg-gray-800 hover:bg-gray-700/70' : 'bg-white hover:bg-gray-100'}
            `}
        >
            <div className="relative mb-3">
                <img 
                    src={imageSrc} 
                    alt={`Album art for ${track.title}`}
                    className="w-full h-auto aspect-square rounded-lg object-cover shadow-md"
                />
                <button 
                    onClick={handlePlayClick}
                    disabled={isLoading}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg"
                    aria-label={isLoading ? "Loading track" : `Play ${track.title}`}
                >
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    ) : (
                        <Disc3 className="h-10 w-10 text-indigo-400 fill-indigo-400/50" />
                    )}
                </button>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <h3 className={`text-base font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {track.title}
                    </h3>
                    <p className={`text-sm ${textColor} opacity-70`}>
                        {track.artist}
                    </p>
                </div>
                <button className={`p-1 rounded-full hover:text-indigo-400 ${textColor}`}>
                    <MoreVertical className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
});


// --- Main Home Component (This is now just the Page Content) ---
const Home = ({ darkMode, setDarkMode }) => {
    const { user, isAuthReady } = useAuth();
    
    // We only need the setPlaylist from context here to populate the global playlist
    const { setPlaylist } = useMusic();
    
    const username = user?.username;
    
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const fetchTracks = useCallback(async (sort = 'recently_added') => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await fetchRecommendedTracks(sort);
            const tracksData = Array.isArray(data) && data.length > 0 ? data : placeholderTracks;
            
            setTracks(tracksData); 
            setPlaylist(tracksData); // Set the global playlist in MusicContext
            
        } catch (err) {
            console.error("Failed to fetch recommended tracks:", err);
            
            const status = err.response?.status;
            let errorMessage = "Failed to load recommended tracks. Using local placeholders.";
            
            if (status === 401 || status === 403) {
                errorMessage = "Session expired or unauthorized. Please log in again.";
            } else if (err.message.includes('Network Error')) {
                errorMessage = "Could not connect to the server. Please check your connection.";
            }

            setError(errorMessage);
            const fallbackTracks = placeholderTracks;
            setTracks(fallbackTracks); 
            setPlaylist(fallbackTracks); // Set the global playlist with fallback tracks on error
        } finally {
            setLoading(false);
        }
    }, [setPlaylist]);

    useEffect(() => {
        if (isAuthReady) {
            fetchTracks(); 
        }
    }, [isAuthReady, fetchTracks]); 

    const handleUploadSuccess = (newTrack) => {
        setTracks(prevTracks => [newTrack, ...prevTracks]);
        setPlaylist(prevPlaylist => [newTrack, ...prevPlaylist]); // Keep global playlist in sync
        setIsUploadModalOpen(false);
    };

    const headerColor = darkMode ? 'text-white' : 'text-gray-900';

    return (
        // ⚠️ This is the main content area now, without the outer flex/h-screen/Sidebar/MusicPlayer
        <div className={`p-8 w-full h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}> 
            
            {/* The Header component is kept here for page-specific UI like the Dark Mode toggle */}
            <Header 
                darkMode={darkMode} 
                setDarkMode={setDarkMode} 
            />

            <div className="flex justify-between items-center mb-2 mt-8"> {/* Adjusted margin-top for content below the Header */}
                <h1 className={`text-4xl font-extrabold ${headerColor}`}>
                    Good Morning, **{username || 'Guest'}**!
                </h1>
                
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center px-4 py-2 rounded-full font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                    aria-label="Upload new track"
                >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Track
                </button>
            </div>
            
            <p className={`text-lg mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Start your day with these personalized recommendations.
            </p>
            
            {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-indigo-500">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="mt-4">Loading tracks...</p>
                </div>
            ) : error ? (
                <div className="p-4 mb-6 bg-red-800 text-white rounded-lg shadow-md">
                    <p className="font-semibold">Error loading tracks:</p>
                    <p>{error}</p>
                </div>
            ) : null}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {tracks.map(track => (
                    <TrackCard key={track._id || track.id} track={track} darkMode={darkMode} />
                ))}
            </div>

            <UploadTrackModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onUploadSuccess={handleUploadSuccess}
            />
        </div>
    );
};

export default Home;
