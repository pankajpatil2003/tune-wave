import React, { createContext, useContext, useState, useRef, useMemo, useCallback, useEffect } from 'react'; 
// We keep ReactPlayer only for YouTube tracks
import ReactPlayer from 'react-player'; 
import { getFullImageUrl } from "../utils/urlUtils.js";

// --- 1. Create Context ---
const MusicContext = createContext();

// --- 2. Custom Hook for consumption ---
export const useMusic = () => useContext(MusicContext);

// --- State for control modes ---
const REPEAT_MODES = {
    OFF: 'off',
    CONTEXT: 'context', // Repeat playlist
    TRACK: 'track',     // Repeat current track
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
    // sourceType can be 'local', 'youtube', or 'external_url'
    const [sourceType, setSourceType] = useState(null); 

    // 🔊 Volume/Mute State 
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);

    // Playlist/Control State
    const [playlist, setPlaylist] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1); 
    const [isShuffling, setIsShuffling] = useState(false);
    const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF);

    // 🛑 DUAL PLAYER REFS: MP3/File Player ref changed to nativePlayerRef
    const nativePlayerRef = useRef(null); 
    const youtubePlayerRef = useRef(null);
    // Dynamic ref to the CURRENT active player
    const activePlayerRef = useRef(null); 
    
    // --- Mode Toggles (No changes) ---
    const toggleShuffle = useCallback(() => {
        setIsShuffling(prev => !prev);
    }, []);

    const toggleRepeat = useCallback(() => {
        setRepeatMode(prev => {
            if (prev === REPEAT_MODES.OFF) return REPEAT_MODES.CONTEXT;
            if (prev === REPEAT_MODES.CONTEXT) return REPEAT_MODES.TRACK;
            return REPEAT_MODES.OFF;
        });
    }, []);

    // 🔊 Volume/Mute Controls (No changes)
    const setAudioVolume = useCallback((newVolume) => {
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);


    // --- Helper Functions (No changes) ---

    const getNextIndex = useCallback(() => {
        if (playlist.length === 0) return -1;
        
        if (repeatMode === REPEAT_MODES.TRACK) {
            return currentTrackIndex; 
        }
        
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


    const playTrackRef = useRef(null); 

// ------------------------------------------------------------------
    // 🥇 Load And Play Track (Source switching logic)
    // ------------------------------------------------------------------
    const loadAndPlayTrack = useCallback((trackData, index = -1) => {
        if (!trackData) {
            console.error("loadAndPlayTrack called with null trackData");
            return;
        }

        let trackUrl = null;
        const newSourceType = trackData.sourceType || (trackData.sourceUrl ? 'youtube' : 'local'); 
        
        console.log("--- Starting Track Load ---");
        console.log("Resolved newSourceType:", newSourceType);

        // 1. Resolve URL based on source type
        if (newSourceType === 'youtube' && trackData.sourceUrl) {
            trackUrl = trackData.sourceUrl;
        } 
        // 2. Handle generic external URL 
        else if (newSourceType === 'external_url' && trackData.sourceUrl) {
            trackUrl = trackData.sourceUrl;
        }
        // 3. Handle local file path (Uses the unencoded path)
        else if (newSourceType === 'local' && trackData.filePath) {
            trackUrl = getFullImageUrl(trackData.filePath); 
        }

        if (!trackUrl) {
            console.error("Failed to load track: No valid source URL or file path found for type:", newSourceType, trackData);
            setCurrentTrack(null);
            setIsPlaying(false);
            return; 
        }
        
        console.log("Final Resolved Media URL (audioSrc):", trackUrl); 

        // 🛑 CRITICAL: Stop playback before changing the URL/Player
        setIsPlaying(false); 

        // Set the new current track and source type
        setCurrentTrack({
            ...trackData,
            audioSrc: trackUrl, // <-- This is the URL the native player uses!
            cover_photo_url: trackData.cover_photo 
                ? getFullImageUrl(trackData.cover_photo) 
                : null,
        });
        setSourceType(newSourceType); 

        // Set the active player ref
        // Now pointing to nativePlayerRef for local/external URLs
        activePlayerRef.current = newSourceType === 'youtube' 
            ? youtubePlayerRef.current 
            : nativePlayerRef.current; // <---- POINTING TO NATIVE AUDIO REF

        console.log("Active Player Set:", 
            newSourceType === 'youtube' ? 'YouTube Player' : 'NATIVE Audio Player'); 

        if (index !== -1) {
            setCurrentTrackIndex(index);
        }
        
        // Start playing the NEW track (Actual play command is handled in the useEffect hook for native player)
        setIsPlaying(true); 
        setCurrentTime(0);

    }, []);


    // Memoized wrapper for loadAndPlayTrack (No changes)
    const playTrack = useCallback((trackData) => {
        const index = playlist.findIndex(t => (t._id || t.id) === (trackData._id || trackData.id));
        loadAndPlayTrack(trackData, index);
    }, [playlist, loadAndPlayTrack]);

    playTrackRef.current = playTrack;


    // ------------------------------------------------------------------
    // ⏭️ Navigation Logic (Modified to handle native seek)
    // ------------------------------------------------------------------

    const playNextStable = useCallback(() => {
        const nextIndex = getNextIndex();
        
        if (nextIndex !== -1 && nextIndex !== currentTrackIndex) {
            const nextTrack = playlist[nextIndex];
            if (nextTrack) {
                playTrackRef.current(nextTrack); 
            }
        } else if (nextIndex === currentTrackIndex && repeatMode === REPEAT_MODES.TRACK) {
            if (activePlayerRef.current) { 
                if (sourceType === 'youtube') activePlayerRef.current.seekTo(0);
                else activePlayerRef.current.currentTime = 0; // Native audio seek
                setIsPlaying(true);
            }
        } else if (nextIndex === -1 && repeatMode === REPEAT_MODES.OFF) {
            setIsPlaying(false);
            setCurrentTrackIndex(-1);
            setCurrentTime(0);
        }
    }, [currentTrackIndex, playlist, repeatMode, getNextIndex, sourceType]);


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
    // --- Player Event Handlers (Modified for native audio) ---
    // ------------------------------------------------------------------

    // Handler must use the active ref for seeking
    const handleSeek = useCallback((time) => {
        if (activePlayerRef.current) { 
            if (sourceType === 'youtube') {
                activePlayerRef.current.seekTo(time, 'seconds');
            } else {
                activePlayerRef.current.currentTime = time; // Native audio seek
            }
            setCurrentTime(time);
            if (!isPlaying) {
                setIsPlaying(true); 
            }
        }
    }, [isPlaying, sourceType]);
    
    // NATIVE AUDIO HANDLER: Called by <audio onLoadedMetadata>
    const handleNativeReady = useCallback(() => {
        if (nativePlayerRef.current) { 
            const durationValue = nativePlayerRef.current.duration || 0;
            console.log(`Native Player READY (local). Duration found:`, durationValue); 
            setDuration(durationValue); 
            // The actual .play() is handled by the useEffect for robust state syncing
        }
    }, []); 

    // REACTPLAYER HANDLER (for YouTube)
    const handleYoutubeReady = useCallback(() => {
        if (youtubePlayerRef.current) { 
            const durationValue = youtubePlayerRef.current.getDuration() || 0;
            console.log(`Player READY (youtube). Duration found:`, durationValue); 
            setDuration(durationValue); 
        }
    }, []); 
    
    // NATIVE AUDIO HANDLER: Called by <audio onTimeUpdate>
    const handleNativeProgress = useCallback(() => {
        // Only update if player is currently active AND it's a native source
        if (isPlaying && (sourceType === 'local' || sourceType === 'external_url')) {
            if (nativePlayerRef.current) {
                setCurrentTime(nativePlayerRef.current.currentTime);
            }
        }
    }, [isPlaying, sourceType]);

    // REACTPLAYER HANDLER (for YouTube)
    const handleYoutubeProgress = useCallback(state => {
        // Only update if player is currently active AND it's YouTube
        if (isPlaying && sourceType === 'youtube') { 
            setCurrentTime(state.playedSeconds);
        }
    }, [isPlaying, sourceType]); 
    
    // Unified End Handler (Modified to handle native seek)
    const handleAudioEnded = useCallback(() => {
        setIsPlaying(false); 
        setCurrentTime(0);
        if (repeatMode === REPEAT_MODES.TRACK) {
            if (activePlayerRef.current) { 
                if (sourceType === 'youtube') activePlayerRef.current.seekTo(0);
                else activePlayerRef.current.currentTime = 0; // Native seek
                setIsPlaying(true);
            }
        } else {
            playNextStable(); 
        }
    }, [playNextStable, repeatMode, sourceType]); 
    
    // --- Exported Control Functions (No changes) ---
    const togglePlayPause = useCallback(() => {
        if (currentTrack) {
            setIsPlaying(prev => !prev);
        }
    }, [currentTrack]);
    
    
    // ------------------------------------------------------------------
    // 💡 NEW: EFFECT TO CONTROL NATIVE <AUDIO> STATE 
    // This is necessary because <audio> doesn't automatically sync with React state changes
    // ------------------------------------------------------------------
    useEffect(() => {
        const isNativeSource = sourceType === 'local' || sourceType === 'external_url';
        const player = nativePlayerRef.current;

        if (player && isNativeSource) {
            player.volume = volume;
            player.muted = isMuted;

            if (isPlaying) {
                // Use .play() with a catch to handle browser autoplay policies
                player.play().catch(e => console.warn("Native Player Auto-play blocked (requires user interaction first):", e));
            } else {
                player.pause();
            }
        }
    }, [isPlaying, volume, isMuted, sourceType]);


    // ------------------------------------------------------------------
    // --- Memoized Context Value (No changes) ---
    // ------------------------------------------------------------------
    const value = useMemo(() => ({
        // State
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, 
        playlist, currentTrackIndex, isShuffling, repeatMode, sourceType, 
        
        // Controls
        togglePlayPause, handleSeek, 
        playTrack, 
        playNext: playNextStable, 
        playPrevious: playPreviousStable,
        setVolume: setAudioVolume, 
        toggleMute,
        setPlaylist, toggleShuffle, toggleRepeat,
        
    }), [
        currentTrack, isPlaying, currentTime, duration, volume, isMuted, playlist,
        currentTrackIndex, isShuffling, repeatMode, sourceType, togglePlayPause, handleSeek, 
        playTrack, setAudioVolume, toggleMute, setPlaylist, playNextStable, 
        playPreviousStable, toggleShuffle, toggleRepeat
    ]);

    // Determine if the track type should be handled by the generic file player
    const isLocalActive = sourceType === 'local' || sourceType === 'external_url';
    // Use the track ID or URL as a key for forced remount
    const playerKey = currentTrack?._id || currentTrack?.id || currentTrack?.audioSrc;


    return (
        <MusicContext.Provider value={value}>
            {children}
            {/* 🎧 DUAL PLAYER SYSTEM: Now using native <audio> for local files */}
            <div style={{ display: 'none' }}>
                
                {/* 1. NATIVE AUDIO Player (Handles local AND external URLs) */}
                {/* We only mount the <audio> tag if we have an active local/external source */}
                {(isLocalActive && currentTrack?.audioSrc) && (
                    <audio
                        key={`native-${playerKey}`} // Force re-render when track changes
                        ref={nativePlayerRef} 
                        src={currentTrack.audioSrc} 
                        // Native handlers replace ReactPlayer's
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

                {/* 2. YouTube Player (Uses ReactPlayer) */}
                <ReactPlayer
                    key={`youtube-${playerKey}`} 
                    ref={youtubePlayerRef} 
                    url={sourceType === 'youtube' ? currentTrack?.audioSrc : null} 
                    playing={isPlaying && sourceType === 'youtube'} 
                    volume={volume}
                    muted={isMuted}
                    // Use YouTube-specific handlers
                    onReady={sourceType === 'youtube' ? handleYoutubeReady : undefined} 
                    onProgress={sourceType === 'youtube' ? handleYoutubeProgress : undefined} 
                    onEnded={sourceType === 'youtube' ? handleAudioEnded : undefined} 
                    onError={(e, data) => {
                        console.error("YouTube Player Failed to load:", e, data);
                        setIsPlaying(false);
                    }}
                    config={{ youtube: { playerVars: { disablekb: 1 } } }}
                />
            </div>
        </MusicContext.Provider>
    );
};