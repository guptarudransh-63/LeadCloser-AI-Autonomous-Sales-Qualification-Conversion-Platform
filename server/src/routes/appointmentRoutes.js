const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/auth');

// Public availability query for widget and portal
router.get('/availability', (req, res, next) => {
  if (req.cookies?.token || req.headers?.authorization) {
    return authenticate(req, res, () => appointmentController.getAvailability(req, res, next));
  }
  return appointmentController.getAvailability(req, res, next);
});

// Booking: Allowed publicly from chat widget or authenticated from dashboard
router.post('/', (req, res, next) => {
  if (req.cookies?.token || req.headers?.authorization) {
    return authenticate(req, res, () => appointmentController.bookAppointment(req, res, next));
  }
  return appointmentController.bookAppointment(req, res, next);
});

// Authenticated endpoints for CRM staff
router.get('/', authenticate, appointmentController.listAppointments);
router.post('/:id/cancel', authenticate, appointmentController.cancelAppointment);

module.exports = router;
