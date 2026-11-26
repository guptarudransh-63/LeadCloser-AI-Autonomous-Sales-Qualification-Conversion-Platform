const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
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
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['handoff_request', 'appointment_booked', 'high_value_lead', 'estimate_approval_needed', 'system'],
      default: 'system'
    },
    link: {
      type: String
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

NotificationSchema.index({ workspaceId: 1, userId: 1, isRead: 1 });
NotificationSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
