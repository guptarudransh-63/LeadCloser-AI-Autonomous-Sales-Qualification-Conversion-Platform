const Service = require('../models/Service');
const PricingRule = require('../models/PricingRule');
const Estimate = require('../models/Estimate');
const Lead = require('../models/Lead');
const { ESTIMATE_STATUSES, ROLES } = require('../config/constants');
const { logAudit } = require('./auditService');

/**
 * Deterministic Pricing Engine
 * Calculates precision-safe prices in integer paise (₹1 = 100 paise)
 */
class PricingEngine {
  /**
   * Calculate estimate based on verified database rules
   */
  static async calculate({
    workspaceId,
    serviceId,
    selectedPackageName = null,
    addonCodes = [], // array of { code: string, quantity: number }
    complexityLevel = 'standard', // 'standard', 'medium', 'high'
    requestedDiscountPaise = 0,
    userRole = null
  }) {
    const service = await Service.findOne({ _id: serviceId, workspaceId, isActive: true });
    if (!service) {
      throw new Error(`Service not found or inactive for id '${serviceId}'`);
    }

    const lineItems = [];
    const assumptions = [
      'Client will provide brand assets, high-res media, and copy text prior to milestone commencement.',
      'Deployment includes standard QA across modern evergreen desktop and mobile browsers.',
      'Scope includes 30 days of complimentary post-launch bug fixing warranty.'
    ];
    const exclusions = [
      'Third-party software licensing, domain registration, and cloud infrastructure hosting fees are not included.',
      'Data migration from legacy proprietary formats requires separate assessment.'
    ];
    const unresolvedItems = [];

    let baseAmountPaise = service.basePricePaise;
    let baseItemName = `${service.name} (Base Scope)`;
    let baseItemDesc = service.description;

    // Check for selected package
    if (selectedPackageName && service.packages && service.packages.length > 0) {
      const pkg = service.packages.find(
        (p) => p.name.toLowerCase() === selectedPackageName.toLowerCase()
      );
      if (pkg) {
        baseAmountPaise = pkg.pricePaise;
        baseItemName = `${service.name} — ${pkg.name} Package`;
        baseItemDesc = pkg.description || `Includes: ${pkg.includedFeatures.join(', ')}`;
        if (pkg.includedFeatures && pkg.includedFeatures.length > 0) {
          assumptions.push(`Includes configured package features: ${pkg.includedFeatures.join(', ')}`);
        }
      }
    }

    lineItems.push({
      name: baseItemName,
      description: baseItemDesc,
      unitPricePaise: baseAmountPaise,
      quantity: 1,
      totalPaise: baseAmountPaise,
      ruleCode: 'BASE_SERVICE',
      isAddon: false
    });

    let runningSubtotalPaise = baseAmountPaise;

    // Fetch and process pricing rules for add-ons
    const activeRules = await PricingRule.find({
      workspaceId,
      serviceId: { $in: [service._id, null] },
      isActive: true
    });

    const ruleMap = new Map();
    activeRules.forEach((r) => ruleMap.set(r.code.toLowerCase(), r));

    for (const addonReq of addonCodes) {
      const code = typeof addonReq === 'string' ? addonReq.toLowerCase() : addonReq.code?.toLowerCase();
      const qty = typeof addonReq === 'object' && addonReq.quantity ? Math.max(1, parseInt(addonReq.quantity, 10)) : 1;

      if (!code) continue;

      const rule = ruleMap.get(code);
      if (rule) {
        const itemTotal = rule.amountPaise * qty;
        runningSubtotalPaise += itemTotal;
        lineItems.push({
          name: rule.name,
          description: rule.description || `Add-on: ${rule.name}`,
          unitPricePaise: rule.amountPaise,
          quantity: qty,
          totalPaise: itemTotal,
          ruleCode: rule.code,
          isAddon: true
        });

        if (rule.requiresHumanReview) {
          unresolvedItems.push(`Custom scope for '${rule.name}' requires engineer technical review.`);
        }
      } else {
        unresolvedItems.push(`Requested add-on '${code}' is not in catalog and requires manual quoting.`);
      }
    }

    // Apply complexity multiplier if applicable
    let complexityMultiplier = 1.0;
    if (complexityLevel === 'medium') {
      complexityMultiplier = 1.15;
    } else if (complexityLevel === 'high') {
      complexityMultiplier = 1.30;
    }

    if (complexityMultiplier > 1.0) {
      const complexityDiffPaise = Math.round(runningSubtotalPaise * (complexityMultiplier - 1.0));
      runningSubtotalPaise += complexityDiffPaise;
      lineItems.push({
        name: `Complexity Adjustment (${complexityLevel.toUpperCase()})`,
        description: `Multiplier of ${(complexityMultiplier).toFixed(2)}x applied for architectural complexity`,
        unitPricePaise: complexityDiffPaise,
        quantity: 1,
        totalPaise: complexityDiffPaise,
        ruleCode: `COMPLEXITY_${complexityLevel.toUpperCase()}`,
        isAddon: false
      });
      assumptions.push(`Timeline and effort adjusted for ${complexityLevel} technical complexity.`);
    }

    // Enforce discount guardrails
    let approvedDiscountPaise = 0;
    if (requestedDiscountPaise > 0) {
      // Non-owners cannot grant discounts unless approved
      if (userRole && userRole !== ROLES.OWNER && userRole !== ROLES.ADMIN) {
        unresolvedItems.push(`Requested discount of ₹${(requestedDiscountPaise / 100).toLocaleString('en-IN')} requires Business Owner approval.`);
      } else {
        approvedDiscountPaise = Math.min(requestedDiscountPaise, runningSubtotalPaise);
      }
    }

    const totalPaise = Math.max(0, runningSubtotalPaise - approvedDiscountPaise);

    const requiresHumanReview =
      unresolvedItems.length > 0 ||
      service.scopeConstraints?.requiresCustomAssessment ||
      (requestedDiscountPaise > 0 && approvedDiscountPaise === 0);

    return {
      serviceId: service._id,
      serviceName: service.name,
      currency: 'INR',
      subtotalPaise: runningSubtotalPaise,
      discountPaise: approvedDiscountPaise,
      totalPaise,
      lineItems,
      assumptions,
      exclusions,
      unresolvedItems,
      requiresHumanReview,
      formattedSubtotal: `₹${(runningSubtotalPaise / 100).toLocaleString('en-IN')}`,
      formattedTotal: `₹${(totalPaise / 100).toLocaleString('en-IN')}`
    };
  }

