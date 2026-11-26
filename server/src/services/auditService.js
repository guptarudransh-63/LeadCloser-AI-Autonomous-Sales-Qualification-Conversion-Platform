const AuditLog = require('../models/AuditLog');

const logAudit = async ({ workspaceId, userId = null, action, resourceType, resourceId, details = {}, ipAddress = null }) => {
  try {
    return await AuditLog.create({
      workspaceId,
      userId,
      action,
      resourceType,
      resourceId: String(resourceId),
      details,
      ipAddress
    });
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error.message);
    return null;
  }
};

module.exports = { logAudit };
