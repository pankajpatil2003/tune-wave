import React, { useMemo } from 'react';
import { useMusic } from '../context/MusicContext'; 
import { X, Minimize2, Maximize2 } from 'lucide-react'; 
import YouTubeIframePlayer from '../components/YouTubeIframePlayer'; 

// --- VideoViewer Component (Wrapper) ---
const VideoViewer = () => {
    // 1. CALL ALL HOOKS UNCONDITIONALLY AT THE TOP
    const { 
        currentTrack, 
        sourceType, 
        isPlaying, 
        volume, 
        isMuted,
        currentTime,
        isVideoViewerOpen, 
        videoViewerSize, 
        toggleVideoViewer,
        resizeVideoViewer, 
        setYoutubeCurrentTime, 
        setYoutubeDuration, 
        setYoutubePlayerObject,
        playNextStable // Note: Changed playNext to playNextStable to match context definition
    } = useMusic();
    
    // 2. Determine container size based on context state (16:9 aspect ratio)
    const { width, height } = useMemo(() => {
        if (videoViewerSize === 'medium') {
            // 640 x 360 (16:9)
            return { width: '640px', height: '360px' };
        }
        // Default to 'small' (320 x 180)
        return { width: '320px', height: '180px' };
    }, [videoViewerSize]);
    
    // Determine the video URL to load. It must be null if the source is not YouTube.
    const videoUrlToLoad = sourceType === 'youtube' ? currentTrack?.audioSrc : null;
    const isYoutubeActive = !!videoUrlToLoad;

    // -------------------------------------------------------------------
    // 3. CONDITIONAL RENDER (Guard Clause)
    // -------------------------------------------------------------------
    // CRITICAL: Only return null if the viewer is entirely closed.
    if (!isVideoViewerOpen) {
        // Safe to return null after all Hooks have been called
        return null;
    }
    
    // --- Styling Variables (Tailwind/CSS classes) ---
    const containerClasses = `
        fixed bottom-28 right-4 
        shadow-2xl rounded-lg overflow-hidden z-50 bg-black
        transition-all duration-300 ease-in-out
    `;

    return (
        <div 
            className={containerClasses} 
            style={{ width, height }} // Apply dynamic size
        >
            {/* --- Controls Panel (Top Bar) --- */}
            {/* Overlay bar for controls and title */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between p-1 z-50 bg-black/80">
                
                {/* Close Button (Minimizes to audio background playback) */}
                <button
                    onClick={toggleVideoViewer} 
                    className="p-1 text-white rounded-full hover:bg-white/20 transition"
                    aria-label="Close video viewer and switch to audio background playback"
                >
                    <X className="w-4 h-4" />
                </button>
                
                {/* Size Controls */}
                <div className='flex space-x-1'>
                    {videoViewerSize === 'medium' ? (
                        <button
                            onClick={() => resizeVideoViewer('small')}
                            className="p-1 text-white rounded-full hover:bg-white/20 transition"
                            aria-label="Minimize video viewer"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => resizeVideoViewer('medium')}
                            className="p-1 text-white rounded-full hover:bg-white/20 transition"
                            aria-label="Maximize video viewer"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* The YouTube Player (Fills 100% of the container's calculated size) */}
            <div className="w-full h-full pt-8"> {/* pt-8 creates padding for the control bar */}
                <YouTubeIframePlayer
                    // 🟢 CRITICAL: NO KEY PROP. This ensures the component instance persists
                    // and relies on the useEffect hooks in YouTubeIframePlayer.jsx for updates.
                    
                    // Pass the videoUrlToLoad (which will be null if MP3 is playing)
                    videoUrl={videoUrlToLoad}
                    type="video" // Renders a visible video iframe
                    
                    // State Sync
                    isPlaying={isPlaying}
                    volume={volume}
                    isMuted={isMuted}
                    // Only use currentTime if it's the *first* video load
                    initialTime={currentTime} 
                    
                    // Handlers
                    setDuration={setYoutubeDuration}
                    setCurrentTime={setYoutubeCurrentTime}
                    setPlayerObject={setYoutubePlayerObject}
                    onEnded={playNextStable} // Use the stable reference
                />

                {/* Optional: Placeholder when a non-YouTube track is playing but viewer is open */}
                {!isYoutubeActive && (
                    <div className="absolute inset-8 flex items-center justify-center text-white/50 text-xs">
                        {currentTrack?.title ? `"${currentTrack.title}" is playing audio only.` : "No video source available."}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoViewer;