import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search as SearchIcon, Disc3, MoreVertical, Loader2, X, Edit2, Trash2 } from 'lucide-react';

import {
  fetchRecommendedTracks,
  searchTracks,
  fetchTrackDetails,
  deleteTrackV2,
  updateTrackV2,
} from '../api/musicService.js';
import AddToPlaylistMenu from '../components/music/AddToPlaylistMenu.jsx';

import { getFullImageUrl } from './../utils/urlUtils.js';
import { useMusic } from './../context/MusicContext.jsx';

// --- Stable Placeholder Data ---
const placeholderTracks = [
  { id: 101, title: 'Cyber Dreams', artist: 'Synthwave God', cover_photo: 'uploads/cyber_cover.jpg' },
  { id: 102, title: 'Echoes of the Void', artist: 'Astral Tides', cover_photo: 'https://via.placeholder.com/150/6366f1/ffffff?text=Astral' },
  { id: 103, title: 'Rainy Day Groove', artist: 'Lo-Fi Beats', cover_photo: 'https://via.placeholder.com/150/818cf8/ffffff?text=LoFi' },
  { id: 104, title: 'Future Funk', artist: 'Neon City', cover_photo: 'https://via.placeholder.com/150/a5b4fc/ffffff?text=Funk' },
];

// --- Edit Track Modal (simple inline) ---
const EditTrackModal = ({ track, onSave, onClose, darkMode }) => {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(track._id, { title, artist });
      onClose();
    } catch (err) {
      console.error('Failed to update track:', err);
      alert('Failed to update track. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Track</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-sm mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Title
            </label>
            <input
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              className={`block text-sm mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Artist
            </label>
            <input
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- TrackCard Component (with playlist + edit/delete) ---
const TrackCard = React.memo(({ track, darkMode, onEdit, onDelete }) => {
  const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
  const imageSrc = getFullImageUrl(track.cover_photo);
  const { playTrack } = useMusic();
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlayClick = async (e) => {
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
      console.error('Failed to load track for playback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
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
        <img
          src={imageSrc || 'https://via.placeholder.com/150/4f46e5/ffffff?text=Track'}
          alt={`Album art for ${track.title}`}
          className="w-full h-auto aspect-square rounded-lg object-cover shadow-md"
        />
        <button
          disabled={isLoading}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg"
          aria-label={isLoading ? 'Loading track' : `Play ${track.title}`}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          ) : (
            <Disc3 className="h-10 w-10 text-indigo-400 fill-indigo-400/50" />
          )}
        </button>
      </div>

      <div className="flex justify-between items-start">
        <div className="overflow-hidden">
          <h3
            className={`text-base font-semibold truncate ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {track.title}
          </h3>
          <p className={`text-sm ${textColor} opacity-70 truncate`}>
            {track.artist}
          </p>
        </div>

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

          {isMenuOpen && (
            <div
              className={`absolute right-0 mt-2 w-48 origin-top-right rounded-lg shadow-2xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Edit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onEdit?.(track);
                }}
                className={`w-full flex items-center px-4 py-2 text-sm ${
                  darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                }`}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit track
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onDelete?.(track);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete track
              </button>

              <div className="border-t border-gray-700/40 border-gray-200/60 my-1" />

              {/* Add to playlist – just opens the separate card */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setIsAddToPlaylistOpen(true); // <-- open AddToPlaylist card
                }}
                className={`w-full flex items-center px-4 py-2 text-sm ${
                  darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                }`}
              >
                <Disc3 className="h-4 w-4 mr-2" />
                Add to playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AddToPlaylist card, shown only when user chose Add to playlist */}
      {isAddToPlaylistOpen && (
        <div className="playlist-menu absolute right-0 top-0 z-20">
          <AddToPlaylistMenu
            trackId={track._id || track.id}
            onClose={() => setIsAddToPlaylistOpen(false)}
            allowCreate={false}  
          />
        </div>
      )}
    </div>
  );
});
TrackCard.displayName = 'TrackCard';

// --- Main Search Page ---
const SearchPage = ({ darkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

  // Initial data fetch
  const fetchInitialTracks = useCallback(() => {
    setLoading(true);
    setError(null);

    fetchRecommendedTracks()
      .then((data) => {
        const initialTracks =
          Array.isArray(data) && data.length > 0 ? data : placeholderTracks;
        setTracks(initialTracks);
      })
      .catch((err) => {
        console.error('[FETCH] Initial track load error:', err);
        setError(
          'Failed to load all tracks for initial display. Displaying placeholders.'
        );
        setTracks(placeholderTracks);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Search
  const debounceSearch = useCallback((query) => {
    setIsSearching(true);
    setLoading(true);
    setError(null);

    searchTracks(query)
      .then((data) => {
        const results =
          Array.isArray(data) && data.length > 0 ? data : placeholderTracks;
        setTracks(results);
        setError(null);
      })
      .catch((err) => {
        console.error('[SEARCH] API Error:', err);
        setError('Failed to perform search. Displaying placeholders.');
        setTracks(placeholderTracks);
      })
      .finally(() => {
        setLoading(false);
        setIsSearching(false);
      });
  }, []);

  // Initial load
  useEffect(() => {
    fetchInitialTracks();
  }, [fetchInitialTracks]);

  // Debounce search term
  useEffect(() => {
    if (searchTerm === '') {
      return;
    }

    const handler = setTimeout(() => {
      debounceSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm, debounceSearch]);

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchTerm(query);

    if (query === '') {
      fetchInitialTracks();
    }
  };

  // Delete handler
  const handleDeleteTrack = async (track) => {
    const id = track._id || track.id;
    if (!id) return;
    if (!window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;

    try {
      await deleteTrackV2(id);
      setTracks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      console.error('Failed to delete track:', err);
      alert('Failed to delete track. Please try again.');
    }
  };

  // Update handler
  const handleUpdateTrack = async (trackId, updates) => {
    const updated = await updateTrackV2(trackId, updates);
    setTracks((prev) => prev.map((t) => (t._id === trackId ? updated : t)));
  };

  const containerBg = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const inputBg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';
  const headerColor = darkMode ? 'text-white' : 'text-gray-900';
  const textColor = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`p-8 w-full h-full overflow-y-auto ${containerBg}`}>
      <h1 className={`text-4xl font-extrabold mb-2 ${headerColor}`}>Search</h1>
      <p className={`text-lg mb-8 ${textColor}`}>
        Find your favorite music by title or artist.
      </p>

      <div className="mb-8 relative max-w-xl">
        <SearchIcon
          className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${textColor}`}
        />
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

      <h2 className={`text-2xl font-semibold mb-4 ${headerColor}`}>
        {searchTerm
          ? isSearching
            ? 'Searching...'
            : `Results for "${searchTerm}"`
          : 'All Tracks (Recently Added)'}
      </h2>

      {loading && (searchTerm === '' || isSearching) && (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className={`ml-4 text-xl ${headerColor}`}>
            {searchTerm === '' ? 'Loading initial tracks...' : 'Searching...'}
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-800 text-white rounded-lg shadow-md">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        tracks.length === 0 && searchTerm ? (
          <p className={textColor}>
            No results found for your query. Try a different search term.
          </p>
        ) : tracks.length === 0 && !searchTerm ? (
          <p className={textColor}>
            No tracks are available on the server. Try uploading one!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {tracks.map((track) => (
              <TrackCard
                key={track._id || track.id}
                track={track}
                darkMode={darkMode}
                onEdit={(t) => setEditingTrack(t)}
                onDelete={handleDeleteTrack}
              />
            ))}
          </div>
        )
      )}

      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          onSave={handleUpdateTrack}
          onClose={() => setEditingTrack(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default SearchPage;
