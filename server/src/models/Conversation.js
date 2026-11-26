const mongoose = require('mongoose');
const { CONVERSATION_STATUSES, CONVERSATION_OUTCOMES } = require('../config/constants');

const ConversationSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      default: 'web_chat'
    },
    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUSES),
      default: CONVERSATION_STATUSES.ACTIVE
    },
    currentOutcome: {
      type: String,
      enum: Object.values(CONVERSATION_OUTCOMES),
      default: CONVERSATION_OUTCOMES.QUALIFICATION_IN_PROGRESS
    },
    escalationReason: {
      type: String
    },
    takenOverBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    takenOverAt: {
      type: Date
    },
    resumedAt: {
      type: Date
    },
    // Track topics already queried to prevent asking redundant questions
    questionsAnswered: [
      {
        topic: String,
        askedAt: { type: Date, default: Date.now },
        answered: { type: Boolean, default: true }
      }
    ],
    currentEstimateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Estimate'
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

ConversationSchema.index({ workspaceId: 1, status: 1 });
ConversationSchema.index({ workspaceId: 1, currentOutcome: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
