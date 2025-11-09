import React from 'react';
import { Moon, Sun, Disc3 } from 'lucide-react';

/**
 * Global application header component for displaying the logo and theme toggle.
 * * @param {Object} props
 * @param {boolean} props.darkMode - The current theme state.
 * @param {function} props.setDarkMode - Setter function to toggle the theme.
 * @returns {JSX.Element}
 */
const Header = ({ darkMode, setDarkMode }) => {
    return (
        <header 
            className={`
                // 🚀 CRITICAL FIX: Removed 'fixed', 'top-0', 'right-0', 'w-[calc(...)]', and high 'z-50'.
                // It now flows naturally inside the Home.jsx flex-grow container.
                
                z-10 // Keep a low z-index for minor stacking safety.
                py-4 px-6 
                shadow-md 
                transition-colors duration-500 
                ${darkMode ? 'bg-gray-900 shadow-indigo-500/10' : 'bg-white shadow-gray-200'} 
                flex-shrink-0
            `}
        >
            <div className="flex justify-between items-center w-full"> 
                {/* Logo and App Name */}
                <div className="flex items-center space-x-2">
                    <Disc3 className="h-6 w-6 text-indigo-500" />
                    <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>TuneWave</span>
                </div>
                
                {/* Theme Toggle Button */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`
                        p-2 rounded-full 
                        transition-colors duration-300 
                        ${darkMode 
                            ? 'bg-indigo-700 text-white hover:bg-indigo-600' 
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }
                    `}
                    aria-label="Toggle Dark Mode"
                >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
            </div>
        </header>
    );
};

export default Header;