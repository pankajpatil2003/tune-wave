// src/components/music/PlaylistSidebar.jsx
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ListMusic } from 'lucide-react';
import { useMusic } from '../../context/MusicContext'; // Adjust path as needed

/**
 * Renders the list of user-created playlists in the sidebar.
 */
const PlaylistSidebar = ({ isCollapsed, linkInactiveColor }) => {
    const { 
        userPlaylists, 
        fetchUserPlaylists, 
        isPlaylistsLoading 
    } = useMusic();

    // 🏆 FIX: Use an empty dependency array to ensure the initial fetch 
    // runs only ONCE when the component mounts. This prevents the infinite loop.
    useEffect(() => {
        // We rely on the context to handle its own loading/error state.
        // If the context needs a refresh, it should provide a separate refresh function.
        // For initial load, we call it once.
        fetchUserPlaylists();
    }, []); // <--- THE CRITICAL FIX: Empty dependency array

    const playlistLinkStyle = ({ isActive }) => `
        flex items-center 
        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2'} 
        rounded-lg transition-colors duration-200
        font-medium text-sm
        ${isActive
            ? 'bg-indigo-600 text-white shadow-lg' 
            : `${linkInactiveColor} text-xs` // Slightly smaller text for playlists
        }
        overflow-hidden whitespace-nowrap
    `;

    return (
        <div className="mt-4">
            {/* Header for Playlists */}
            <h4 className={`
                text-xs font-semibold uppercase tracking-wider 
                ${isCollapsed ? 'hidden' : 'px-3 mb-2 text-indigo-400'}
            `}>
                {isCollapsed ? '' : 'Playlists'}
            </h4>
            
            {/* Loading/Error State */}
            {isPlaylistsLoading && <p className={`text-xs ${isCollapsed ? 'hidden' : 'px-3 py-2 text-gray-400'}`}>Loading...</p>}

            {/* Playlist List */}
            <ul className="flex flex-col space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {userPlaylists.map((playlist) => (
                    <li key={playlist._id || playlist.id}>
                        <NavLink 
                            to={`/playlist/${playlist._id || playlist.id}`}
                            className={playlistLinkStyle}
                        >
                            {/* Icon for collapsed view, text for expanded */}
                            <ListMusic className={`h-5 w-5 ${isCollapsed ? '' : 'mr-4'}`} />
                            <span className={`
                                transition-opacity duration-300 
                                ${isCollapsed ? 'opacity-0 w-0 absolute' : 'opacity-100 w-auto truncate'}
                            `}>
                                {playlist.name}
                            </span>
                        </NavLink>
                    </li>
                ))}
            </ul>
            {/* Note: We will need a way to trigger 'Create Playlist' later */}
        </div>
    );
};

export default PlaylistSidebar;