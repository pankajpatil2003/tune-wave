import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { LogIn, UserPlus, Loader2, CheckCircle } from 'lucide-react'; 

// --- Components located in src/components/common/ ---
import InputField from '../../components/common/InputField';
import PrimaryButton from '../../components/common/PrimaryButton'; 
// ---------------------------------------------------


// 💡 Self-Contained Component: AuthCard wrapper
const AuthCard = ({ title, onSubmit, darkMode, children }) => {
    return (
        <div 
            className={`
                w-full max-w-md p-8 rounded-2xl shadow-2xl transition-all duration-300 space-y-6
                ${darkMode 
                    ? 'bg-gray-800 text-white border border-indigo-500/30' 
                    : 'bg-white text-gray-900 border border-gray-300'
                }
            `}
        >
            <h2 className="text-3xl font-extrabold text-center">
                {title}
            </h2>
            
            <form onSubmit={onSubmit} className="space-y-4">
                {children}
            </form>
        </div>
    );
};


const Login = ({ darkMode }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login'); 
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false); 

    const { isAuthenticated, loading, error, login, register, setError } = useAuth();

    // Clear form and state when switching modes
    useEffect(() => {
        setUsername('');
        setEmail('');
        setPassword('');
        setError(null);
        setRegistrationSuccess(false);
    }, [mode, setError]);

    // Redirection Handler: Triggers immediately after state change in useAuth
    useEffect(() => {
        if (isAuthenticated) {
            // Redirects to the root path ("/")
            navigate('/', { replace: true }); 
        }
    }, [isAuthenticated, navigate]);

    // Handles form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 💡 FIX 2: Guard clause for redirection failure
        if (isAuthenticated) {
             // Already logged in, force navigation
            navigate('/', { replace: true });
            return; 
        }

        setError(null);
        setRegistrationSuccess(false);
        
        if (mode === 'login') {
            await login(email, password);
        } else {
            const success = await register(username, email, password);
            if (success) {
                setMode('login');
                setRegistrationSuccess(true);
                setEmail(email);
                setPassword('');
            }
        }
    };
    
    // Logic for button text and form validation
    const actionText = mode === 'login' ? 'Sign In' : 'Register Account';
    const isFormIncomplete = mode === 'register' ? (!username || !email || !password) : (!email || !password);
    const Icon = mode === 'login' ? LogIn : UserPlus;

    return (
        <AuthCard 
            title={mode === 'login' ? "Sign In to TuneWave" : "Create TuneWave Account"}
            onSubmit={handleSubmit}
            darkMode={darkMode}
        >
            {/* Error Message Display */}
            {error && (
                <div className="p-3 bg-red-600 text-white rounded-lg font-medium text-sm">
                    {error}
                </div>
            )}
            
            {/* Registration Success Message */}
            {registrationSuccess && (
                <div className="p-3 bg-green-600 text-white rounded-lg font-medium text-sm flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Registration successful! Please sign in with your new account.</span>
                </div>
            )}
            
            {/* Input Fields */}
            {mode === 'register' && (
                <InputField 
                    label="Username"
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., testuser"
                    darkMode={darkMode}
                />
            )}

            <InputField 
                label="Email Address"
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                darkMode={darkMode}
            />
            <InputField 
                label="Password"
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                darkMode={darkMode}
            />
            
            {/* Action Button */}
            <PrimaryButton 
                type="submit" 
                fullWidth 
                disabled={loading || isFormIncomplete}
            >
                {/* 💡 FIX 1: Conditional rendering for UI glitch */}
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        <Icon className="h-5 w-5 mr-2" />
                        {actionText}
                    </>
                )}
            </PrimaryButton>

            {/* Mode Toggle Link */}
            <p className={`text-sm text-center mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {mode === 'login' ? (
                    <>
                        Don't have an account?{' '}
                        <button 
                            type="button" 
                            onClick={() => setMode('register')}
                            className="text-indigo-500 hover:text-indigo-400 font-medium"
                        >
                            Register
                        </button>
                    </>
                ) : (
                    <>
                        Already have an account?{' '}
                        <button 
                            type="button" 
                            onClick={() => setMode('login')}
                            className="text-indigo-500 hover:text-indigo-400 font-medium"
                        >
                            Sign In
                        </button>
                    </>
                )}
            </p>
        </AuthCard>
    );
};

export default Login;