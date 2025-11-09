// backend/routes/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

const router = express.Router();

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with that email or username.' });
    }

    // Create new user (password is auto-hashed via Mongoose pre-save hook)
    user = await User.create({ username, email, password });

    // Respond with user data and a token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profile_image: user.profile_image,
      token: generateToken(user._id),
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: Registration failed.');
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email (must use .select('+password') to retrieve the hashed password)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Compare passwords using the instance method
    if (await user.matchPassword(password)) {
      // Success: respond with user data and a token
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
        token: generateToken(user._id),
      });
    } else {
      // Failure: passwords do not match
      res.status(401).json({ msg: 'Invalid credentials' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: Login failed.');
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user data
// @access  Private (Requires a valid JWT token)
const { protect } = require('../middleware/auth'); // ensure this is imported

router.get('/me', protect, async (req, res) => {
    // req.user is set by the 'protect' middleware
    res.json(req.user);
});

// @route   PUT /api/auth/profile
// @desc    Update user profile data (e.g., profile image URL)
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const { profile_image } = req.body;
  
  // Find the user by the ID attached by the 'protect' middleware
  const user = await User.findById(req.user.id);

  if (user) {
    if (profile_image) {
      user.profile_image = profile_image;
    }
    // You could also update username or email here if needed

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profile_image: updatedUser.profile_image,
    });
  } else {
    res.status(404).json({ msg: 'User not found' });
  }
});

module.exports = router;