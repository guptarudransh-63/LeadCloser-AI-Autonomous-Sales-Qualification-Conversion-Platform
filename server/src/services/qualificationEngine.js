const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const QualificationAssessment = require('../models/QualificationAssessment');
const Workspace = require('../models/Workspace');
const Service = require('../models/Service');
const { LEAD_PRIORITIES, PIPELINE_STAGES } = require('../config/constants');
const { sendNotification } = require('./notificationService');
const { logAudit } = require('./auditService');

class QualificationEngine {
  /**
   * Evaluate and score a lead based on extracted requirements and interaction
   */
  static async evaluateLead({ workspaceId, leadId, actorId = null }) {
    const lead = await Lead.findOne({ _id: leadId, workspaceId });
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const reqs = (await LeadRequirement.findOne({ leadId, workspaceId })) || {};
    const workspace = await Workspace.findById(workspaceId);
    const weights = workspace?.settings?.scoringWeights || {
      serviceFit: 25,
      budgetFit: 20,
      timelineReadiness: 20,
      requirementCompleteness: 15,
      engagementIntent: 20
    };

    let serviceFitScore = 0;
    let serviceFitReason = 'Service interest not yet clarified';

    let budgetFitScore = 0;
    let budgetFitReason = 'Budget not yet discussed';

    let timelineScore = 0;
    let timelineReason = 'Project timeline not yet specified';

    let completenessScore = 0;
    let completenessReason = 'Requirements are minimal';

    let engagementScore = 10; // Baseline for starting a conversation
    let engagementReason = 'Active discovery conversation';

    const rulesTriggered = [];

    // 1. Service Fit
    if (lead.serviceInterest || reqs.serviceCategory) {
      serviceFitScore = weights.serviceFit;
      serviceFitReason = `Clear service alignment with ${reqs.serviceCategory || 'catalog offering'}`;
      rulesTriggered.push({
        ruleName: 'SERVICE_MATCH',
        pointsAwarded: serviceFitScore,
        reason: serviceFitReason
      });
    } else {
      serviceFitScore = Math.round(weights.serviceFit * 0.4);
      serviceFitReason = 'General inquiry, specific service matching in progress';
    }

    // 2. Budget Compatibility
    let targetService = null;
    if (lead.serviceInterest) {
      targetService = await Service.findById(lead.serviceInterest);
    }

    const minServicePricePaise = targetService ? targetService.basePricePaise : 2000000; // default ₹20,000

    if (reqs.budgetRange && (reqs.budgetRange.minPaise > 0 || reqs.budgetRange.maxPaise > 0)) {
      const maxBudget = reqs.budgetRange.maxPaise || reqs.budgetRange.minPaise;
      if (maxBudget >= minServicePricePaise) {
        budgetFitScore = weights.budgetFit;
        budgetFitReason = `Budget (${reqs.budgetRange.rawText || '₹' + maxBudget / 100}) meets or exceeds service baseline`;
      } else {
        budgetFitScore = Math.round(weights.budgetFit * 0.35);
        budgetFitReason = `Provided budget (${reqs.budgetRange.rawText}) is below standard baseline (₹${minServicePricePaise / 100})`;
      }
      rulesTriggered.push({
        ruleName: 'BUDGET_ANALYZED',
        pointsAwarded: budgetFitScore,
        reason: budgetFitReason
      });
    } else {
      budgetFitScore = Math.round(weights.budgetFit * 0.4);
      budgetFitReason = 'Budget not specified yet; standard pricing assumed';
    }

    // 3. Timeline Readiness
    if (reqs.expectedTimeline && (reqs.expectedTimeline.deadlineDays || reqs.expectedTimeline.rawText)) {
      const days = reqs.expectedTimeline.deadlineDays;
      if (days && days < 7) {
        timelineScore = Math.round(weights.timelineReadiness * 0.7);
        timelineReason = `Urgent timeline (${reqs.expectedTimeline.rawText}) may require rush scheduling`;
      } else {
        timelineScore = weights.timelineReadiness;
        timelineReason = `Feasible delivery timeline specified (${reqs.expectedTimeline.rawText || days + ' days'})`;
      }
      rulesTriggered.push({
        ruleName: 'TIMELINE_VERIFIED',
        pointsAwarded: timelineScore,
        reason: timelineReason
      });
    } else {
      timelineScore = Math.round(weights.timelineReadiness * 0.3);
      timelineReason = 'Timeline open / flexible';
    }

    // 4. Requirement Completeness
    let completenessFactors = 0;
    if (reqs.problemToSolve) completenessFactors += 1;
    if (reqs.requiredFeatures && reqs.requiredFeatures.length > 0) completenessFactors += 2;
    if (reqs.businessType) completenessFactors += 1;
    if (reqs.approxScope) completenessFactors += 1;

    const completenessRatio = Math.min(1.0, completenessFactors / 5.0);
    completenessScore = Math.round(weights.requirementCompleteness * completenessRatio);
    completenessReason = `Discovered ${completenessFactors} of 5 key requirement dimensions`;
    rulesTriggered.push({
      ruleName: 'COMPLETENESS_CHECK',
      pointsAwarded: completenessScore,
      reason: completenessReason
    });

    // 5. Engagement & Intent
    if (lead.email || lead.phone) {
      engagementScore += 5;
    }
    if (lead.salesStage === PIPELINE_STAGES.MEETING_SCHEDULED) {
      engagementScore = weights.engagementIntent;
      engagementReason = 'High intent: Consultation appointment booked';
    } else if (lead.salesStage === PIPELINE_STAGES.ESTIMATE_SENT) {
      engagementScore = Math.min(weights.engagementIntent, engagementScore + 5);
      engagementReason = 'Strong intent: Requested and reviewed estimate';
    } else {
      engagementScore = Math.min(weights.engagementIntent, engagementScore);
      engagementReason = 'Active conversational discovery';
    }
    rulesTriggered.push({
      ruleName: 'ENGAGEMENT_INTENT',
      pointsAwarded: engagementScore,
      reason: engagementReason
    });

    const totalScore = Math.min(100, Math.max(0, serviceFitScore + budgetFitScore + timelineScore + completenessScore + engagementScore));

    // Determine priority
    let priority = LEAD_PRIORITIES.LOW;
    if (totalScore >= (workspace?.settings?.handoffThresholds?.minScoreForHighPriority || 75)) {
      priority = LEAD_PRIORITIES.HIGH;
    } else if (totalScore >= 50) {
      priority = LEAD_PRIORITIES.MEDIUM;
    } else {
      priority = LEAD_PRIORITIES.LOW;
    }

    // Check if manual override exists
    const existingAssessment = await QualificationAssessment.findOne({ leadId, workspaceId });
    let finalScore = totalScore;
    if (existingAssessment?.manualOverride?.isOverridden) {
      finalScore = existingAssessment.manualOverride.originalScore !== undefined
        ? existingAssessment.totalScore
        : totalScore;
    }

    const scoreExplanation = {
      serviceFit: { score: serviceFitScore, reason: serviceFitReason },
      budgetFit: { score: budgetFitScore, reason: budgetFitReason },
      timelineReadiness: { score: timelineScore, reason: timelineReason },
      requirementCompleteness: { score: completenessScore, reason: completenessReason },
      engagementIntent: { score: engagementScore, reason: engagementReason }
    };

    // Update or create QualificationAssessment
    await QualificationAssessment.findOneAndUpdate(
      { leadId, workspaceId },
      {
        scores: {
          serviceFit: serviceFitScore,
          budgetFit: budgetFitScore,
          timelineReadiness: timelineScore,
          requirementCompleteness: completenessScore,
          engagementIntent: engagementScore
        },
        totalScore: finalScore,
        rulesTriggered
      },
      { upsert: true, new: true }
    );

    // Update Lead document
    lead.score = finalScore;
    lead.priority = priority;
    lead.scoreExplanation = scoreExplanation;

    if (totalScore >= 70 && lead.salesStage === PIPELINE_STAGES.NEW) {
      lead.salesStage = PIPELINE_STAGES.QUALIFIED;
    }

    await lead.save();

    // Trigger high-value notification if applicable
    const highValueThreshold = workspace?.settings?.handoffThresholds?.highValueLeadThresholdPaise || 10000000;
    if (lead.estimatedValuePaise >= highValueThreshold || priority === LEAD_PRIORITIES.HIGH) {
      await sendNotification({
        workspaceId,
        userId: lead.assignedTo,
        title: `🔥 High Priority Lead: ${lead.name}`,
        message: `Lead scored ${finalScore}/100 with estimated value ₹${(lead.estimatedValuePaise / 100).toLocaleString('en-IN')}`,
        type: 'high_value_lead',
        link: `/leads/${lead._id}`
      });
    }

    return {
      totalScore: finalScore,
      priority,
      scores: {
        serviceFit: serviceFitScore,
        budgetFit: budgetFitScore,
        timelineReadiness: timelineScore,
        requirementCompleteness: completenessScore,
        engagementIntent: engagementScore
      },
      explanation: scoreExplanation,
      rulesTriggered
    };
  }

  /**
   * Manual override of lead score by authorized user
   */
  static async overrideScore({ workspaceId, leadId, newScore, reason, actorId }) {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    const lead = await Lead.findOne({ _id: leadId, workspaceId });
    if (!lead) throw new Error('Lead not found');

    const previousScore = lead.score;

    let priority = LEAD_PRIORITIES.LOW;
    if (newScore >= 75) priority = LEAD_PRIORITIES.HIGH;
    else if (newScore >= 50) priority = LEAD_PRIORITIES.MEDIUM;

    lead.score = newScore;
    lead.priority = priority;
    await lead.save();

    await QualificationAssessment.findOneAndUpdate(
      { leadId, workspaceId },
      {
        totalScore: newScore,
        manualOverride: {
          isOverridden: true,
          originalScore: previousScore,
          overriddenBy: actorId,
          reason,
          timestamp: new Date()
        }
      },
      { upsert: true }
    );

    await logAudit({
      workspaceId,
      userId: actorId,
      action: 'lead.score_overridden',
      resourceType: 'lead',
      resourceId: leadId,
      details: {
        previousScore,
        newScore,
        reason
      }
    });

    return { success: true, score: newScore, priority };
  }
}

module.exports = QualificationEngine;
