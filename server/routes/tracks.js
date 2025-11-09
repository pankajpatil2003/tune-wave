// backend/routes/tracks.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const Track = require('../models/Track');
const { protect } = require('../middleware/auth'); // Import the Auth Middleware
const { parseFile } = require('music-metadata'); // Import music-metadata for ID3 tag extraction

// --- Configuration ---
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// --- Utility Functions (getYouTubeId, storage, upload) ---
const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})(?:\S+)?$/;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the original extension, but clean the filename
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/\s/g, '_');
        cb(null, Date.now() + '-' + baseName + ext);
    }
});

// ✅ CORRECTED AND STANDARDIZED MULTER CONFIGURATION
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        // Allow audio, mp4, and common image types (for the cover)
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Only audio, mp4 video, and image files are allowed.'), false);
        }
    }
}).fields([
    { name: 'audioFile', maxCount: 1 }, 
    { name: 'cover_photo', maxCount: 1 } // <-- Standardized Name
]); 


// ==========================================================
//                   API ENDPOINTS
// ==========================================================

// @route   GET /api/tracks
// @desc    Get all tracks (Public access, remains the default sort)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const tracks = await Track.find()
          .populate('user', 'username profile_image') 
          .sort({ createdAt: -1 }); // Default to recently added
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve tracks.');
    }
});

// @route   GET /api/tracks/sorted?sortBy=...
// @desc    Get tracks sorted by a specified field (title, created, listened)
// @access  Public
router.get('/sorted', async (req, res) => {
    try {
        const { sortBy } = req.query;
        let sortCriteria = {};

        switch (sortBy) {
            case 'alphabetical':
                sortCriteria = { title: 1 }; 
                break;
            case 'recently_added':
                sortCriteria = { createdAt: -1 }; 
                break;
            case 'recently_listened':
                sortCriteria = { recently_listened: -1, createdAt: -1 }; 
                break;
            default:
                sortCriteria = { createdAt: -1 }; 
        }

        const tracks = await Track.find()
          .populate('user', 'username profile_image') 
          .sort(sortCriteria);
        
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve and sort tracks.');
    }
});

// @route   GET /api/tracks/search?q=...
// @desc    Search for tracks by title or artist (Public access)
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(200).json([]);
        }

        const searchRegex = new RegExp(q, 'i'); 

        const tracks = await Track.find({
            $or: [
                { title: { $regex: searchRegex } },
                { artist: { $regex: searchRegex } }
            ]
        })
          .populate('user', 'username profile_image')
          .sort({ createdAt: -1 }); 

        res.json(tracks);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not perform track search.');
    }
});

// @route   GET /api/tracks/my-tracks
// @desc    Get all tracks uploaded by the currently logged-in user
// @access  Private
router.get('/my-tracks', protect, async (req, res) => {
    try {
        const userTracks = await Track.find({ user: req.user.id })
          .sort({ createdAt: -1 });

        if (userTracks.length === 0) {
            return res.status(200).json({ msg: 'No tracks found for this user.' });
        }
        
        res.json(userTracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve user tracks.');
    }
});


// @route   GET /api/tracks/:id
// @desc    Get a single track by ID
// @access  Private ⬅️ MODIFIED: Added 'protect' middleware here
router.get('/:id', protect, async (req, res) => {
    try {
        const track = await Track.findById(req.params.id)
            .populate('user', 'username profile_image');

        if (!track) {
            return res.status(404).json({ msg: 'Track not found.' });
        }

        res.json(track);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Track not found (Invalid ID format).' });
        }
        res.status(500).send('Server Error: Could not retrieve track.');
    }
});


