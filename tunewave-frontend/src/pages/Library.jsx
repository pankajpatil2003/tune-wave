import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { fetchUserPlaylists, createPlaylist } from '../api/musicService'; 
import { Disc3, PlusCircle, ListMusic, Music, ChevronRight, Loader2, Check } from 'lucide-react'; 

// ✅ IMPORT THE NEW UTILITY FUNCTION (Assuming the correct relative path is two levels up)
import { getFullImageUrl } from './../utils/urlUtils'; 

// --- Component: PlaylistCard ---

const PlaylistCard = ({ playlist, darkMode }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    const PlaylistIcon = ListMusic; 

    // ✅ FIX: Use the utility function to reliably resolve the playlist image URL
    const imageSrc = getFullImageUrl(playlist.image);

    return (
        <div 
            className={`
                flex items-center p-4 rounded-xl shadow-md cursor-pointer 
                transition-all duration-300 hover:shadow-lg
                ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}
            `}
        >
            {/* Playlist Icon/Image */}
            <div className={`
                w-16 h-16 flex items-center justify-center rounded-lg mr-4 flex-shrink-0
                ${darkMode ? 'bg-indigo-700/50' : 'bg-indigo-500/10'}
            `}>
                {/* Check if image source is available after utility processing */}
                {imageSrc ? (
                    // Use the image source if it exists
                    <img 
                        src={imageSrc} 
                        alt={playlist.name} 
                        className="w-full h-full object-cover rounded-lg" 
                    />
                ) : (
                    // Fallback icon if no image is available
                    <PlaylistIcon className="h-8 w-8 text-indigo-400" />
                )}
            </div>

            {/* Playlist Details */}
            <div className="flex-grow min-w-0">
                <h3 className={`text-lg font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {playlist.name}
                </h3>
                <p className={`text-sm ${textColor} opacity-70 truncate`}>
                    {/* Access tracks.length safely */}
                    {playlist.trackCount || playlist.tracks?.length || 0} songs
                </p>
            </div>

            {/* Navigation Arrow */}
            <ChevronRight className={`h-6 w-6 ml-4 flex-shrink-0 ${textColor} opacity-50`} />
        </div>
    );
};


// --- Main Library Component ---

const LibraryPage = ({ darkMode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();

    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Playlist Creation
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [createError, setCreateError] = useState(null);


    // Function to handle fetching playlists
    const fetchPlaylists = () => {
        setLoading(true);
        setError(null);
        
        fetchUserPlaylists()
            .then(data => {
                const placeholderPlaylists = [
                    // Added a placeholder image that uses a local path to test the utility function
                    { id: 101, name: "Chill Lofi Beats", tracks: [1,2,3], image: "uploads/lofi_cover.jpg" }, 
                    { id: 102, name: "Workout Hits 2024", tracks: [1,2,3,4,5], image: "https://via.placeholder.com/64/f5a623/ffffff?text=Gym" },
                ];
                setPlaylists(Array.isArray(data) && data.length > 0 ? data : placeholderPlaylists);
                setError(null);
            })
            .catch(err => {
                console.error("Failed to fetch playlists:", err);
                const errorMessage = err.message.includes('Unauthorized') 
                    ? "Session expired. Please log in again." 
                    : "Could not load your playlists. Using local placeholders.";
                setError(errorMessage);
                // Fallback to placeholder data if auth fails but still show the error
                setPlaylists([]); 
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Effect to fetch playlists
    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            fetchPlaylists();
        } else if (isAuthReady) {
            // User is not authenticated, stop loading indicator
            setLoading(false);
        }
    }, [isAuthenticated, isAuthReady]); 
    
    // --- Playlist Creation Logic ---

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) {
            setCreateError("Playlist name cannot be empty.");
            return;
        }

        setCreateError(null);
        setIsCreating(true);

        try {
            const newPlaylist = await createPlaylist(newPlaylistName);
            
            // Optimistically update the list
            setPlaylists(prev => [newPlaylist, ...prev]);
            
            // Reset state
            setNewPlaylistName('');
            setIsCreating(false);
            setCreateError(null);

        } catch (err) {
            console.error("Error creating playlist:", err);
            setCreateError(err.message || "Failed to create playlist. Try logging in again.");
            setIsCreating(false);
        }
    };
    
    const headerColor = darkMode ? 'text-white' : 'text-gray-900';

    if (!isAuthReady) {
         return <div className={`flex justify-center items-center h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}><Loader2 className="h-10 w-10 text-indigo-500 animate-spin" /></div>;
    }

    if (!isAuthenticated) {
        return (
            <div className={`p-8 w-full h-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <h1 className="text-4xl font-extrabold mb-4">Library</h1>
                <p className="text-xl">Please log in to view your music library and playlists.</p>
            </div>
        );
    }

    return (
        <div className={`p-8 w-full h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <h1 className={`text-4xl font-extrabold mb-2 ${headerColor}`}>
                Your Music Library
            </h1>
            <p className={`text-lg mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your playlists and saved content.
            </p>

            {/* Action Bar: Create Playlist */}
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${headerColor}`}>My Playlists</h2>
                <button 
                    onClick={() => {
                        setIsCreating(prev => !prev);
                        setCreateError(null); // Clear error on toggle
                        setNewPlaylistName(''); // Clear input on toggle
                    }}
                    className={`
                        flex items-center px-4 py-2 rounded-full font-medium transition-colors
                        ${isCreating ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white shadow-md
                    `}
                >
                    {isCreating ? 'Cancel Creation' : (
                        <>
                            <PlusCircle className="h-5 w-5 mr-2" />
                            New Playlist
                        </>
                    )}
                </button>
            </div>

            {/* 🚀 Create Playlist Inline Input */}
            {isCreating && (
                <div className={`p-6 mb-8 rounded-xl shadow-lg border-2 border-indigo-500/50 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-xl font-semibold mb-3 ${headerColor}`}>Create New Playlist</h3>
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            placeholder="Enter playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className={`flex-grow p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleCreatePlaylist();
                            }}
                            // Use isCreating state to disable, not 'loading'
                            disabled={!newPlaylistName.trim().length} 
                        />
                        <button
                            onClick={handleCreatePlaylist}
                            // Disabled if already loading or name is empty
                            disabled={isCreating || !newPlaylistName.trim()} 
                            className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-500"
                        >
                            {isCreating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                            {isCreating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                    {createError && (
                        <p className="mt-3 text-red-400">{createError}</p>
                    )}
                </div>
            )}


            {/* Loading/Error States for Fetching */}
            {loading && (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                    <p className={`ml-4 text-xl ${headerColor}`}>Loading playlists...</p>
                </div>
            )}

            {error && (
                <div className="p-4 mb-6 bg-red-800 text-white rounded-lg shadow-md">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                </div>
            )}


            {/* Playlists Grid/List */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {playlists.length > 0 ? (
                        playlists.map(playlist => (
                            <PlaylistCard key={playlist.id || playlist._id} playlist={playlist} darkMode={darkMode} />
                        ))
                    ) : (
                        <div className={`col-span-full text-center py-16 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Music className="h-12 w-12 mx-auto mb-4" />
                            <p className="text-xl">You haven't created any playlists yet.</p>
                            <p className="text-sm mt-2">Click the "New Playlist" button to get started.</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Saved Tracks Section Placeholder (kept the same) */}
            <h2 className={`text-2xl font-bold mt-12 mb-4 ${headerColor}`}>
                Saved Tracks
            </h2>
            <div className={`
                p-6 rounded-xl shadow-inner 
                ${darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-200/50 text-gray-600'}
            `}>
                <p>This section will list tracks you've marked as favorites. Functionality coming soon!</p>
            </div>
        </div>
    );
};

export default LibraryPage;