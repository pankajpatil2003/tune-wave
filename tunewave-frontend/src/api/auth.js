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
            // 🆕 Extract detailed error message from various backend formats
            let errorMessage = 'Registration failed. Please try again with different details.';
            
            if (data.message) {
                errorMessage = data.message;
            } else if (data.error) {
                errorMessage = data.error;
            } else if (data.errors) {
                // Handle validation errors object format
                // Example: { errors: { password: { message: "..." }, email: { message: "..." } } }
                if (typeof data.errors === 'object') {
                    const messages = Object.values(data.errors)
                        .map(err => err.message || err)
                        .filter(Boolean);
                    if (messages.length > 0) {
                        errorMessage = messages.join('. ');
                    }
                } else if (typeof data.errors === 'string') {
                    errorMessage = data.errors;
                }
            }
            
            return { 
                success: false, 
                error: errorMessage
            };
        }

        // Success case
        return { 
            success: true, 
            token: data.token, 
            userId: data._id || data.userId,
            username: data.username
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
            // 🆕 Extract detailed error message
            let errorMessage = 'Login failed. Invalid email or password.';
            
            if (data.message) {
                errorMessage = data.message;
            } else if (data.error) {
                errorMessage = data.error;
            }
            
            return { 
                success: false, 
                error: errorMessage
            };
        }

        // Success case
        return { 
            success: true, 
            token: data.token, 
            userId: data._id || data.userId,
            username: data.username
        };
    } catch (error) {
        console.error("Login Network Error:", error);
        return { success: false, error: 'Network error occurred. Check server availability.' };
    }
};

/**
 * Removes local storage token to simulate logout and returns a success status.
 */
export const logout = () => {
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('user');
    return { success: true }; 
};
