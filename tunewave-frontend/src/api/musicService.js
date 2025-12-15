
// --- API Base URL ---
// General base URL for the new apiRequest helper
const API_BASE_URL = 'http://localhost:5000/api'; 
// Full base URLs used by V1 functions (kept for backward compatibility)
const TRACKS_API_BASE_URL = 'http://localhost:5000/api/tracks'; 
const PLAYLIST_API_BASE_URL = 'http://localhost:5000/api/playlists';

// --- Standardized Token Retrieval ---
/**
 * Retrieves the authentication token from localStorage using the key 'authToken'.
 */
const getAuthToken = () => {
    return localStorage.getItem('authToken'); 
};

// Export for use in components if needed
export const getToken = getAuthToken;

// ----------------------------------------------------------------------
// 🔑 CENTRAL API REQUEST UTILITY ( It's perfect)
// ----------------------------------------------------------------------

/**
 * Standardized function for making authenticated API requests.
 * This helper ensures the Authorization header is set correctly before every call.
 * @param {string} endpointPath - The path relative to API_BASE_URL (e.g., /tracks/sorted).
 * @param {object} options - Fetch options (method, headers, body, etc.).
 * @param {boolean} requireAuth - If true, throws error if token is missing (Default: true).
 * @returns {Promise<object | array>} The parsed JSON response.
 */
