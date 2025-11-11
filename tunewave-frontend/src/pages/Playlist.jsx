import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useMusic from '../context/MusicContext';
// Import the V3 functions from music service
import { 
    fetchPlaylistDetailsV3 as fetchPlaylistDetails, 
    searchTracksV2 as searchTracks, 
    addTrackToPlaylistV3 as addTrackToPlaylist 
} from '../api/musicService'; 
import { Loader2, ListMusic, Music, Clock, User, Heart, Play, Search, Plus } from 'lucide-react'; 

import { getFullImageUrl } from './../utils/urlUtils'; 

const PlaylistPage = ({ darkMode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();
    const { playlistId } = useParams(); 

    // 🎵 Get playback function from Music context
    const { playNewQueue } = useMusic();

    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // States for Track Search/Add
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [pendingTrackId, setPendingTrackId] = useState(null);

    const headerColor = darkMode ? 'text-white' : 'text-gray-900';
    const textColor = darkMode ? 'text-gray-400' : 'text-gray-600';
    const cardBg = darkMode ? 'bg-gray-800' : 'bg-white';
    const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    // Fetch playlist details
    const fetchPlaylistData = (id) => {
        setLoading(true);
        setError(null);

        fetchPlaylistDetails(id)
            .then(data => {
                setPlaylist(data);
                setError(null);
            })
            .catch(err => {
                console.error("Failed to fetch playlist details:", err);
                setError(err.message || "Could not load playlist details.");
                setPlaylist(null);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!isAuthReady || !playlistId) return;

        if (!isAuthenticated) {
            setLoading(false);
            setError("Authentication required to view this playlist.");
            return;
        }
        fetchPlaylistData(playlistId);
    }, [playlistId, isAuthenticated, isAuthReady]); 

    // Helper Functions
    const getArtistName = (track) => {
        return track.artist?.name || 'Unknown Artist';
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Track Search Logic
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            const results = await searchTracks(searchTerm);
            setSearchResults(Array.isArray(results) ? results : []);
        } catch (err) {
            setSearchError(err.message || "Failed to perform search.");
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Add Track Logic
    const handleAddTrack = async (track) => {
        if (!playlistId) return;

        const trackId = track.id || track._id;
        if (pendingTrackId === trackId) return;

        setPendingTrackId(trackId);
        setSearchError(null);

        try {
            const updatedPlaylist = await addTrackToPlaylist(playlistId, trackId);

            // Update playlist with new data
            setPlaylist(updatedPlaylist); 

            // Clear search on success
            setSearchTerm('');
            setSearchResults([]);

        } catch (err) {
            setSearchError(err.message || "Failed to add track to playlist.");
        } finally {
            setPendingTrackId(null);
        }
    };

    // 🎵 NEW: Play Playlist Handler
    const handlePlayPlaylist = () => {
        if (playlist && playlist.tracks && playlist.tracks.length > 0) {
            playNewQueue(playlist.tracks, 0);
        } else {
            console.log("Playlist is empty, cannot start playback.");
        }
    };

    // 🎵 NEW: Play Single Track Handler
    const handlePlayTrack = (index) => {
        if (playlist && playlist.tracks && playlist.tracks.length > 0) {
            playNewQueue(playlist.tracks, index);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className={`flex justify-center items-center h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <p className={`ml-4 text-xl ${headerColor}`}>Loading playlist...</p>
            </div>
        );
    }

    // Error State
    if (error || !playlist) {
        return (
            <div className={`p-8 w-full h-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <h1 className="text-4xl font-extrabold mb-4">Playlist Error</h1>
                <div className="p-4 bg-red-800 text-white rounded-lg shadow-md">
                    <p className="font-semibold">Error:</p>
                    <p>{error || "Playlist not found or data is invalid."}</p>
                </div>
            </div>
        );
    }

    const totalDuration = playlist?.tracks?.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;
    const totalDurationFormatted = formatDuration(totalDuration);

    return (
        <div className={`p-8 w-full h-full overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>

            {/* Playlist Header Section */}
            <div className="flex items-end mb-10 pb-6 border-b border-gray-700/30">

                {/* Image */}
                <div className="w-48 h-48 flex-shrink-0 mr-6 shadow-2xl rounded-lg overflow-hidden">
                    {playlist.image ? (
                        <img 
                            src={getFullImageUrl(playlist.image)} 
                            alt={playlist.name} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-indigo-700' : 'bg-indigo-400'}`}>
                            <ListMusic className="h-12 w-12 text-white opacity-80" />
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                    <p className={`text-sm font-light uppercase ${textColor}`}>Playlist</p>
                    <h1 className={`text-5xl font-extrabold md:text-7xl mb-2 ${headerColor}`}>
                        {playlist.name}
                    </h1>
                    <p className={`text-lg font-medium ${textColor} mb-3`}>
                        {playlist.description || 'A collection of great music.'}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center text-sm font-medium">
                        <User className={`h-4 w-4 mr-1 ${textColor}`} />
                        <span className={`mr-4 ${textColor}`}>{playlist.owner?.username || 'You'}</span>
                        <Music className={`h-4 w-4 mr-1 ${textColor}`} />
                        <span className={`mr-4 ${textColor}`}>
                            {playlist.tracks?.length || 0} songs
                        </span>
                        {totalDuration > 0 && (
                            <>
                                <Clock className={`h-4 w-4 mr-1 ${textColor}`} />
                                <span className={`mr-4 ${textColor}`}>
                                    {totalDurationFormatted}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar and Search */}
            <div className="flex justify-between items-start mb-8">
                {/* 🎵 Play Button with handler */}
                <button 
                    onClick={handlePlayPlaylist}
                    disabled={!playlist || !playlist.tracks || playlist.tracks.length === 0}
                    className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <Play className="h-6 w-6 mr-2 fill-white" />
                    PLAY
                </button>

                {/* Track Search Input */}
                <form onSubmit={handleSearch} className="relative w-full max-w-sm ml-8">
                    <input
                        type="text"
                        placeholder="Search tracks to add..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full p-2 pl-10 rounded-full border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        disabled={isSearching}
                    />
                    <Search 
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} 
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-500 animate-spin" />
                    )}
                </form>
            </div>

            {/* Search Results Display */}
            {searchResults.length > 0 && (
                <div className={`mb-8 p-4 rounded-xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-xl font-semibold mb-3 ${headerColor}`}>Search Results</h3>
                    {searchError && <p className="text-red-500 mb-2">{searchError}</p>}

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map(track => {
                            const trackId = track.id || track._id;
                            const isPending = pendingTrackId === trackId;
                            const isAlreadyInPlaylist = playlist.tracks?.some(pTrack => (pTrack.id || pTrack._id) === trackId);

                            return (
                                <div 
                                    key={trackId}
                                    className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                                >
                                    <div className="flex items-center min-w-0">
                                        {track.image && (
                                            <img 
                                                src={getFullImageUrl(track.image)} 
                                                alt={track.title} 
                                                className="w-10 h-10 object-cover rounded-md mr-3 flex-shrink-0" 
                                            />
                                        )}
                                        <div className="min-w-0 truncate">
                                            <div className={`font-medium truncate ${headerColor}`}>{track.title}</div>
                                            <div className={`text-sm truncate ${textColor}`}>{getArtistName(track)}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAddTrack(track)}
                                        disabled={isPending || isAlreadyInPlaylist}
                                        title={isAlreadyInPlaylist ? "Track already in playlist" : "Add to Playlist"}
                                        className={`flex items-center px-3 py-1 rounded-full text-white font-medium transition-colors ml-4 whitespace-nowrap
                                            ${isAlreadyInPlaylist 
                                                ? 'bg-gray-500 cursor-not-allowed' 
                                                : isPending 
                                                ? 'bg-indigo-500 cursor-wait' 
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`
                                        }
                                    >
                                        {isAlreadyInPlaylist ? 'Added' : (
                                            isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />
                                        )}
                                        {!isAlreadyInPlaylist && !isPending && <span className="ml-1">Add</span>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Track List Header */}
            <h2 className={`text-2xl font-bold mb-4 ${headerColor}`}>Tracks</h2>
            <div className={`grid grid-cols-12 gap-4 py-2 px-4 border-b ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-700'} text-xs font-semibold uppercase`}>
                <div className="col-span-1">#</div>
                <div className="col-span-5">Title</div>
                <div className="col-span-4">Artist</div>
                <div className="col-span-2 flex justify-end">
                    <Clock className="h-4 w-4" />
                </div>
            </div>

            {/* Track List Items with playback */}
            <div className="space-y-1 mt-2">
                {playlist.tracks && playlist.tracks.length > 0 ? (
                    playlist.tracks.map((track, index) => (
                        <div 
                            key={track.id || track._id}
                            onClick={() => handlePlayTrack(index)}
                            className={`grid grid-cols-12 gap-4 items-center py-2 px-4 rounded-lg cursor-pointer transition-colors ${hoverBg} ${darkMode ? 'text-white' : 'text-gray-900'}`}
                        >
                            <div className="col-span-1 text-sm text-center opacity-70">{index + 1}</div>

                            <div className="col-span-5 flex items-center">
                                {track.image && (
                                    <img 
                                        src={getFullImageUrl(track.image)} 
                                        alt={track.title} 
                                        className="w-10 h-10 object-cover rounded-md mr-3" 
                                    />
                                )}
                                <div>
                                    <div className="text-base font-medium truncate">{track.title}</div>
                                    <div className="text-xs opacity-70">Album Placeholder</div>
                                </div>
                            </div>

                            <div className="col-span-4 text-sm font-medium truncate opacity-90">
                                {getArtistName(track)}
                            </div>

                            <div className="col-span-2 text-sm text-right opacity-70">
                                {formatDuration(track.duration)}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={`py-12 text-center ${textColor}`}>
                        <p>This playlist is currently empty. Use the search bar to add some tracks!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistPage;