const mongoose = require('mongoose');
const { PIPELINE_STAGES, LEAD_PRIORITIES } = require('../config/constants');

const LeadSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    leadNumber: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true,
      default: 'Anonymous Prospect'
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      default: 'chat_widget'
    },
    serviceInterest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    salesStage: {
      type: String,
      enum: Object.values(PIPELINE_STAGES),
      default: PIPELINE_STAGES.NEW
    },
    priority: {
      type: String,
      enum: Object.values(LEAD_PRIORITIES),
      default: LEAD_PRIORITIES.NEEDS_REVIEW
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    scoreExplanation: {
      serviceFit: { score: Number, reason: String },
      budgetFit: { score: Number, reason: String },
      timelineReadiness: { score: Number, reason: String },
      requirementCompleteness: { score: Number, reason: String },
      engagementIntent: { score: Number, reason: String }
    },
    estimatedValuePaise: {
      type: Number,
      default: 0
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nextFollowUpDate: {
      type: Date
    },
    lostReason: {
      type: String
    },
    notes: [
      {
        text: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

LeadSchema.index({ workspaceId: 1, leadNumber: 1 }, { unique: true });
LeadSchema.index({ workspaceId: 1, email: 1 });
LeadSchema.index({ workspaceId: 1, salesStage: 1 });
LeadSchema.index({ workspaceId: 1, priority: 1 });
LeadSchema.index({ workspaceId: 1, assignedTo: 1 });
LeadSchema.index({ workspaceId: 1, nextFollowUpDate: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
