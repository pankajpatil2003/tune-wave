// backend/routes/playlists.js

const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const Track = require('../models/Track'); // Need to validate track IDs
const { protect } = require('../middleware/auth');

// ==========================================================
//                   PLAYLIST API ENDPOINTS
// ==========================================================

// @route   POST /api/playlists
// @desc    Create a new playlist
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ msg: 'Playlist name is required.' });
        }

        const newPlaylist = new Playlist({
            name,
            user: req.user.id, // Assign the logged-in user as the owner
            tracks: [], // Starts empty
        });

        const playlist = await newPlaylist.save();
        res.status(201).json(playlist);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not create playlist.');
    }
});

// @route   GET /api/playlists
// @desc    Get all playlists owned by the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const playlists = await Playlist.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json(playlists);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve playlists.');
    }
});

// @route   GET /api/playlists/:id
// @desc    Get a single playlist and populate its tracks
// @access  Private (Owner only for now)
router.get('/:id', protect, async (req, res) => {
    try {
        // Find the playlist by ID AND ensure the logged-in user is the owner
        const playlist = await Playlist.findOne({ 
            _id: req.params.id, 
            user: req.user.id 
        })
        .populate({
            path: 'tracks', // Populate the tracks array
            select: 'title artist sourceType sourceUrl videoId filePath' // Select specific track fields
        });

        if (!playlist) {
            return res.status(404).json({ msg: 'Playlist not found or you do not have permission to view it.' });
        }

        res.json(playlist);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Playlist not found (Invalid ID format).' });
        }
        res.status(500).send('Server Error: Could not retrieve playlist.');
    }
});


// @route   PUT /api/playlists/add-track
// @desc    Add a track to a playlist
// @access  Private
router.put('/add-track', protect, async (req, res) => {
    const { playlistId, trackId } = req.body;

    if (!playlistId || !trackId) {
        return res.status(400).json({ msg: 'Playlist ID and Track ID are required.' });
    }
    
    try {
        // 1. Validate track existence
        const track = await Track.findById(trackId);
        if (!track) {
            return res.status(404).json({ msg: 'Track not found.' });
        }

        // 2. Find playlist and ensure the logged-in user is the owner
        const playlist = await Playlist.findOne({ 
            _id: playlistId, 
            user: req.user.id 
        });

        if (!playlist) {
            return res.status(404).json({ msg: 'Playlist not found or you are not the owner.' });
        }

        // 3. Prevent duplicate tracks (optional but recommended)
        if (playlist.tracks.includes(trackId)) {
            return res.status(400).json({ msg: 'Track already exists in this playlist.' });
        }

        // 4. Add the track ID and save
        playlist.tracks.push(trackId);
        await playlist.save();

        // 5. Respond with the updated playlist (optional: populate tracks before responding)
        const updatedPlaylist = await playlist.populate({
            path: 'tracks',
            select: 'title artist sourceType sourceUrl videoId filePath'
        });

        res.json(updatedPlaylist);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not add track to playlist.');
    }
});


// @route   PUT /api/playlists/remove-track
// @desc    Remove a track from a playlist
// @access  Private
router.put('/remove-track', protect, async (req, res) => {
    const { playlistId, trackId } = req.body;

    try {
        // 1. Find playlist and ensure the logged-in user is the owner
        const playlist = await Playlist.findOne({ 
            _id: playlistId, 
            user: req.user.id 
        });

        if (!playlist) {
            return res.status(404).json({ msg: 'Playlist not found or you are not the owner.' });
        }

        // 2. Remove the track ID from the array
        const initialLength = playlist.tracks.length;
        playlist.tracks = playlist.tracks.filter(
            (track) => track.toString() !== trackId
        );
        
        // Check if the track was actually removed
        if (playlist.tracks.length === initialLength) {
             return res.status(404).json({ msg: 'Track not found in this playlist.' });
        }

        await playlist.save();
        
        // 3. Respond with the updated playlist
        const updatedPlaylist = await playlist.populate({
            path: 'tracks',
            select: 'title artist sourceType sourceUrl videoId filePath'
        });

        res.json(updatedPlaylist);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not remove track from playlist.');
    }
});


// @route   DELETE /api/playlists/:id
// @desc    Delete a playlist (Owner only)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const result = await Playlist.deleteOne({ 
            _id: req.params.id, 
            user: req.user.id // Ensures only the owner can delete
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ msg: 'Playlist not found or you are not authorized to delete it.' });
        }

        res.json({ msg: 'Playlist successfully deleted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not delete playlist.');
    }
});


module.exports = router;