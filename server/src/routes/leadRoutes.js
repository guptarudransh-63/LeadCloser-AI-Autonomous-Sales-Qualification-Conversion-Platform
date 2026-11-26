const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/', leadController.listLeads);
router.post('/', leadController.createLead);
router.get('/:id', leadController.getLeadById);
router.patch('/:id', leadController.updateLead);
router.patch('/:id/stage', leadController.updateStage);
router.post('/:id/assign', requireRole(ROLES.OWNER, ROLES.ADMIN), leadController.assignLead);
router.post('/:id/score-override', requireRole(ROLES.OWNER, ROLES.ADMIN), leadController.overrideScore);

module.exports = router;
