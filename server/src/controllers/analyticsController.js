const Lead = require('../models/Lead');
const Appointment = require('../models/Appointment');
const Estimate = require('../models/Estimate');
const Conversation = require('../models/Conversation');
const AuditLog = require('../models/AuditLog');
const { PIPELINE_STAGES, LEAD_PRIORITIES, APPOINTMENT_STATUSES } = require('../config/constants');

exports.getOverview = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLeads,
      newLeadsThisPeriod,
      qualifiedLeads,
      highPriorityLeads,
      appointmentsBooked,
      estimatesGenerated,
      wonDeals,
      lostDeals,
      avgScoreResult,
      leadsByStage,
      leadsBySource,
      recentActivity
    ] = await Promise.all([
      Lead.countDocuments({ workspaceId, isArchived: false }),
      Lead.countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo }, isArchived: false }),
      Lead.countDocuments({
        workspaceId,
        salesStage: { $in: [PIPELINE_STAGES.QUALIFIED, PIPELINE_STAGES.ESTIMATE_SENT, PIPELINE_STAGES.MEETING_SCHEDULED, PIPELINE_STAGES.NEGOTIATION, PIPELINE_STAGES.WON] }
      }),
      Lead.countDocuments({ workspaceId, priority: LEAD_PRIORITIES.HIGH }),
      Appointment.countDocuments({
        workspaceId,
        status: { $in: [APPOINTMENT_STATUSES.SCHEDULED, APPOINTMENT_STATUSES.COMPLETED] }
      }),
      Estimate.countDocuments({ workspaceId }),
      Lead.countDocuments({ workspaceId, salesStage: PIPELINE_STAGES.WON }),
      Lead.countDocuments({ workspaceId, salesStage: PIPELINE_STAGES.LOST }),
      Lead.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } }
      ]),
      Lead.aggregate([
        { $match: { workspaceId, isArchived: false } },
        { $group: { _id: '$salesStage', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { workspaceId, isArchived: false } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      AuditLog.find({ workspaceId }).populate('userId', 'name').sort({ createdAt: -1 }).limit(10)
    ]);

    const leadToQualifiedRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
    const leadToWonRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore || 0) : 0;

    // Stage order for pipeline
    const stagesOrder = Object.values(PIPELINE_STAGES);
    const stageMap = {};
    leadsByStage.forEach((s) => {
      stageMap[s._id] = s.count;
    });

    const pipelineFunnel = stagesOrder.map((stg) => ({
      stage: stg,
      label: stg.replace(/_/g, ' ').toUpperCase(),
      count: stageMap[stg] || 0
    }));

    res.json({
      success: true,
      kpis: {
        totalLeads,
        newLeadsThisPeriod,
        qualifiedLeads,
        highPriorityLeads,
        appointmentsBooked,
        estimatesGenerated,
        wonDeals,
        lostDeals,
        leadToQualifiedRate,
        leadToWonRate,
        avgScore
      },
      pipelineFunnel,
      leadsBySource: leadsBySource.map((s) => ({
        source: s._id || 'unknown',
        count: s.count
      })),
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};
