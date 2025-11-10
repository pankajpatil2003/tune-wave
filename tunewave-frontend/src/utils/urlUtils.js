// --- API Base URL for Static Assets ---
// 💡 IMPORTANT: This must match your backend's base URL (where static files are served)
const API_BASE_URL = 'http://localhost:5000'; 


/**
 * Safely constructs the full URL for a track's cover photo or media file.
 * This function is optimized for local static file serving, returning the
 * literal path without standard URI encoding, which is required when
 * serving files with special characters via Express/Node static middleware.
 * * @param {string | undefined} relativePath - The path returned by the API (e.g., 'uploads/image.jpg').
 * @returns {string} The complete URL or an empty string if no path is provided.
 */
export const getFullImageUrl = (relativePath) => {
    if (!relativePath) return '';
    
    // 1. If it's already a full URL (YouTube, external, etc.)
    if (relativePath.startsWith('http')) {
        return relativePath;
    }
    
    // 2. Handle the relative path (e.g., 'uploads/123.jpg')
    // Ensure API_BASE_URL does not end with a slash
    const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    
    // Ensure relativePath does not start with a slash
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    
    // 💥 CRITICAL: This constructs the literal URL (e.g., http://localhost:5000/uploads/file_name.mp3).
    // This literal path is necessary for native HTML5 audio/video elements when the file path
    // contains characters that would otherwise be URI encoded (like spaces or parentheses).
    return `${cleanBase}/${cleanPath}`;
};