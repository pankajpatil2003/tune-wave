import React, { createContext, useContext, useState, useRef, useMemo, useCallback, useEffect } from 'react'; 
import { getFullImageUrl } from "../utils/urlUtils.js";
import YouTubeIframePlayer from '../components/YouTubeIframePlayer'; 

// Import the V3 API functions
import { 
    fetchUserPlaylistsV3, 
    createPlaylistV3,
    updatePlaylistV3,
    toggleTrackInPlaylistV3,
    fetchPlaylistDetailsV3,
    deletePlaylistV3
} from '../api/musicService.js';

// Create Context
const MusicContext = createContext();

// Custom Hook for consumption
export const useMusic = () => useContext(MusicContext);

// State for control modes
const REPEAT_MODES = {
    OFF: 'off',
    CONTEXT: 'context',
    TRACK: 'track',
};

// Provider Component
export const MusicProvider = ({ children }) => {
    // Core Playback State
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [sourceType, setSourceType] = useState(null); 

    // Volume/Mute State 
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);

    // Playlist/Control State
    const [playlist, setPlaylist] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1); 
    const [isShuffling, setIsShuffling] = useState(false);
    const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF);

    // Playlist Management State
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);

    // Dual Player Refs
    const nativePlayerRef = useRef(null);
    const youtubePlayerObjectRef = useRef(null);
    const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false); 
    const [videoViewerSize, setVideoViewerSize] = useState('small');

    // Control Toggles & Helpers
    const toggleShuffle = useCallback(() => { setIsShuffling(prev => !prev); }, []);
    const toggleRepeat = useCallback(() => {
        setRepeatMode(prev => {
            if (prev === REPEAT_MODES.OFF) return REPEAT_MODES.CONTEXT;
            if (prev === REPEAT_MODES.CONTEXT) return REPEAT_MODES.TRACK;
            return REPEAT_MODES.OFF;
        });
    }, []);

    const setAudioVolume = useCallback((newVolume) => {
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    }, []);
    const toggleMute = useCallback(() => { setIsMuted(prev => !prev); }, []);

    // Viewer Toggle & Ref Registration
    const toggleVideoViewer = useCallback(() => {
        setIsVideoViewerOpen(prev => {
            const newState = !prev;

            if (!newState) {
                const player = youtubePlayerObjectRef.current;
                if (player && typeof player.seekTo === 'function') {
                    player.seekTo(currentTime, true);
                }
            }
            return newState;
        });
    }, [currentTime]);

    const resizeVideoViewer = useCallback((size) => {
        if (size === 'small' || size === 'medium') {
            setVideoViewerSize(size);
        }
    }, []);

    // HELPER FUNCTIONS
    const getNextIndex = useCallback(() => {
        if (playlist.length === 0) return -1;
        if (repeatMode === REPEAT_MODES.TRACK) return currentTrackIndex; 

        if (isShuffling) {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * playlist.length);
            } while (nextIndex === currentTrackIndex && playlist.length > 1);
            return nextIndex;
        }

        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= playlist.length) {
            return repeatMode === REPEAT_MODES.CONTEXT ? 0 : -1;
        }
        return nextIndex;
    }, [currentTrackIndex, playlist, isShuffling, repeatMode]);

    // PLAYER CONTROL FUNCTIONS

    // SEEK Logic
    const handleSeek = useCallback((time) => {
        const player = sourceType === 'youtube'
            ? youtubePlayerObjectRef.current
            : nativePlayerRef.current;

        if (player) {
            if (sourceType === 'youtube') {
                if (typeof player.seekTo === 'function') player.seekTo(time, true);
            } else if (player.currentTime !== undefined) {
                player.currentTime = time;
            }
            setCurrentTime(time);
            if (!isPlaying) setIsPlaying(true);
        } else {
            console.warn("Attempted to seek but no active player ref found.");
        }
    }, [isPlaying, sourceType]);

    // NAVIGATION FUNCTIONS
    const playTrackRef = useRef(null); 

    const playNextStable = useCallback(() => {
        const nextIndex = getNextIndex();

        if (nextIndex !== -1 && nextIndex !== currentTrackIndex) {
            const nextTrack = playlist[nextIndex];
            if (nextTrack) {
                playTrackRef.current(nextTrack); 
            }
        } else if (nextIndex === currentTrackIndex && repeatMode === REPEAT_MODES.TRACK) {
            handleSeek(0); 
        } else if (nextIndex === -1 && repeatMode === REPEAT_MODES.OFF) {
            setIsPlaying(false);
            setCurrentTrackIndex(-1);
            setCurrentTime(0);
        }
    }, [currentTrackIndex, playlist, repeatMode, getNextIndex, handleSeek]);

    const playPreviousStable = useCallback(() => {
        if (playlist.length === 0 || currentTrackIndex === -1) return;

        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = repeatMode !== REPEAT_MODES.OFF ? playlist.length - 1 : 0; 
        }

        if (prevIndex !== currentTrackIndex) {
            const previousTrack = playlist[prevIndex];
            playTrackRef.current(previousTrack);
        }
    }, [currentTrackIndex, playlist, repeatMode]);

    // EVENT HANDLERS

    // Unified End Handler 
    const handleAudioEnded = useCallback(() => {
        setIsPlaying(false); 
        setCurrentTime(0);
        playNextStable(); 
    }, [playNextStable]); 

    // NATIVE AUDIO HANDLERS
    const handleNativeReady = useCallback(() => {
        if (nativePlayerRef.current) { 
            const player = nativePlayerRef.current;
            const durationValue = player.duration || 0;
            setDuration(durationValue); 

            if (isPlaying) {
                player.play().catch(e => console.warn("Native Player READY: Auto-play blocked:", e));
            }
        }
    }, [isPlaying]); 

    const handleNativeProgress = useCallback(() => {
        if (isPlaying && (sourceType === 'local' || sourceType === 'external_url')) {
            if (nativePlayerRef.current) {
                setCurrentTime(nativePlayerRef.current.currentTime);
            }
        }
    }, [isPlaying, sourceType]);

    // Unified handlers for YouTube player
    const setYoutubeCurrentTime = useCallback((time) => {
        if (sourceType === 'youtube') setCurrentTime(time);
    }, [sourceType]);

    const setYoutubeDuration = useCallback((d) => {
        if (sourceType === 'youtube') setDuration(d);
    }, [sourceType]);

    const setYoutubePlayerObject = useCallback((player) => { 
        youtubePlayerObjectRef.current = player; 
    }, []);

    // LOAD AND PLAY LOGIC
    const loadAndPlayTrack = useCallback((trackData, index = -1) => {
        if (!trackData) return;

        let trackUrl = null;
        const newSourceType = trackData.sourceType || (trackData.sourceUrl ? 'youtube' : 'local'); 

        if (newSourceType === 'youtube' && trackData.sourceUrl) {
            trackUrl = trackData.sourceUrl;
        } else if (newSourceType === 'external_url' && trackData.sourceUrl) {
            trackUrl = trackData.sourceUrl;
        } else if (newSourceType === 'local' && trackData.filePath) {
            trackUrl = getFullImageUrl(trackData.filePath); 
        }

        if (!trackUrl) {
            console.error("Failed to load track: No valid source URL or file path found.");
            setCurrentTrack(null);
            setIsPlaying(false);
            return; 
        }

        setIsPlaying(false); 

        setCurrentTrack(prevTrack => ({
            ...trackData,
            audioSrc: trackUrl, 
            cover_photo_url: trackData.cover_photo 
                ? getFullImageUrl(trackData.cover_photo) 
                : (prevTrack?.cover_photo_url || null),
        }));
        setSourceType(newSourceType); 

        setIsVideoViewerOpen(newSourceType === 'youtube'); 
        setCurrentTime(0);
        setDuration(0);

        if (index !== -1) {
            setCurrentTrackIndex(index);
        }

        setIsPlaying(true); 
    }, []);

    const playTrack = useCallback((trackData) => {
        const index = playlist.findIndex(t => (t._id || t.id) === (trackData._id || trackData.id));
        loadAndPlayTrack(trackData, index);
    }, [playlist, loadAndPlayTrack]);

    playTrackRef.current = playTrack;

    // 🆕 NEW: Play a new queue of tracks
    const playNewQueue = useCallback((tracks, startIndex = 0) => {
        if (!tracks || tracks.length === 0) {
            setPlaylist([]);
            setCurrentTrackIndex(-1);
            setCurrentTrack(null);
            setIsPlaying(false);
            return;
        }

        // Set the new playlist
        setPlaylist(tracks);

        // Load and play the track at startIndex
        const trackToPlay = tracks[startIndex];
        if (trackToPlay) {
            loadAndPlayTrack(trackToPlay, startIndex);
        }
    }, [loadAndPlayTrack]);

    // 🆕 NEW: Play a single track immediately
    const playSingleTrack = useCallback((track) => {
        if (!track) return;

        // Create a queue with just this track
        playNewQueue([track], 0);
    }, [playNewQueue]);

    // Exported Control Functions
    const togglePlayPause = useCallback(() => {
        if (currentTrack) {
            setIsPlaying(prev => !prev);
        }
    }, [currentTrack]);

    // PLAYLIST MANAGEMENT FUNCTIONS

    const fetchUserPlaylists = useCallback(async () => {
        setIsPlaylistsLoading(true);
        try {
            const data = await fetchUserPlaylistsV3();
            setUserPlaylists(data.playlists || data); 
            return data.playlists || data;
        } catch (error) {
            console.error("Failed to fetch user playlists:", error);
            throw error;
        } finally {
            setIsPlaylistsLoading(false);
        }
    }, []);

    const createPlaylist = useCallback(async (name, description = '', is_public = false) => {
        try {
            const newPlaylist = await createPlaylistV3(name, description, is_public);
            setUserPlaylists(prev => [...prev, newPlaylist]);
            return newPlaylist;
        } catch (error) {
            console.error("Failed to create playlist:", error);
            throw error;
        }
    }, []);

    const updatePlaylist = useCallback(async (playlistId, updates) => {
        try {
            const updatedPlaylist = await updatePlaylistV3(playlistId, updates);
            setUserPlaylists(prev => prev.map(p => 
                (p._id === playlistId || p.id === playlistId) 
                    ? updatedPlaylist
                    : p
            ));
            return updatedPlaylist;
        } catch (error) {
            console.error(`Failed to update playlist ${playlistId}:`, error);
            throw error;
        }
    }, []);

    const toggleTrackInPlaylist = useCallback(async (playlistId, trackId) => {
        try {
            const result = await toggleTrackInPlaylistV3(playlistId, trackId);
            if (result.success || result.message) {
                 fetchUserPlaylists();
            }
            return result.message;
        } catch (error) {
            console.error(`Failed to toggle track ${trackId} in playlist ${playlistId}:`, error);
            throw error;
        }
    }, [fetchUserPlaylists]);

    const fetchPlaylistDetails = useCallback(async (playlistId) => {
        try {
            const playlistDetails = await fetchPlaylistDetailsV3(playlistId);
            return playlistDetails;
        } catch (error) {
            console.error(`Failed to fetch details for playlist ${playlistId}:`, error);
            throw error;
        }
    }, []);

    const deletePlaylist = useCallback(async (playlistId) => {
        try {
            const result = await deletePlaylistV3(playlistId);
            setUserPlaylists(prev => prev.filter(p => p._id !== playlistId && p.id !== playlistId));
            return result.message;
        } catch (error) {
            console.error(`Failed to delete playlist ${playlistId}:`, error);
            throw error;
        }
    }, []);

    // EFFECT TO CONTROL NATIVE <AUDIO> STATE
    useEffect(() => {
        const isNativeSource = sourceType === 'local' || sourceType === 'external_url';
        const player = nativePlayerRef.current;

        if (player && isNativeSource) {
            player.volume = volume;
            player.muted = isMuted;

            if (isPlaying) {
                if (player.readyState >= 3 || player.currentTime > 0) {
                    player.play().catch(e => console.warn("Native Player Auto-play blocked (effect):", e));
                }
            } else {
                player.pause();
            }
        }
    }, [isPlaying, volume, isMuted, sourceType]);

    // Memoized Context Value
    const value = useMemo(() => ({
        // State
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, 
        playlist, currentTrackIndex, isShuffling, repeatMode, sourceType, 
        isVideoViewerOpen, videoViewerSize,

        // Playlist State
        userPlaylists, 
        isPlaylistsLoading,

        // Controls
        togglePlayPause, handleSeek, playTrack, 
        playNext: playNextStable, playPrevious: playPreviousStable,
        setVolume: setAudioVolume, toggleMute, setPlaylist, toggleShuffle, toggleRepeat,
        toggleVideoViewer, resizeVideoViewer,

        // 🆕 NEW: Queue Controls
        playNewQueue,
        playSingleTrack,

        // Playlist Controls
        fetchUserPlaylists,
        createPlaylist,
        updatePlaylist, 
        deletePlaylist, 
        toggleTrackInPlaylist,
        fetchPlaylistDetails,

        // YouTube Player Handlers
        setYoutubeCurrentTime, 
        setYoutubeDuration, 
        setYoutubePlayerObject,

    }), [
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, playlist,
        currentTrackIndex, isShuffling, repeatMode, sourceType, isVideoViewerOpen,
        videoViewerSize,
        userPlaylists, isPlaylistsLoading,
        fetchUserPlaylists, createPlaylist, updatePlaylist, deletePlaylist, toggleTrackInPlaylist, fetchPlaylistDetails,
        togglePlayPause, handleSeek, playTrack, setAudioVolume, toggleMute, 
        setPlaylist, playNextStable, playPreviousStable, toggleShuffle, toggleRepeat,
        toggleVideoViewer, resizeVideoViewer, setYoutubeCurrentTime, setYoutubeDuration, 
        setYoutubePlayerObject, playNewQueue, playSingleTrack
    ]);

    const isLocalActive = sourceType === 'local' || sourceType === 'external_url';
    const playerKey = currentTrack?._id || currentTrack?.id || currentTrack?.audioSrc;

    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        let id = null;

        let match = url.match(/[?&]v=([^&]+)/);
        if (match) {
            id = match[1];
        }

        if (!id) {
            match = url.match(/youtu\.be\/([^?&]+)/);
            if (match) {
                id = match[1];
            }
        }

        if (!id) {
            match = url.match(/embed\/([^?&]+)/);
            if (match) {
                id = match[1];
            }
        }

        return id ? id.split(/[#?]/)[0] : null;
    };

    const youtubeVideoId = getYoutubeVideoId(currentTrack?.audioSrc);

    return (
        <MusicContext.Provider value={value}>
            {children}
            {/* DUAL PLAYER SYSTEM: HIDDEN FOR PLAYBACK CONTROL */}
            <div style={{ display: 'none' }}>

                {/* NATIVE AUDIO Player */}
                {(isLocalActive && currentTrack?.audioSrc) && (
                    <audio
                        key={`native-${playerKey}`} 
                        ref={nativePlayerRef} 
                        src={currentTrack.audioSrc} 
                        volume={volume} 
                        muted={isMuted}
                        onLoadedMetadata={handleNativeReady} 
                        onTimeUpdate={handleNativeProgress} 
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                            console.error("Native Audio Player Failed to load:", e);
                            setIsPlaying(false);
                            setDuration(0);
                        }}
                        preload="auto"
                    />
                )}

                {/* YouTube Hidden Player */}
                {(sourceType === 'youtube' && !isVideoViewerOpen && youtubeVideoId) && (
                    <YouTubeIframePlayer 
                        key={`youtube-hidden-${playerKey}`}
                        videoUrl={currentTrack.audioSrc}
                        type="audio"
                        isPlaying={isPlaying}
                        volume={volume}
                        isMuted={isMuted}
                        initialTime={currentTime}
                        setDuration={setYoutubeDuration}
                        setCurrentTime={setYoutubeCurrentTime}
                        setPlayerObject={setYoutubePlayerObject}
                        onEnded={playNextStable}
                    />
                )}
            </div>
        </MusicContext.Provider>
    );
};

export default useMusic;