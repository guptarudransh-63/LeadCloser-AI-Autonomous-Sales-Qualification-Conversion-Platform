const mongoose = require('mongoose');

const AvailabilityRuleSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:mm
      default: '10:00'
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      default: '18:00'
    },
    slotDurationMinutes: {
      type: Number,
      default: 30
    },
    bufferMinutes: {
      type: Number,
      default: 15
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

AvailabilityRuleSchema.index({ workspaceId: 1, userId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('AvailabilityRule', AvailabilityRuleSchema);
