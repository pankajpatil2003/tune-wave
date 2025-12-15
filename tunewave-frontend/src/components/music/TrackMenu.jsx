import React, { useState } from 'react';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';

/**
 * Dropdown menu for track actions (Edit, Delete)
 */
const TrackMenu = ({ track, onEdit, onDelete, darkMode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {/* Menu Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent track from playing
                    setIsOpen(!isOpen);
                }}
                className={`p-2 rounded-full transition-colors ${
                    darkMode 
                        ? 'hover:bg-gray-700 text-gray-400' 
                        : 'hover:bg-gray-200 text-gray-600'
                }`}
                aria-label="Track options"
            >
                <MoreVertical className="h-5 w-5" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop to close menu */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Menu Items */}
                    <div 
                        className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${
                            darkMode 
                                ? 'bg-gray-800 border border-gray-700' 
                                : 'bg-white border border-gray-200'
                        }`}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                onEdit(track);
                            }}
                            className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                                darkMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-700'
                            }`}
                        >
                            <Edit2 className="h-4 w-4 mr-3" />
                            Edit Track
                        </button>
                        
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                onDelete(track);
                            }}
                            className={`w-full flex items-center px-4 py-3 text-left transition-colors text-red-500 ${
                                darkMode 
                                    ? 'hover:bg-gray-700' 
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete Track
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TrackMenu;
