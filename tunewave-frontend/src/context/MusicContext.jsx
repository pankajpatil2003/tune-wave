import React, { createContext, useContext, useState, useRef, useMemo, useCallback, useEffect } from 'react'; 
import { getFullImageUrl } from "../utils/urlUtils.js";
// Assuming YouTubeIframePlayer component is imported/available where needed.
import YouTubeIframePlayer from '../components/YouTubeIframePlayer'; 

// --- 1. Create Context ---
const MusicContext = createContext();

// --- 2. Custom Hook for consumption ---
export const useMusic = () => useContext(MusicContext);

// --- State for control modes ---
const REPEAT_MODES = {
    OFF: 'off',
    CONTEXT: 'context', // Repeat playlist
    TRACK: 'track',  // Repeat current track
};

// ----------------------------------------------------------------------
// --- 3. Provider Component ---
// ----------------------------------------------------------------------
export const MusicProvider = ({ children }) => {
    // Core Playback State
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [sourceType, setSourceType] = useState(null); 

    // 🔊 Volume/Mute State 
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);

    // Playlist/Control State
    const [playlist, setPlaylist] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1); 
    const [isShuffling, setIsShuffling] = useState(false);
    const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF);

    // 🛑 DUAL PLAYER REFS
    const nativePlayerRef = useRef(null);
    // Reference for the active YouTube player object (set by YouTubeIframePlayer)
    const youtubePlayerObjectRef = useRef(null);
    
    // 🟢 CRITICAL FIX: Initialize to false so the viewer doesn't open on startup.
    const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false); 
    
    // 📺 VIDEO VIEWER SIZE STATE (NEW)
    const [videoViewerSize, setVideoViewerSize] = useState('small'); // 'small' or 'medium'

    // --- Control Toggles & Helpers ---
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
    
    // ------------------------------------------------------------------
    // 🔄 Viewer Toggle & Ref Registration
    // ------------------------------------------------------------------
    const toggleVideoViewer = useCallback(() => {
        setIsVideoViewerOpen(prev => {
            const newState = !prev;

            // If we are CLOSING the viewer (going from true to false):
            // We seek the hidden player to the current time so it starts from the right spot
            if (!newState) {
                const player = youtubePlayerObjectRef.current;
                if (player && typeof player.seekTo === 'function') {
                    // Check if player has the seekTo method (part of the YT API)
                    player.seekTo(currentTime, true);
                }
            }
            return newState;
        });
    }, [currentTime]);

    // 📺 NEW: Function to set the video viewer size
    const resizeVideoViewer = useCallback((size) => {
        if (size === 'small' || size === 'medium') {
            setVideoViewerSize(size);
        }
    }, []);

    // ------------------------------------------------------------------
    // 1. HELPER FUNCTIONS
    // ------------------------------------------------------------------
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
    
    // ------------------------------------------------------------------
    // 2. PLAYER CONTROL FUNCTIONS
    // ------------------------------------------------------------------
    
    // 🎯 SEEK Logic - Determines which player to seek
    const handleSeek = useCallback((time) => {
        const player = sourceType === 'youtube'
            ? youtubePlayerObjectRef.current
            : nativePlayerRef.current;

        if (player) {
            if (sourceType === 'youtube') {
                // Use a check for the method as the YT API object might be delayed
                if (typeof player.seekTo === 'function') player.seekTo(time, true);
            } else if (player.currentTime !== undefined) {
                // Native Audio element property
                player.currentTime = time;
            }
            setCurrentTime(time);
            if (!isPlaying) setIsPlaying(true);
        } else {
            console.warn("Attempted to seek but no active player ref found.");
        }
    }, [isPlaying, sourceType]);
    
    // ------------------------------------------------------------------
    // 3. NAVIGATION FUNCTIONS
    // ------------------------------------------------------------------
    const playTrackRef = useRef(null); 
    
    const playNextStable = useCallback(() => {
        const nextIndex = getNextIndex();
        
        if (nextIndex !== -1 && nextIndex !== currentTrackIndex) {
            const nextTrack = playlist[nextIndex];
            if (nextTrack) {
                playTrackRef.current(nextTrack); 
            }
        } else if (nextIndex === currentTrackIndex && repeatMode === REPEAT_MODES.TRACK) {
            // Seek to 0 for track repeat
            handleSeek(0); 
        } else if (nextIndex === -1 && repeatMode === REPEAT_MODES.OFF) {
            // Stop playing at end of playlist
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


    // ------------------------------------------------------------------
    // 4. EVENT HANDLERS
    // ------------------------------------------------------------------
    
    // Unified End Handler 
    const handleAudioEnded = useCallback(() => {
        setIsPlaying(false); 
        setCurrentTime(0);
        playNextStable(); 
    }, [playNextStable]); 

    // NATIVE AUDIO HANDLERS (Same)
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

    // Unified handlers that the YouTube player component should call
    const setYoutubeCurrentTime = useCallback((time) => {
        // This is correct: the YouTube player updates the global currentTime state
        if (sourceType === 'youtube') setCurrentTime(time);
    }, [sourceType]);

    const setYoutubeDuration = useCallback((d) => {
        if (sourceType === 'youtube') setDuration(d);
    }, [sourceType]);

    // Function to set the YouTube API object ref
    const setYoutubePlayerObject = useCallback((player) => { 
        youtubePlayerObjectRef.current = player; 
    }, []);


    // ------------------------------------------------------------------
    // 5. LOAD AND PLAY LOGIC
    // ------------------------------------------------------------------
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
        
        // When a new YouTube track is played, automatically open the viewer
        setIsVideoViewerOpen(newSourceType === 'youtube'); 
        setCurrentTime(0);
        setDuration(0); // Reset duration immediately

        if (index !== -1) {
            setCurrentTrackIndex(index);
        }
        
        setIsPlaying(true); 

    }, []);

    const playTrack = useCallback((trackData) => {
        const index = playlist.findIndex(t => (t._id || t.id) === (trackData._id || trackData.id));
        loadAndPlayTrack(trackData, index);
    }, [playlist, loadAndPlayTrack]);

    playTrackRef.current = playTrack; // Assign to ref after definition
    
    // --- Exported Control Functions ---
    const togglePlayPause = useCallback(() => {
        if (currentTrack) {
            setIsPlaying(prev => !prev);
        }
    }, [currentTrack]);
    
    
    // ------------------------------------------------------------------
    // 💡 EFFECT TO CONTROL NATIVE <AUDIO> STATE (Same)
    // ------------------------------------------------------------------
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


    // ------------------------------------------------------------------
    // --- Memoized Context Value ---
    // ------------------------------------------------------------------
    const value = useMemo(() => ({
        // State
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, 
        playlist, currentTrackIndex, isShuffling, repeatMode, sourceType, 
        isVideoViewerOpen, 
        videoViewerSize, // <--- NEW STATE
        
        // Controls
        togglePlayPause, handleSeek, playTrack, 
        playNext: playNextStable, playPrevious: playPreviousStable,
        setVolume: setAudioVolume, toggleMute, setPlaylist, toggleShuffle, toggleRepeat,
        toggleVideoViewer, 
        resizeVideoViewer, // <--- NEW FUNCTION
        
        // Handlers for the YouTube player component
        setYoutubeCurrentTime, 
        setYoutubeDuration, 
        // Function to set the YouTube API object ref
        setYoutubePlayerObject,
        
    }), [
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, playlist,
        currentTrackIndex, isShuffling, repeatMode, sourceType, isVideoViewerOpen,
        videoViewerSize,
        togglePlayPause, handleSeek, playTrack, setAudioVolume, toggleMute, 
        setPlaylist, playNextStable, playPreviousStable, toggleShuffle, toggleRepeat,
        toggleVideoViewer, resizeVideoViewer, setYoutubeCurrentTime, setYoutubeDuration, 
        setYoutubePlayerObject 
    ]);

    // Determine if the track type should be handled by the generic file player
    const isLocalActive = sourceType === 'local' || sourceType === 'external_url';
    // Use the track ID or URL as a key for forced remount
    const playerKey = currentTrack?._id || currentTrack?.id || currentTrack?.audioSrc;

    // -------------------------------------------------------------------
    // Robust Helper to get video ID from various YouTube URL formats
    // -------------------------------------------------------------------
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        let id = null;

        // 1. Check for 'v=' parameter (Standard URL)
        let match = url.match(/[?&]v=([^&]+)/);
        if (match) {
            id = match[1];
        }
        
        // 2. Check for 'youtu.be/' (Share link)
        if (!id) {
            match = url.match(/youtu\.be\/([^?&]+)/);
            if (match) {
                id = match[1];
            }
        }
        
        // 3. Check for 'embed/' (Embed link)
        if (!id) {
            match = url.match(/embed\/([^?&]+)/);
            if (match) {
                id = match[1];
            }
        }

        // Sanitize the ID (remove potential trailing characters like timestamps or fragments)
        return id ? id.split(/[#?]/)[0] : null;
    };
    
    // Get the video ID to pass to the hidden player component
    const youtubeVideoId = getYoutubeVideoId(currentTrack?.audioSrc);


    return (
        <MusicContext.Provider value={value}>
            {children}
            {/* 🎧 DUAL PLAYER SYSTEM: HIDDEN FOR PLAYBACK CONTROL */}
            <div style={{ display: 'none' }}>
                
                {/* 1. NATIVE AUDIO Player (Handles local AND external URLs) */}
                {(isLocalActive && currentTrack?.audioSrc) && (
                    <audio
                        key={`native-${playerKey}`} 
                        ref={nativePlayerRef} 
                        src={currentTrack.audioSrc} 
                        volume={volume} 
                        muted={isMuted}
                        
                        // Native handlers 
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

                {/* 2. YouTube Hidden Player (Placeholder for Audio) */}
                {/* Renders if it's a YouTube track AND the viewer is closed */}
                {(sourceType === 'youtube' && !isVideoViewerOpen && youtubeVideoId) && (
                    <YouTubeIframePlayer 
                        // CRITICAL: Dynamic key forces clean player remount on track change.
                        key={`youtube-hidden-${playerKey}`}
                        videoUrl={currentTrack.audioSrc}
                        type="audio" // Renders a hidden/audio-only iframe
                        // Pass essential context state and handlers to the hidden player
                        isPlaying={isPlaying}
                        volume={volume}
                        isMuted={isMuted}
                        initialTime={currentTime}
                        setDuration={setYoutubeDuration}
                        setCurrentTime={setYoutubeCurrentTime} // CRITICAL: This updates the global currentTime state
                        setPlayerObject={setYoutubePlayerObject}
                        onEnded={playNextStable}
                    />
                )}
            </div>
        </MusicContext.Provider>
    );
};