const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const Track = require('../models/Track');
const { protect } = require('../middleware/auth'); 
const { parseFile } = require('music-metadata');

// --- Configuration & Utility Functions (keep as is) ---
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

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
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/\s/g, '_');
        cb(null, Date.now() + '-' + baseName + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Only audio, mp4 video, and image files are allowed.'), false);
        }
    }
}).fields([
    { name: 'audioFile', maxCount: 1 }, 
    { name: 'cover_photo', maxCount: 1 }
]);


// Helper function - make sure this is at the top of your file

const getRandomDefaultImage = async () => {
    try {
        const defaultImageDir = path.join(__dirname, '..', 'images', 'default_img_bucket');
        
        console.log('🔍 Looking for images in:', defaultImageDir);
        
        const files = await fs.readdir(defaultImageDir);
        console.log('🔍 Files found:', files);
        
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
        });
        
        console.log('🔍 Image files filtered:', imageFiles);
        
        if (imageFiles.length === 0) {
            console.log('⚠️ No images in bucket, using default');
            return '/images/default_cover.png';
        }
        
        const randomIndex = Math.floor(Math.random() * imageFiles.length);
        const randomImage = imageFiles[randomIndex];
        const finalPath = `/images/default_img_bucket/${randomImage}`;
        
        console.log('✅ Selected random image:', finalPath);
        return finalPath;
    } catch (err) {
        console.error('❌ Error in getRandomDefaultImage:', err);
        return '/images/default_cover.png';
    }
};

// ==========================================================
//                   API ENDPOINTS
// ==========================================================

// @route   GET /api/tracks
// @desc    Get all tracks for the logged-in user
// @access  Private 🆕 CHANGED FROM PUBLIC
router.get('/', protect, async (req, res) => {
    try {
        const tracks = await Track.find({ user: req.user.id }) // 🆕 Filter by user
          .populate('user', 'username profile_image') 
          .sort({ createdAt: -1 });
        res.json(tracks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve tracks.');
    }
});

// @route   GET /api/tracks/sorted?sortBy=...
// @desc    Get user's tracks sorted by a specified field
// @access  Private 🆕 CHANGED FROM PUBLIC
router.get('/sorted', protect, async (req, res) => {
    try {
        const { sortBy } = req.query;
        const userId = req.user.id; // 🆕 Get user ID
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

        const tracks = await Track.find({ user: userId }) // 🆕 Filter by user
          .populate('user', 'username profile_image') 
          .sort(sortCriteria);
        
        res.json({ tracks }); // 🆕 Wrap in object for consistency
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve and sort tracks.');
    }
});

// @route   GET /api/tracks/search?q=...
// @desc    Search user's tracks by title or artist
// @access  Private 🆕 CHANGED FROM PUBLIC
router.get('/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.user.id; // 🆕 Get user ID

        if (!q || q.length < 2) {
            return res.status(200).json({ tracks: [] }); // 🆕 Consistent response format
        }

        const searchRegex = new RegExp(q, 'i'); 

        const tracks = await Track.find({
            user: userId, // 🆕 Filter by user
            $or: [
                { title: { $regex: searchRegex } },
                { artist: { $regex: searchRegex } }
            ]
        })
          .populate('user', 'username profile_image')
          .sort({ createdAt: -1 }); 

        res.json({ tracks }); // 🆕 Wrap in object

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not perform track search.');
    }
});

// @route   GET /api/tracks/my-tracks
// @desc    Get all tracks uploaded by the currently logged-in user (Alias for GET /)
// @access  Private
router.get('/my-tracks', protect, async (req, res) => {
    try {
        const userTracks = await Track.find({ user: req.user.id })
          .sort({ createdAt: -1 });

        if (userTracks.length === 0) {
            return res.status(200).json({ tracks: [], msg: 'No tracks found for this user.' });
        }
        
        res.json({ tracks: userTracks });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error: Could not retrieve user tracks.');
    }
});

// @route   GET /api/tracks/:id
// @desc    Get a single track by ID (only if it belongs to the user)
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const track = await Track.findOne({ 
            _id: req.params.id, 
            user: req.user.id // 🆕 Verify ownership
        })
            .populate('user', 'username profile_image');

        if (!track) {
            return res.status(404).json({ message: 'Track not found or you do not have permission to access it.' });
        }

        res.json({ track }); // 🆕 Wrap in object for consistency

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Track not found (Invalid ID format).' });
        }
        res.status(500).json({ message: 'Server Error: Could not retrieve track.' });
    }
});

// @route   POST /api/tracks
// @desc    Add a new track link or upload a local file (Private access)
// @access  Private


