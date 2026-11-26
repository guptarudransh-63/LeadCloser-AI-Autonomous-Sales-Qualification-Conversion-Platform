const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLES } = require('../config/constants');

// Public read catalog for widget inquiry if workspaceId passed or default
router.get('/', (req, res, next) => {
  if (req.cookies?.token || req.headers?.authorization) {
    return authenticate(req, res, () => serviceController.listServices(req, res, next));
  }
  // If not auth, allow read-only query
  return serviceController.listServices(req, res, next);
});

router.use(authenticate);

router.post('/', requireRole(ROLES.OWNER, ROLES.ADMIN), serviceController.createService);
router.get('/:id', serviceController.getServiceById);
router.patch('/:id', requireRole(ROLES.OWNER, ROLES.ADMIN), serviceController.updateService);

// Pricing rules endpoints
router.get('/rules/all', serviceController.listPricingRules);
router.post('/rules', requireRole(ROLES.OWNER, ROLES.ADMIN), serviceController.createPricingRule);

module.exports = router;
