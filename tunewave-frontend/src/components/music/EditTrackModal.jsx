import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

const EditTrackModal = ({ track, onSave, onClose, darkMode }) => {
    const [title, setTitle] = useState(track.title);
    const [artist, setArtist] = useState(track.artist);
    const [coverPhoto, setCoverPhoto] = useState(track.cover_photo || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            await onSave(track._id, { title, artist, cover_photo: coverPhoto });
            onClose();
        } catch (error) {
            console.error('Failed to update track:', error);
            alert('Failed to update track. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div 
                className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
                    darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Edit Track</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                        }`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className={`w-full px-4 py-2 rounded-lg border ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Artist
                        </label>
                        <input
                            type="text"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            required
                            className={`w-full px-4 py-2 rounded-lg border ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Cover Photo URL (optional)
                        </label>
                        <input
                            type="text"
                            value={coverPhoto}
                            onChange={(e) => setCoverPhoto(e.target.value)}
                            placeholder="https://example.com/cover.jpg"
                            className={`w-full px-4 py-2 rounded-lg border ${
                                darkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                darkMode 
                                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            } disabled:opacity-50`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {isSaving ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTrackModal;