// Your route
router.post('/', protect, upload, async (req, res) => {
    
    const audioFile = req.files && req.files['audioFile'] ? req.files['audioFile'][0] : null;
    const coverPhotoFile = req.files && req.files['cover_photo'] ? req.files['cover_photo'][0] : null; 
    
    const { title: bodyTitle, artist: bodyArtist, sourceUrl, sourceType, cover_photo: bodyCoverPhoto } = req.body;
    
    console.log('\n=== DEBUG COVER PHOTO ===');
    console.log('bodyCoverPhoto:', bodyCoverPhoto);
    console.log('bodyCoverPhoto type:', typeof bodyCoverPhoto);
    console.log('coverPhotoFile:', coverPhotoFile);
    
    const finalSourceType = sourceType || (audioFile ? 'local' : 'external_url');
    
    // 🔍 NEW DEBUG LINES
    console.log('🔍 finalSourceType:', finalSourceType);
    console.log('🔍 audioFile exists:', !!audioFile);
    console.log('🔍 sourceUrl:', sourceUrl);
    console.log('🔍 sourceType from body:', sourceType);

    let newTrackData = { 
        title: bodyTitle, 
        artist: bodyArtist, 
        sourceType: finalSourceType, 
        user: req.user.id,
    };
    
    // 1. LOCAL FILE UPLOAD
    if (finalSourceType === 'local') {
        console.log('✅ ENTERED LOCAL BLOCK');
        
        if (!audioFile) {
            return res.status(400).json({ msg: 'No audio file was uploaded for a local track.' });
        }

        const cleanupFiles = async () => {
            if (audioFile) await fs.unlink(audioFile.path).catch(() => {});
            if (coverPhotoFile) await fs.unlink(coverPhotoFile.path).catch(() => {});
        };

        try {
            const metadata = await parseFile(audioFile.path);

            newTrackData.title = metadata.common.title || newTrackData.title;
            newTrackData.artist = metadata.common.artist || newTrackData.artist;
            
            console.log('🔍 Checking cover photo sources...');
            
            // Priority 1: Uploaded cover file
            if (coverPhotoFile) {
                console.log('✓ Using uploaded cover file');
                newTrackData.cover_photo = path.join('uploads', coverPhotoFile.filename).replace(/\\/g, '/');
            } 
            // Priority 2: Embedded metadata picture
            else if (metadata.common.picture && metadata.common.picture.length > 0) {
                console.log('✓ Using embedded cover from metadata');
                const picture = metadata.common.picture[0];
                const mime = picture.format;
                const buffer = picture.data.toString('base64');
                newTrackData.cover_photo = `data:${mime};base64,${buffer}`;
            } 
            // Priority 3: Random default image
            else {
                console.log('✓ No cover found, getting random default...');
                newTrackData.cover_photo = await getRandomDefaultImage();
            }
            
            console.log('✅ Final cover_photo value:', newTrackData.cover_photo);
            
            newTrackData.filePath = path.join('uploads', audioFile.filename).replace(/\\/g, '/');
            newTrackData.mimeType = audioFile.mimetype;

        } catch (metaErr) {
            console.warn(`⚠️ Could not read metadata. Error: ${metaErr.message}`);
            
            newTrackData.filePath = path.join('uploads', audioFile.filename).replace(/\\/g, '/');
            newTrackData.mimeType = audioFile.mimetype;
            
            if (coverPhotoFile) {
                newTrackData.cover_photo = path.join('uploads', coverPhotoFile.filename).replace(/\\/g, '/');
            } else {
                console.log('⚠️ Metadata error - getting random default');
                newTrackData.cover_photo = await getRandomDefaultImage();
            }
        }
        
        console.log('🔍 About to save track with data:', JSON.stringify(newTrackData, null, 2));
        
        if (!newTrackData.title || !newTrackData.artist) {
            await cleanupFiles();
            return res.status(400).json({ msg: 'Title and Artist are required, but could not be extracted or provided manually.' });
        }

        try {
            const newTrack = new Track(newTrackData);
            const track = await newTrack.save();
            console.log('✅ Track saved successfully with cover:', track.cover_photo);
            res.status(201).json(track); 
        } catch (dbErr) {
            await cleanupFiles();
            
            if (dbErr.code === 11000) {
                return res.status(400).json({ msg: 'This link has already been uploaded or is invalid.' });
            }
            console.error('❌ DB Error:', dbErr.message);
            res.status(500).send('Server Error: Could not save track.');
        }
        return;
    } 
    
    // 2. YOUTUBE
    else if (finalSourceType === 'youtube') {
        console.log('✅ ENTERED YOUTUBE BLOCK');
        
        if (!sourceUrl) {
            return res.status(400).json({ msg: 'YouTube URL is required.' });
        }
        const videoId = getYouTubeId(sourceUrl);
        if (!videoId) {
            return res.status(400).json({ msg: 'Invalid or unsupported YouTube URL provided.' });
        }
        newTrackData.sourceUrl = sourceUrl;
        newTrackData.videoId = videoId;
        
        // 🌟 ADD RANDOM COVER FOR YOUTUBE
        if (!bodyCoverPhoto) {
            console.log('✓ YouTube track - getting random cover');
            newTrackData.cover_photo = await getRandomDefaultImage();
        } else {
            newTrackData.cover_photo = bodyCoverPhoto;
        }
        
    } 
    
    // 3. EXTERNAL URL
    else if (finalSourceType === 'external_url') {
        console.log('✅ ENTERED EXTERNAL_URL BLOCK');
        
        if (!sourceUrl || !sourceUrl.startsWith('http')) {
            return res.status(400).json({ msg: 'Invalid external URL provided.' });
        }
        newTrackData.sourceUrl = sourceUrl;
        
        // 🌟 ADD RANDOM COVER FOR EXTERNAL URL
        if (!bodyCoverPhoto) {
            console.log('✓ External URL track - getting random cover');
            newTrackData.cover_photo = await getRandomDefaultImage();
        } else {
            newTrackData.cover_photo = bodyCoverPhoto;
        }
        
    } else {
        return res.status(400).json({ msg: 'Invalid source type specified.' });
    }

    console.log('🔍 Final data for external link:', JSON.stringify(newTrackData, null, 2));

    if (!newTrackData.title || !newTrackData.artist) {
        return res.status(400).json({ msg: 'Title and Artist are required for external links.' });
    }

    try {
        const newTrack = new Track(newTrackData);
        const track = await newTrack.save();
        console.log('✅ External track saved with cover:', track.cover_photo);
        res.status(201).json(track); 
    } catch (dbErr) {
        if (dbErr.code === 11000) {
            return res.status(400).json({ msg: 'This link has already been uploaded or is invalid.' });
        }
        console.error('❌ DB Error:', dbErr.message);
        res.status(500).send('Server Error: Could not save track.');
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