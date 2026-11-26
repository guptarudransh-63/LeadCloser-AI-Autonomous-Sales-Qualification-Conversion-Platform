const mongoose = require('mongoose');
const { PRICING_MODELS } = require('../config/constants');

const PackageTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    pricePaise: { type: Number, required: true },
    includedFeatures: [{ type: String }],
    estimatedDeliveryDays: { type: Number, default: 14 }
  },
  { _id: true }
);

const ServiceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    basePricePaise: {
      type: Number,
      required: true,
      default: 0
    },
    pricingModel: {
      type: String,
      enum: Object.values(PRICING_MODELS),
      default: PRICING_MODELS.BASE_PLUS_ADDONS
    },
    packages: [PackageTierSchema],
    scopeConstraints: {
      minDurationDays: { type: Number, default: 7 },
      maxRevisions: { type: Number, default: 3 },
      requiresCustomAssessment: { type: Boolean, default: false }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

ServiceSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
ServiceSchema.index({ workspaceId: 1, category: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
