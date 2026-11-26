const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticate } = require('../middlewares/auth');

// Public initiation and message posting for prospect chat widget
router.post('/', conversationController.initiateConversation);
router.post('/:id/messages', (req, res, next) => {
  // Check optional auth: if token present, attach req.user, else proceed as prospect
  if (req.cookies?.token || req.headers?.authorization) {
    return authenticate(req, res, () => conversationController.sendMessage(req, res, next));
  }
  return conversationController.sendMessage(req, res, next);
});
router.get('/:id/messages', (req, res, next) => {
  if (req.cookies?.token || req.headers?.authorization) {
    return authenticate(req, res, () => conversationController.getMessages(req, res, next));
  }
  return conversationController.getMessages(req, res, next);
});

// Authenticated CRM dashboard routes
router.get('/', authenticate, conversationController.listConversations);
router.get('/:id', authenticate, conversationController.getConversationById);
router.post('/:id/takeover', authenticate, conversationController.takeover);
router.post('/:id/resume', authenticate, conversationController.resumeAI);

module.exports = router;
