const mongoose = require('mongoose');
const { ESTIMATE_STATUSES } = require('../config/constants');

const EstimateLineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    unitPricePaise: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    totalPaise: { type: Number, required: true },
    ruleCode: { type: String },
    isAddon: { type: Boolean, default: false }
  },
  { _id: true }
);

const EstimateSchema = new mongoose.Schema(
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
      index: true
    },
    estimateNumber: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      required: true,
      default: 1
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    status: {
      type: String,
      enum: Object.values(ESTIMATE_STATUSES),
      default: ESTIMATE_STATUSES.PRELIMINARY
    },
    currency: {
      type: String,
      default: 'INR'
    },
    subtotalPaise: {
      type: Number,
      required: true
    },
    discountPaise: {
      type: Number,
      default: 0
    },
    taxPaise: {
      type: Number,
      default: 0
    },
    totalPaise: {
      type: Number,
      required: true
    },
    lineItems: [EstimateLineItemSchema],
    assumptions: [{ type: String }],
    exclusions: [{ type: String }],
    unresolvedItems: [{ type: String }],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate'
    }
  },
  { timestamps: true }
);

EstimateSchema.index({ workspaceId: 1, estimateNumber: 1 });
EstimateSchema.index({ workspaceId: 1, leadId: 1, version: 1 });

module.exports = mongoose.model('Estimate', EstimateSchema);
