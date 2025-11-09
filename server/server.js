// backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const trackRoutes = require('./routes/tracks'); // Import track routes
const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlists');

// Load environment variables from .env file
dotenv.config();

const frontendOrigin = 'http://localhost:5173'; // Explicitly allow your frontend URL

const corsOptions = {
    // 1. Specify the exact origin URL(s) allowed to access the API
    origin: frontendOrigin, 
    
    // 2. Allow credentials (cookies, authorization headers)
    credentials: true, 
    
    // 3. Define the methods allowed
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    
    // 4. Define the headers allowed
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Connect to database
connectDB();

// Initialize the app
const app = express();

app.use(cors(corsOptions));
// Middleware
// Body parser: allows us to get JSON data from req.body
app.use(express.json());

// 🖼️ CRITICAL FIX: The 'images' folder is a sibling of server.js, not nested in 'public'.
// Correct path is just 'images' relative to __dirname (where server.js is).
app.use('/images', express.static(path.join(__dirname, 'images')));

// ** Static File Serving ** // Serves files from the 'uploads' directory when requesting /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ** Define Routes **
// Mount the track routes to the /api/tracks endpoint
app.use('/api/tracks', trackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);

// Basic root route
app.get('/', (req, res) => {
    res.send('TuneWave API is running and ready to serve!');
});

// Start the server
const PORT = process.env.PORT || 5000;


app.listen(
    PORT,
    () => console.log(`Server running on port ${PORT}`)
);