// --- API Base URL for Static Assets ---
// 💡 IMPORTANT: This must match your backend's base URL (where static files are served)
const API_BASE_URL = 'http://localhost:5000'; 

/**
 * Safely constructs the full URL for a track's cover photo.
 * This handles relative paths (like 'uploads/image.jpg') by prepending the base URL,
 * ensuring no double-slashes and correctly forming the link.
 * * @param {string | undefined} relativePath - The path returned by the API (e.g., 'uploads/image.jpg').
 * @returns {string} The complete URL or an empty string if no path is provided.
 */
export const getFullImageUrl = (relativePath) => {
    if (!relativePath) return '';
    
    // 1. If it's already a full URL (from a third-party service like YouTube/Soundcloud)
    if (relativePath.startsWith('http')) {
        return relativePath;
    }
    
    // 2. Handle the relative path (e.g., 'uploads/123.jpg')
    const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    
    return `${cleanBase}/${cleanPath}`;
};