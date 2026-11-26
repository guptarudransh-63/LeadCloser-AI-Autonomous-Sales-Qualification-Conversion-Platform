const mongoose = require('mongoose');

const FollowUpTaskSchema = new mongoose.Schema(
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
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['post_consultation', 'stalled_lead_nudge', 'estimate_reminder', 'high_priority_alert'],
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    bodyDraft: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      enum: ['email', 'in_app', 'sms'],
      default: 'email'
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sent', 'dismissed', 'failed'],
      default: 'draft'
    },
    scheduledFor: {
      type: Date,
      default: Date.now
    },
    sentAt: {
      type: Date
    },
    requiresApproval: {
      type: Boolean,
      default: true
    },
    deliveryResult: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

FollowUpTaskSchema.index({ workspaceId: 1, status: 1 });
FollowUpTaskSchema.index({ workspaceId: 1, scheduledFor: 1 });

module.exports = mongoose.model('FollowUpTask', FollowUpTaskSchema);
