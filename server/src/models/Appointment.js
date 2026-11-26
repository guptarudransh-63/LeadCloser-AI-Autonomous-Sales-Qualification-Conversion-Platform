const mongoose = require('mongoose');
const { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } = require('../config/constants');

const AppointmentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true
    },
    salesRepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    appointmentType: {
      type: String,
      enum: Object.values(APPOINTMENT_TYPES),
      default: APPOINTMENT_TYPES.CONSULTATION
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    meetingLink: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUSES),
      default: APPOINTMENT_STATUSES.SCHEDULED
    },
    bookingSource: {
      type: String,
      enum: ['ai_conversation', 'manual', 'reschedule'],
      default: 'ai_conversation'
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true
    },
    notes: {
      type: String
    },
    cancellationReason: {
      type: String
    }
  },
  { timestamps: true }
);

// Idempotency: unique per workspace
AppointmentSchema.index({ workspaceId: 1, idempotencyKey: 1 }, { unique: true });

// Anti-double-booking: Unique compound partial index for active scheduled bookings
AppointmentSchema.index(
  { workspaceId: 1, salesRepId: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: APPOINTMENT_STATUSES.SCHEDULED }
  }
);

AppointmentSchema.index({ workspaceId: 1, startTime: 1 });
AppointmentSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
