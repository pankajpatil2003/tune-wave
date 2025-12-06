const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name for the playlist'],
        trim: true,
    },
    // Reference to the User who owns this playlist
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Array of references to the Track model
    tracks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Track',
        }
    ],
    is_public: {
        type: Boolean,
        default: false, // Playlists are private by default
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Playlist', PlaylistSchema);