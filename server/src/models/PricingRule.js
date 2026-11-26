const mongoose = require('mongoose');

const PricingRuleSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String
    },
    ruleType: {
      type: String,
      enum: ['addon', 'quantity_tier', 'complexity_multiplier', 'custom_factor'],
      default: 'addon'
    },
    // Amount in paise for fixed/addon or basis points (10000 = 1.0x) for multiplier
    amountPaise: {
      type: Number,
      required: true,
      default: 0
    },
    minQty: {
      type: Number,
      default: 1
    },
    maxQty: {
      type: Number,
      default: 100
    },
    requiresHumanReview: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

PricingRuleSchema.index({ workspaceId: 1, serviceId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PricingRule', PricingRuleSchema);
