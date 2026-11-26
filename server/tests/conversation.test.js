const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AIConversationService } = require('../src/services/aiConversationService');
const Workspace = require('../src/models/Workspace');
const Service = require('../src/models/Service');
const PricingRule = require('../src/models/PricingRule');
const Lead = require('../src/models/Lead');
const LeadRequirement = require('../src/models/LeadRequirement');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const { CONVERSATION_STATUSES, CONVERSATION_OUTCOMES } = require('../src/config/constants');

let mongoServer;
let workspaceId;
let serviceId;
let leadId;
let conversationId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const ws = await Workspace.create({ name: 'Conv Agency', slug: 'conv-agency' });
  workspaceId = ws._id;

  const s = await Service.create({
    workspaceId,
    name: 'Custom Web Application & Portal',
    slug: 'custom-web-application',
    category: 'Web Development',
    description: 'Bespoke web platforms',
    basePricePaise: 2000000 // ₹20,000
  });
  serviceId = s._id;

  await PricingRule.create([
    {
      workspaceId,
      serviceId,
      name: 'Student Portal',
      code: 'student_portal',
      amountPaise: 800000,
      isActive: true
    },
    {
      workspaceId,
      serviceId,
      name: 'Fee Tracking',
      code: 'payment_gateway',
      amountPaise: 600000,
      isActive: true
    },
    {
      workspaceId,
      serviceId,
      name: 'Admin Dashboard',
      code: 'admin_dashboard',
      amountPaise: 750000,
      isActive: true
    }
  ]);

  const lead = await Lead.create({
    workspaceId,
    leadNumber: 'LD-CONV-1',
    name: 'Coaching Prospect'
  });
  leadId = lead._id;

  await LeadRequirement.create({
    workspaceId,
    leadId
  });

  const conv = await Conversation.create({
    workspaceId,
    leadId,
    status: CONVERSATION_STATUSES.ACTIVE
  });
  conversationId = conv._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Autonomous Conversation Engine & Extraction', () => {
  test('extracts business type, features, and budget from customer message', () => {
    const text = 'Hi, I need a website for my coaching institute. I want student registration, online fee tracking, and an admin dashboard. Budget is around ₹45,000 and deadline 3 weeks.';
    const result = AIConversationService.extractFromText(text);

    expect(result.requirements.businessType).toBe('Coaching / Educational Institute');
    expect(result.requirements.requiredFeatures).toContain('Student Registration');
    expect(result.requirements.requiredFeatures).toContain('Online Fee & Payment Tracking');
    expect(result.requirements.requiredFeatures).toContain('Admin Management Dashboard');
    expect(result.requirements.budgetMinPaise).toBe(4500000); // 45,000 * 100
    expect(result.requirements.timelineDeadlineDays).toBe(21); // 3 * 7
  });

  test('processes inbound requirement and responds with deterministic estimate', async () => {
    const message = 'I need a coaching institute website with student registration, online fee tracking, and an admin dashboard. What would it cost?';

    const response = await AIConversationService.handleIncomingMessage({
      workspaceId,
      conversationId,
      messageText: message
    });

    expect(response.aiResponse).toContain('Custom Web Application & Portal');
    expect(response.aiResponse).toContain('Student Portal');
    expect(response.aiResponse).toContain('Fee Tracking');
    expect(response.aiResponse).toContain('Admin Dashboard');
    expect(response.aiResponse).toContain('Total Estimated Investment');

    // Verify tool execution trace was logged
    expect(response.toolTraces.length).toBeGreaterThan(0);
    const estTool = response.toolTraces.find((t) => t.toolName === 'calculate_estimate');
    expect(estTool).toBeDefined();
    expect(estTool.result.total).toBe('₹41,500');
  });

  test('escalates to human when prospect asks to speak with an agent', async () => {
    const response = await AIConversationService.handleIncomingMessage({
      workspaceId,
      conversationId,
      messageText: 'I would like to speak to a real person please.'
    });

    expect(response.aiResponse).toContain('notified our senior sales representative');

    const updatedConv = await Conversation.findById(conversationId);
    expect(updatedConv.status).toBe(CONVERSATION_STATUSES.PENDING_HUMAN_REVIEW);
    expect(updatedConv.currentOutcome).toBe(CONVERSATION_OUTCOMES.HUMAN_REVIEW_REQUIRED);
  });

  test('pauses AI bot replies when human takeover is active', async () => {
    // Set takeover status
    await Conversation.findByIdAndUpdate(conversationId, {
      status: CONVERSATION_STATUSES.HUMAN_TAKEOVER
    });

    const response = await AIConversationService.handleIncomingMessage({
      workspaceId,
      conversationId,
      messageText: 'Can you answer another question?'
    });

    expect(response.isPausedForHuman).toBe(true);
    expect(response.message).toContain('AI automation paused');
  });
});