  /**
   * Save or supersede estimate for a lead
   */
  static async createOrUpdateEstimate({
    workspaceId,
    leadId,
    serviceId,
    calculationResult,
    actorId = null,
    isApproved = false
  }) {
    // Check existing estimates for this lead
    const latestEstimate = await Estimate.findOne({ workspaceId, leadId }).sort({ version: -1 });

    let nextVersion = 1;
    let estimateNumber = `EST-${Date.now().toString().slice(-6)}`;

    if (latestEstimate) {
      nextVersion = latestEstimate.version + 1;
      estimateNumber = latestEstimate.estimateNumber;
      // Mark previous active/preliminary as superseded
      await Estimate.updateMany(
        { workspaceId, leadId, status: { $in: [ESTIMATE_STATUSES.PRELIMINARY, ESTIMATE_STATUSES.DRAFT] } },
        { status: ESTIMATE_STATUSES.SUPERSEDED }
      );
    }

    const status = isApproved
      ? ESTIMATE_STATUSES.APPROVED
      : calculationResult.requiresHumanReview
      ? ESTIMATE_STATUSES.DRAFT
      : ESTIMATE_STATUSES.PRELIMINARY;

    const estimate = await Estimate.create({
      workspaceId,
      leadId,
      estimateNumber,
      version: nextVersion,
      serviceId,
      status,
      currency: calculationResult.currency || 'INR',
      subtotalPaise: calculationResult.subtotalPaise,
      discountPaise: calculationResult.discountPaise,
      taxPaise: 0,
      totalPaise: calculationResult.totalPaise,
      lineItems: calculationResult.lineItems,
      assumptions: calculationResult.assumptions,
      exclusions: calculationResult.exclusions,
      unresolvedItems: calculationResult.unresolvedItems,
      approvedBy: isApproved ? actorId : null,
      approvedAt: isApproved ? new Date() : null
    });

    // Update Lead's estimated deal value
    await Lead.findByIdAndUpdate(leadId, {
      estimatedValuePaise: calculationResult.totalPaise
    });

    await logAudit({
      workspaceId,
      userId: actorId,
      action: 'estimate.created',
      resourceType: 'estimate',
      resourceId: estimate._id,
      details: {
        estimateNumber,
        version: nextVersion,
        totalPaise: calculationResult.totalPaise,
        status
      }
    });

    return estimate;
  }
}

module.exports = PricingEngine;
