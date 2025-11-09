import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * A primary, reusable button component following the TuneWave blue theme.
 * * @param {Object} props
 * @param {React.ReactNode} props.children - The content inside the button (text, icon, etc.).
 * @param {Function} [props.onClick] - Click handler function.
 * @param {boolean} [props.disabled=false] - Disables the button and shows a loading spinner.
 * @param {boolean} [props.fullWidth=false] - Makes the button span the full width of its container.
 * @param {string} [props.type='button'] - Button type ('submit', 'button', 'reset').
 * @param {string} [props.className=''] - Additional CSS classes to apply.
 * @returns {JSX.Element}
 */
const PrimaryButton = ({ 
    children, 
    onClick, 
    disabled = false, 
    fullWidth = false, 
    type = 'button', 
    className = '' 
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
                ${fullWidth ? 'w-full' : 'px-6'}
                py-3 
                bg-indigo-600 
                text-white 
                font-semibold 
                rounded-xl 
                shadow-lg 
                hover:bg-indigo-700 
                transition-all 
                duration-200 
                focus:outline-none 
                focus:ring-4 
                focus:ring-indigo-500/50
                disabled:opacity-50
                disabled:cursor-not-allowed
                flex items-center justify-center space-x-2
                ${className}
            `}
        >
            {/* Show a loading spinner if the button is disabled */}
            {disabled && <Loader2 className="animate-spin h-5 w-5 mr-3" />}
            
            {/* If loading, display 'Processing...' as a fallback text if children is not available */}
            {disabled && !children && <span>Processing...</span>}

            {/* Render children only if not disabled or if children is explicitly passed */}
            {(!disabled || children) && children}
        </button>
    );
};

export default PrimaryButton;