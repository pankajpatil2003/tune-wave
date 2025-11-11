import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Disc3, MoreVertical, Loader2, X } from 'lucide-react';

// Import the required API functions
import { fetchRecommendedTracks, searchTracks, fetchTrackDetails } from '../api/musicService.js'; // Added .js
// Import the component needed for playlist management
import AddToPlaylistMenu from '../components/music/AddToPlaylistMenu.jsx'; 

// Utility functions
import { getFullImageUrl } from './../utils/urlUtils.js'; // Added .js
import { useMusic } from './../context/MusicContext.jsx'; // Added .jsx

// --- Stable Placeholder Data (Moved OUTSIDE Component) ---
const placeholderTracks = [
    { id: 101, title: "Cyber Dreams", artist: "Synthwave God", cover_photo: "uploads/cyber_cover.jpg" },
    { id: 102, title: "Echoes of the Void", artist: "Astral Tides", cover_photo: "https://via.placeholder.com/150/6366f1/ffffff?text=Astral" },
    { id: 103, title: "Rainy Day Groove", artist: "Lo-Fi Beats", cover_photo: "https://via.placeholder.com/150/818cf8/ffffff?text=LoFi" },
    { id: 104, title: "Future Funk", artist: "Neon City", cover_photo: "https://via.placeholder.com/150/a5b4fc/ffffff?text=Funk" },
];


