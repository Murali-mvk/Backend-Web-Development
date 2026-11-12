const express = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    user: { id: req.user.id, email: req.user.email },
  });
});
router.post('/logout', authController.logout);

module.exports = router;
