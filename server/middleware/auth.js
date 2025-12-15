const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the token (remove 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user data to the request object (excluding the password)
      req.user = await User.findById(decoded.id).select('-password');
      
      // 🆕 Additional check: ensure user still exists in database
      if (!req.user) {
        return res.status(401).json({ message: 'User not found, token invalid' });
      }
      
      next(); // Proceed to the next middleware or the route handler
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // 🆕 Fixed: This only runs if no Authorization header exists
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
