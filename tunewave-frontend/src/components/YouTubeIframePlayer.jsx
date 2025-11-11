import React, { useRef, useEffect, useMemo, useState } from 'react';

// --- API Loader Setup (Keep this section the same) ---
let scriptLoaded = false;
let YTDeferred = null;

const loadYouTubeScript = () => {
    if (scriptLoaded) { return YTDeferred; }
    
    YTDeferred = new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => {
            scriptLoaded = true;
            resolve(window.YT);
        };

        if (window.YT && window.YT.Player) {
            scriptLoaded = true;
            resolve(window.YT);
            return;
        }

        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        const parent = firstScriptTag ? firstScriptTag.parentNode : document.head; 
        if (parent) {
            parent.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }
    });

    return YTDeferred;
};

// --- YouTube Player Component ---
const YouTubeIframePlayer = ({
    videoUrl, type = 'video', isPlaying, volume, isMuted, initialTime,
    setDuration, setCurrentTime, setPlayerObject, onEnded,
}) => {
    const playerRef = useRef(null); 
    const intervalRef = useRef(null); 
    
    // 🛑 STABLE ID: Generate a unique ID for the container div once
    const playerElementId = useMemo(() => `Youtubeer-${Math.random().toString(36).substr(2, 9)}`, []);
    
    // NEW STATE: Tracks when the YT player instance has fired its 'onReady' event
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Helper to extract videoId
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        let id = null;
        let match = url.match(/[?&]v=([^&]+)/);
        if (match) { id = match[1]; }
        if (!id) { match = url.match(/youtu\.be\/([^?&]+)/); }
        if (match) { id = match[1]; }
        if (!id) { match = url.match(/embed\/([^?&]+)/); }
        if (match) { id = match[1]; }
        return id ? id.split(/[#?]/)[0] : null;
    };

    // Video ID calculation based on prop
    const memoizedVideoId = getYoutubeVideoId(videoUrl); 

    // --- API Event Handlers ---
    const onPlayerReady = (event) => {
        const player = event.target;
        // console.log("READY: Player is initialized and ready.");
        
        setIsPlayerReady(true);
        
        const duration = player.getDuration();
        if (duration > 0) {
            setDuration(duration);
        }
        
        if (initialTime > 0) { player.seekTo(initialTime, true); }
        player.setVolume(isMuted ? 0 : Math.round(volume * 100));

        setPlayerObject(player); 
        
        if (isPlaying) {
            player.playVideo();
        }
    };

    const onPlayerStateChange = (event) => {
        const player = event.target;
        const YT = window.YT;
        const state = event.data;

        // 🟢 FIX 1: Set duration when the player is ready/loading the video's data
        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
            const newDuration = player.getDuration();
            if (newDuration > 0) {
                setDuration(newDuration);
            }
        }
        
        if (state === YT.PlayerState.PLAYING) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setCurrentTime(player.getCurrentTime());
            }, 250); 
        } else {
            clearInterval(intervalRef.current);
            if (state === YT.PlayerState.ENDED) {
                const finalDuration = player.getDuration();
                if (finalDuration > 0) {
                    setCurrentTime(finalDuration);
                }
                onEnded();
            }
        }
    };
    
    // ----------------------------------------------------------------------
    // 1. 🟢 CRITICAL EFFECT: Player Initialization and Cleanup (MOUNT/UNMOUNT ONLY)
    // ----------------------------------------------------------------------
    useEffect(() => {
        if (!document.getElementById(playerElementId)) {
            return;
        }
        
        const initialVideoId = memoizedVideoId || '';
        let newPlayerInstance;
        
        loadYouTubeScript().then((YT) => {
            newPlayerInstance = new YT.Player(playerElementId, {
                height: '100%',
                width: '100%',
                videoId: initialVideoId, 
                playerVars: {
                    'playsinline': 1,
                    'enablejsapi': 1,
                    'controls': type === 'audio' ? 0 : 1, 
                    'disablekb': type === 'audio' ? 1 : 0, 
                    'modestbranding': 1,
                    'origin': window.location.origin
                },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
            playerRef.current = newPlayerInstance; 
        }).catch(e => {
            console.error("LIFECYCLE: Failed to initialize YouTube Player:", e);
        });

        // 🟢 CRITICAL CLEANUP (Runs ONLY when the component UNMOUNTS entirely)
        return () => {
            clearInterval(intervalRef.current); 
            setPlayerObject(null); 
            setIsPlayerReady(false); 
            
            const playerToDestroy = playerRef.current;
            playerRef.current = null;
            
            if (playerToDestroy && typeof playerToDestroy.destroy === 'function') {
                setTimeout(() => {
                    try {
                        playerToDestroy.destroy(); 
                    } catch (e) {
                        console.warn("CLEANUP: Error during player destroy. Node may be gone.", e);
                    }
                }, 100); 
            }
        };
    }, [playerElementId]); 

    // ----------------------------------------------------------------------
    // 2. 🟢 CRITICAL EFFECT: Video Change (Loads new video into EXISTING player)
    // ----------------------------------------------------------------------
    useEffect(() => {
        const player = playerRef.current;
        
        // 🛑 CRITICAL CHECK: Ensure player is ready and loadVideoById function exists.
        if (!player || !isPlayerReady || typeof player.loadVideoById !== 'function') {
            if (memoizedVideoId) {
                console.warn("UPDATE: Player not ready to load video yet.");
            }
            // Proceed to cleanup case below if no video ID, even if player isn't fully ready
        }
        
        if (memoizedVideoId) {
             // Case A: New YouTube video ID is available
             if (player && isPlayerReady) {
                 try {
                     if (player.getVideoData().video_id === memoizedVideoId) {
                         const currentDuration = player.getDuration();
                         if (currentDuration > 0) {
                             setDuration(currentDuration);
                         }
                         return; 
                     }
                 } catch (e) {
                     // Ignore errors if player data isn't immediately available
                 }
            
                 // Load new video
                 player.loadVideoById(memoizedVideoId, 0); 
                 
                 // Reset time immediately to prevent old duration/progress showing
                 setDuration(0); 
                 setCurrentTime(0);
             }
        } else {
            // Case B: Switching to an MP3 or no source (memoizedVideoId is null)
            if (player && isPlayerReady) {
                try {
                    // Stop the player and reset state in the UI
                    player.stopVideo();
                    setDuration(0);
                    setCurrentTime(0);
                } catch (e) {
                    // console.warn("Could not stop YouTube player:", e);
                }
            }
        }
    }, [memoizedVideoId, isPlayerReady, setDuration, setCurrentTime]); 
    
    // ----------------------------------------------------------------------
    // 3. 🟢 CRITICAL EFFECT: Control Sync (Play/Pause, Volume/Mute)
    // ----------------------------------------------------------------------
    useEffect(() => {
        const player = playerRef.current;
        
        // 🛑 CRITICAL CHECK: Ensure player is ready and functions exist
        if (player && isPlayerReady && typeof player.getPlayerState === 'function') {
            const state = player.getPlayerState();
            const YT = window.YT;

            if (isPlaying && state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
                player.playVideo();
            } else if (!isPlaying && state !== YT.PlayerState.PAUSED && state !== YT.PlayerState.ENDED) {
                player.pauseVideo();
            }
        }
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(isMuted ? 0 : Math.round(volume * 100));
        }
    }, [isPlaying, volume, isMuted, isPlayerReady]);

    // ----------------------------------------------------------------------
    // 4. 🖼️ RENDER
    // ----------------------------------------------------------------------
    const style = type === 'audio' ? { 
        // Hide completely for audio-only mode
        position: 'absolute', left: '-9999px', top: '-9999px', 
        width: '1px', height: '1px', overflow: 'hidden'
    } : {
        // Visually hide the player if no video ID is present (MP3 playing)
        opacity: memoizedVideoId ? 1 : 0, 
        // 🛑 CRITICAL VISUAL FIX: Use visibility: hidden instead of opacity: 0 for video elements
        // This is often more reliable for IFRAMEs
        visibility: memoizedVideoId ? 'visible' : 'hidden', 
        width: '100%', 
        height: '100%',
    };

    // Render the container div with the stable, unique ID
    return <div id={playerElementId} style={style} />;
};

export default YouTubeIframePlayer;