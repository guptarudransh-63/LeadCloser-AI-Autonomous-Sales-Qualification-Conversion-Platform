const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
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
    action: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      required: true
    },
    resourceId: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ workspaceId: 1, createdAt: -1 });
AuditLogSchema.index({ workspaceId: 1, resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
