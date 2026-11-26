const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const QualificationAssessment = require('../models/QualificationAssessment');
const Estimate = require('../models/Estimate');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const QualificationEngine = require('../services/qualificationEngine');
const { logAudit } = require('../services/auditService');
const { sendNotification } = require('../services/notificationService');
const { ROLES } = require('../config/constants');

exports.listLeads = async (req, res, next) => {
  try {
    const {
      search,
      stage,
      priority,
      assignedTo,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { workspaceId: req.workspaceId, isArchived: false };

    // RBAC: If sales agent, only allow seeing assigned leads unless workspace settings allow team view
    if (req.user.role === ROLES.SALES_AGENT && !assignedTo) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (stage) filter.salesStage = stage;
    if (priority) filter.priority = priority;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { leadNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email role')
        .populate('serviceInterest', 'name category basePricePaise')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Lead.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.workspaceId })
      .populate('assignedTo', 'name email role')
      .populate('serviceInterest');

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found in this workspace.' });
    }

    const [requirements, assessment, estimates, appointments, activity] = await Promise.all([
      LeadRequirement.findOne({ leadId: lead._id, workspaceId: req.workspaceId }),
      QualificationAssessment.findOne({ leadId: lead._id, workspaceId: req.workspaceId }),
      Estimate.find({ leadId: lead._id, workspaceId: req.workspaceId }).sort({ version: -1 }),
      Appointment.find({ leadId: lead._id, workspaceId: req.workspaceId }).populate('salesRepId', 'name email').sort({ startTime: -1 }),
      AuditLog.find({ resourceId: String(lead._id), workspaceId: req.workspaceId }).populate('userId', 'name role').sort({ createdAt: -1 }).limit(20)
    ]);

    res.json({
      success: true,
      lead,
      requirements,
      assessment,
      estimates,
      appointments,
      activity
    });
  } catch (error) {
    next(error);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const { name, email, phone, companyName, serviceInterest, source = 'manual', notes } = req.body;

    const count = await Lead.countDocuments({ workspaceId: req.workspaceId });
    const leadNumber = `LD-${1000 + count + 1}`;

    const lead = await Lead.create({
      workspaceId: req.workspaceId,
      leadNumber,
      name: name || 'New Prospect',
      email,
      phone,
      companyName,
      serviceInterest,
      source,
      assignedTo: req.user._id,
      notes: notes ? [{ text: notes, author: req.user._id }] : []
    });

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'lead.created',
      resourceType: 'lead',
      resourceId: lead._id,
      details: { leadNumber, source }
    });

    res.status(201).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });

    const allowedUpdates = ['name', 'email', 'phone', 'companyName', 'serviceInterest', 'priority', 'lostReason', 'nextFollowUpDate'];
    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) lead[key] = req.body[key];
    });

    if (req.body.note) {
      lead.notes.push({ text: req.body.note, author: req.user._id });
    }

    await lead.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'lead.updated',
      resourceType: 'lead',
      resourceId: lead._id,
      details: req.body
    });

    res.json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

exports.updateStage = async (req, res, next) => {
  try {
    const { stage, lostReason } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });

    const previousStage = lead.salesStage;
    lead.salesStage = stage;
    if (lostReason) lead.lostReason = lostReason;
    await lead.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'lead.stage_changed',
      resourceType: 'lead',
      resourceId: lead._id,
      details: { previousStage, newStage: stage, lostReason }
    });

    res.json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

exports.assignLead = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });

    lead.assignedTo = assignedTo;
    await lead.save();

    await sendNotification({
      workspaceId: req.workspaceId,
      userId: assignedTo,
      title: '🎯 Lead Assigned to You',
      message: `You have been assigned to ${lead.name} (${lead.leadNumber})`,
      type: 'system',
      link: `/leads/${lead._id}`
    });

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'lead.assigned',
      resourceType: 'lead',
      resourceId: lead._id,
      details: { assignedTo }
    });

    res.json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

exports.overrideScore = async (req, res, next) => {
  try {
    const { score, reason } = req.body;
    if (score === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'Both score and reason are required for override.' });
    }

    const result = await QualificationEngine.overrideScore({
      workspaceId: req.workspaceId,
      leadId: req.params.id,
      newScore: score,
      reason,
      actorId: req.user._id
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
