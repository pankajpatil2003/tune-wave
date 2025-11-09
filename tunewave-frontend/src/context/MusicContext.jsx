import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react'; 
import { getFullImageUrl } from '../utils/urlUtils'; 

// --- 1. Create Context ---
const MusicContext = createContext();

// --- 2. Custom Hook for consumption ---
export const useMusic = () => useContext(MusicContext);

// --- State for control modes (New additions) ---
const REPEAT_MODES = {
    OFF: 'off',
    CONTEXT: 'context', // Repeat playlist
    TRACK: 'track',     // Repeat current track
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

    // Playlist/Control State
    const [playlist, setPlaylist] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1); 
    const [needsPlayAfterLoad, setNeedsPlayAfterLoad] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF);

    // Ref for the native HTML <audio> element
    const audioRef = useRef(null);
    
    // --- Control Toggles ---
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


    // --- Core Playback Logic (Defined top-down for stable dependencies) ---

    // Define navigation functions (playNext, playPrevious) first.
    // They depend on stable playTrack (defined below), so we must pass them in the useEffect.
    const playNext = useCallback(() => {
        // Implementation moved below after playTrack is defined
    }, [currentTrackIndex, playlist, repeatMode, isShuffling]);

    const playPrevious = useCallback(() => {
        // Implementation moved below after playTrack is defined
    }, [currentTrackIndex, playlist]);


    const loadAndPlayTrack = useCallback(async (trackData, index = -1) => {
        if (!trackData || !trackData.filePath) return;

        const newAudioSrc = getFullImageUrl(trackData.filePath);
        
        setCurrentTrack({
            ...trackData,
            audioSrc: newAudioSrc, 
            cover_photo_url: getFullImageUrl(trackData.cover_photo),
        });

        if (index !== -1) {
            setCurrentTrackIndex(index);
        }
        
        if (audioRef.current && audioRef.current.src !== newAudioSrc) {
             audioRef.current.src = newAudioSrc;
             audioRef.current.currentTime = 0; 
             setNeedsPlayAfterLoad(true); 
        } else if (audioRef.current) {
             audioRef.current.currentTime = 0;
             audioRef.current.play().catch(e => e.name !== "AbortError" && console.error("Error playing audio (same track):", e));
             setIsPlaying(true);
        }
        
    }, []);

    const playTrack = useCallback((trackData) => {
        const index = playlist.findIndex(t => (t._id || t.id) === (trackData._id || trackData.id));
        loadAndPlayTrack(trackData, index);
    }, [playlist, loadAndPlayTrack]);

    // --- Finalized Navigation Logic (using playTrack) ---
    const getNextIndex = useCallback(() => {
        if (playlist.length === 0) return -1;
        
        // 1. Check for Repeat One (This is handled in handleAudioEnded, but good practice here too)
        if (repeatMode === REPEAT_MODES.TRACK) {
            return currentTrackIndex; // Stay on the current track
        }
        
        // 2. Handle Shuffle
        if (isShuffling) {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * playlist.length);
            } while (nextIndex === currentTrackIndex && playlist.length > 1); // Avoid playing the same track again if possible
            return nextIndex;
        }

        // 3. Handle Linear (Next)
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= playlist.length) {
             // If repeating the context, loop back to the start (0). Otherwise, stop (-1 or current index).
             return repeatMode === REPEAT_MODES.CONTEXT ? 0 : -1;
        }
        return nextIndex;
    }, [currentTrackIndex, playlist, isShuffling, repeatMode]);

    // Re-define playNext using getNextIndex
    const playNextStable = useCallback(() => {
        const nextIndex = getNextIndex();
        if (nextIndex !== -1 && nextIndex !== currentTrackIndex) {
            const nextTrack = playlist[nextIndex];
            if (nextTrack) {
                 playTrack(nextTrack); 
            }
        } else if (nextIndex === currentTrackIndex && repeatMode === REPEAT_MODES.TRACK) {
            // Explicitly reload/play for repeat track mode
            loadAndPlayTrack(playlist[currentTrackIndex], currentTrackIndex);
        } else if (nextIndex === -1 && repeatMode === REPEAT_MODES.OFF) {
            // Stop playback when playlist ends and repeat is off
            setIsPlaying(false);
        }
    }, [currentTrackIndex, playlist, playTrack, repeatMode, loadAndPlayTrack, getNextIndex]);


    const playPreviousStable = useCallback(() => {
        if (playlist.length === 0) return;

        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) {
            // If repeating, wrap around to the end
            prevIndex = repeatMode !== REPEAT_MODES.OFF ? playlist.length - 1 : 0; 
        }

        if (prevIndex !== currentTrackIndex) {
            const previousTrack = playlist[prevIndex];
            playTrack(previousTrack);
        }
    }, [currentTrackIndex, playlist, playTrack, repeatMode]);

    // --- Audio Event Handlers (CRITICAL: Must be stable) ---
    // The problem may be here: the effect needs to see the LATEST version of the handler.
    
    // ✅ CRITICAL FIX: We use the dependency array here to ensure that when `needsPlayAfterLoad` changes, 
    // a new version of this function is created, ensuring the effect re-runs to attach the new logic.
    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration); 
            
            if (needsPlayAfterLoad) {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                    setNeedsPlayAfterLoad(false); 
                }).catch(e => {
                    if (e.name !== "AbortError") {
                        console.error("Error playing audio after metadata load:", e);
                    }
                    setIsPlaying(false);
                    setNeedsPlayAfterLoad(false);
                });
            }
        }
    }, [needsPlayAfterLoad]); 

    // ✅ CRITICAL FIX: This updates the progress bar. It must be stable.
    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            // The audio element emits this event frequently (4-66 times per second).
            setCurrentTime(audioRef.current.currentTime);
        }
    }, []); 
    
    // Handles track ending, checks repeat mode, then skips
    const handleAudioEnded = useCallback(() => {
        // If repeat track is on, re-seek to 0 and play again immediately
        if (repeatMode === REPEAT_MODES.TRACK) {
             if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.error("Error repeating track:", e));
                setIsPlaying(true);
             }
        } else {
            // For repeat context or off, go to the next track
            setIsPlaying(false);
            setCurrentTime(0);
            playNextStable(); 
        }
    }, [playNextStable, repeatMode]); 


    // --- Listener Attachment Effect (CRITICAL: Single and stable) ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            // This case should ideally not happen if Audio() is called once on mount
            const newAudio = new Audio();
            audioRef.current = newAudio;
        }

        // We re-attach ALL listeners whenever any of the handler functions change.
        // This is a common pattern to ensure the event listeners have access to the latest state/props.
        const attachListeners = () => {
             audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
             audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
             audioRef.current.addEventListener('ended', handleAudioEnded);
        };
        
        const removeListeners = () => {
             audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
             audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
             audioRef.current.removeEventListener('ended', handleAudioEnded);
        };

        // Remove and re-attach to ensure we're using the latest callbacks
        if (audioRef.current) {
             removeListeners(); // Remove stale listeners
             attachListeners(); // Add fresh listeners
        }

        // Final Cleanup: runs on unmount OR before the effect re-runs
        return () => {
            if (audioRef.current) {
                removeListeners();
                audioRef.current.pause();
            }
        };
        
    }, [handleLoadedMetadata, handleTimeUpdate, handleAudioEnded]); 
    // The effect runs whenever any of the useCallback dependencies change (e.g., needsPlayAfterLoad for metadata)


    // --- Exported Control Functions ---
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else if (currentTrack) {
                audioRef.current.play().catch(e => {
                     if (e.name !== "AbortError") {
                        console.error("Error playing audio on toggle:", e);
                     }
                });
            }
            // Only toggle isPlaying if we have a track OR if we are pausing
            if (currentTrack || isPlaying) {
                 setIsPlaying(prev => !prev);
            }
        }
    };

    const handleSeek = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };
    

    // --- Memoized Context Value ---
    const value = useMemo(() => ({
        // Core state
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        audioRef,
        
        // Controls
        togglePlayPause,
        handleSeek,
        playTrack, 
        playNext: playNextStable, 
        playPrevious: playPreviousStable,

        // Playlist State & Modes
        setPlaylist,
        playlist,
        currentTrackIndex,
        isShuffling,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
        
    }), [
        // State dependencies (trigger consumers like MusicPlayer)
        currentTrack, 
        isPlaying,    
        currentTime,  
        duration,
        playlist,
        currentTrackIndex,
        needsPlayAfterLoad, 
        isShuffling,
        repeatMode,
        
        // Function dependencies
        togglePlayPause,
        handleSeek,
        playTrack,
        setPlaylist,
        playNextStable, 
        playPreviousStable,
        toggleShuffle,
        toggleRepeat,
    ]);

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>; 
};