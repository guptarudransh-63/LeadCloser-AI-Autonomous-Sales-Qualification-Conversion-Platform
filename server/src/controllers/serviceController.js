const Service = require('../models/Service');
const PricingRule = require('../models/PricingRule');
const { logAudit } = require('../services/auditService');

exports.listServices = async (req, res, next) => {
  try {
    const services = await Service.find({ workspaceId: req.workspaceId, isActive: true });
    res.json({ success: true, count: services.length, services });
  } catch (error) {
    next(error);
  }
};

exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });
    const rules = await PricingRule.find({ workspaceId: req.workspaceId, serviceId: service._id, isActive: true });
    res.json({ success: true, service, pricingRules: rules });
  } catch (error) {
    next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { name, category, description, basePricePaise, pricingModel, packages, scopeConstraints } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const service = await Service.create({
      workspaceId: req.workspaceId,
      name,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      category,
      description,
      basePricePaise,
      pricingModel,
      packages: packages || [],
      scopeConstraints: scopeConstraints || {}
    });

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'service.created',
      resourceType: 'service',
      resourceId: service._id,
      details: { name, basePricePaise }
    });

    res.status(201).json({ success: true, service });
  } catch (error) {
    next(error);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      { $set: req.body },
      { new: true }
    );
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'service.updated',
      resourceType: 'service',
      resourceId: service._id,
      details: req.body
    });

    res.json({ success: true, service });
  } catch (error) {
    next(error);
  }
};

exports.listPricingRules = async (req, res, next) => {
  try {
    const rules = await PricingRule.find({ workspaceId: req.workspaceId, isActive: true }).populate('serviceId', 'name');
    res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    next(error);
  }
};

exports.createPricingRule = async (req, res, next) => {
  try {
    const { serviceId, name, code, description, ruleType, amountPaise, minQty, maxQty, requiresHumanReview } = req.body;

    const rule = await PricingRule.create({
      workspaceId: req.workspaceId,
      serviceId: serviceId || null,
      name,
      code: code.toLowerCase(),
      description,
      ruleType,
      amountPaise,
      minQty: minQty || 1,
      maxQty: maxQty || 100,
      requiresHumanReview: !!requiresHumanReview
    });

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'pricing_rule.created',
      resourceType: 'pricing_rule',
      resourceId: rule._id,
      details: { code, amountPaise }
    });

    res.status(201).json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};
