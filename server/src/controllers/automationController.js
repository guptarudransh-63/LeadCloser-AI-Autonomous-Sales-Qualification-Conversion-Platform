const FollowUpTask = require('../models/FollowUpTask');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const AvailabilityRule = require('../models/AvailabilityRule');
const { logAudit } = require('../services/auditService');

exports.listFollowUps = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { workspaceId: req.workspaceId };
    if (status) filter.status = status;

    const tasks = await FollowUpTask.find(filter)
      .populate('leadId', 'name leadNumber email phone salesStage')
      .populate('salesRepId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tasks.length, followUps: tasks });
  } catch (error) {
    next(error);
  }
};

exports.approveFollowUp = async (req, res, next) => {
  try {
    const task = await FollowUpTask.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!task) return res.status(404).json({ success: false, error: 'Follow-up task not found.' });

    task.status = 'sent';
    task.sentAt = new Date();
    task.deliveryResult = {
      provider: 'simulated_email_adapter',
      deliveredAt: new Date().toISOString(),
      status: 'delivered'
    };
    await task.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'followup.approved_and_sent',
      resourceType: 'follow_up_task',
      resourceId: task._id,
      details: { subject: task.subject, leadId: task.leadId }
    });

    res.json({ success: true, message: 'Follow-up approved and dispatched via simulation adapter.', followUp: task });
  } catch (error) {
    next(error);
  }
};

exports.listNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      workspaceId: req.workspaceId,
      $or: [{ userId: req.user._id }, { userId: null }]
    }).sort({ createdAt: -1 }).limit(30);

    const unreadCount = await Notification.countDocuments({
      workspaceId: req.workspaceId,
      $or: [{ userId: req.user._id }, { userId: null }],
      isRead: false
    });

    res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        _id: req.params.id,
        workspaceId: req.workspaceId
      },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        workspaceId: req.workspaceId,
        $or: [{ userId: req.user._id }, { userId: null }],
        isRead: false
      },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.listAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ workspaceId: req.workspaceId })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

exports.listAvailabilityRules = async (req, res, next) => {
  try {
    const rules = await AvailabilityRule.find({ workspaceId: req.workspaceId })
      .populate('userId', 'name email role');
    res.json({ success: true, rules });
  } catch (error) {
    next(error);
  }
};

exports.createOrUpdateAvailabilityRule = async (req, res, next) => {
  try {
    const { userId, dayOfWeek, startTime, endTime, slotDurationMinutes, bufferMinutes } = req.body;
    const rule = await AvailabilityRule.findOneAndUpdate(
      {
        workspaceId: req.workspaceId,
        userId: userId || req.user._id,
        dayOfWeek
      },
      {
        startTime,
        endTime,
        slotDurationMinutes: slotDurationMinutes || 30,
        bufferMinutes: bufferMinutes || 15,
        isActive: true
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};
