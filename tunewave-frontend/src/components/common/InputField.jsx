import React from 'react';

/**
 * A reusable input field component for forms.
 * Handles styling for both light and dark modes.
 * * @param {Object} props
 * @param {string} props.label - The label displayed above the input.
 * @param {string} props.id - The unique HTML ID, used to link label to input.
 * @param {string} props.type - The input type ('text', 'email', 'password', etc.).
 * @param {string} props.value - The current value of the input state.
 * @param {function} props.onChange - Handler for when the input value changes.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {boolean} [props.darkMode=false] - If true, applies dark mode styling.
 * @param {boolean} [props.required=true] - Specifies if the input is required.
 * @returns {JSX.Element}
 */
const InputField = ({ 
    label, 
    id, 
    type, 
    value, 
    onChange, 
    placeholder, 
    darkMode = false, 
    required = true 
}) => {
    return (
        <div>
            {/* Label with dynamic text color */}
            <label 
                htmlFor={id} 
                className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
            >
                {label}
            </label>
            
            {/* Input with dynamic background, border, and text color */}
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className={`
                    w-full 
                    px-4 py-3 
                    rounded-xl 
                    border-2 
                    transition-colors duration-300
                    focus:ring-2 
                    focus:ring-indigo-500 
                    focus:border-indigo-500
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                `}
            />
        </div>
    );
};

export default InputField;