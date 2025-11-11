import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // 🆕 Import Link for navigation
import useAuth from '../hooks/useAuth';
import { fetchUserPlaylistsV3 as fetchUserPlaylists, createPlaylist } from '../api/musicService'; 
import { Disc3, PlusCircle, ListMusic, Music, ChevronRight, Loader2, Check } from 'lucide-react'; 

import { getFullImageUrl } from './../utils/urlUtils'; 

// --- Component: PlaylistCard ---

const PlaylistCard = ({ playlist, darkMode }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    const PlaylistIcon = ListMusic; 

    const imageSrc = getFullImageUrl(playlist.image);

    return (
        // 🆕 UPDATED: Changed div to Link for navigation
        <Link 
            to={`/playlist/${playlist.id || playlist._id}`}
            className={`
                flex items-center p-4 rounded-xl shadow-md cursor-pointer 
                transition-all duration-300 hover:shadow-lg
                ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'}
            `}
        >
            <div className={`
                w-16 h-16 flex items-center justify-center rounded-lg mr-4 flex-shrink-0
                ${darkMode ? 'bg-indigo-700/50' : 'bg-indigo-500/10'}
            `}>
                {imageSrc ? (
                    <img 
                        src={imageSrc} 
                        alt={playlist.name} 
                        className="w-full h-full object-cover rounded-lg" 
                    />
                ) : (
                    <PlaylistIcon className="h-8 w-8 text-indigo-400" />
                )}
            </div>

            <div className="flex-grow min-w-0">
                <h3 className={`text-lg font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {playlist.name}
                </h3>
                <p className={`text-sm ${textColor} opacity-70 truncate`}>
                    {playlist.trackCount || playlist.tracks?.length || 0} songs
                </p>
            </div>

            <ChevronRight className={`h-6 w-6 ml-4 flex-shrink-0 ${textColor} opacity-50`} />
        </Link>
    );
};

// --- Main Library Component ---

const LibraryPage = ({ darkMode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();

    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [createError, setCreateError] = useState(null);

    const fetchPlaylists = () => {
        setLoading(true);
        setError(null);
        
        fetchUserPlaylists()
            .then(data => {
                setPlaylists(Array.isArray(data) ? data : []);
                setError(null);
            })
            .catch(err => {
                console.error("Failed to fetch playlists:", err);
                const errorMessage = err.message && err.message.includes('Authentication')
                    ? "Session expired. Please log in again."
                    : "Could not load your playlists.";
                setError(errorMessage);
                setPlaylists([]); 
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        if (isAuthReady && isAuthenticated) {
            fetchPlaylists();
        } else if (isAuthReady) {
            setLoading(false);
        }
    }, [isAuthenticated, isAuthReady]); 
    
    const handleCreatePlaylist = async () => {
        if (isSubmitting || !newPlaylistName.trim()) {
            return;
        }

        setCreateError(null);
        setIsSubmitting(true);

        try {
            const newPlaylist = await createPlaylist(newPlaylistName);
            
            setPlaylists(prev => [newPlaylist, ...prev]);
            
            setNewPlaylistName('');
            setCreateError(null);
            setShowCreateForm(false);

        } catch (err) {
            console.error("Error creating playlist:", err);
            setCreateError(err.message || "Failed to create playlist. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCreateForm = () => {
        if (showCreateForm) {
            setShowCreateForm(false);
            setNewPlaylistName('');
            setCreateError(null);
            setIsSubmitting(false);
        } else {
            setShowCreateForm(true);
            setNewPlaylistName('');
            setCreateError(null);
            setIsSubmitting(false);
        }
    };
    
    const headerColor = darkMode ? 'text-white' : 'text-gray-900';

    if (!isAuthReady) {
        return (
            <div className={`flex justify-center items-center h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            </div>
        );
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

            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${headerColor}`}>My Playlists</h2>
                <button 
                    onClick={toggleCreateForm}
                    type="button"
                    disabled={isSubmitting}
                    className={`
                        flex items-center px-4 py-2 rounded-full font-medium transition-colors
                        ${showCreateForm ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} 
                        text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                >
                    {showCreateForm ? 'Cancel' : (
                        <>
                            <PlusCircle className="h-5 w-5 mr-2" />
                            New Playlist
                        </>
                    )}
                </button>
            </div>

            {showCreateForm && (
                <div className={`p-6 mb-8 rounded-xl shadow-lg border-2 border-indigo-500/50 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-xl font-semibold mb-3 ${headerColor}`}>Create New Playlist</h3>
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            placeholder="Enter playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className={`
                                flex-grow p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500
                                ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'}
                            `}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isSubmitting && newPlaylistName.trim()) {
                                    handleCreatePlaylist();
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={handleCreatePlaylist}
                            type="button" 
                            disabled={isSubmitting || !newPlaylistName.trim()} 
                            className={`
                                flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
                                ${(isSubmitting || !newPlaylistName.trim()) 
                                    ? 'bg-gray-500 cursor-not-allowed' 
                                    : 'bg-green-600 hover:bg-green-700'
                                } 
                                text-white
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> 
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="h-5 w-5 mr-2" />
                                    Create
                                </>
                            )}
                        </button>
                    </div>
                    {createError && (
                        <p className="mt-3 text-red-400 text-sm">{createError}</p>
                    )}
                </div>
            )}

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
