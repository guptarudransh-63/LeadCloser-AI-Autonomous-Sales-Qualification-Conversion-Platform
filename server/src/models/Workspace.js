const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    businessType: {
      type: String,
      default: 'IT & Digital Services'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    settings: {
      scoringWeights: {
        serviceFit: { type: Number, default: 25 },
        budgetFit: { type: Number, default: 20 },
        timelineReadiness: { type: Number, default: 20 },
        requirementCompleteness: { type: Number, default: 15 },
        engagementIntent: { type: Number, default: 20 }
      },
      handoffThresholds: {
        minScoreForHighPriority: { type: Number, default: 75 },
        maxAutoDiscountPaise: { type: Number, default: 0 },
        highValueLeadThresholdPaise: { type: Number, default: 10000000 } // ₹1,00,000
      },
      autoFollowUpEnabled: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', WorkspaceSchema);
