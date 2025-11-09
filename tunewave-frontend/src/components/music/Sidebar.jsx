import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LogOut, 
    Disc3, 
    Home as HomeIcon, 
    Search, 
    Library, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';

/**
 * Main navigation sidebar component for TuneWave.
 */
const Sidebar = ({ darkMode, logout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Define the main navigation items, using the URL paths
    const navItems = [
        { name: 'Home', icon: HomeIcon, path: '/' },
        { name: 'Search', icon: Search, path: '/search' },
        { name: 'Library', icon: Library, path: '/library' },
    ];

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    // Dynamic Tailwind Classes
    // Ensure the non-collapsed width (w-64) matches the required space.
    const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'; 
    const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = darkMode ? 'text-white' : 'text-gray-900';
    const collapseButtonColor = darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300';
    const linkInactiveColor = darkMode ? 'text-indigo-300 hover:text-white hover:bg-indigo-700/50' : 'text-gray-600 hover:text-indigo-700 hover:bg-indigo-100';


    return (
        <nav 
            className={`
                // 🚀 CRITICAL FIXES: 
                // 1. Remove 'fixed' positioning.
                // 2. Add 'flex-shrink-0' so it maintains its width in the flex parent.
                // 3. Add 'h-full' to span the full height of the parent.
                flex-shrink-0 
                h-full
                
                ${sidebarWidth} // Dynamic width
                ${bgColor}
                ${textColor}
                
                flex flex-col p-4 
                shadow-2xl 
                transition-all duration-300 ease-in-out
            `}
        >
            
            {/* Logo and Collapse Button Area */}
            <div className={`flex items-center mb-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className={`flex items-center space-x-2 ${isCollapsed ? 'hidden' : ''}`}>
                    <Disc3 className="h-7 w-7 text-indigo-500" />
                    <span className="text-2xl font-extrabold">TuneWave</span>
                </div>
                
                {/* Collapse/Expand Button */}
                <button
                    onClick={toggleCollapse}
                    className={`
                        p-2 rounded-full transition-colors duration-200 
                        ${collapseButtonColor}
                        ${darkMode ? 'text-white' : 'text-gray-800'}
                    `}
                    aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </button>
            </div>


            {/* Navigation Links */}
            <ul className="flex flex-col space-y-2 flex-grow">
                {navItems.map((item) => (
                    <li key={item.name}>
                        <NavLink 
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center 
                                ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2'} 
                                rounded-lg transition-colors duration-200
                                font-medium
                                ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : `${linkInactiveColor}` // Use the defined inactive color variable
                                }
                            `}
                        >
                            <item.icon className={`h-6 w-6 ${isCollapsed ? '' : 'mr-4'}`} />
                            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 absolute' : 'opacity-100 w-auto'}`}>
                                {item.name}
                            </span>
                        </NavLink>
                    </li>
                ))}
            </ul>

            {/* Logout Button */}
            <div className={`mt-auto pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                    onClick={logout}
                    className={`
                        flex items-center w-full 
                        ${isCollapsed ? 'justify-center p-3' : 'px-3 py-2'} 
                        rounded-lg transition-colors duration-200 
                        text-red-400 hover:bg-red-900/50 hover:text-white
                    `}
                >
                    <LogOut className={`h-6 w-6 ${isCollapsed ? '' : 'mr-4'}`} />
                    <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 absolute' : 'opacity-100 w-auto'}`}>
                        Log Out
                    </span>
                </button>
            </div>
        </nav>
    );
};

export default Sidebar;