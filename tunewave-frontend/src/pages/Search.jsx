import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Disc3, MoreVertical, Loader2 } from 'lucide-react';

// Import the required API functions
import { fetchRecommendedTracks, searchTracks, fetchTrackDetails } from '../api/musicService'; 

// Utility functions
import { getFullImageUrl } from './../utils/urlUtils'; 
import { useMusic } from './../context/MusicContext'; 

// --- Stable Placeholder Data (Moved OUTSIDE Component) ---
const placeholderTracks = [
    { id: 101, title: "Cyber Dreams", artist: "Synthwave God", cover_photo: "uploads/cyber_cover.jpg" },
    { id: 102, title: "Echoes of the Void", artist: "Astral Tides", cover_photo: "https://via.placeholder.com/150/6366f1/ffffff?text=Astral" },
    { id: 103, title: "Rainy Day Groove", artist: "Lo-Fi Beats", cover_photo: "https://via.placeholder.com/150/818cf8/ffffff?text=LoFi" },
    { id: 104, title: "Future Funk", artist: "Neon City", cover_photo: "https://via.placeholder.com/150/a5b4fc/ffffff?text=Funk" },
];


// --- TrackCard Component (STABILIZED with React.memo and PLAYBACK ADDED) ---
// This component should be defined outside the SearchPage function.
const TrackCard = React.memo(({ track, darkMode }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    const imageSrc = getFullImageUrl(track.cover_photo); 
    const { playTrack } = useMusic(); // Access music context
    const [isLoading, setIsLoading] = useState(false);

    const handlePlayClick = async (e) => {
        e.stopPropagation(); 
        if (isLoading) return;

        setIsLoading(true);
        try {
            const trackId = track._id || track.id; 
            // Fetch full details if necessary, then play
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
            onClick={handlePlayClick} // Handle click on the entire card
            className={`
                p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 group
                ${darkMode ? 'bg-gray-800 hover:bg-gray-700/70' : 'bg-white hover:bg-gray-100'}
            `}
        >
            <div className="relative mb-3">
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
            {/* ... Track Info Block (unchanged) ... */}
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
TrackCard.displayName = 'TrackCard'; // Good practice for memoized components


const SearchPage = ({ darkMode }) => {
    // Note: Removed mountRef as external stability issues are now addressed.

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
    }, []); // Removed placeholderTracks from dependency array, as it's stable outside the component.


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
    }, []); // Removed placeholderTracks from dependency array, as it's stable outside the component.


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

    // --- Render Logic ---
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
            
            {/* Search Input Field */}
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

            {/* Content Display */}
            <h2 className={`text-2xl font-semibold mb-4 ${headerColor}`}>
                {searchTerm ? (isSearching ? 'Searching...' : `Results for "${searchTerm}"`) : 'All Tracks (Recently Added)'}
            </h2>

            {/* Loading Indicator */}
            {loading && (searchTerm === '' || isSearching) && (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                    <p className={`ml-4 text-xl ${headerColor}`}>{searchTerm === '' ? 'Loading initial tracks...' : 'Searching...'}</p>
                </div>
            )}
            
            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-800 text-white rounded-lg shadow-md">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                </div>
            )}
            
            {/* Track Grid/List */}
            {!loading && !error && (
                tracks.length === 0 && searchTerm ? (
                    <p className={textColor}>No results found for your query. Try a different search term.</p>
                ) : tracks.length === 0 && !searchTerm ? (
                    <p className={textColor}>No tracks are available on the server. Try uploading one!</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {tracks.map(track => (
                            // Use track._id if available, fall back to track.id
                            <TrackCard key={track._id || track.id} track={track} darkMode={darkMode} /> 
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default SearchPage;