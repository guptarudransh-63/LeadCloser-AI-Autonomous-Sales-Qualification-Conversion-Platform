module.exports = {
  ROLES: {
    OWNER: 'owner',
    SALES_AGENT: 'sales_agent',
    ADMIN: 'admin'
  },

  PIPELINE_STAGES: {
    NEW: 'new',
    CONTACTED: 'contacted',
    QUALIFYING: 'qualifying',
    QUALIFIED: 'qualified',
    ESTIMATE_SENT: 'estimate_sent',
    MEETING_SCHEDULED: 'meeting_scheduled',
    NEGOTIATION: 'negotiation',
    WON: 'won',
    LOST: 'lost'
  },

  LEAD_PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    NEEDS_REVIEW: 'needs_review'
  },

  CONVERSATION_STATUSES: {
    ACTIVE: 'active',
    PENDING_HUMAN_REVIEW: 'pending_human_review',
    HUMAN_TAKEOVER: 'human_takeover',
    COMPLETED: 'completed',
    CLOSED: 'closed'
  },

  CONVERSATION_OUTCOMES: {
    QUALIFICATION_IN_PROGRESS: 'qualification_in_progress',
    QUALIFIED: 'qualified',
    ESTIMATE_READY: 'estimate_ready',
    APPOINTMENT_REQUESTED: 'appointment_requested',
    APPOINTMENT_BOOKED: 'appointment_booked',
    HUMAN_REVIEW_REQUIRED: 'human_review_required',
    NOT_A_FIT: 'not_a_fit',
    CLOSED_LOST: 'closed_lost'
  },

  APPOINTMENT_STATUSES: {
    SCHEDULED: 'scheduled',
    RESCHEDULED: 'rescheduled',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show'
  },

  APPOINTMENT_TYPES: {
    DISCOVERY_CALL: 'discovery_call',
    SOLUTION_DEMO: 'solution_demo',
    CONSULTATION: 'consultation'
  },

  PRICING_MODELS: {
    FIXED_PACKAGE: 'fixed_package',
    BASE_PLUS_ADDONS: 'base_plus_addons',
    QUANTITY_BASED: 'quantity_based',
    HOURLY_ESTIMATE: 'hourly_estimate',
    COMPLEXITY_TIERED: 'complexity_tiered',
    CUSTOM_QUOTE: 'custom_quote'
  },

  ESTIMATE_STATUSES: {
    DRAFT: 'draft',
    PRELIMINARY: 'preliminary',
    APPROVED: 'approved',
    SUPERSEDED: 'superseded',
    REJECTED: 'rejected'
  },

  INTENTS: {
    SERVICE_INQUIRY: 'service_inquiry',
    PRICING_INQUIRY: 'pricing_inquiry',
    REQUIREMENT_DISCOVERY: 'requirement_discovery',
    BUDGET_DISCUSSION: 'budget_discussion',
    TIMELINE_DISCUSSION: 'timeline_discussion',
    FEATURE_CLARIFICATION: 'feature_clarification',
    CONSULTATION_REQUEST: 'consultation_request',
    DEMO_REQUEST: 'demo_request',
    ESTIMATE_REQUEST: 'estimate_request',
    OBJECTION_HANDLING: 'objection_handling',
    FOLLOW_UP_REQUEST: 'follow_up_request',
    HUMAN_ASSISTANCE_REQUEST: 'human_assistance_request',
    UNSUPPORTED_INQUIRY: 'unsupported_inquiry'
  }
};
