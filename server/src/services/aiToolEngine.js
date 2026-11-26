const Service = require('../models/Service');
const PricingRule = require('../models/PricingRule');
const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const FollowUpTask = require('../models/FollowUpTask');
const PricingEngine = require('./pricingEngine');
const QualificationEngine = require('./qualificationEngine');
const SchedulingEngine = require('./schedulingEngine');
const { sendNotification } = require('./notificationService');
const { logAudit } = require('./auditService');
const { CONVERSATION_STATUSES, CONVERSATION_OUTCOMES, LEAD_PRIORITIES } = require('../config/constants');

class AIToolEngine {
  /**
   * Tool definitions schema for LLM function calling
   */
  static getToolDefinitions() {
    return [
      {
        name: 'search_services',
        description: 'Search the active service catalog by keyword, query or category to find relevant service offerings.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword to search services, e.g. "website", "coaching", "mobile app"' },
            category: { type: 'string', description: 'Optional category filter' }
          }
        }
      },
      {
        name: 'get_service_details',
        description: 'Get full details of a specific service including base price, packages, and scope constraints.',
        parameters: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'The MongoDB ObjectId of the service' }
          },
          required: ['serviceId']
        }
      },
      {
        name: 'get_pricing_rules',
        description: 'Retrieve configured add-ons and pricing rules applicable to a service.',
        parameters: {
          type: 'object',
          properties: {
            serviceId: { type: 'string', description: 'The MongoDB ObjectId of the service' }
          },
          required: ['serviceId']
        }
      },
      {
        name: 'calculate_estimate',
        description: 'Compute a transparent, deterministic price estimate in backend code using verified catalog rules.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            serviceId: { type: 'string', description: 'Service ID' },
            selectedPackageName: { type: 'string', description: 'Package name (e.g. "Starter", "Standard", "Pro")' },
            addonCodes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of add-on codes (e.g. ["student_portal", "payment_gateway", "admin_dashboard"])'
            },
            complexityLevel: { type: 'string', enum: ['standard', 'medium', 'high'] }
          },
          required: ['leadId', 'serviceId']
        }
      },
      {
        name: 'get_lead_profile',
        description: 'Get current CRM lead profile and known extracted requirements.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' }
          },
          required: ['leadId']
        }
      },
      {
        name: 'update_lead_requirements',
        description: 'Update structured requirements extracted from the conversation into the CRM.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            serviceCategory: { type: 'string' },
            businessType: { type: 'string' },
            problemToSolve: { type: 'string' },
            requiredFeatures: { type: 'array', items: { type: 'string' } },
            preferredIntegrations: { type: 'array', items: { type: 'string' } },
            approxScope: { type: 'string' },
            budgetMinPaise: { type: 'number' },
            budgetMaxPaise: { type: 'number' },
            budgetRawText: { type: 'string' },
            timelineDeadlineDays: { type: 'number' },
            timelineRawText: { type: 'string' },
            prospectName: { type: 'string' },
            prospectEmail: { type: 'string' },
            prospectPhone: { type: 'string' }
          },
          required: ['leadId']
        }
      },
      {
        name: 'calculate_lead_score',
        description: 'Recalculate qualification score (0-100) and priority with transparent multi-factor breakdown.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' }
          },
          required: ['leadId']
        }
      },
      {
        name: 'search_available_slots',
        description: 'Search available appointment slots for discovery calls or consultations based on real staff availability.',
        parameters: {
          type: 'object',
          properties: {
            startDateStr: { type: 'string', description: 'Start date in YYYY-MM-DD' },
            endDateStr: { type: 'string', description: 'End date in YYYY-MM-DD' },
            salesRepId: { type: 'string', description: 'Optional sales representative ID' }
          },
          required: ['startDateStr', 'endDateStr']
        }
      },
      {
        name: 'book_appointment',
        description: 'Book an appointment slot atomically with concurrency check and idempotency protection.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            startTime: { type: 'string', description: 'ISO 8601 start timestamp' },
            appointmentType: { type: 'string', enum: ['discovery_call', 'solution_demo', 'consultation'] },
            idempotencyKey: { type: 'string', description: 'Unique idempotency key' }
          },
          required: ['leadId', 'startTime']
        }
      },
      {
        name: 'get_conversation_history',
        description: 'Retrieve the recent message history for the current conversation.',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', description: 'Conversation ID' },
            limit: { type: 'number', description: 'Max messages to retrieve' }
          },
          required: ['conversationId']
        }
      },
      {
        name: 'create_follow_up_draft',
        description: 'Create a personalized follow-up draft for sales rep review.',
        parameters: {
          type: 'object',
          properties: {
            leadId: { type: 'string', description: 'Lead ID' },
            type: { type: 'string', enum: ['post_consultation', 'stalled_lead_nudge', 'estimate_reminder', 'high_priority_alert'] },
            subject: { type: 'string' },
            bodyDraft: { type: 'string' }
          },
          required: ['leadId', 'subject', 'bodyDraft']
        }
      },
      {
        name: 'request_human_handoff',
        description: 'Escalate the conversation to a human salesperson when requirements are ambiguous, complex, or high-value.',
        parameters: {
          type: 'object',
          properties: {
            conversationId: { type: 'string', description: 'Conversation ID' },
            reason: { type: 'string', description: 'Clear reason why human intervention is required' }
          },
          required: ['conversationId', 'reason']
        }
      }
    ];
  }

  /**
   * Execute an AI tool with authorization and strict schema validation
   */
  static async executeTool({ workspaceId, toolName, args, conversationId = null }) {
    const startTime = Date.now();
    try {
      let result;

      switch (toolName) {
        case 'search_services': {
          const filter = { workspaceId, isActive: true };
          if (args.category) filter.category = args.category;
          if (args.query) {
            filter.$or = [
              { name: { $regex: args.query, $options: 'i' } },
              { description: { $regex: args.query, $options: 'i' } }
            ];
          }
          const services = await Service.find(filter).select('name slug category description basePricePaise packages');
          result = {
            count: services.length,
            services: services.map((s) => ({
              id: s._id,
              name: s.name,
              category: s.category,
              description: s.description,
              basePrice: `₹${(s.basePricePaise / 100).toLocaleString('en-IN')}`,
              packages: s.packages.map((p) => ({
                name: p.name,
                price: `₹${(p.pricePaise / 100).toLocaleString('en-IN')}`,
                features: p.includedFeatures
              }))
            }))
          };
          break;
        }

        case 'get_service_details': {
          const service = await Service.findOne({ _id: args.serviceId, workspaceId });
          if (!service) throw new Error('Service not found');
          const rules = await PricingRule.find({ workspaceId, serviceId: service._id, isActive: true });
          result = {
            id: service._id,
            name: service.name,
            category: service.category,
            description: service.description,
            basePrice: `₹${(service.basePricePaise / 100).toLocaleString('en-IN')}`,
            packages: service.packages,
            scopeConstraints: service.scopeConstraints,
            addons: rules.map((r) => ({
              code: r.code,
              name: r.name,
              price: `₹${(r.amountPaise / 100).toLocaleString('en-IN')}`
            }))
          };
          break;
        }

        case 'get_pricing_rules': {
          const rules = await PricingRule.find({
            workspaceId,
            serviceId: { $in: [args.serviceId, null] },
            isActive: true
          });
          result = {
            rules: rules.map((r) => ({
              code: r.code,
              name: r.name,
              amount: `₹${(r.amountPaise / 100).toLocaleString('en-IN')}`,
              type: r.ruleType
            }))
          };
          break;
        }

        case 'calculate_estimate': {
          const calc = await PricingEngine.calculate({
            workspaceId,
            serviceId: args.serviceId,
            selectedPackageName: args.selectedPackageName,
            addonCodes: args.addonCodes || [],
            complexityLevel: args.complexityLevel || 'standard'
          });

          // Save estimate in CRM
          const estimate = await PricingEngine.createOrUpdateEstimate({
            workspaceId,
            leadId: args.leadId,
            serviceId: args.serviceId,
            calculationResult: calc
          });

          if (conversationId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              currentEstimateId: estimate._id,
              currentOutcome: CONVERSATION_OUTCOMES.ESTIMATE_READY
            });
          }

          // Recalculate lead score
          await QualificationEngine.evaluateLead({ workspaceId, leadId: args.leadId });

          result = {
            estimateId: estimate._id,
            estimateNumber: estimate.estimateNumber,
            version: estimate.version,
            subtotal: calc.formattedSubtotal,
            total: calc.formattedTotal,
            lineItems: calc.lineItems.map((li) => ({
              name: li.name,
              price: `₹${(li.totalPaise / 100).toLocaleString('en-IN')}`
            })),
            assumptions: calc.assumptions,
            exclusions: calc.exclusions,
            requiresHumanReview: calc.requiresHumanReview
          };
          break;
        }

        case 'get_lead_profile': {
          const lead = await Lead.findOne({ _id: args.leadId, workspaceId }).populate('serviceInterest');
          const reqs = await LeadRequirement.findOne({ leadId: args.leadId, workspaceId });
          result = {
            lead: {
              id: lead?._id,
              name: lead?.name,
              email: lead?.email,
              phone: lead?.phone,
              salesStage: lead?.salesStage,
              priority: lead?.priority,
              score: lead?.score
            },
            requirements: reqs
          };
          break;
        }

        case 'update_lead_requirements': {
          const updateFields = {};
          if (args.serviceCategory) updateFields.serviceCategory = args.serviceCategory;
          if (args.businessType) updateFields.businessType = args.businessType;
          if (args.problemToSolve) updateFields.problemToSolve = args.problemToSolve;
          if (args.requiredFeatures) updateFields.requiredFeatures = args.requiredFeatures;
          if (args.preferredIntegrations) updateFields.preferredIntegrations = args.preferredIntegrations;
          if (args.approxScope) updateFields.approxScope = args.approxScope;

          if (args.budgetMinPaise || args.budgetMaxPaise || args.budgetRawText) {
            updateFields.budgetRange = {
              minPaise: args.budgetMinPaise || 0,
              maxPaise: args.budgetMaxPaise || 0,
              currency: 'INR',
              rawText: args.budgetRawText || ''
            };
          }

          if (args.timelineDeadlineDays || args.timelineRawText) {
            updateFields.expectedTimeline = {
              deadlineDays: args.timelineDeadlineDays,
              rawText: args.timelineRawText || ''
            };
          }

          updateFields.lastExtractedAt = new Date();

          const reqDoc = await LeadRequirement.findOneAndUpdate(
            { leadId: args.leadId, workspaceId },
            { $set: updateFields },
            { upsert: true, new: true }
          );

          // Update Lead basic contact info if prospect shared name/email/phone
          const leadUpdates = {};
          if (args.prospectName) leadUpdates.name = args.prospectName;
          if (args.prospectEmail) leadUpdates.email = args.prospectEmail;
          if (args.prospectPhone) leadUpdates.phone = args.prospectPhone;

          if (Object.keys(leadUpdates).length > 0) {
            await Lead.findByIdAndUpdate(args.leadId, leadUpdates);
          }

          result = { success: true, updatedFields: Object.keys(updateFields) };
          break;
        }

        case 'calculate_lead_score': {
          const scoreResult = await QualificationEngine.evaluateLead({
            workspaceId,
            leadId: args.leadId
          });
          result = scoreResult;
          break;
        }

        case 'search_available_slots': {
          result = await SchedulingEngine.getAvailableSlots({
            workspaceId,
            salesRepId: args.salesRepId,
            startDateStr: args.startDateStr,
            endDateStr: args.endDateStr
          });
          break;
        }

        case 'book_appointment': {
          const bookingResult = await SchedulingEngine.bookAppointment({
            workspaceId,
            leadId: args.leadId,
            startTime: args.startTime,
            appointmentType: args.appointmentType || 'consultation',
            idempotencyKey: args.idempotencyKey
          });

          if (conversationId) {
            await Conversation.findByIdAndUpdate(conversationId, {
              currentOutcome: CONVERSATION_OUTCOMES.APPOINTMENT_BOOKED
            });
          }

          result = {
            appointmentId: bookingResult.appointment._id,
            startTime: bookingResult.appointment.startTime,
            endTime: bookingResult.appointment.endTime,
            meetingLink: bookingResult.appointment.meetingLink,
            salesRep: bookingResult.appointment.salesRepId?.name,
            message: bookingResult.message
          };
          break;
        }

        case 'get_conversation_history': {
          const limit = args.limit || 10;
          const messages = await Message.find({
            conversationId: args.conversationId,
            isInternalNote: false
          })
            .sort({ createdAt: -1 })
            .limit(limit);

          result = {
            messages: messages.reverse().map((m) => ({
              senderType: m.senderType,
              content: m.content,
              createdAt: m.createdAt
            }))
          };
          break;
        }

        case 'create_follow_up_draft': {
          const lead = await Lead.findById(args.leadId);
          const task = await FollowUpTask.create({
            workspaceId,
            leadId: args.leadId,
            salesRepId: lead?.assignedTo,
            type: args.type || 'post_consultation',
            subject: args.subject,
            bodyDraft: args.bodyDraft,
            status: 'draft',
            requiresApproval: true
          });
          result = { taskId: task._id, status: 'draft_created' };
          break;
        }

        case 'request_human_handoff': {
          const conv = await Conversation.findOne({ _id: args.conversationId, workspaceId });
          if (conv) {
            conv.status = CONVERSATION_STATUSES.PENDING_HUMAN_REVIEW;
            conv.currentOutcome = CONVERSATION_OUTCOMES.HUMAN_REVIEW_REQUIRED;
            conv.escalationReason = args.reason;
            await conv.save();

            const lead = await Lead.findById(conv.leadId);
            if (lead) {
              lead.priority = LEAD_PRIORITIES.HIGH;
              await lead.save();
            }

            await sendNotification({
              workspaceId,
              userId: lead?.assignedTo,
              title: '🚨 Human Handoff Requested',
              message: `Conversation ${conv._id} escalated: ${args.reason}`,
              type: 'handoff_request',
              link: `/conversations/${conv._id}`
            });

            await logAudit({
              workspaceId,
              action: 'conversation.handoff_requested',
              resourceType: 'conversation',
              resourceId: conv._id,
              details: { reason: args.reason }
            });
          }
          result = { handoffStatus: 'pending_human_review', reason: args.reason };
          break;
        }

        default:
          throw new Error(`Unknown tool: '${toolName}'`);
      }

      return {
        toolName,
        args,
        result,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        toolName,
        args,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }
}

module.exports = AIToolEngine;
