import React, { useState, useRef } from 'react';
import { uploadTrack } from '../../api/musicService';
import { X, Music, Link, Youtube, Loader2, Image } from 'lucide-react'; 

const UploadTrackModal = ({ isOpen, onClose, onUploadSuccess }) => {
    // Hooks are called unconditionally at the top level
    const fileInputRef = useRef(null); 
    const coverImageRef = useRef(null);
    const [sourceType, setSourceType] = useState('local'); 
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [coverImageFile, setCoverImageFile] = useState(null); // State for cover image
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Conditional render check is AFTER all hooks
    if (!isOpen) return null;

    const extractYoutubeVideoId = (url) => {
        const regex = /(?:youtu\.be\/|v\/|watch\?v=|embed\/)([a-zA-Z0-9_-]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const resetState = () => {
        setSourceType('local'); 
        setTitle('');
        setArtist('');
        setSourceUrl('');
        setAudioFile(null);
        setCoverImageFile(null);
        setError(null);
        setLoading(false);
        // Clear file inputs using refs
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (coverImageRef.current) { 
            coverImageRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Client-side Validation
        if (!title || !artist) {
            setError("Please fill in the Title and Artist.");
            setLoading(false);
            return;
        }

        if (sourceType === 'local' && !audioFile) {
            setError("Please select a local audio file.");
            setLoading(false);
            return;
        }

        if ((sourceType === 'youtube' || sourceType === 'external_url') && !sourceUrl) {
            setError("Please provide a valid URL.");
            setLoading(false);
            return;
        }
        
        if (sourceType === 'youtube' && !extractYoutubeVideoId(sourceUrl)) {
            setError("Could not extract a valid YouTube video ID from the provided URL.");
            setLoading(false);
            return;
        }


        // Package data based on sourceType
        let dataToUpload;

        if (sourceType === 'local') {
            // Use FormData for file upload
            dataToUpload = new FormData();
            dataToUpload.append('title', title);
            dataToUpload.append('artist', artist);
            dataToUpload.append('sourceType', sourceType);
            dataToUpload.append('audioFile', audioFile); 
            
            // 🚀 CRITICAL FIX: Changed from 'coverImageFile' to 'cover_photo'
            // to match the field name expected by the backend.
            if (coverImageFile) {
                dataToUpload.append('cover_photo', coverImageFile); 
            }
        } else {
            // Use JSON object for URL-based tracks
            dataToUpload = {
                title,
                artist,
                sourceType,
                sourceUrl,
            };
            if (sourceType === 'youtube') {
                dataToUpload.videoId = extractYoutubeVideoId(sourceUrl);
            }
        }
        
        try {
            const newTrack = await uploadTrack(dataToUpload);
            onUploadSuccess(newTrack);
            handleClose(); 

        } catch (err) {
            console.error("Upload failed:", err);
            // Improved error parsing
            const errMsg = err.response?.data?.error || err.message || "An unknown error occurred during upload.";
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 transition dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed";
    const fileInputClasses = "mt-1 block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload New Track</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {error && (
                    <div className="p-3 mb-4 text-sm font-medium text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Source Type Toggle */}
                    <div className="flex space-x-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-700 shadow-inner">
                        <button 
                            type="button"
                            onClick={() => setSourceType('local')}
                            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition text-sm font-semibold ${sourceType === 'local' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            <Music className="h-5 w-5 mr-1" /> Local File
                        </button>
                        <button
                            type="button"
                            onClick={() => setSourceType('youtube')}
                            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition text-sm font-semibold ${sourceType === 'youtube' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            <Youtube className="h-5 w-5 mr-1" /> YouTube
                        </button>
                        <button
                            type="button"
                            onClick={() => setSourceType('external_url')}
                            className={`flex-1 flex items-center justify-center py-2 rounded-lg transition text-sm font-semibold ${sourceType === 'external_url' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            <Link className="h-5 w-5 mr-1" /> Other URL
                        </button>
                    </div>

                    {/* Common Fields: Title & Artist */}
                    <div>
                        <label htmlFor="title" className={labelClasses}>Title</label>
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                            className={inputClasses} placeholder="Song Title" required disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="artist" className={labelClasses}>Artist</label>
                        <input type="text" id="artist" value={artist} onChange={(e) => setArtist(e.target.value)}
                            className={inputClasses} placeholder="Artist Name" required disabled={loading}
                        />
                    </div>

                    {/* Source-Specific Fields */}
                    {sourceType === 'local' ? (
                        <>
                            {/* Audio File Input (Required) */}
                            <div>
                                <label htmlFor="audioFile" className={labelClasses}>Audio File (.mp3, .wav, etc.)</label>
                                <input 
                                    type="file" 
                                    id="audioFile" 
                                    accept="audio/*"
                                    onChange={(e) => setAudioFile(e.target.files[0])}
                                    className={fileInputClasses}
                                    required={sourceType === 'local'}
                                    ref={fileInputRef} 
                                    disabled={loading}
                                />
                                {audioFile && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Selected Audio: {audioFile.name}</p>}
                            </div>

                            {/* Cover Image Input (Optional) */}
                            <div>
                                <label htmlFor="coverImage" className={labelClasses}>
                                    <span className='flex items-center'><Image className='h-4 w-4 mr-1' /> Cover Image (Optional)</span>
                                </label>
                                <input 
                                    type="file" 
                                    id="coverImage" 
                                    accept="image/*"
                                    onChange={(e) => setCoverImageFile(e.target.files[0])}
                                    className={fileInputClasses}
                                    ref={coverImageRef} 
                                    disabled={loading}
                                />
                                {coverImageFile && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Selected Image: {coverImageFile.name}</p>}
                            </div>
                        </>
                    ) : (
                        <div>
                            {/* URL Input */}
                            <label htmlFor="sourceUrl" className={labelClasses}>
                                {sourceType === 'youtube' ? 'YouTube URL' : 'External Source URL'}
                            </label>
                            <input 
                                type="url" 
                                id="sourceUrl" 
                                value={sourceUrl} 
                                onChange={(e) => setSourceUrl(e.target.value)}
                                className={inputClasses}
                                placeholder={sourceType === 'youtube' ? 'e.g., https://www.youtube.com/watch?v=...' : 'e.g., https://soundcloud.com/...'} 
                                required
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={loading}
                        className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white transition ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}`}
                    >
                        {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Music className="h-5 w-5 mr-2" />}
                        {loading ? 'Uploading...' : 'Upload Track'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadTrackModal;