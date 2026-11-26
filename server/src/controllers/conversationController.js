const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const Workspace = require('../models/Workspace');
const { AIConversationService } = require('../services/aiConversationService');
const { logAudit } = require('../services/auditService');
const { CONVERSATION_STATUSES, CONVERSATION_OUTCOMES, ROLES } = require('../config/constants');

exports.initiateConversation = async (req, res, next) => {
  try {
    const { workspaceSlug, leadId } = req.body;
    let targetWorkspaceId = req.workspaceId;

    if (!targetWorkspaceId && workspaceSlug) {
      const ws = await Workspace.findOne({ slug: workspaceSlug });
      if (!ws) return res.status(404).json({ success: false, error: 'Workspace not found.' });
      targetWorkspaceId = ws._id;
    }

    if (!targetWorkspaceId) {
      // Pick first active workspace
      const defaultWs = await Workspace.findOne();
      if (!defaultWs) return res.status(404).json({ success: false, error: 'No active workspace found.' });
      targetWorkspaceId = defaultWs._id;
    }

    let targetLead;
    if (leadId) {
      targetLead = await Lead.findOne({ _id: leadId, workspaceId: targetWorkspaceId });
    }

    if (!targetLead) {
      const count = await Lead.countDocuments({ workspaceId: targetWorkspaceId });
      targetLead = await Lead.create({
        workspaceId: targetWorkspaceId,
        leadNumber: `LD-${1000 + count + 1}`,
        name: 'Prospect ' + (count + 1),
        source: 'chat_widget'
      });
      await LeadRequirement.create({
        workspaceId: targetWorkspaceId,
        leadId: targetLead._id
      });
    }

    let conversation = await Conversation.findOne({
      workspaceId: targetWorkspaceId,
      leadId: targetLead._id,
      status: { $in: [CONVERSATION_STATUSES.ACTIVE, CONVERSATION_STATUSES.PENDING_HUMAN_REVIEW, CONVERSATION_STATUSES.HUMAN_TAKEOVER] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        workspaceId: targetWorkspaceId,
        leadId: targetLead._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.QUALIFICATION_IN_PROGRESS
      });
    }

    res.status(201).json({
      success: true,
      conversationId: conversation._id,
      leadId: targetLead._id,
      workspaceId: targetWorkspaceId
    });
  } catch (error) {
    next(error);
  }
};

exports.listConversations = async (req, res, next) => {
  try {
    const { status, outcome } = req.query;
    const filter = { workspaceId: req.workspaceId };

    if (status) filter.status = status;
    if (outcome) filter.currentOutcome = outcome;

    const conversations = await Conversation.find(filter)
      .populate('leadId', 'name email phone companyName salesStage priority score estimatedValuePaise')
      .populate('takenOverBy', 'name email')
      .populate('currentEstimateId', 'estimateNumber version totalPaise status')
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: conversations.length, conversations });
  } catch (error) {
    next(error);
  }
};

exports.getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    })
      .populate('leadId')
      .populate('takenOverBy', 'name email')
      .populate('currentEstimateId');

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    const requirements = await LeadRequirement.findOne({ leadId: conversation.leadId._id });

    res.json({
      success: true,
      conversation,
      messages,
      requirements
    });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
      workspaceId: req.workspaceId
    }).sort({ createdAt: 1 });

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { content, senderType = 'customer' } = req.body;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const workspaceId = conversation.workspaceId;

    if (senderType === 'human_agent') {
      // Must be authenticated user
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required for agent reply.' });
      }

      const msg = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'human_agent',
        senderId: req.user._id,
        content
      });

      return res.status(201).json({ success: true, message: msg });
    }

    // Customer message processed by autonomous sales conversation engine
    const result = await AIConversationService.handleIncomingMessage({
      workspaceId,
      conversationId,
      messageText: content
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

exports.takeover = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });

    conversation.status = CONVERSATION_STATUSES.HUMAN_TAKEOVER;
    conversation.takenOverBy = req.user._id;
    conversation.takenOverAt = new Date();
    await conversation.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'conversation.takeover',
      resourceType: 'conversation',
      resourceId: conversation._id,
      details: { takenOverBy: req.user._id }
    });

    res.json({
      success: true,
      status: conversation.status,
      message: 'Human takeover activated. AI bot responses paused.'
    });
  } catch (error) {
    next(error);
  }
};

exports.resumeAI = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId
    });

    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });

    conversation.status = CONVERSATION_STATUSES.ACTIVE;
    conversation.resumedAt = new Date();
    await conversation.save();

    await logAudit({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      action: 'conversation.resumed',
      resourceType: 'conversation',
      resourceId: conversation._id
    });

    res.json({
      success: true,
      status: conversation.status,
      message: 'AI automation resumed.'
    });
  } catch (error) {
    next(error);
  }
};
