const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verify2FA,
  getMe,
  enable2FA,
  confirm2FA,
  disable2FA
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);
router.get('/me', protect, getMe);
router.post('/enable-2fa', protect, enable2FA);
router.post('/confirm-2fa', protect, confirm2FA);
router.post('/disable-2fa', protect, disable2FA);

module.exports = router;
