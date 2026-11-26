const mongoose = require('mongoose');

const ToolCallSchema = new mongoose.Schema(
  {
    toolName: { type: String, required: true },
    args: { type: mongoose.Schema.Types.Mixed },
    result: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    executionTimeMs: { type: Number, default: 0 }
  },
  { _id: true }
);

const MessageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderType: {
      type: String,
      enum: ['customer', 'ai_agent', 'human_agent', 'system'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    intentDetected: {
      type: String
    },
    toolCalls: [ToolCallSchema],
    isInternalNote: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
