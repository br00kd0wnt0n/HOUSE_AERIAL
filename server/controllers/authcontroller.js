// server/controllers/authcontroller.js - Authentication controller

const User = require('../models/user');

// Initialize or get system status (check if admin password is set)
exports.getAuthStatus = async (req, res) => {
  try {
    // Find any user in the system
    const user = await User.findOne({});
    
    // If no user exists, the system needs initialization
    if (!user) {
      return res.status(200).json({
        initialized: false,
        message: 'System needs initialization'
      });
    }
    
    // Return initialization status
    return res.status(200).json({
      initialized: user.isInitialized,
      message: user.isInitialized ? 'System is initialized' : 'Password needs to be set'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error checking auth status',
      error: error.message
    });
  }
};

// Initialize the admin password for the first time
exports.initialize = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        message: 'Password is required'
      });
    }
    
    // Check if we already have a user
    let user = await User.findOne({});
    
    if (user && user.isInitialized) {
      return res.status(400).json({
        message: 'System is already initialized'
      });
    }
    
    // Create new user or update existing uninitialized user
    if (!user) {
      user = new User({
        username: 'admin',
        password,
        isInitialized: true
      });
    } else {
      user.password = password;
      user.isInitialized = true;
    }
    
    await user.save();
    
    return res.status(200).json({
      message: 'Password initialized successfully',
      initialized: true
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error initializing password',
      error: error.message
    });
  }
};

// Login with password
exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        message: 'Password is required'
      });
    }
    
    // Find the admin user
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      return res.status(404).json({
        message: 'System not initialized'
      });
    }
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid password'
      });
    }
    
    // On successful login, return success
    return res.status(200).json({
      message: 'Login successful',
      isAuthenticated: true
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error during login',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }
    
    // Find the admin user
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    return res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error changing password',
      error: error.message
    });
  }
}; 