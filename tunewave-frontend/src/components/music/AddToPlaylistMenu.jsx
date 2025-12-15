import React, { useState, useEffect, useCallback } from 'react';
import { useMusic } from '../../context/MusicContext';
import InputField from '../common/InputField.jsx';
import PrimaryButton from '../common/PrimaryButton.jsx';
import { fetchPlaylistsByTrack } from '../../api/musicService.js';

/**
 * AddToPlaylistMenu allows a user to add or remove a specific track
 * from their existing playlists, or create a new playlist.
 * @param {{trackId: string, onClose: () => void, allowCreate?: boolean}} props
 */
const AddToPlaylistMenu = ({ trackId, onClose, allowCreate = true }) => {
  const {
    userPlaylists = [],
    fetchUserPlaylists,
    isPlaylistsLoading,
    toggleTrackInPlaylist,
    createPlaylist,
  } = useMusic();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [playlistSearch, setPlaylistSearch] = useState('');
  // Set of playlist IDs that already contain this track
  const [playlistsWithTrack, setPlaylistsWithTrack] = useState(new Set());

  // Load all playlists (names)
  useEffect(() => {
    if (userPlaylists.length === 0) {
      fetchUserPlaylists();
    }
  }, [fetchUserPlaylists, userPlaylists.length]);

  // Load which playlists contain this track
  useEffect(() => {
    let isMounted = true;

    const loadPlaylistsWithTrack = async () => {
      try {
        const data = await fetchPlaylistsByTrack(trackId);
        if (!isMounted) return;
        const ids = new Set((data || []).map((pl) => pl._id || pl.id));
        setPlaylistsWithTrack(ids);
      } catch (err) {
        console.error('Failed to load playlists containing track:', err);
        if (isMounted) setPlaylistsWithTrack(new Set());
      }
    };

    loadPlaylistsWithTrack();

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  // Toggle track in playlist and keep local set in sync
  const handleToggleTrack = useCallback(
    async (playlistId) => {
      try {
        const result = await toggleTrackInPlaylist(playlistId, trackId);
        const { msg, isAdded } = result || {};
        setStatusMessage(msg || 'Playlist updated.');

        setPlaylistsWithTrack((prev) => {
          const next = new Set(prev);
          if (isAdded) {
            next.add(playlistId);
          } else {
            next.delete(playlistId);
          }
          return next;
        });
      } catch (error) {
        setStatusMessage('Error toggling track.');
        console.error(error);
      }
      setTimeout(() => setStatusMessage(''), 2500);
    },
    [trackId, toggleTrackInPlaylist]
  );

  // Create playlist, then add track to it
  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const newPlaylist = await createPlaylist(
        newPlaylistName,
        'New playlist from app.'
      );

      const pid = newPlaylist._id || newPlaylist.id;
      await handleToggleTrack(pid);

      setNewPlaylistName('');
      setStatusMessage(
        `Playlist "${newPlaylistName}" created and track added!`
      );
    } catch (error) {
      setStatusMessage('Failed to create playlist.');
      console.error(error);
    } finally {
      setIsCreating(false);
      setTimeout(() => setStatusMessage(''), 2500);
    }
  }, [newPlaylistName, createPlaylist, handleToggleTrack]);

  // Membership helper based on the set we maintain
  const isTrackInPlaylist = (playlist) =>
    playlistsWithTrack.has(playlist._id || playlist.id);

  const filteredPlaylists = userPlaylists.filter((playlist) =>
    playlist.name?.toLowerCase().includes(playlistSearch.toLowerCase())
  );

  return (
    <div className="atp-backdrop" onClick={onClose}>
      <div
        className="atp-modal"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h3 className="menu-title">Add to Playlist</h3>
        <button onClick={onClose} className="close-btn">
          ×
        </button>

        {statusMessage && <p className="status-message">{statusMessage}</p>}

        {allowCreate && (
          <>
            <div className="new-playlist-section">
              <InputField
                type="text"
                placeholder="New Playlist Name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                disabled={isCreating}
              />
              <PrimaryButton
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || isCreating}
                loading={isCreating}
              >
                Create & Add
              </PrimaryButton>
            </div>

            <hr />
          </>
        )}

        <div className="mb-3">
          <InputField
            type="text"
            placeholder="Search playlists..."
            value={playlistSearch}
            onChange={(e) => setPlaylistSearch(e.target.value)}
          />
        </div>

        <div className="existing-playlists-list">
          <h4>Your Playlists</h4>
          {isPlaylistsLoading ? (
            <p>Loading playlists...</p>
          ) : filteredPlaylists.length === 0 ? (
            <p>No playlists found{allowCreate ? '. Create one above!' : ''}</p>
          ) : (
            <ul>
              {filteredPlaylists.map((playlist) => {
                const pid = playlist._id || playlist.id;
                const inPlaylist = isTrackInPlaylist(playlist);

                return (
                  <li
                    key={pid}
                    className="playlist-item"
                    onClick={() => handleToggleTrack(pid)}
                  >
                    <span>{playlist.name}</span>
                    <span
                      className={`status ${inPlaylist ? 'remove' : 'add'}`}
                    >
                      {inPlaylist ? 'REMOVE' : '+ ADD'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <style>{`
          .atp-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .atp-modal {
            position: relative;
            background: var(--bg-surface, #1f2933);
            border: 1px solid var(--border-color, #444);
            padding: 18px 20px 22px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            width: min(480px, 95vw);
            max-height: 80vh;
            overflow: hidden;
            color: #f9fafb;
          }
          .menu-title {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1.2em;
          }
          .close-btn {
            position: absolute;
            top: 10px;
            right: 12px;
            background: none;
            border: none;
            color: #e5e7eb;
            cursor: pointer;
            font-size: 1.5em;
          }
          .new-playlist-section {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }
          .existing-playlists-list {
            max-height: 260px;
            overflow-y: auto;
            margin-top: 4px;
          }
          .playlist-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            cursor: pointer;
            list-style: none;
            transition: background 0.2s;
            border-radius: 6px;
          }
          .playlist-item:hover {
            background: var(--bg-hover, #374151);
          }
          .status {
            font-size: 0.8em;
            font-weight: 600;
            padding: 3px 6px;
            border-radius: 9999px;
          }
          .status.add {
            color: var(--color-success, #69f0ae);
          }
          .status.remove {
            color: var(--color-danger, #ff8a80);
          }
          .status-message {
            position: absolute;
            left: 50%;
            bottom: 8px;
            transform: translateX(-50%);
            background: rgba(16, 185, 129, 0.95);
            color: #e6fffb;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            white-space: nowrap;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AddToPlaylistMenu;
