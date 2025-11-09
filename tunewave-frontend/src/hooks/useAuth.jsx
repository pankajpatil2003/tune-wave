import { useState, useEffect, useContext, createContext, useMemo, useCallback } from 'react';
// Assuming '../api/auth' provides loginApi, registerApi, and logoutApi functions
import { login as loginApi, register as registerApi, logout as logoutApi } from '../api/auth'; 

const AuthContext = createContext();

const useAuthProvider = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false); 
    const [error, setError] = useState(null);

    // Initial check for authentication state
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setIsAuthenticated(true);
                setUser(parsedUser); 
            } catch (e) {
                console.error("Failed to parse user data from local storage", e);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        }
        setIsAuthReady(true);
    }, []);

    // 1. Login Function (Stable: Dependencies [])
    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await loginApi(email, password); 

            if (response.success) {
                const data = response.data || response;
                
                const userData = {
                    userId: data._id || data.userId, 
                    username: data.username, 
                    email: data.email,
                };
                
                if (!userData.username) {
                    throw new Error("Login succeeded but user data (username) was missing from the response.");
                }
                
                localStorage.setItem('authToken', response.token || data.token);
                localStorage.setItem('user', JSON.stringify(userData)); 

                setUser(userData); 
                setIsAuthenticated(true);
                return true;
            } else {
                setError(response.error || 'Login failed. Please check your credentials.');
                return false;
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || 'An unexpected client error occurred during login.');
            return false;
        } finally {
            setLoading(false);
        }
    }, []); // 🚀 Stable useCallback

    // 2. Register Function (Stable: Dependencies [])
    const register = useCallback(async (username, email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await registerApi(username, email, password);

            if (response.success) {
                return true;
            } else {
                setError(response.error || 'Registration failed. Try a different email or username.');
                return false;
            }
        } catch (err) {
            setError('An unexpected client error occurred during registration.');
            return false;
        } finally {
            setLoading(false);
        }
    }, []); // 🚀 Stable useCallback

    // 3. Logout Function (Stable: Dependencies [])
    const logout = useCallback(async () => {
        logoutApi(); 
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user'); 

        setUser(null); 
        setIsAuthenticated(false);
    }, []); // 🚀 Stable useCallback

    // 4. Memoize the returned context value
    const value = useMemo(
        () => ({
            isAuthenticated,
            user,
            loading,
            isAuthReady,
            error,
            setError,
            login,
            register,
            logout,
        }),
        // 🚀 FIX: Only state variables are included as dependencies.
        // Functions (login, register, logout, setError) are guaranteed stable.
        [isAuthenticated, user, loading, isAuthReady, error] 
    );

    return value;
};

// --- Context Provider Component ---
export const AuthProvider = ({ children }) => {
    const auth = useAuthProvider();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// --- Custom Hook for consuming context ---
const useAuth = () => {
    return useContext(AuthContext);
};

export default useAuth;