// @route   POST /api/tracks
// @desc    Add a new track link or upload a local file (Private access)
router.post('/', protect, upload, async (req, res) => {
    
    // File access using standardized 'cover_photo' field name
    const audioFile = req.files && req.files['audioFile'] ? req.files['audioFile'][0] : null;
    const coverPhotoFile = req.files && req.files['cover_photo'] ? req.files['cover_photo'][0] : null; 
    
    const { title: bodyTitle, artist: bodyArtist, sourceUrl, sourceType, cover_photo: bodyCoverPhoto } = req.body;
    
    const finalSourceType = sourceType || (audioFile ? 'local' : 'external_url');

    let newTrackData = { 
        title: bodyTitle, 
        artist: bodyArtist, 
        sourceType: finalSourceType, 
        user: req.user.id,
        cover_photo: bodyCoverPhoto
    };
    
    // 1. Source-Specific Validation & Data Structuring
    if (finalSourceType === 'local') {
        
        if (!audioFile) {
            return res.status(400).json({ msg: 'No audio file was uploaded for a local track.' });
        }

        // Function to clean up uploaded files on error
        const cleanupFiles = async () => {
            if (audioFile) await fs.unlink(audioFile.path).catch(() => {});
            if (coverPhotoFile) await fs.unlink(coverPhotoFile.path).catch(() => {});
        };

        try {
            // Metadata Extraction from the audio file
            const metadata = await parseFile(audioFile.path);

            newTrackData.title = metadata.common.title || newTrackData.title;
            newTrackData.artist = metadata.common.artist || newTrackData.artist;
            
            // --- Cover Photo Logic ---
            if (coverPhotoFile) {
                // 🌟 FIX: Replace backslashes with forward slashes for database storage
                newTrackData.cover_photo = path.join('uploads', coverPhotoFile.filename).replace(/\\/g, '/');
            } 
            else if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                const mime = picture.format;
                const buffer = picture.data.toString('base64');
                newTrackData.cover_photo = `data:${mime};base64,${buffer}`;
            } 
            else if (!newTrackData.cover_photo) {
                newTrackData.cover_photo = '/images/default_cover.png'; 
            }
            
            // 🌟 FIX: Replace backslashes with forward slashes for database storage
            newTrackData.filePath = path.join('uploads', audioFile.filename).replace(/\\/g, '/');
            newTrackData.mimeType = audioFile.mimetype;

        } catch (metaErr) {
            console.warn(`Could not read metadata for file ${audioFile.filename}. Relying on manual input.`, metaErr.message);
            
            // 🌟 FIX: Replace backslashes with forward slashes (Fallback)
            newTrackData.filePath = path.join('uploads', audioFile.filename).replace(/\\/g, '/');
            newTrackData.mimeType = audioFile.mimetype;
            
            if (coverPhotoFile) {
                // 🌟 FIX: Replace backslashes with forward slashes (Fallback)
                newTrackData.cover_photo = path.join('uploads', coverPhotoFile.filename).replace(/\\/g, '/');
            }
        }
        
        // Final check for essential fields (inside 'local' block)
        if (!newTrackData.title || !newTrackData.artist) {
            await cleanupFiles(); // Cleanup if metadata/manual input failed
            return res.status(400).json({ msg: 'Title and Artist are required, but could not be extracted or provided manually.' });
        }

        try {
            const newTrack = new Track(newTrackData);
            const track = await newTrack.save();
            res.status(201).json(track); 
        } catch (dbErr) {
            // Cleanup on DB error
            await cleanupFiles();
            
            if (dbErr.code === 11000) {
                return res.status(400).json({ msg: 'This link has already been uploaded or is invalid.' });
            }
            console.error(dbErr.message);
            res.status(500).send('Server Error: Could not save track.');
        }
        return; // RETURN HERE to prevent flow into the external link logic below

    } 
    
    // 2. External Link Validation & Data Structuring
    else if (finalSourceType === 'youtube') {
        if (!sourceUrl) {
            return res.status(400).json({ msg: 'YouTube URL is required.' });
        }
        const videoId = getYouTubeId(sourceUrl);
        if (!videoId) {
            return res.status(400).json({ msg: 'Invalid or unsupported YouTube URL provided.' });
        }
        newTrackData.sourceUrl = sourceUrl;
        newTrackData.videoId = videoId;
        
    } else if (finalSourceType === 'external_url') {
        if (!sourceUrl || !sourceUrl.startsWith('http')) {
            return res.status(400).json({ msg: 'Invalid external URL provided.' });
        }
        newTrackData.sourceUrl = sourceUrl;
    } else {
        return res.status(400).json({ msg: 'Invalid source type specified.' });
    }

    // Final check for external links (local flow returns above)
    if (!newTrackData.title || !newTrackData.artist) {
        return res.status(400).json({ msg: 'Title and Artist are required for external links.' });
    }

    try {
        const newTrack = new Track(newTrackData);
        const track = await newTrack.save();
        res.status(201).json(track); 
    } catch (dbErr) {
        if (dbErr.code === 11000) {
            return res.status(400).json({ msg: 'This link has already been uploaded or is invalid.' });
        }
        console.error(dbErr.message);
        res.status(500).send('Server Error: Could not save track.');
    }
});
// @route   PUT /api/tracks/:id/listen
// @desc    Marks a track as recently listened to
// @access  Private
router.put('/:id/listen', protect, async (req, res) => {
    try {
        const track = await Track.findById(req.params.id);

        if (!track) {
            return res.status(404).json({ msg: 'Track not found.' });
        }
        
        // Update the recently_listened timestamp to the current time
        track.recently_listened = new Date();

        const updatedTrack = await track.save();
        
        res.json({ 
            msg: 'Track listening timestamp updated.',
            recently_listened: updatedTrack.recently_listened
        });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Invalid Track ID format.' });
        }
        res.status(500).send('Server Error: Could not update listening status.');
    }
});


