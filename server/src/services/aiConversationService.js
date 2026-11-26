const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const Service = require('../models/Service');
const AIToolEngine = require('./aiToolEngine');
const { INTENTS, CONVERSATION_STATUSES, CONVERSATION_OUTCOMES, PIPELINE_STAGES } = require('../config/constants');
const { sendNotification } = require('./notificationService');

let ioInstance = null;
const setSocketIO = (io) => {
  ioInstance = io;
};

class AIConversationService {
  /**
   * Process an incoming customer message through the Autonomous Sales Qualification Engine
   */
  static async handleIncomingMessage({ workspaceId, conversationId, messageText }) {
    const conversation = await Conversation.findOne({ _id: conversationId, workspaceId });
    if (!conversation) throw new Error('Conversation not found');

    const lead = await Lead.findOne({ _id: conversation.leadId, workspaceId });
    if (!lead) throw new Error('Lead not found');

    // 1. Save customer message
    const customerMsg = await Message.create({
      workspaceId,
      conversationId,
      senderType: 'customer',
      content: messageText
    });

    if (ioInstance) {
      ioInstance.to(`conversation:${conversationId}`).emit('new_message', customerMsg);
    }

    // 2. Check if human takeover is active: Pause AI automated responses
    if (conversation.status === CONVERSATION_STATUSES.HUMAN_TAKEOVER) {
      return {
        isPausedForHuman: true,
        message: 'AI automation paused: Human sales agent has taken over this conversation.'
      };
    }

    // 3. Structured Intent & Requirement Extraction
    const extraction = this.extractFromText(messageText);
    customerMsg.intentDetected = extraction.intent;
    await customerMsg.save();

    // 4. Update structured requirements via tool
    const toolTraces = [];
    if (Object.keys(extraction.requirements).length > 0) {
      const updateResult = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'update_lead_requirements',
        args: {
          leadId: lead._id,
          ...extraction.requirements
        },
        conversationId
      });
      toolTraces.push(updateResult);
    }

    // 5. Check for human handoff intent
    if (
      extraction.intent === INTENTS.HUMAN_ASSISTANCE_REQUEST ||
      messageText.toLowerCase().includes('talk to human') ||
      messageText.toLowerCase().includes('speak to agent') ||
      messageText.toLowerCase().includes('real person')
    ) {
      const handoffTrace = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'request_human_handoff',
        args: {
          conversationId,
          reason: 'Prospect explicitly requested human sales representative'
        },
        conversationId
      });
      toolTraces.push(handoffTrace);

      const aiReply = "I have notified our senior sales representative to take over and assist you directly. A team member will join this conversation shortly!";
      const savedAiMsg = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'ai_agent',
        content: aiReply,
        intentDetected: extraction.intent,
        toolCalls: toolTraces
      });

      if (ioInstance) {
        ioInstance.to(`conversation:${conversationId}`).emit('new_message', savedAiMsg);
        ioInstance.to(`workspace:${workspaceId}`).emit('conversation_updated', {
          conversationId,
          status: CONVERSATION_STATUSES.PENDING_HUMAN_REVIEW
        });
      }

      return { aiResponse: aiReply, toolTraces };
    }

    // 6. Check for slot selection or booking intent
    const isBookingSlot = this.detectSlotBooking(messageText);
    if (isBookingSlot) {
      const bookingTrace = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'book_appointment',
        args: {
          leadId: lead._id,
          startTime: isBookingSlot.startTime,
          appointmentType: 'consultation',
          idempotencyKey: `chat_${lead._id}_${isBookingSlot.startTime}`
        },
        conversationId
      });
      toolTraces.push(bookingTrace);

      let aiReply;
      if (bookingTrace.result?.meetingLink) {
        aiReply = `🎉 Your consultation is confirmed for ${new Date(isBookingSlot.startTime).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}!\n\nMeeting Link: ${bookingTrace.result.meetingLink}\n\nOur team has added this to the calendar and we look forward to discussing your project in detail.`;
      } else {
        aiReply = `I couldn't confirm that exact slot: ${bookingTrace.error || 'Please pick an available time slot.'}`;
      }

      const savedAiMsg = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'ai_agent',
        content: aiReply,
        intentDetected: INTENTS.CONSULTATION_REQUEST,
        toolCalls: toolTraces
      });

      if (ioInstance) {
        ioInstance.to(`conversation:${conversationId}`).emit('new_message', savedAiMsg);
      }
      return { aiResponse: aiReply, toolTraces };
    }

    // 7. Check if consultation/slots requested
    if (
      extraction.intent === INTENTS.CONSULTATION_REQUEST ||
      extraction.intent === INTENTS.DEMO_REQUEST ||
      messageText.toLowerCase().includes('schedule') ||
      messageText.toLowerCase().includes('book demo') ||
      messageText.toLowerCase().includes('slots')
    ) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 5);

      const slotsTrace = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'search_available_slots',
        args: {
          startDateStr: today.toISOString().split('T')[0],
          endDateStr: nextWeek.toISOString().split('T')[0]
        },
        conversationId
      });
      toolTraces.push(slotsTrace);

      const slots = slotsTrace.result?.slots?.slice(0, 4) || [];
      let slotsText = '';
      if (slots.length > 0) {
        slotsText = '\n\nHere are upcoming available consultation slots:\n' +
          slots.map((s, idx) => `${idx + 1}. ${new Date(s.startTime).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`).join('\n') +
          '\n\nSimply let me know which number or time works best for you, or click to confirm!';
      } else {
        slotsText = '\n\nOur team is currently coordinating schedules. Let me connect you with an agent to lock in a time.';
      }

      const aiReply = `I'd be delighted to arrange a discovery consultation with our technical sales team.${slotsText}`;
      const savedAiMsg = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'ai_agent',
        content: aiReply,
        intentDetected: INTENTS.CONSULTATION_REQUEST,
        toolCalls: toolTraces
      });

      if (ioInstance) {
        ioInstance.to(`conversation:${conversationId}`).emit('new_message', savedAiMsg);
      }
      return { aiResponse: aiReply, toolTraces };
    }

    // 8. Find matching service or estimate
    let service = null;
    if (lead.serviceInterest) {
      service = await Service.findById(lead.serviceInterest);
    }
    if (!service) {
      const services = await Service.find({ workspaceId, isActive: true });
      if (services.length > 0) {
        // match category or default to first
        service = services.find((s) =>
          messageText.toLowerCase().includes(s.name.toLowerCase()) ||
          messageText.toLowerCase().includes(s.category.toLowerCase())
        ) || services[0];
        lead.serviceInterest = service._id;
        await lead.save();
      }
    }

    // 9. Pricing or estimate trigger
    const wantsEstimate =
      extraction.intent === INTENTS.PRICING_INQUIRY ||
      extraction.intent === INTENTS.ESTIMATE_REQUEST ||
      messageText.toLowerCase().includes('cost') ||
      messageText.toLowerCase().includes('price') ||
      messageText.toLowerCase().includes('quote') ||
      messageText.toLowerCase().includes('estimate');

    const reqDoc = await LeadRequirement.findOne({ leadId: lead._id, workspaceId });
    const hasSufficientFeatures = reqDoc && reqDoc.requiredFeatures && reqDoc.requiredFeatures.length >= 2;

    if (service && (wantsEstimate || hasSufficientFeatures)) {
      // Collect matching add-ons based on required features
      const addonCodes = [];
      const lowerMsg = (messageText + ' ' + (reqDoc?.requiredFeatures?.join(' ') || '')).toLowerCase();

      if (lowerMsg.includes('student') || lowerMsg.includes('registration') || lowerMsg.includes('portal')) {
        addonCodes.push('student_portal');
      }
      if (lowerMsg.includes('fee') || lowerMsg.includes('payment') || lowerMsg.includes('online payment')) {
        addonCodes.push('payment_gateway');
      }
      if (lowerMsg.includes('admin') || lowerMsg.includes('dashboard') || lowerMsg.includes('analytics')) {
        addonCodes.push('admin_dashboard');
      }
      if (lowerMsg.includes('ecommerce') || lowerMsg.includes('store') || lowerMsg.includes('shop')) {
        addonCodes.push('ecommerce_addon');
      }

      // Calculate estimate via tool
      const estimateTrace = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'calculate_estimate',
        args: {
          leadId: lead._id,
          serviceId: service._id,
          addonCodes,
          complexityLevel: lowerMsg.includes('complex') || lowerMsg.includes('custom') ? 'medium' : 'standard'
        },
        conversationId
      });
      toolTraces.push(estimateTrace);

      // Recalculate score via tool
      const scoreTrace = await AIToolEngine.executeTool({
        workspaceId,
        toolName: 'calculate_lead_score',
        args: { leadId: lead._id },
        conversationId
      });
      toolTraces.push(scoreTrace);

      const est = estimateTrace.result;
      const breakdownLines = est.lineItems.map((li) => `• ${li.name}: ${li.price}`).join('\n');

      let followUpQuestion = '';
      if (!reqDoc?.expectedTimeline?.rawText && !this.hasAskedTopic(conversation, 'timeline')) {
        followUpQuestion = '\n\nWhat is your target timeline or completion deadline for this project?';
        this.recordAskedTopic(conversation, 'timeline');
      } else if (!reqDoc?.budgetRange?.rawText && !this.hasAskedTopic(conversation, 'budget')) {
        followUpQuestion = '\n\nDo you have a specific allocated budget range in mind?';
        this.recordAskedTopic(conversation, 'budget');
      } else {
        followUpQuestion = '\n\nWould you like to schedule a quick 30-minute consultation with our lead technical architect to review these requirements?';
      }

      await conversation.save();

      const aiReply = `Based on your requirements for a **${service.name}** with ${reqDoc?.requiredFeatures?.join(', ') || 'custom features'}, here is our transparent estimate breakdown:\n\n${breakdownLines}\n\n**Total Estimated Investment:** ${est.total}\n\n*Note: This is a preliminary estimate based on standard scope. Final binding quote is validated during consultation.*${followUpQuestion}`;

      const savedAiMsg = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'ai_agent',
        content: aiReply,
        intentDetected: INTENTS.PRICING_INQUIRY,
        toolCalls: toolTraces
      });

      if (ioInstance) {
        ioInstance.to(`conversation:${conversationId}`).emit('new_message', savedAiMsg);
        ioInstance.to(`conversation:${conversationId}`).emit('estimate_updated', est);
      }
      return { aiResponse: aiReply, toolTraces };
    }

    // 10. Sequential Discovery Question (Avoid repeating answered questions)
    let aiReply = '';
    if (!reqDoc?.problemToSolve && !this.hasAskedTopic(conversation, 'problem')) {
      aiReply = "Thanks for reaching out! To give you the most accurate solution and pricing, could you share a bit more about your business and the core problem you're looking to solve?";
      this.recordAskedTopic(conversation, 'problem');
    } else if ((!reqDoc?.requiredFeatures || reqDoc.requiredFeatures.length === 0) && !this.hasAskedTopic(conversation, 'features')) {
      aiReply = "Understood. What specific features or integrations are must-haves for this project (e.g. user authentication, payment processing, reports)?";
      this.recordAskedTopic(conversation, 'features');
    } else if (!reqDoc?.expectedTimeline?.rawText && !this.hasAskedTopic(conversation, 'timeline')) {
      aiReply = "Got it! What is your anticipated project timeline or desired launch date?";
      this.recordAskedTopic(conversation, 'timeline');
    } else if (!reqDoc?.budgetRange?.rawText && !this.hasAskedTopic(conversation, 'budget')) {
      aiReply = "Helpful context! Do you have a preferred budget bracket for this rollout?";
      this.recordAskedTopic(conversation, 'budget');
    } else {
      aiReply = "Thank you for sharing those details. Would you like me to prepare a customized estimate breakdown or book a brief discovery consultation?";
    }

    await conversation.save();

    // Recalculate score
    const scoreTrace = await AIToolEngine.executeTool({
      workspaceId,
      toolName: 'calculate_lead_score',
      args: { leadId: lead._id },
      conversationId
    });
    toolTraces.push(scoreTrace);

    const savedAiMsg = await Message.create({
      workspaceId,
      conversationId,
      senderType: 'ai_agent',
      content: aiReply,
      intentDetected: extraction.intent,
      toolCalls: toolTraces
    });

    if (ioInstance) {
      ioInstance.to(`conversation:${conversationId}`).emit('new_message', savedAiMsg);
    }

    return { aiResponse: aiReply, toolTraces };
  }

  /**
   * Helper to check if a topic was already questioned
   */
  static hasAskedTopic(conversation, topic) {
    if (!conversation.questionsAnswered) return false;
    return conversation.questionsAnswered.some((q) => q.topic === topic);
  }

  static recordAskedTopic(conversation, topic) {
    if (!conversation.questionsAnswered) conversation.questionsAnswered = [];
    conversation.questionsAnswered.push({ topic, askedAt: new Date(), answered: true });
  }

  /**
   * Rule-based entity & requirement extraction
   */
  static extractFromText(text) {
    const lower = text.toLowerCase();
    const requirements = {};
    let intent = INTENTS.REQUIREMENT_DISCOVERY;

    // Detect Intent
    if (lower.includes('cost') || lower.includes('price') || lower.includes('estimate') || lower.includes('quote')) {
      intent = INTENTS.PRICING_INQUIRY;
    } else if (lower.includes('consultation') || lower.includes('demo') || lower.includes('schedule') || lower.includes('call') || lower.includes('meeting')) {
      intent = INTENTS.CONSULTATION_REQUEST;
    } else if (lower.includes('human') || lower.includes('agent') || lower.includes('person') || lower.includes('manager')) {
      intent = INTENTS.HUMAN_ASSISTANCE_REQUEST;
    } else if (lower.includes('budget')) {
      intent = INTENTS.BUDGET_DISCUSSION;
    } else if (lower.includes('timeline') || lower.includes('deadline') || lower.includes('month') || lower.includes('week')) {
      intent = INTENTS.TIMELINE_DISCUSSION;
    }

    // Extract business type & service category
    if (lower.includes('coaching') || lower.includes('institute') || lower.includes('school') || lower.includes('academy')) {
      requirements.businessType = 'Coaching / Educational Institute';
      requirements.serviceCategory = 'Web Development & Learning Platform';
    } else if (lower.includes('ecommerce') || lower.includes('store') || lower.includes('shop')) {
      requirements.businessType = 'E-commerce Business';
      requirements.serviceCategory = 'E-commerce Platform';
    } else if (lower.includes('clinic') || lower.includes('hospital') || lower.includes('healthcare')) {
      requirements.businessType = 'Healthcare / Clinic';
      requirements.serviceCategory = 'Healthcare Portal';
    } else if (lower.includes('website') || lower.includes('portal')) {
      requirements.serviceCategory = 'Custom Web Application';
    }

    // Extract features
    const features = [];
    if (lower.includes('student registration') || lower.includes('registration') || lower.includes('sign up')) {
      features.push('Student Registration');
    }
    if (lower.includes('fee tracking') || lower.includes('payment') || lower.includes('fee') || lower.includes('checkout')) {
      features.push('Online Fee & Payment Tracking');
    }
    if (lower.includes('admin dashboard') || lower.includes('dashboard') || lower.includes('admin portal')) {
      features.push('Admin Management Dashboard');
    }
    if (lower.includes('mobile responsive') || lower.includes('mobile app')) {
      features.push('Mobile App / Responsive View');
    }
    if (lower.includes('whatsapp') || lower.includes('sms')) {
      features.push('WhatsApp/SMS Notifications');
    }
    if (features.length > 0) {
      requirements.requiredFeatures = features;
      requirements.problemToSolve = `Build digital platform with: ${features.join(', ')}`;
    }

    // Extract Budget
    const budgetMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)\s*(?:to|-)\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i) ||
                        text.match(/(?:budget|around|about|under)?\s*(?:₹|rs\.?|inr)\s*(\d+[\d,]*)/i);
    if (budgetMatch) {
      requirements.budgetRawText = budgetMatch[0].trim();
      const num1 = parseInt(budgetMatch[1].replace(/,/g, ''), 10) * 100;
      const num2 = budgetMatch[2] ? parseInt(budgetMatch[2].replace(/,/g, ''), 10) * 100 : num1;
      requirements.budgetMinPaise = Math.min(num1, num2);
      requirements.budgetMaxPaise = Math.max(num1, num2);
    }

    // Extract Timeline
    const timelineMatch = text.match(/(\d+)\s*(?:days?|weeks?|months?)/i) || text.match(/(asap|urgently|immediate|next month)/i);
    if (timelineMatch) {
      requirements.timelineRawText = timelineMatch[0].trim();
      if (timelineMatch[0].toLowerCase().includes('week')) {
        requirements.timelineDeadlineDays = (parseInt(timelineMatch[1], 10) || 1) * 7;
      } else if (timelineMatch[0].toLowerCase().includes('month')) {
        requirements.timelineDeadlineDays = (parseInt(timelineMatch[1], 10) || 1) * 30;
      } else if (timelineMatch[0].toLowerCase().includes('day')) {
        requirements.timelineDeadlineDays = parseInt(timelineMatch[1], 10) || 7;
      }
    }

    // Extract Contact
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    if (emailMatch) {
      requirements.prospectEmail = emailMatch[0].toLowerCase();
    }
    const phoneMatch = text.match(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
    if (phoneMatch) {
      requirements.prospectPhone = phoneMatch[0].trim();
    }

    return { intent, requirements };
  }

  /**
   * Helper to detect if user is choosing a slot
   */
  static detectSlotBooking(text) {
    const isoMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (isoMatch) {
      return { startTime: isoMatch[0] };
    }
    return null;
  }
}

module.exports = { AIConversationService, setSocketIO };
