const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  // ** Core Data **
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  artist: {
    type: String,
    required: [true, 'Please add an artist name'],
    trim: true,
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, // This is the ID of the user who uploaded it
    ref: 'User', // References the 'User' model
    required: true // A track must be associated with a user
  },
  cover_photo: { 
    type: String,
    //default: '/images/default_cover.png' // Default placeholder image
  },
  recently_listened: { 
          type: Date,
          default: null // Will be updated when the track is played
      },
  sourceType: {
    type: String,
    enum: ['local', 'youtube', 'external_url'], // Define possible sources
    required: true,
  },
  sourceUrl: { 
    type: String,
    required: function() { return this.sourceType !== 'local'; }, // Required if not a local file
    unique: true, // Still good practice for external links
    sparse: true, // Allows nulls (for local files) while enforcing uniqueness
  },
  videoId: { // Specific to YouTube
    type: String,
    required: false,
    sparse: true,
  },
  filePath: {
    type: String, // The path on the server (e.g., 'uploads/123456-audio.mp3')
    required: function() { return this.sourceType === 'local'; }, // Required if a local file
    sparse: true,
  },
  mimeType: {
    type: String,
    required: false,
  },

}, {
  timestamps: true 
});

const Track = mongoose.model('Track', trackSchema);

module.exports = Track;