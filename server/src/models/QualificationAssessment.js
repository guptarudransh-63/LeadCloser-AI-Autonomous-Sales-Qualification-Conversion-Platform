const mongoose = require('mongoose');

const QualificationAssessmentSchema = new mongoose.Schema(
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
      unique: true,
      index: true
    },
    scores: {
      serviceFit: { type: Number, default: 0 },
      budgetFit: { type: Number, default: 0 },
      timelineReadiness: { type: Number, default: 0 },
      requirementCompleteness: { type: Number, default: 0 },
      engagementIntent: { type: Number, default: 0 }
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100
    },
    rulesTriggered: [
      {
        ruleName: { type: String, required: true },
        pointsAwarded: { type: Number, required: true },
        reason: { type: String, required: true }
      }
    ],
    manualOverride: {
      isOverridden: { type: Boolean, default: false },
      originalScore: { type: Number },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      timestamp: { type: Date }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QualificationAssessment', QualificationAssessmentSchema);
