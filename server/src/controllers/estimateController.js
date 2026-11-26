const Estimate = require('../models/Estimate');
const PricingEngine = require('../services/pricingEngine');
const { logAudit } = require('../services/auditService');
const { ESTIMATE_STATUSES, ROLES } = require('../config/constants');

exports.calculatePreview = async (req, res, next) => {
  try {
    const { serviceId, selectedPackageName, addonCodes, complexityLevel, requestedDiscountPaise } = req.body;

    const result = await PricingEngine.calculate({
      workspaceId: req.workspaceId,
      serviceId,
      selectedPackageName,
      addonCodes,
      complexityLevel,
      requestedDiscountPaise,
      userRole: req.user?.role
    });

    res.json({ success: true, estimate: result });
  } catch (error) {
    next(error);
  }
};

exports.createEstimate = async (req, res, next) => {
  try {
    const { leadId, serviceId, selectedPackageName, addonCodes, complexityLevel, requestedDiscountPaise } = req.body;

    const calculation = await PricingEngine.calculate({
      workspaceId: req.workspaceId,
      serviceId,
      selectedPackageName,
      addonCodes,
      complexityLevel,
      requestedDiscountPaise,
      userRole: req.user.role
    });

    const isAutoApproved = req.user.role === ROLES.OWNER || req.user.role === ROLES.ADMIN;

    const estimate = await PricingEngine.createOrUpdateEstimate({
      workspaceId: req.workspaceId,
      leadId,
      serviceId,
      calculationResult: calculation,
      actorId: req.user._id,
      isApproved: isAutoApproved
    });

    res.status(201).json({ success: true, estimate });
  } catch (error) {
    next(error);
  }
};

exports.listEstimates = async (req, res, next) => {
  try {
    const { leadId, status } = req.query;
    const filter = { workspaceId: req.workspaceId };
    if (leadId) filter.leadId = leadId;
    if (status) filter.status = status;

    const estimates = await Estimate.find(filter)
      .populate('leadId', 'name leadNumber email')
      .populate('serviceId', 'name')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: estimates.length, estimates });
  } catch (error) {
    next(error);
  }
};

exports.getEstimateById = async (req, res, next) => {
  try {
    const estimate = await Estimate.findOne({ _id: req.params.id, workspaceId: req.workspaceId })
      .populate('leadId')
      .populate('serviceId')
      .populate('approvedBy', 'name email');

    if (!estimate) return res.status(404).json({ success: false, error: 'Estimate not found.' });

    res.json({ success: true, estimate });
  } catch (error) {
    next(error);
  }
};

exports.approveEstimate = async (req, res, next) => {
  try {
    const estimate = await Estimate.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!estimate) return res.status(404).json({ success: false, error: 'Estimate not found.' });

    estimate.status = ESTIMATE_STATUSES.APPROVED;
    estimate.approvedBy = req.user._id;
    estimate.approvedAt = new Date();
    await estimate.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'estimate.approved',
      resourceType: 'estimate',
      resourceId: estimate._id,
      details: {
        estimateNumber: estimate.estimateNumber,
        version: estimate.version,
        totalPaise: estimate.totalPaise
      }
    });

    res.json({ success: true, message: 'Estimate approved successfully.', estimate });
  } catch (error) {
    next(error);
  }
};
