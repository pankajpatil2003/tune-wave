import React from 'react'; 
import { 
    Play, 
    Pause, 
    SkipBack, 
    SkipForward, 
    Shuffle, 
    Repeat, 
    Volume2, 
    VolumeX,
    Youtube
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext'; 

/**
 * Persistent music player bar fixed at the bottom of the application.
 * @param {Object} props
 * @param {boolean} props.darkMode - The current theme state.
 * @returns {JSX.Element}
 */
const MusicPlayer = ({ darkMode }) => {
    // Destructure ALL state and control functions from the centralized context
    const { 
        currentTrack, 
        isPlaying, 
        
        // --- Core Playback State (Used for progress bar) ---
        currentTime, 
        duration, 
        
        togglePlayPause, 
        handleSeek,
        playNext, 
        playPrevious,

        // --- Volume and Mute States/Controls ---
        volume,
        isMuted,
        setVolume,      
        toggleMute,

        // --- Shuffle and Repeat Controls ---
        isShuffling,
        toggleShuffle,
        repeatMode, 
        toggleRepeat,
        
        // Source Type for conditional rendering
        sourceType, 
        
        // --- NEW: Video Viewer Control ---
        isVideoViewerOpen, // Use this for conditional styling (optional, but good practice)
        toggleVideoViewer, 
        
    } = useMusic();

    // --- Time Formatting Utility ---
    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Handler to update the volume state in context
    const handleVolumeChange = (e) => {
        setVolume(Number(e.target.value)); 
    };
    
    // Handler to toggle mute (added for completeness)
    const handleMuteToggle = () => {
        toggleMute();
    };


    // Handler to seek using the progress slider
    const handleSliderSeek = (e) => {
        // CRITICAL: Convert the string value from the range input to a number
        const time = Number(e.target.value);
        handleSeek(time); 
    };
    
    // --- Style Helpers ---
    const isDark = darkMode;
    const textColor = isDark ? 'text-gray-300' : 'text-gray-800';
    const controlButtonClass = `p-2 rounded-full transition-colors ${textColor} hover:bg-indigo-600/20`; 
    
    // Function to get button class based on state
    const getActiveControlClass = (isActive) => 
        isActive 
            ? 'text-indigo-400' 
            : `${textColor}`;

    
    // Guard Clause: Render a minimal bar if no track is loaded
    if (!currentTrack) {
        return (
            <div 
                className={`
                    flex items-center justify-center 
                    h-24 p-4 
                    shadow-2xl z-20 
                    fixed bottom-0 left-0 right-0
                    ${isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'}
                `}
            >
                <span className={textColor}>Select a track to start playing.</span>
            </div>
        );
    }
    
    const { title, artist, cover_photo_url } = currentTrack;
    
    const repeatIconColorClass = getActiveControlClass(repeatMode !== 'off');
    
    // Check if the current track is a YouTube video
    const isYoutube = sourceType === 'youtube';

    // Custom wrapper for the repeat button to show the '1' indicator
    const RepeatButton = () => (
        <button 
            onClick={toggleRepeat}
            className={`${controlButtonClass} ${repeatIconColorClass} relative`} 
            aria-label={`Repeat mode: ${repeatMode}`}
        >
            <Repeat className="h-5 w-5" />
            {/* Display a small '1' when in repeat-track mode */}
            {repeatMode === 'track' && (
                <span className="absolute text-xs font-bold bottom-1 right-0 left-0" style={{ fontSize: '0.65rem' }}>1</span>
            )}
        </button>
    );

    // Dynamic style for the Track Info section when it's clickable
    const trackInfoClass = `flex items-center w-1/4 min-w-48 ${
        isYoutube ? 'cursor-pointer hover:bg-gray-700/50 p-2 rounded-lg -m-2 transition-colors' : ''
    }`;

    // Handler for clicking the track info area to toggle the video viewer
    const handleTrackInfoClick = () => {
        if (isYoutube) {
            toggleVideoViewer();
        }
    };
    

    return (
        <div 
            className={`
                flex items-center justify-between 
                h-24 p-4 
                shadow-2xl z-20 
                fixed bottom-0 left-0 right-0
                ${isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'}
            `}
        >
            {/* 1. Track Info (Left Side) - Clickable to toggle VideoViewer */}
            <div 
                className={trackInfoClass} 
                onClick={handleTrackInfoClick}
            >
                
                {/* CONDITIONAL RENDERING for Cover Art / Video Placeholder */}
                {isYoutube ? (
                    // YouTube Video Placeholder
                    <div className="w-14 h-14 rounded-md mr-3 flex items-center justify-center bg-red-600 text-white shadow-md relative">
                        <Youtube className="h-8 w-8 fill-current" />
                        {/* Optional: Indicator for video viewer state */}
                        <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ${isVideoViewerOpen ? 'bg-green-400' : 'bg-yellow-400'} border-2 ${isDark ? 'border-gray-900' : 'border-white'}`} title={isVideoViewerOpen ? "Video viewer open" : "Playing in background"}></div>
                    </div>
                ) : (
                    // Standard Cover Art
                    <img 
                        src={cover_photo_url || '/assets/images/placeholder_album.jpg'} 
                        alt="Album Art"
                        className="w-14 h-14 rounded-md mr-3 object-cover shadow-md"
                    />
                )}
                
                <div className='truncate'>
                    <div className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={title}>
                        {title}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`} title={artist}>
                        {artist}
                    </div>
                </div>
            </div>

            {/* 2. Playback Controls (Center) */}
            <div className="flex flex-col items-center w-1/2">
                
                {/* Control Buttons */}
                <div className="flex items-center space-x-6 mb-2">
                    {/* Shuffle Button */}
                    <button 
                        onClick={toggleShuffle}
                        className={`${controlButtonClass} ${getActiveControlClass(isShuffling)}`} 
                        aria-label="Toggle Shuffle"
                    >
                        <Shuffle className="h-5 w-5" />
                    </button>
                    
                    <button 
                        onClick={playPrevious} 
                        className={controlButtonClass} 
                        aria-label="Previous Track"
                    >
                        <SkipBack className="h-6 w-6" />
                    </button>
                    
                    <button 
                        onClick={togglePlayPause}
                        className={`p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg`}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                    </button>
                    
                    <button 
                        onClick={playNext} 
                        className={controlButtonClass} 
                        aria-label="Next Track"
                    >
                        <SkipForward className="h-6 w-6" />
                    </button>
                    
                    <RepeatButton />
                </div>

                {/* Progress Bar (CRITICAL) */}
                <div className="flex items-center w-full max-w-xl space-x-2 text-sm">
                    <span className={`${textColor} w-10 text-right`}>{formatTime(currentTime)}</span>
                    <input 
                        type="range"
                        min="0"
                        // Ensure max is numerical
                        max={duration ? Number(duration) : 0}
                        // Ensure value is numerical and correctly bound to context state
                        value={currentTime ? Number(currentTime) : 0} 
                        onChange={handleSliderSeek}
                        className="w-full h-1 bg-indigo-600 rounded-lg appearance-none cursor-pointer range-lg" 
                        style={{
                            // Custom style to show progress within the range slider
                            backgroundSize: `${(currentTime / duration) * 100}% 100%`,
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: isDark ? '#4b5563' : '#d1d5db', // bg-gray-600 or bg-gray-300
                            backgroundImage: 'linear-gradient(to right, #4f46e5, #4f46e5)', // bg-indigo-600
                        }}
                    />
                    <span className={`${textColor} w-10 text-left`}>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 3. Volume Control (Right Side) */}
            <div className="flex items-center w-1/4 justify-end space-x-2 pr-4">
                <button 
                    onClick={handleMuteToggle} 
                    className={controlButtonClass} 
                    aria-label={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    // Use the volume state from context
                    value={isMuted ? 0 : volume}
                    // Use the new context handler
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-indigo-600 rounded-lg appearance-none cursor-pointer range-sm"
                    style={{
                        // Custom style to show volume progress
                        backgroundSize: `${isMuted ? 0 : volume * 100}% 100%`,
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: isDark ? '#4b5563' : '#d1d5db', // bg-gray-600 or bg-gray-300
                        backgroundImage: 'linear-gradient(to right, #4f46e5, #4f46e5)', // bg-indigo-600
                    }}
                />
            </div>
        </div>
    );
};

export default MusicPlayer;