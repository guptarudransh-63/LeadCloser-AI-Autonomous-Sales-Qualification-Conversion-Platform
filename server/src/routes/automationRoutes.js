const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Follow-ups
router.get('/follow-ups', automationController.listFollowUps);
router.post('/follow-ups/:id/approve', automationController.approveFollowUp);

// Notifications
router.get('/notifications', automationController.listNotifications);
router.patch('/notifications/read-all', automationController.markAllNotificationsRead);
router.patch('/notifications/:id/read', automationController.markNotificationRead);

// Audit Logs
router.get('/audit-logs', automationController.listAuditLogs);

// Availability Rules
router.get('/availability-rules', automationController.listAvailabilityRules);
router.post('/availability-rules', requireRole(ROLES.OWNER, ROLES.ADMIN), automationController.createOrUpdateAvailabilityRule);

module.exports = router;
