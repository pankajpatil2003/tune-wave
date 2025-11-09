import React, { useState } from 'react'; 
import { 
    Play, 
    Pause, 
    SkipBack, 
    SkipForward, 
    Shuffle, 
    Repeat, 
    Volume2, 
    VolumeX 
} from 'lucide-react';
// ✅ Import the custom hook
import { useMusic } from '../../context/MusicContext'; 

/**
 * Persistent music player bar fixed at the bottom of the application.
 * @param {Object} props
 * @param {boolean} props.darkMode - The current theme state.
 * @returns {JSX.Element}
 */
const MusicPlayer = ({ darkMode }) => {
    // ✅ Updated hook usage to include the new playlist controls and modes
    const { 
        currentTrack, 
        isPlaying, 
        currentTime, 
        duration, 
        togglePlayPause, 
        handleSeek,
        audioRef, 
        
        // Skip functions
        playNext, 
        playPrevious,

        // 🚀 NEW: Shuffle and Repeat State & Controls
        isShuffling,
        toggleShuffle,
        repeatMode, // 'off', 'context', 'track'
        toggleRepeat,
        
    } = useMusic();

    // --- Playback State Hooks (Only volume remains local) ---
    const [volume, setVolume] = useState(0.8); // 0.0 to 1.0
    const [isMuted, setIsMuted] = useState(false);

    // --- Time Formatting Utility ---
    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Volume Control Logic ---
    const handleVolumeChange = (e) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
            if (newVolume > 0) setIsMuted(false);
        }
    };

    const handleMuteToggle = () => {
        if (audioRef.current) {
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            audioRef.current.muted = newMutedState;
        }
    };
    
    // --- Style Helpers ---
    const isDark = darkMode;
    const textColor = isDark ? 'text-gray-300' : 'text-gray-800';
    // Use a slightly different hover effect for better visibility on dark mode
    const controlButtonClass = `p-2 rounded-full transition-colors ${textColor} hover:bg-indigo-600/20`; 
    
    // 🚀 NEW: Function to get button class based on state
    const getActiveControlClass = (isActive) => 
        isActive 
            ? 'text-indigo-400' 
            : `${textColor}`;


    // Handler to seek using the slider
    const handleSliderSeek = (e) => {
        const time = Number(e.target.value);
        handleSeek(time);
    };

    // The progress percentage calculation is harmless, we can keep it
    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Guard Clause: Render a minimal bar if no track is loaded
    if (!currentTrack) {
        return (
            <div 
                className={`
                    flex items-center justify-center 
                    h-16 p-4 
                    shadow-2xl z-20 
                    ${isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'}
                `}
            >
                <span className={textColor}>Select a track to start playing.</span>
            </div>
        );
    }
    
    const { title, artist, cover_photo_url } = currentTrack;
    
    // 🚀 NEW: Determine Repeat Icon
    const repeatIconColorClass = getActiveControlClass(repeatMode !== 'off');
    const repeatIcon = repeatMode === 'track' 
        ? <Repeat className="h-5 w-5" data-repeat-one /> // Use lucide's Repeat with a repeat-one indicator (for now, use a class or attribute)
        : <Repeat className="h-5 w-5" />;


    return (
        <div 
            className={`
                flex items-center justify-between 
                h-24 p-4 
                shadow-2xl z-20 
                ${isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'}
            `}
        >
            {/* 1. Track Info (Left Side) */}
            <div className="flex items-center w-1/4 min-w-48">
                <img 
                    src={cover_photo_url || '/assets/images/placeholder_album.jpg'} 
                    alt="Album Art"
                    className="w-14 h-14 rounded-md mr-3 object-cover"
                />
                <div>
                    <div className={`text-base font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {title}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {artist}
                    </div>
                </div>
            </div>

            {/* 2. Playback Controls (Center) */}
            <div className="flex flex-col items-center w-1/2">
                
                {/* Control Buttons */}
                <div className="flex items-center space-x-6 mb-2">
                    {/* 🚀 NEW: Shuffle Button Logic */}
                    <button 
                        onClick={toggleShuffle}
                        className={`${controlButtonClass} ${getActiveControlClass(isShuffling)}`} 
                        aria-label="Shuffle"
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
                    
                    {/* 🚀 NEW: Repeat Button Logic */}
                    <button 
                        onClick={toggleRepeat}
                        className={`${controlButtonClass} ${repeatIconColorClass}`} 
                        aria-label={`Repeat mode: ${repeatMode}`}
                    >
                        {/* Render the Repeat Icon based on the mode */}
                        {repeatIcon}
                        {/* Optional small indicator for Repeat One */}
                        {repeatMode === 'track' && (
                            <span className="absolute text-xs bottom-1 left-1/2 transform -translate-x-1/2">1</span>
                        )}
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center w-full max-w-xl space-x-2 text-sm">
                    <span className={`${textColor} w-10 text-right`}>{formatTime(currentTime)}</span>
                    <input 
                        type="range"
                        min="0"
                        // ✅ Use duration directly here
                        max={duration || 0}
                        // ✅ Use currentTime directly here
                        value={currentTime || 0}
                        onChange={handleSliderSeek}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" 
                    />
                    <span className={`${textColor} w-10 text-left`}>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 3. Volume Control (Right Side) */}
            <div className="flex items-center w-1/4 justify-end space-x-2 pr-4">
                <button onClick={handleMuteToggle} className={controlButtonClass} aria-label={isMuted ? "Unmute" : "Mute"}>
                    {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm"
                    style={{
                        '--track-color': isDark ? '#4F46E5' : '#4338CA',
                        '--thumb-color': 'white', 
                    }}
                />
            </div>
        </div>
    );
};

export default MusicPlayer;