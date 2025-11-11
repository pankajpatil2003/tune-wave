import React, { useState, useEffect, useCallback } from 'react';
import { useMusic } from '../../context/MusicContext';
import InputField from '../common/InputField.jsx'; // Assuming this component exists
import PrimaryButton from '../common/PrimaryButton.jsx'; // Assuming this component exists

/**
 * AddToPlaylistMenu component allows a user to add or remove a specific track
 * from their existing playlists, or create a new playlist.
 * * @param {{trackId: string, onClose: () => void}} props
 */
const AddToPlaylistMenu = ({ trackId, onClose }) => {
    const { 
        userPlaylists, 
        fetchUserPlaylists, 
        isPlaylistsLoading,
        toggleTrackInPlaylist,
        createPlaylist 
    } = useMusic();

    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // 1. Fetch playlists on mount (if they haven't been fetched yet)
    useEffect(() => {
        if (userPlaylists.length === 0) {
            fetchUserPlaylists();
        }
    }, [fetchUserPlaylists, userPlaylists.length]);

    // 2. Handle toggling a track in a playlist
    const handleToggleTrack = useCallback(async (playlistId) => {
        try {
            const message = await toggleTrackInPlaylist(playlistId, trackId);
            setStatusMessage(message);
        } catch (error) {
            setStatusMessage("Error toggling track.");
            console.error(error);
        }
        // Clear message after a brief display
        setTimeout(() => setStatusMessage(''), 3000);
    }, [trackId, toggleTrackInPlaylist]);

    // 3. Handle creating a new playlist
    const handleCreatePlaylist = useCallback(async () => {
        if (!newPlaylistName.trim()) return;

        setIsCreating(true);
        try {
            // Test 1: Create the playlist
            const newPlaylist = await createPlaylist(newPlaylistName, "New playlist from app.");
            
            // Automatically add the track to the newly created playlist
            await handleToggleTrack(newPlaylist._id || newPlaylist.id);

            setNewPlaylistName('');
            setStatusMessage(`Playlist "${newPlaylistName}" created and track added!`);
        } catch (error) {
            setStatusMessage("Failed to create playlist.");
        } finally {
            setIsCreating(false);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    }, [newPlaylistName, createPlaylist, handleToggleTrack]);


    // Helper to check if the track is in a playlist
    const isTrackInPlaylist = (playlist) => {
        // We check against the tracks array which should contain populated track objects OR just track IDs
        return playlist.tracks.some(track => (track._id || track.id) === trackId);
    };

    return (
        <div className="add-to-playlist-menu">
            <h3 className="menu-title">Add to Playlist</h3>
            <button onClick={onClose} className="close-btn">×</button>

            {/* Status Message */}
            {statusMessage && <p className="status-message">{statusMessage}</p>}

            {/* Create New Playlist Section */}
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
                    isLoading={isCreating}
                >
                    Create & Add
                </PrimaryButton>
            </div>
            
            <hr/>

            {/* List of Existing Playlists */}
            <div className="existing-playlists-list">
                <h4>Your Playlists</h4>
                {isPlaylistsLoading ? (
                    <p>Loading playlists...</p>
                ) : userPlaylists.length === 0 ? (
                    <p>No playlists found. Create one above!</p>
                ) : (
                    <ul>
                        {userPlaylists.map(playlist => (
                            <li 
                                key={playlist._id || playlist.id} 
                                className="playlist-item"
                                onClick={() => handleToggleTrack(playlist._id || playlist.id)}
                            >
                                <span>{playlist.name}</span>
                                <span className={`status ${isTrackInPlaylist(playlist) ? 'remove' : 'add'}`}>
                                    {isTrackInPlaylist(playlist) ? '✓ REMOVE' : '+ ADD'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {/* Minimal styling for demonstration (You'll need actual CSS) */}
            <style jsx global>{`
                .add-to-playlist-menu {
                    position: absolute;
                    background: var(--bg-surface, #2a2a2a);
                    border: 1px solid var(--border-color, #444);
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                    z-index: 1000;
                    min-width: 300px;
                }
                .menu-title {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 1.2em;
                }
                .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1.5em;
                }
                .new-playlist-section {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .existing-playlists-list {
                    max-height: 200px;
                    overflow-y: auto;
                }
                .playlist-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 10px;
                    cursor: pointer;
                    list-style: none;
                    transition: background 0.2s;
                }
                .playlist-item:hover {
                    background: var(--bg-hover, #3a3a3a);
                }
                .status {
                    font-size: 0.8em;
                    font-weight: bold;
                    padding: 3px 6px;
                    border-radius: 4px;
                }
                .status.add {
                    color: var(--color-success, #69f0ae);
                }
                .status.remove {
                    color: var(--color-danger, #ff8a80);
                }
                .status-message {
                    color: var(--color-primary, #64ffda);
                    text-align: center;
                    margin-bottom: 10px;
                }
            `}</style>
        </div>
    );
};

export default AddToPlaylistMenu;