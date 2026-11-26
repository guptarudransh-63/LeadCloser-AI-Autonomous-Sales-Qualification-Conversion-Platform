const mongoose = require('mongoose');

const AutomationRuleSchema = new mongoose.Schema(
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
    description: {
      type: String
    },
    triggerEvent: {
      type: String,
      enum: ['lead_qualified', 'appointment_booked', 'stalled_conversation', 'high_score_reached', 'estimate_generated'],
      required: true
    },
    conditions: {
      minScore: { type: Number },
      pipelineStage: { type: String },
      inactiveHours: { type: Number }
    },
    action: {
      type: {
        type: String,
        enum: ['create_followup_draft', 'notify_rep', 'escalate_human', 'update_stage'],
        required: true
      },
      params: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

AutomationRuleSchema.index({ workspaceId: 1, triggerEvent: 1, isActive: 1 });

module.exports = mongoose.model('AutomationRule', AutomationRuleSchema);
