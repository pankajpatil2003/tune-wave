// --- API Base URL ---
const API_BASE_URL = 'http://localhost:5000/api/auth'; 

/**
 * Calls the registration endpoint.
 * Standardized return format: { success: boolean, token?: string, userId?: string, username?: string, error?: string }
 */
export const register = async (username, email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Return failure object with the error message
            return { 
                success: false, 
                error: data.message || 'Registration failed. Please try again with different details.' 
            };
        }

        // 🚀 FIX: Assume API returns { token, userId, username, ... } on success
        return { 
            success: true, 
            token: data.token, 
            userId: data._id || data.userId, // Use _id if available (common in MongoDB)
            username: data.username // 🚀 NEW: Ensure username is returned
        };
    } catch (error) {
        // Handle network failure
        console.error("Registration Network Error:", error);
        return { success: false, error: 'Network error occurred. The server may be down.' };
    }
};

/**
 * Calls the login endpoint.
 * Standardized return format: { success: boolean, token?: string, userId?: string, username?: string, error?: string }
 */
export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Return failure object with the error message
            return { 
                success: false, 
                error: data.message || 'Login failed. Invalid email or password.' 
            };
        }

        // Assuming your API returns { token: '...', userId: '...', username: '...' } on success
        return { 
            success: true, 
            token: data.token, 
            userId: data._id || data.userId, // Use _id if available
            username: data.username // 🚀 CRITICAL FIX: Ensure username is returned
        };
    } catch (error) {
        // Handle network failure
        console.error("Login Network Error:", error);
        return { success: false, error: 'Network error occurred. Check server availability.' };
    }
};

/**
 * Removes local storage token to simulate logout and returns a success status.
 */
export const logout = () => {
    // 🚀 FIX: Ensure we are only removing the authToken, useAuth.jsx handles the rest.
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('user'); // Also remove 'user' for completeness
    
    return { success: true }; 
};