// @route   DELETE /api/tracks/:id
// @desc    Delete a track by ID and its file (if local) (Private access)
router.delete('/:id', protect, async (req, res) => {
    try {
      const track = await Track.findById(req.params.id);
  
      if (!track) {
        return res.status(404).json({ msg: 'Track not found.' });
      }
      
      // Authorization Check: Only the owner can delete the track
      if (track.user.toString() !== req.user.id) {
          return res.status(401).json({ msg: 'Not authorized to delete this track.' });
      }
  
      // ** CRUCIAL STEP: DELETE Local File **
      if (track.sourceType === 'local' && track.filePath) {
          // Note: The delete operation uses the path stored in the DB, 
          // which now correctly uses '/' but path.join still works correctly 
          // to join the base directory with the file path regardless of separator.
          const fullPath = path.join(__dirname, '..', track.filePath);
          try {
              await fs.unlink(fullPath);
              console.log(`Successfully deleted file: ${fullPath}`);
          } catch (fileErr) {
              if (fileErr.code !== 'ENOENT') {
                  console.error(`Failed to delete local file: ${fullPath}`, fileErr);
              }
          }
      }
      
      await Track.deleteOne({ _id: req.params.id });
  
      res.json({ msg: 'Track successfully removed.' });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Track not found (Invalid ID format).' });
      }
      res.status(500).send('Server Error: Could not delete track.');
    }
});


// @route   PUT /api/tracks/:id
// @desc    Update track metadata (title, artist, cover_photo)
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, artist, cover_photo } = req.body; 
        
        const track = await Track.findById(req.params.id);

        if (!track) {
            return res.status(404).json({ msg: 'Track not found.' });
        }

        // Authorization Check: Only the owner can update the track
        if (track.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to update this track.' });
        }

        // Update fields if provided in the request body
        if (title !== undefined) {
            track.title = title;
        }
        if (artist !== undefined) {
            track.artist = artist;
        }
        if (cover_photo !== undefined) { 
            // NOTE: If you update a cover_photo via PUT, ensure the string uses forward slashes if it's a file path
            track.cover_photo = cover_photo;
        }

        const updatedTrack = await track.save();
        res.json(updatedTrack);

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Track not found (Invalid ID format).' });
        }
        res.status(500).send('Server Error: Could not update track.');
    }
});

module.exports = router;