import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import {
  fetchRecommendedTracks,
  fetchTrackDetails,
  deleteTrackV2,
  updateTrackV2,
} from '../api/musicService.js';
import {
  Disc3,
  MoreVertical,
  Upload,
  Loader2,
  Trash2,
  Edit2,
} from 'lucide-react';
import { getFullImageUrl } from '../utils/urlUtils.js';
import { useMusic } from '../context/MusicContext.jsx';

import Header from '../components/common/Header.jsx';
import UploadTrackModal from '../components/music/UploadTrackModal.jsx';

// --- Placeholder Data ---
const placeholderTracks = [
  {
    _id: 'ph1',
    title: 'Midnight City',
    artist: 'M83',
    cover_photo:
      'https://via.placeholder.com/150/4f46e5/ffffff?text=M83',
    filePath: '',
  },
  {
    _id: 'ph2',
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    cover_photo:
      'https://via.placeholder.com/150/6366f1/ffffff?text=Tame',
    filePath: '',
  },
  {
    _id: 'ph3',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    cover_photo:
      'https://via.placeholder.com/150/818cf8/ffffff?text=Weeknd',
    filePath: '',
  },
  {
    _id: 'ph4',
    title: 'Levitating',
    artist: 'Dua Lipa',
    cover_photo:
      'https://via.placeholder.com/150/a5b4fc/ffffff?text=Dua',
    filePath: '',
  },
];

// Dynamic greeting + message
const getGreetingData = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good Morning',
      message: 'Start your day with these fresh picks.',
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good Afternoon',
      message: 'Take a break and enjoy these tracks.',
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      greeting: 'Good Evening',
      message: 'Unwind with these evening favorites.',
    };
  }
  return {
    greeting: 'Good Night',
    message: 'End your day with these personalized recommendations.',
  };
};

// --- Edit Track Modal ---
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

// --- TrackCard Component ---
const TrackCard = React.memo(
  ({ track, darkMode, onEdit, onDelete }) => {
    const textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
    const { playTrack } = useMusic();
    const [isLoading, setIsLoading] = useState(false);

    const imageSrc =
      getFullImageUrl(track.cover_photo) ||
      'https://via.placeholder.com/150/4f46e5/ffffff?text=Track';

    const handlePlayClick = async (e) => {
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
            aria-label={
              isLoading ? 'Loading track' : `Play ${track.title}`
            }
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
            <h3
              className={`text-base font-semibold truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {track.title}
            </h3>
            <p className={`text-sm ${textColor} opacity-70`}>
              {track.artist}
            </p>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(track);
              }}
              className={`p-1 rounded-full hover:text-indigo-400 ${textColor}`}
              aria-label="Edit track"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(track);
              }}
              className="p-1 rounded-full text-red-500 hover:text-red-400"
              aria-label="Delete track"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// --- Main Home Component ---
const Home = ({ darkMode, setDarkMode }) => {
  const { user, isAuthReady } = useAuth();
  const { setPlaylist } = useMusic();
  const { greeting, message } = getGreetingData();

  const username = user?.username;

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

  const fetchTracks = useCallback(
    async (sort = 'recently_added') => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchRecommendedTracks(sort);
        const tracksData =
          Array.isArray(data) && data.length > 0
            ? data
            : placeholderTracks;

        setTracks(tracksData);
        setPlaylist(tracksData);
      } catch (err) {
        console.error('Failed to fetch recommended tracks:', err);

        const status = err.response?.status;
        let errorMessage =
          'Failed to load recommended tracks. Using local placeholders.';

        if (status === 401 || status === 403) {
          errorMessage =
            'Session expired or unauthorized. Please log in again.';
        } else if (err.message?.includes('Network Error')) {
          errorMessage =
            'Could not connect to the server. Please check your connection.';
        }

        setError(errorMessage);
        setTracks(placeholderTracks);
        setPlaylist(placeholderTracks);
      } finally {
        setLoading(false);
      }
    },
    [setPlaylist]
  );

  useEffect(() => {
    if (isAuthReady) {
      fetchTracks();
    }
  }, [isAuthReady, fetchTracks]);

  const handleUploadSuccess = (newTrack) => {
    setTracks((prev) => [newTrack, ...prev]);
    setPlaylist((prev) => [newTrack, ...prev]);
    setIsUploadModalOpen(false);
  };

  const handleDeleteTrack = async (track) => {
    if (!track._id) return;
    if (
      !window.confirm(
        `Delete "${track.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteTrackV2(track._id);
      setTracks((prev) =>
        prev.filter((t) => (t._id || t.id) !== track._id)
      );
      setPlaylist((prev) =>
        prev.filter((t) => (t._id || t.id) !== track._id)
      );
    } catch (err) {
      console.error('Failed to delete track:', err);
      alert('Failed to delete track. Please try again.');
    }
  };

  const handleUpdateTrack = async (trackId, updates) => {
    const updated = await updateTrackV2(trackId, updates);
    setTracks((prev) =>
      prev.map((t) => (t._id === trackId ? updated : t))
    );
    setPlaylist((prev) =>
      prev.map((t) => (t._id === trackId ? updated : t))
    );
  };

  const headerColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <div
      className={`p-8 w-full h-full ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="flex justify-between items-center mb-2 mt-8">
        <h1 className={`text-4xl font-extrabold ${headerColor}`}>
          {greeting}, {username || 'Guest'}!
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

      <p
        className={`text-lg mb-8 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        {message}
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

      <UploadTrackModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

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

export default Home;
