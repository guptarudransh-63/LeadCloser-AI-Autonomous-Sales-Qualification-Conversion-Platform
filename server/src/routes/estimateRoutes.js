const express = require('express');
const router = express.Router();
const estimateController = require('../controllers/estimateController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.post('/calculate', estimateController.calculatePreview);
router.post('/', estimateController.createEstimate);
router.get('/', estimateController.listEstimates);
router.get('/:id', estimateController.getEstimateById);
router.post('/:id/approve', requireRole(ROLES.OWNER, ROLES.ADMIN), estimateController.approveEstimate);

module.exports = router;