const apiRequest = async (endpointPath, options = {}, requireAuth = true) => {
    const token = getAuthToken();
    let headers = { ...options.headers };

    if (requireAuth) {
        if (!token) {
            const authError = new Error("Authentication required.");
            authError.response = { status: 401 };
            throw authError;
        }

        // Conditionally set Content-Type header unless the body is FormData (file upload)
        if (!(options.body instanceof FormData)) {
             headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const fullUrl = `${API_BASE_URL}${endpointPath}`;
        const response = await fetch(fullUrl, {
            ...options,
            headers: headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData.message = errorText || 'Unknown server error';
            }

            const error = new Error(errorData.message || `API Error ${response.status}: Failed to process request.`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
             return {};
        }

        return response.json();
    } catch (error) {
        console.error(`Error in apiRequest to ${endpointPath}:`, error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// 🔄 NEW, IMPROVED TRACK API FUNCTIONS (V2 - Use these instead of V1)
// ----------------------------------------------------------------------

/**
 * V2: Uploads a new track (POST /api/tracks).
 */
export const uploadTrackV2 = async (trackData) => {
    const isLocalFileUpload = trackData instanceof FormData;

    return apiRequest('/tracks', {
        method: 'POST',
        body: isLocalFileUpload ? trackData : JSON.stringify(trackData), 
    });
};

/**
 * V2: Fetches tracks from the API, optionally sorted (GET /api/tracks/sorted).
 */
export const fetchRecommendedTracksV2 = async (sortBy = 'recently_added') => {
    return apiRequest(`/tracks/sorted?sortBy=${sortBy}`, {
        method: 'GET',
    });
};

/**
 * V2: Function for Marking a Track as Listened (PUT /api/tracks/:trackId/listen).
 */
export const markTrackAsListenedV2 = async (trackId) => {
    return apiRequest(`/tracks/${trackId}/listen`, {
        method: 'PUT',
        body: JSON.stringify({}), 
    });
};

/**
 * V2: Search Tracks (GET /api/tracks/search?q=...).
 * 🆕 UPDATED: Now uses the central apiRequest utility.
 */
export const searchTracksV2 = async (query) => {
    if (!query) { return []; }
    return apiRequest(`/tracks/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
    });
};

/**
 * V2: Fetches full details for a single track (GET /api/tracks/:trackId).
 */
export const fetchTrackDetailsV2 = async (trackId) => {
    return apiRequest(`/tracks/${trackId}`, {
        method: 'GET',
    });
};

// ----------------------------------------------------------------------
// 🏆 NEW PLAYLIST API FUNCTIONS (V3 - Uses apiRequest and latest routes)
// ----------------------------------------------------------------------

/**
 * V3: Fetches the user's personal playlists (GET /api/playlists/my-playlists).
 */
export const fetchUserPlaylistsV3 = async () => {
    try {
        return await apiRequest('/playlists/my-playlists', {
            method: 'GET',
        }); 
    } catch (error) {
        console.error("Error fetching user playlists:", error);
        throw new Error("Error fetching user playlists: " + (error.message || "Unknown server error"));
    }
};

/**
 * V3: Creates a new playlist (POST /api/playlists).
 */
export const createPlaylistV3 = async (name, description = '', is_public = false) => {
    return apiRequest('/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, description, is_public }),
    });
};

/**
 * V3: Updates a playlist's details (PUT /api/playlists/:id).
 */
export const updatePlaylistV3 = async (playlistId, updates) => {
    return apiRequest(`/playlists/${playlistId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

/**
 * V3: Toggles a track's presence in a playlist (PUT /api/playlists/:id/tracks).
 * The API handles add/remove based on the track's current presence.
 */

// toggle add/remove a track in playlist (your existing V3)
export const toggleTrackInPlaylistV3 = (playlistId, trackId) =>
  apiRequest(`/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    body: JSON.stringify({ trackId }),
  });

// delete playlist
/**
 * V3: Deletes a playlist (DELETE /api/playlists/:id).
 */
export const deletePlaylistV3 = (playlistId) =>
  apiRequest(`/playlists/${playlistId}`, { method: 'DELETE' });


/**
 * V3: Fetches full playlist details, including populated tracks (GET /api/playlists/:id).
 */
export const fetchPlaylistDetailsV3 = async (playlistId) => {
    if (!playlistId) {
        throw new Error("Playlist ID is required to fetch playlist details.");
    }

    return apiRequest(`/playlists/${playlistId}`, {
        method: 'GET',
    });
};


// ----------------------------------------------------------------------
// ORIGINAL TRACK API FUNCTIONS (Keep for backward compatibility)
// ----------------------------------------------------------------------

/**
 * Original V1: Uploads a new track, either from a local file or an external URL (including YouTube).
 * Corresponds to: POST http://localhost:5000/api/tracks
 * @param {object | FormData} trackData - Contains track metadata and files OR URL data.
 * @returns {Promise<object>} A promise that resolves to the newly created track object.
 */
export const uploadTrack = async (trackData) => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        throw new Error("Authentication required to upload a track.");
    }

    const isLocalFileUpload = trackData instanceof FormData;

    let headers = {
        'Authorization': `Bearer ${token}`,
    };

    let body;

    // Handle FormData (for files) vs. JSON (for URLs)
    if (isLocalFileUpload) {
        // Case 1: Local File Upload (FormData)
        body = trackData;
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
 * Original V1: Fetches tracks from the API, optionally sorted.
 * It reads the authToken from localStorage for authorization.
 * @param {string} [sortBy='recently_added'] - The sorting parameter (alphabetical, recently_added, recently_listened).
 * @returns {Promise<Array>} A promise that resolves to an array of track objects.
 */

export const fetchRecommendedTracks = async (sortBy = 'recently_added') => {
    const token = localStorage.getItem('authToken');

    // Construct the endpoint with the query parameter
    let endpoint = `${TRACKS_API_BASE_URL}/sorted`;
    if (sortBy) {
        endpoint += `?sortBy=${sortBy}`;
    }

    const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` }), 
    };

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
        });

        // 1. Handle network or server errors
        if (!response.ok) {
            if (response.status === 401) {
                const authError = new Error("Unauthorized access. Please log in.");
                authError.response = { status: 401 };
                throw authError;
            }
            const errorData = await response.json().catch(() => ({ message: 'Unknown server error' }));
            const generalError = new Error(errorData.message || `Failed to fetch tracks with status: ${response.status}`);
            generalError.response = { status: response.status, data: errorData };
            throw generalError;
        }

        // 2. Parse and return the track data
        const data = await response.json();
        return data.tracks || data; 

    } catch (error) {
        console.error("Error fetching recommended tracks:", error);
        throw error;
    }
};

// --- Original V1: Function for Marking a Track as Listened ---
export const markTrackAsListened = async (trackId) => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.warn("Attempted to mark track as listened without authentication token.");
        throw new Error("Authentication required to mark track as listened.");
    }

    try {
        const response = await fetch(`${TRACKS_API_BASE_URL}/${trackId}/listen`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({})
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

// --- Original V1: Search Tracks ---
export const searchTracks = async (query) => {
    const token = localStorage.getItem('authToken');

    if (!query) {
        return []; 
    }

    const endpoint = `${TRACKS_API_BASE_URL}/search?q=${encodeURIComponent(query)}`;

    const headers = {
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

// --- Original V1: Fetches full details for a single track ---
export const fetchTrackDetails = async (trackId) => {
    const token = localStorage.getItem('authToken');

    if (!token) {
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
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch track details' }));
            const error = new Error(errorData.message || `Failed to fetch track details with status: ${response.status}`);
            error.response = { status: response.status, data: errorData };
            throw error;
        }

        const data = await response.json();
        return data.track || data;
    } catch (error) {
        console.error(`Error fetching track details for ${trackId}:`, error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// ORIGINAL PLAYLIST API FUNCTIONS (Keep for backward compatibility)
// ----------------------------------------------------------------------

export const fetchUserPlaylists = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.warn("Attempted to fetch playlists without authentication token.");
        throw new Error("Authentication required to fetch user playlists.");
    }

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

/**
 * Adds a single track to a playlist (PUT /api/playlists/:id/tracks).
 * The trackId should be passed in the request body.
 */
export const addTrackToPlaylistV3 = async (playlistId, trackId) => {
    
    const token = getToken();
    const url = `${API_BASE_URL}/playlists/${playlistId}/tracks`;

    try {
        const response = await fetch(url, {
            
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ trackId }), // Send the track ID in the body
        });

        if (!response.ok) {
            let errorDetail = await response.json().catch(() => ({ message: response.statusText }));
            // Using the raw text from the error response to be more informative
            let errorMessage = errorDetail.message || `Failed to add track. Status: ${response.status}.`;
            
            // Check if the server returned the full HTML error page
            if (errorMessage.includes("<!DOCTYPE html>")) {
                 errorMessage = "Server error or misconfigured route. Check server logs.";
            }

            throw new Error(errorMessage);
        }

        // Return the updated playlist object from the successful PUT request
        // Your Postman response confirms the 'playlist' object is nested, so we adjust
        const result = await response.json();
        return result.playlist; // Return the nested playlist object
        
    } catch (error) {
        console.error("API error in addTrackToPlaylist:", error);
        throw error;
    }
};

/**
 * V2: Deletes a track by ID (DELETE /api/tracks/:id).
 */
export const deleteTrackV2 = async (trackId) => {
    return apiRequest(`/tracks/${trackId}`, {
        method: 'DELETE',
    });
};

/**
 * V2: Updates track metadata (PUT /api/tracks/:id).
 */
export const updateTrackV2 = async (trackId, updates) => {
    return apiRequest(`/tracks/${trackId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const fetchPlaylistsByTrack = (trackId) => {
  return apiRequest(`/playlists/by-track/${trackId}`);
};
