const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const Track = require('../models/Track');
const { protect } = require('../middleware/auth'); 
const mongoose = require('mongoose'); 

// ==========================================================
//                   PLAYLIST API ENDPOINTS
// ==========================================================

// @route   POST /api/playlists
// @desc    Create a new playlist
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        // 🛠️ FIX: Include all fields from the model
        const { name, description, is_public } = req.body; 

        if (!name) {
            return res.status(400).json({ msg: 'Playlist name is required.' });
        }

        const newPlaylist = new Playlist({
            name,
            description,
            is_public: is_public !== undefined ? is_public : true, // Default to true
            user: req.user.id, // Assign the logged-in user as the owner
            tracks: [], 
        });

        const playlist = await newPlaylist.save();
        res.status(201).json(playlist);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not create playlist.');
    }
});

// // @route   GET /api/playlists/my-playlists
// // @desc    Get all playlists owned by the logged-in user
// // @access  Private
// // 🛠️ FIX: Renamed from '/' to '/my-playlists' for clarity and to prevent ambiguity
// router.get('/my-playlists', protect, async (req, res) => {
//     try {
//         const playlists = await Playlist.find({ user: req.user.id })
//             .select('-tracks -__v') // Exclude track content for efficiency in list view
//             .sort({ createdAt: -1 });

//         res.json(playlists);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server Error: Could not retrieve user playlists.');
//     }
// });


// @route   GET /api/playlists/my-playlists
// @desc    Get all playlists owned by the logged-in user (with track IDs)
// @access  Private
router.get('/my-playlists', protect, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user.id })
      // include tracks so frontend can know membership
      .select('name tracks is_public createdAt updatedAt') 
      .sort({ createdAt: -1 });

    res.json(playlists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: Could not retrieve user playlists.');
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
            select: 'title artist sourceType sourceUrl videoId filePath cover_photo' // Added cover_photo
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

// @route   PUT /api/playlists/:id/tracks
// @desc    TOGGLE: Add or Remove a track from a playlist
// @access  Private (Owner only)
// 🛠️ NEW/FIXED ROUTE: Replaces the ambiguous /add-track and /remove-track with proper RESTful ID-based toggle
router.put('/:id/tracks', protect, async (req, res) => {
    const { trackId } = req.body;

    if (!trackId || !mongoose.Types.ObjectId.isValid(trackId)) {
        return res.status(400).json({ msg: 'Valid track ID is required.' });
    }

    try {
        let playlist = await Playlist.findById(req.params.id);

        if (!playlist) {
            return res.status(404).json({ msg: 'Playlist not found.' });
        }

        // Authorization Check: Only the owner can modify the playlist
        if (playlist.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to modify this playlist.' });
        }
        
        // Ensure the track actually exists before trying to add it
        const trackExists = await Track.findById(trackId);
        if (!trackExists) {
            return res.status(404).json({ msg: 'Track does not exist.' });
        }

        const trackIndex = playlist.tracks.findIndex(
            (track) => track.toString() === trackId
        );

        let action;
        if (trackIndex > -1) {
            // Track is already in the playlist, so remove it
            playlist.tracks.splice(trackIndex, 1);
            action = 'removed';
        } else {
            // Track is not in the playlist, so add it
            playlist.tracks.push(trackId);
            action = 'added';
        }

        await playlist.save();
        
        // Populate and return the updated playlist for immediate UI refresh
        const updatedPlaylist = await playlist.populate({
             path: 'tracks',
             select: 'title artist sourceType sourceUrl videoId filePath cover_photo'
        });

        res.json({ 
            msg: `Track ${action} to playlist.`, 
            isAdded: action === 'added', 
            playlist: updatedPlaylist 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not update playlist tracks.');
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


// backend/routes/playlists.js (Add this block)

// @route   PUT /api/playlists/:id
// @desc    Update playlist details (name, description, is_public)
// @access  Private (Owner only)
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, description, is_public } = req.body;
        const updates = {};

        // 1. Prepare updates object
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description; // Allow empty string
        if (is_public !== undefined) updates.is_public = is_public;

        // Ensure there is something to update
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ msg: 'No fields provided for update.' });
        }

        // 2. Find the playlist by ID and ensure the logged-in user is the owner
        const playlist = await Playlist.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: updates },
            { new: true, runValidators: true } // Return the updated document and run Mongoose schema validators
        )
        // Optionally populate tracks on return, or just return the updated details
        .select('-__v -tracks'); 

        if (!playlist) {
            return res.status(404).json({ msg: 'Playlist not found or you are not authorized to modify it.' });
        }

        res.json(playlist);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Invalid Playlist ID format.' });
        }
        res.status(500).send('Server Error: Could not update playlist.');
    }
});

// @route   GET /api/playlists/by-track/:trackId
// @desc    Get all user's playlists that contain the given track
// @access  Private
router.get('/by-track/:trackId', protect, async (req, res) => {
  const { trackId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(trackId)) {
    return res.status(400).json({ msg: 'Invalid track ID.' });
  }

  try {
    const playlists = await Playlist.find({
      user: req.user.id,
      tracks: trackId, // Mongo: element in tracks array equals trackId
    }).select('_id name');

    res.json(playlists);
  } catch (err) {
    console.error('Error fetching playlists by track:', err);
    res.status(500).json({ msg: 'Server Error: Could not retrieve playlists for track.' });
  }
});


module.exports = router;