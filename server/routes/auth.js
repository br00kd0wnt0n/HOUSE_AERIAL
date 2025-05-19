// server/routes/auth.js - Authentication API routes

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');

// Routes
router.get('/status', authController.getAuthStatus);
router.post('/initialize', authController.initialize);
router.post('/login', authController.login);
router.post('/change-password', authController.changePassword);

module.exports = router; 