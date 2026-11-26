const mongoose = require('mongoose');

const LeadRequirementSchema = new mongoose.Schema(
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
    serviceCategory: {
      type: String,
      trim: true
    },
    businessType: {
      type: String,
      trim: true
    },
    problemToSolve: {
      type: String,
      trim: true
    },
    requiredFeatures: [
      {
        type: String,
        trim: true
      }
    ],
    preferredIntegrations: [
      {
        type: String,
        trim: true
      }
    ],
    approxScope: {
      type: String,
      trim: true
    },
    budgetRange: {
      minPaise: { type: Number, default: 0 },
      maxPaise: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      rawText: { type: String }
    },
    expectedTimeline: {
      deadlineDays: { type: Number },
      targetDate: { type: Date },
      rawText: { type: String }
    },
    decisionTimeline: {
      type: String
    },
    additionalConstraints: {
      type: String
    },
    unresolvedQuestions: [
      {
        type: String
      }
    ],
    confirmedFields: [
      {
        type: String
      }
    ],
    lastExtractedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeadRequirement', LeadRequirementSchema);