// --- TrackCard Component (UPDATED for Playlist Menu) ---
const TrackCard = React.memo(({ track, darkMode }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    const imageSrc = getFullImageUrl(track.cover_photo); 
    const { playTrack } = useMusic();
    const [isLoading, setIsLoading] = useState(false);
    
    // 🆕 State to manage the visibility of the AddToPlaylistMenu
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const handlePlayClick = async (e) => {
        // Only trigger play if not clicking the menu button
        if (e.target.closest('.menu-button') || e.target.closest('.playlist-menu')) {
            return;
        }

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
    
    const handleMenuClick = (e) => {
        e.stopPropagation(); // Prevent the card's play action
        setIsMenuOpen(prev => !prev);
    };


    return (
        <div 
            onClick={handlePlayClick}
            className={`
                p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 group relative
                ${darkMode ? 'bg-gray-800 hover:bg-gray-700/70' : 'bg-white hover:bg-gray-100'}
            `}
        >
            <div className="relative mb-3">
                {/* ... Image and Play Button (Unchanged) ... */}
                <img 
                    src={imageSrc || 'https://via.placeholder.com/150/4f46e5/ffffff?text=Track'}
                    alt={`Album art for ${track.title}`}
                    className="w-full h-auto aspect-square rounded-lg object-cover shadow-md"
                />
                <button 
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
                {/* ... Track Info Block (Unchanged) ... */}
                <div className='overflow-hidden'>
                    <h3 className={`text-base font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {track.title}
                    </h3>
                    <p className={`text-sm ${textColor} opacity-70 truncate`}>
                        {track.artist}
                    </p>
                </div>
                
                {/* 🆕 More Button to open Playlist Menu */}
                <div ref={menuRef} className="relative z-10">
                    <button 
                        onClick={handleMenuClick}
                        className={`menu-button p-1 rounded-full transition-colors duration-150 ${
                            isMenuOpen ? 'text-indigo-400 bg-gray-700' : `${textColor} hover:text-indigo-400`
                        }`}
                        aria-label="More options"
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <MoreVertical className="h-5 w-5" />}
                    </button>
                    
                    {/* 🆕 AddToPlaylistMenu Integration */}
                    {isMenuOpen && (
                        <div className="playlist-menu absolute right-0 mt-2 w-48 origin-top-right rounded-lg shadow-2xl z-20">
                             <AddToPlaylistMenu 
                                trackId={track._id || track.id} 
                                onDone={() => setIsMenuOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
TrackCard.displayName = 'TrackCard';


const SearchPage = ({ darkMode }) => {
    // ... all other states and functions remain the same ...
    const [searchTerm, setSearchTerm] = useState('');
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSearching, setIsSearching] = useState(false); 

    // --- 1. Initial data fetch (Stable) ---
    const fetchInitialTracks = useCallback(() => {
        setLoading(true);
        setError(null);
        
        fetchRecommendedTracks()
            .then(data => {
                const initialTracks = Array.isArray(data) && data.length > 0 ? data : placeholderTracks;
                setTracks(initialTracks);
            })
            .catch(err => {
                console.error("[FETCH] Initial track load error:", err);
                setError("Failed to load all tracks for initial display. Displaying placeholders.");
                setTracks(placeholderTracks);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []); 


    // --- 2. Debounced search function (Stable) ---
    const debounceSearch = useCallback((query) => {
        setIsSearching(true);
        setLoading(true);
        setError(null);
        
        searchTracks(query)
            .then(data => {
                const results = Array.isArray(data) && data.length > 0 ? data : placeholderTracks;
                setTracks(results);
                setError(null);
            })
            .catch(err => {
                console.error("[SEARCH] API Error:", err);
                setError("Failed to perform search. Displaying placeholders.");
                setTracks(placeholderTracks);
            })
            .finally(() => {
                setLoading(false);
                setIsSearching(false);
            });
    }, []); 


    // --- 3. useEffect for INITIAL Load (Runs ONCE on mount) ---
    useEffect(() => {
        fetchInitialTracks();
    }, [fetchInitialTracks]); 


    // --- 4. useEffect for Debouncing ---
    useEffect(() => {
        if (searchTerm === '') {
            return;
        }

        const handler = setTimeout(() => {
            debounceSearch(searchTerm);
        }, 500); 

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, debounceSearch]);


    const handleInputChange = (e) => {
        const query = e.target.value;
        setSearchTerm(query);

        // Manually trigger initial load if the search box is cleared
        if (query === '') {
            fetchInitialTracks();
        }
    };

    // --- Render Logic (Unchanged) ---
    const containerBg = darkMode ? 'bg-gray-900' : 'bg-gray-50';
    const inputBg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';
    const headerColor = darkMode ? 'text-white' : 'text-gray-900';
    const textColor = darkMode ? 'text-gray-400' : 'text-gray-600';

    return (
        <div className={`p-8 w-full h-full overflow-y-auto ${containerBg}`}>
            
            <h1 className={`text-4xl font-extrabold mb-2 ${headerColor}`}>
                Search
            </h1>
            <p className={`text-lg mb-8 ${textColor}`}>
                Find your favorite music by title or artist.
            </p>
            
            {/* Search Input Field (Unchanged) */}
            <div className="mb-8 relative max-w-xl">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${textColor}`} />
                <input
                    type="text"
                    placeholder="Search songs, artists, or albums..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    className={`
                        w-full py-3 pl-10 pr-4 rounded-full shadow-lg transition duration-150
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 
                        ${inputBg} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                    `}
                />
            </div>

            {/* Content Display (Unchanged) */}
            <h2 className={`text-2xl font-semibold mb-4 ${headerColor}`}>
                {searchTerm ? (isSearching ? 'Searching...' : `Results for "${searchTerm}"`) : 'All Tracks (Recently Added)'}
            </h2>

            {/* Loading/Error blocks (Unchanged) */}
            {loading && (searchTerm === '' || isSearching) && (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                    <p className={`ml-4 text-xl ${headerColor}`}>{searchTerm === '' ? 'Loading initial tracks...' : 'Searching...'}</p>
                </div>
            )}
            
            {error && (
                <div className="p-4 bg-red-800 text-white rounded-lg shadow-md">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                </div>
            )}
            
            {/* Track Grid/List (Unchanged) */}
            {!loading && !error && (
                tracks.length === 0 && searchTerm ? (
                    <p className={textColor}>No results found for your query. Try a different search term.</p>
                ) : tracks.length === 0 && !searchTerm ? (
                    <p className={textColor}>No tracks are available on the server. Try uploading one!</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {tracks.map(track => (
                            <TrackCard key={track._id || track.id} track={track} darkMode={darkMode} /> 
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default SearchPage;