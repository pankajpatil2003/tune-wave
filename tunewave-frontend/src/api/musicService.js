// --- API Base URL ---
const TRACKS_API_BASE_URL = 'http://localhost:5000/api/tracks'; 
const PLAYLIST_API_BASE_URL = 'http://localhost:5000/api/playlists';

// ----------------------------------------------------------------------
// TRACK API FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Uploads a new track, either from a local file or an external URL (including YouTube).
 * Corresponds to: POST http://localhost:5000/api/tracks
 * @param {object | FormData} trackData - Contains track metadata and files OR URL data.
 * @returns {Promise<object>} A promise that resolves to the newly created track object.
 */
export const uploadTrack = async (trackData) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error("Authentication required to upload a track.");
    }

    // Determine if the incoming data is FormData (Local File Upload) or a JSON object (URL Submission)
    const isLocalFileUpload = trackData instanceof FormData;
    
    let headers = {
        'Authorization': `Bearer ${token}`,
    };
    
    let body;

    // Handle FormData (for files) vs. JSON (for URLs)
    if (isLocalFileUpload) {
        // Case 1: Local File Upload (FormData)
        body = trackData;
        // DO NOT set Content-Type: 'multipart/form-data' here. The browser handles it.
    } else {
        // Case 2: External URL or YouTube (JSON)
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(trackData);
    }
    
    try {
        const response = await fetch(TRACKS_API_BASE_URL, {
            method: 'POST',
            headers: headers,
            body: body, 
        });

        if (!response.ok) {
            // Include status in the error for better debugging in Home.jsx
            const errorData = await response.json().catch(() => ({ message: 'Failed to upload track' }));
            const error = new Error(errorData.message || `Failed to upload track with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        return response.json(); 

    } catch (error) {
        console.error("Error uploading track:", error);
        throw error;
    }
};


/**
 * Fetches tracks from the API, optionally sorted.
 * It reads the authToken from localStorage for authorization.
 * * @param {string} [sortBy='recently_added'] - The sorting parameter (alphabetical, recently_added, recently_listened).
 * @returns {Promise<Array>} A promise that resolves to an array of track objects.
 */
export const fetchRecommendedTracks = async (sortBy = 'recently_added') => {
    const token = localStorage.getItem('authToken');
    
    // Construct the endpoint with the query parameter
    let endpoint = `${TRACKS_API_BASE_URL}/sorted`;
    if (sortBy) {
        endpoint += `?sortBy=${sortBy}`;
    }

    // 💡 FIX: Removed Content-Type: application/json for a simple GET request.
    const headers = {
        // 🔑 Only include Authorization if the token exists
        ...(token && { 'Authorization': `Bearer ${token}` }), 
    };

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
            // GET requests should not have a body
        });

        // 1. Handle network or server errors
        if (!response.ok) {
            // Throw a specific error if authentication fails (e.g., 401 Unauthorized)
            if (response.status === 401) {
                // Ensure the error thrown includes the status for Home.jsx to use
                const authError = new Error("Unauthorized access. Please log in.");
                authError.response = { status: 401 };
                throw authError;
            }
            // General error handling
            const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
            const generalError = new Error(errorData.message || `Failed to fetch tracks with status: ${response.status}`);
            generalError.response = { status: response.status, data: errorData };
            throw generalError;
        }

        // 2. Parse and return the track data
        const data = await response.json();
        return data.tracks || data; 

    } catch (error) {
        // Log the error for debugging
        console.error("Error fetching recommended tracks:", error);
        // Re-throw the error so the calling component (Home.jsx) can handle it
        throw error;
    }
};

// --- Function for Marking a Track as Listened ---
export const markTrackAsListened = async (trackId) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.warn("Attempted to mark track as listened without authentication token.");
        // Throwing an error ensures Home.jsx can handle unauthenticated state better
        throw new Error("Authentication required to mark track as listened.");
    }

    try {
        const response = await fetch(`${TRACKS_API_BASE_URL}/${trackId}/listen`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({}) // PUT usually requires a body even if empty
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update timestamp' }));
            const error = new Error(errorData.message || `Failed to mark track as listened with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        return response.json(); 

    } catch (error) {
        console.error(`Error marking track ${trackId} as listened:`, error);
        throw error;
    }
};

// --- Search Tracks ---
export const searchTracks = async (query) => {
    const token = localStorage.getItem('authToken');
    
    if (!query) {
        return []; 
    }

    const endpoint = `${TRACKS_API_BASE_URL}/search?q=${encodeURIComponent(query)}`;

    // 💡 FIX: Removed Content-Type: application/json for a simple GET request.
    const headers = {
        // Only include Authorization if the token exists
        ...(token && { 'Authorization': `Bearer ${token}` }), 
    };

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown search error' }));
            const error = new Error(errorData.message || `Search failed with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        const data = await response.json();
        return data.tracks || data; 

    } catch (error) {
        console.error("Error searching tracks:", error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// PLAYLIST API FUNCTIONS 
// ----------------------------------------------------------------------

export const fetchUserPlaylists = async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.warn("Attempted to fetch playlists without authentication token.");
        throw new Error("Authentication required to fetch user playlists.");
    }

    // 💡 FIX: Removed Content-Type: application/json for a simple GET request.
    const headers = {
        'Authorization': `Bearer ${token}`, 
    };

    try {
        const response = await fetch(PLAYLIST_API_BASE_URL, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                const authError = new Error("Unauthorized access. Token invalid or expired.");
                authError.response = { status: 401 };
                throw authError;
            }
            const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
            const generalError = new Error(errorData.message || `Failed to fetch playlists with status: ${response.status}`);
            generalError.response = { status: response.status, data: errorData };
            throw generalError;
        }

        const data = await response.json();
        return data.playlists || data; 

    } catch (error) {
        console.error("Error fetching user playlists:", error);
        throw error;
    }
};

export const createPlaylist = async (name) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error("Authentication required to create a playlist.");
    }

    try {
        const response = await fetch(PLAYLIST_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create playlist' }));
            const error = new Error(errorData.message || `Failed to create playlist with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        return response.json(); 

    } catch (error) {
        console.error("Error creating playlist:", error);
        throw error;
    }
};

export const addTrackToPlaylist = async (playlistId, trackId) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error("Authentication required to add a track.");
    }

    try {
        const response = await fetch(`${PLAYLIST_API_BASE_URL}/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ trackId }), 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to add track' }));
            const error = new Error(errorData.message || `Failed to add track with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        return response.json(); 

    } catch (error) {
        console.error(`Error adding track ${trackId} to playlist ${playlistId}:`, error);
        throw error;
    }
};


/**
 * Fetches full details for a single track.
 * Corresponds to: GET http://localhost:5000/api/tracks/:trackId (Private)
 * @param {string} trackId - The ID of the track to fetch.
 * @returns {Promise<Object>} The full track object including filePath.
 */
export const fetchTrackDetails = async (trackId) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        // This stops the call if not authenticated, preventing an unnecessary request
        throw new Error("Authentication required to fetch track details for playback.");
    }

    const endpoint = `${TRACKS_API_BASE_URL}/${trackId}`;
    
    const headers = {
        'Authorization': `Bearer ${token}`, 
    };

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            // Include status in the error for better debugging
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch track details' }));
            const error = new Error(errorData.message || `Failed to fetch track details with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        // The API response should be the full track object directly
        const data = await response.json();
        return data.track || data; // Return the track object
    } catch (error) {
        console.error(`Error fetching track details for ${trackId}:`, error);
        throw error;
    }
};