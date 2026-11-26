require('dotenv').config({ path: __dirname + '/../../.env' });
const { connectDB, disconnectDB } = require('../config/db');

const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Service = require('../models/Service');
const PricingRule = require('../models/PricingRule');
const Lead = require('../models/Lead');
const LeadRequirement = require('../models/LeadRequirement');
const QualificationAssessment = require('../models/QualificationAssessment');
const Estimate = require('../models/Estimate');
const Appointment = require('../models/Appointment');
const AvailabilityRule = require('../models/AvailabilityRule');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AutomationRule = require('../models/AutomationRule');
const FollowUpTask = require('../models/FollowUpTask');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const {
  ROLES,
  PIPELINE_STAGES,
  LEAD_PRIORITIES,
  CONVERSATION_STATUSES,
  CONVERSATION_OUTCOMES,
  ESTIMATE_STATUSES,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  INTENTS
} = require('../config/constants');

/** Return a Date shifted by `daysOffset` days at the given hour:minute local time. */
const relativeDate = (daysOffset, hour = 11, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const seedData = async () => {
  try {
    console.log('🌱 Starting LeadCloser AI Database Seeder...');
    await connectDB();

    // Clear existing data across all workspace collections
    await Promise.all([
      Workspace.deleteMany({}),
      User.deleteMany({}),
      Service.deleteMany({}),
      PricingRule.deleteMany({}),
      Lead.deleteMany({}),
      LeadRequirement.deleteMany({}),
      QualificationAssessment.deleteMany({}),
      Estimate.deleteMany({}),
      Appointment.deleteMany({}),
      AvailabilityRule.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      AutomationRule.deleteMany({}),
      FollowUpTask.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('🧹 Existing collections cleared.');

    // 1. Create Workspace
    const workspace = await Workspace.create({
      name: 'Apex Digital Solutions',
      slug: 'apex-digital',
      businessType: 'Custom Web & Software Development',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      settings: {
        scoringWeights: {
          serviceFit: 25,
          budgetFit: 20,
          timelineReadiness: 20,
          requirementCompleteness: 15,
          engagementIntent: 20
        },
        handoffThresholds: {
          minScoreForHighPriority: 75,
          maxAutoDiscountPaise: 0,
          highValueLeadThresholdPaise: 10000000 // ₹1,00,000
        },
        autoFollowUpEnabled: true
      }
    });

    console.log(`✅ Created Workspace: ${workspace.name} (${workspace.slug})`);

    // 2. Create Users
    const passwordHash = await User.hashPassword('password123');

    const [owner, rep, rep2, admin] = await User.create([
      {
        workspaceId: workspace._id,
        name: 'Ashish Gupta',
        email: 'owner@leadcloser.ai',
        passwordHash,
        role: ROLES.OWNER,
        phone: '+91 98765 43210',
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Priya Sharma',
        email: 'priya@leadcloser.ai',
        passwordHash,
        role: ROLES.SALES_AGENT,
        phone: '+91 98765 12345',
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Rohan Kulkarni',
        email: 'rohan@leadcloser.ai',
        passwordHash,
        role: ROLES.SALES_AGENT,
        phone: '+91 98765 54321',
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Vikram Mehta',
        email: 'admin@leadcloser.ai',
        passwordHash,
        role: ROLES.ADMIN,
        phone: '+91 98765 67890',
        isActive: true
      }
    ]);

    console.log('✅ Created 4 workspace team members (Owner, 2 Sales Reps, Admin).');

    // 3. Availability Rules (Mon-Fri 10:00 to 18:00 for both sales reps & owner)
    const availabilityDocs = [];
    for (const salesUser of [rep, rep2, owner]) {
      for (let day = 1; day <= 5; day++) {
        availabilityDocs.push({
          workspaceId: workspace._id,
          userId: salesUser._id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '18:00',
          slotDurationMinutes: 30,
          bufferMinutes: 15,
          isActive: true
        });
      }
    }
    await AvailabilityRule.create(availabilityDocs);
    console.log('✅ Created Availability Rules for Mon-Fri.');

    // 4. Services & Pricing Rules
    const [webService, ecommerceService, mobileService, aiService] = await Service.create([
      {
        workspaceId: workspace._id,
        name: 'Custom Web Application & Portal',
        slug: 'custom-web-application',
        category: 'Web Development',
        description: 'Full-stack web applications, business management portals, client dashboards, and responsive web portals.',
        basePricePaise: 2000000, // ₹20,000
        pricingModel: 'base_plus_addons',
        packages: [
          {
            name: 'Starter Portal',
            description: 'Essential multi-page web application with responsive layout and basic forms',
            pricePaise: 2000000,
            includedFeatures: ['Responsive Design', '5 Core Views', 'SSL & Deployment', 'Contact Forms'],
            estimatedDeliveryDays: 14
          },
          {
            name: 'Growth Platform',
            description: 'Full-featured web application with role-based user authentication and data tables',
            pricePaise: 4500000,
            includedFeatures: ['User Auth & Roles', 'Interactive Data Tables', '10 Views', 'API Integrations'],
            estimatedDeliveryDays: 25
          },
          {
            name: 'Enterprise Suite',
            description: 'High-availability bespoke platform with high concurrency architecture and reporting',
            pricePaise: 9500000,
            includedFeatures: ['Microservice Architecture', 'Audit Logging', 'Automated Backups', 'Dedicated Support'],
            estimatedDeliveryDays: 45
          }
        ],
        scopeConstraints: {
          minDurationDays: 14,
          maxRevisions: 3,
          requiresCustomAssessment: false
        }
      },
      {
        workspaceId: workspace._id,
        name: 'E-Commerce Platform & Storefront',
        slug: 'ecommerce-platform',
        category: 'E-Commerce',
        description: 'Custom e-commerce store with catalog, shopping cart, multi-currency payment gateway, and order fulfillment.',
        basePricePaise: 3500000, // ₹35,000
        pricingModel: 'base_plus_addons',
        packages: [
          {
            name: 'Starter Store',
            description: 'Up to 100 products, Razorpay/Stripe checkout, order confirmation emails',
            pricePaise: 3500000,
            includedFeatures: ['Product Catalog', 'Payment Gateway', 'Customer Accounts'],
            estimatedDeliveryDays: 20
          },
          {
            name: 'Growth D2C Store',
            description: 'Unlimited SKUs, discount coupons, GST invoicing, and courier tracking integration',
            pricePaise: 6500000,
            includedFeatures: ['Unlimited SKUs', 'Shiprocket Integration', 'GST Invoices', 'Abandoned Cart Recovery'],
            estimatedDeliveryDays: 30
          },
          {
            name: 'Enterprise Marketplace',
            description: 'Multi-vendor marketplace with seller payouts, warehouse routing, and SLA monitoring',
            pricePaise: 12500000,
            includedFeatures: ['Multi-Vendor Portal', 'Split Payouts', 'Warehouse Sync', 'Custom Analytics'],
            estimatedDeliveryDays: 50
          }
        ],
        scopeConstraints: {
          minDurationDays: 20,
          maxRevisions: 3
        }
      },
      {
        workspaceId: workspace._id,
        name: 'Mobile App Development (iOS & Android)',
        slug: 'mobile-app-development',
        category: 'Mobile Apps',
        description: 'Cross-platform native mobile applications built with React Native / Flutter and cloud-synced APIs.',
        basePricePaise: 5500000, // ₹55,000
        pricingModel: 'base_plus_addons',
        packages: [
          {
            name: 'MVP Mobile App',
            description: 'Core user journeys, authentication, and App Store / Play Store submission',
            pricePaise: 5500000,
            includedFeatures: ['iOS & Android Builds', 'OTP / Social Auth', 'REST API Integration', 'Store Submission'],
            estimatedDeliveryDays: 30
          },
          {
            name: 'Scale Production App',
            description: 'Rich interactive UX, real-time sync, payments, and crash telemetry',
            pricePaise: 11000000,
            includedFeatures: ['Real-Time Sync', 'In-App Payments', 'Analytics & Crashlytics', 'CI/CD Pipeline'],
            estimatedDeliveryDays: 55
          }
        ],
        scopeConstraints: {
          minDurationDays: 28,
          maxRevisions: 3,
          requiresCustomAssessment: false
        }
      },
      {
        workspaceId: workspace._id,
        name: 'AI Sales & Support Automation Suite',
        slug: 'ai-automation-suite',
        category: 'AI & Automation',
        description: 'Custom LLM assistants, WhatsApp qualification bots, and CRM workflow automation pipelines.',
        basePricePaise: 2500000, // ₹25,000
        pricingModel: 'base_plus_addons',
        packages: [
          {
            name: 'Starter AI Widget',
            description: 'Website AI chat assistant trained on your catalog with lead capture',
            pricePaise: 2500000,
            includedFeatures: ['Knowledge Base RAG', 'Lead Qualification', 'CRM Webhook Sync', 'Transcript Export'],
            estimatedDeliveryDays: 12
          },
          {
            name: 'Omnichannel AI Closer',
            description: 'Web + WhatsApp autonomous quoting, calendar booking, and human handoff routing',
            pricePaise: 6000000,
            includedFeatures: ['WhatsApp Cloud API', 'Deterministic Quoting', 'Calendar Booking', 'Human Takeover Inbox'],
            estimatedDeliveryDays: 24
          }
        ],
        scopeConstraints: {
          minDurationDays: 10,
          maxRevisions: 4,
          requiresCustomAssessment: false
        }
      }
    ]);

    await PricingRule.create([
      {
        workspaceId: workspace._id,
        serviceId: webService._id,
        name: 'Student Registration & Portal Addon',
        code: 'student_portal',
        description: 'Student profile onboarding, course enrollment, batch tracking',
        ruleType: 'addon',
        amountPaise: 800000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: webService._id,
        name: 'Online Fee & Payment Gateway Integration',
        code: 'payment_gateway',
        description: 'Razorpay / UPI / Stripe automated fee collection and receipt generation',
        ruleType: 'addon',
        amountPaise: 600000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: webService._id,
        name: 'Admin Dashboard & Analytics',
        code: 'admin_dashboard',
        description: 'Executive dashboard with revenue charts, student KPIs, and exportable CSVs',
        ruleType: 'addon',
        amountPaise: 750000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: webService._id,
        name: 'WhatsApp & SMS Automated Alerts',
        code: 'whatsapp_notifications',
        description: 'Automated fee due notifications and event reminders via WhatsApp Cloud API',
        ruleType: 'addon',
        amountPaise: 350000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: ecommerceService._id,
        name: 'Inventory & Multi-Warehouse Tracking',
        code: 'ecommerce_addon',
        description: 'Low-stock triggers, SKU barcode scanning, multi-location fulfillment',
        ruleType: 'addon',
        amountPaise: 1200000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: ecommerceService._id,
        name: 'GST Billing & ERP Sync',
        code: 'erp_sync',
        description: 'Automated Tally/Zoho Books invoice sync and HSN tax calculation',
        ruleType: 'addon',
        amountPaise: 900000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: mobileService._id,
        name: 'Push Notifications & Deep Linking',
        code: 'push_notifications',
        description: 'FCM/APNs segmented push campaigns with universal deep links',
        ruleType: 'addon',
        amountPaise: 500000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: mobileService._id,
        name: 'Offline-First Sync & Biometric Auth',
        code: 'offline_biometric',
        description: 'Local SQLite caching with background sync and FaceID/Fingerprint login',
        ruleType: 'addon',
        amountPaise: 1100000,
        isActive: true
      },
      {
        workspaceId: workspace._id,
        serviceId: aiService._id,
        name: 'HubSpot / Salesforce Bidirectional Sync',
        code: 'crm_webhook_sync',
        description: 'Real-time lead stage, conversation transcript, and quote sync to external CRM',
        ruleType: 'addon',
        amountPaise: 850000,
        isActive: true
      }
    ]);

    console.log('✅ Created 4 Services and 9 Add-on Pricing Rules.');

    // 5. Create Realistic Leads across all 9 Pipeline Stages
    const lead1 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1001',
      name: 'Rahul Verma',
      email: 'rahul.verma@apexcoaching.in',
      phone: '+91 98111 22334',
      companyName: 'Apex Coaching Institute',
      source: 'chat_widget',
      serviceInterest: webService._id,
      salesStage: PIPELINE_STAGES.ESTIMATE_SENT,
      priority: LEAD_PRIORITIES.HIGH,
      score: 88,
      estimatedValuePaise: 4150000,
      assignedTo: rep._id,
      nextFollowUpDate: relativeDate(1, 14, 0),
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Direct match with Custom Web Application catalog' },
        budgetFit: { score: 20, reason: 'Client budget ₹40,000–₹50,000 meets scope' },
        timelineReadiness: { score: 20, reason: '3-week timeline is realistic and feasible' },
        requirementCompleteness: { score: 13, reason: 'Scope, features and student workflows clarified' },
        engagementIntent: { score: 10, reason: 'Active estimate review in progress' }
      },
      notes: [
        { text: 'Reviewed preliminary estimate EST-2026-001; interested in starting next Monday.', author: rep._id, createdAt: relativeDate(-1, 16, 30) }
      ]
    });

    const lead2 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1002',
      name: 'Dr. Ananya Sen',
      email: 'ananya@caredental.in',
      phone: '+91 99222 33445',
      companyName: 'Care Dental Clinic',
      source: 'website_inquiry',
      serviceInterest: webService._id,
      salesStage: PIPELINE_STAGES.MEETING_SCHEDULED,
      priority: LEAD_PRIORITIES.HIGH,
      score: 92,
      estimatedValuePaise: 3500000,
      assignedTo: rep._id,
      nextFollowUpDate: relativeDate(2, 11, 0),
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Clinic portal fits Web Application & Portal tier' },
        budgetFit: { score: 20, reason: 'Approved ₹35,000–₹45,000 range' },
        timelineReadiness: { score: 18, reason: 'Launch planned before next quarter' },
        requirementCompleteness: { score: 14, reason: 'Patient intake and booking flow documented' },
        engagementIntent: { score: 15, reason: 'Consultation booked via AI assistant' }
      }
    });

    const lead3 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1003',
      name: 'Kabir Mehta',
      email: 'kabir@urbanfit.com',
      phone: '+91 98333 44556',
      companyName: 'UrbanFit Gyms',
      source: 'chat_widget',
      serviceInterest: mobileService._id,
      salesStage: PIPELINE_STAGES.QUALIFYING,
      priority: LEAD_PRIORITIES.MEDIUM,
      score: 62,
      estimatedValuePaise: 5500000,
      assignedTo: rep._id,
      scoreExplanation: {
        serviceFit: { score: 22, reason: 'Gym member check-in & workout tracker suits Mobile App' },
        budgetFit: { score: 12, reason: 'Evaluating ₹50k–₹65k budget with co-founder' },
        timelineReadiness: { score: 12, reason: 'Flexible 6-week launch window' },
        requirementCompleteness: { score: 8, reason: 'Still confirming wearable integrations' },
        engagementIntent: { score: 8, reason: 'Active chat inquiry, awaiting feature confirmation' }
      }
    });

    const lead4 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1004',
      name: 'Siddharth Rao',
      email: 'siddharth@raologistics.com',
      phone: '+91 98444 55667',
      companyName: 'Rao Logistics',
      source: 'referral',
      serviceInterest: webService._id,
      salesStage: PIPELINE_STAGES.WON,
      priority: LEAD_PRIORITIES.HIGH,
      score: 95,
      estimatedValuePaise: 11500000,
      assignedTo: owner._id,
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Enterprise fleet & dispatch portal' },
        budgetFit: { score: 20, reason: 'Full enterprise retainer signed' },
        timelineReadiness: { score: 20, reason: 'Kickoff completed this week' },
        requirementCompleteness: { score: 15, reason: 'Signed off SOW & architecture specs' },
        engagementIntent: { score: 15, reason: 'Advance invoice paid' }
      }
    });

    const lead5 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1005',
      name: 'Neha Kapoor',
      email: 'neha@luxejewels.co',
      phone: '+91 98555 66778',
      companyName: 'Luxe Jewels',
      source: 'chat_widget',
      serviceInterest: ecommerceService._id,
      salesStage: PIPELINE_STAGES.CONTACTED,
      priority: LEAD_PRIORITIES.HIGH,
      score: 78,
      estimatedValuePaise: 7400000,
      assignedTo: rep._id,
      scoreExplanation: {
        serviceFit: { score: 22, reason: 'Custom luxury storefront with certificate verification' },
        budgetFit: { score: 16, reason: 'High budget, requested volume discount' },
        timelineReadiness: { score: 16, reason: 'Targeting festive season launch' },
        requirementCompleteness: { score: 12, reason: 'Needs custom blockchain certificate lookup' },
        engagementIntent: { score: 12, reason: 'Requested human architect callback' }
      }
    });

    const lead6 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1006',
      name: 'Meera Iyer',
      email: 'meera.iyer@finedge.in',
      phone: '+91 98666 77889',
      companyName: 'FinEdge Advisory',
      source: 'website_inquiry',
      serviceInterest: mobileService._id,
      salesStage: PIPELINE_STAGES.QUALIFIED,
      priority: LEAD_PRIORITIES.HIGH,
      score: 84,
      estimatedValuePaise: 7100000,
      assignedTo: rep2._id,
      nextFollowUpDate: relativeDate(1, 16, 0),
      scoreExplanation: {
        serviceFit: { score: 24, reason: 'Wealth client portfolio app matches Scale Mobile tier' },
        budgetFit: { score: 18, reason: '₹70,000–₹85,000 allocated' },
        timelineReadiness: { score: 16, reason: '8-week roadmap aligned' },
        requirementCompleteness: { score: 13, reason: 'Biometric login & push alerts specified' },
        engagementIntent: { score: 13, reason: 'Ready for formal estimate' }
      }
    });

    const lead7 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1007',
      name: 'Arjun Malhotra',
      email: 'arjun@kisanfresh.in',
      phone: '+91 98777 88990',
      companyName: 'KisanFresh AgriTech',
      source: 'referral',
      serviceInterest: ecommerceService._id,
      salesStage: PIPELINE_STAGES.NEGOTIATION,
      priority: LEAD_PRIORITIES.HIGH,
      score: 91,
      estimatedValuePaise: 8600000,
      assignedTo: owner._id,
      nextFollowUpDate: relativeDate(0, 17, 0),
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'D2C farm-to-table commerce + multi-warehouse inventory' },
        budgetFit: { score: 19, reason: 'Negotiating milestone payment split on ₹86,000 quote' },
        timelineReadiness: { score: 18, reason: 'Immediate start once MSA is finalized' },
        requirementCompleteness: { score: 15, reason: 'Complete SKU and cold-chain slot specs provided' },
        engagementIntent: { score: 14, reason: 'Procurement team reviewing final terms' }
      }
    });

    const lead8 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1008',
      name: 'Zoya Khan',
      email: 'zoya@velvetvine.studio',
      phone: '+91 98888 99001',
      companyName: 'Velvet & Vine Studio',
      source: 'chat_widget',
      serviceInterest: ecommerceService._id,
      salesStage: PIPELINE_STAGES.NEW,
      priority: LEAD_PRIORITIES.MEDIUM,
      score: 45,
      estimatedValuePaise: 3500000,
      assignedTo: rep2._id,
      scoreExplanation: {
        serviceFit: { score: 18, reason: 'Boutique apparel storefront inquiry' },
        budgetFit: { score: 10, reason: 'Budget not yet shared' },
        timelineReadiness: { score: 8, reason: 'Exploring options for next month' },
        requirementCompleteness: { score: 5, reason: 'Initial greeting only' },
        engagementIntent: { score: 4, reason: 'Just landed on widget' }
      }
    });

    const lead9 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1009',
      name: 'Vikramaditya Joshi',
      email: 'v.joshi@medlinklabs.com',
      phone: '+91 98999 00112',
      companyName: 'MedLink Diagnostics',
      source: 'website_inquiry',
      serviceInterest: webService._id,
      salesStage: PIPELINE_STAGES.MEETING_SCHEDULED,
      priority: LEAD_PRIORITIES.HIGH,
      score: 89,
      estimatedValuePaise: 5250000,
      assignedTo: rep2._id,
      nextFollowUpDate: relativeDate(1, 15, 0),
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Lab report portal + WhatsApp automated delivery' },
        budgetFit: { score: 18, reason: '₹50,000–₹60,000 approved by diagnostics board' },
        timelineReadiness: { score: 18, reason: '4-week target for 3 city branches' },
        requirementCompleteness: { score: 14, reason: 'HL7 PDF report upload & patient OTP clarified' },
        engagementIntent: { score: 14, reason: 'Technical demo scheduled with Rohan' }
      }
    });

    const lead10 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1010',
      name: 'Sanya Bansal',
      email: 'sanya@edspark.io',
      phone: '+91 97111 22334',
      companyName: 'EdSpark Learning',
      source: 'linkedin_outbound',
      serviceInterest: aiService._id,
      salesStage: PIPELINE_STAGES.ESTIMATE_SENT,
      priority: LEAD_PRIORITIES.MEDIUM,
      score: 79,
      estimatedValuePaise: 6850000,
      assignedTo: rep._id,
      nextFollowUpDate: relativeDate(3, 12, 0),
      scoreExplanation: {
        serviceFit: { score: 24, reason: 'Omnichannel AI Closer + HubSpot sync fits EdSpark admissions' },
        budgetFit: { score: 16, reason: 'Evaluating ₹68,500 against internal SDR cost' },
        timelineReadiness: { score: 15, reason: 'Admissions cycle opens in 5 weeks' },
        requirementCompleteness: { score: 12, reason: 'Course catalog FAQ & counselor handoff defined' },
        engagementIntent: { score: 12, reason: 'Estimate EST-2026-004 shared for review' }
      }
    });

    const lead11 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1011',
      name: 'Devansh Patel',
      email: 'devansh@cloudbite.in',
      phone: '+91 97222 33445',
      companyName: 'CloudBite Kitchens',
      source: 'partner_channel',
      serviceInterest: ecommerceService._id,
      salesStage: PIPELINE_STAGES.WON,
      priority: LEAD_PRIORITIES.HIGH,
      score: 94,
      estimatedValuePaise: 7700000,
      assignedTo: rep2._id,
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Multi-kitchen ordering storefront + inventory sync' },
        budgetFit: { score: 20, reason: 'Deposit cleared for ₹77,000 scope' },
        timelineReadiness: { score: 19, reason: 'Sprint 1 underway' },
        requirementCompleteness: { score: 15, reason: 'Menu modifiers & Razorpay webhook specs locked' },
        engagementIntent: { score: 15, reason: 'Signed proposal' }
      }
    });

    const lead12 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1012',
      name: 'Ritu Deshmukh',
      email: 'ritu@craftnest.design',
      phone: '+91 97333 44556',
      companyName: 'CraftNest Interiors',
      source: 'chat_widget',
      serviceInterest: webService._id,
      salesStage: PIPELINE_STAGES.LOST,
      priority: LEAD_PRIORITIES.LOW,
      score: 35,
      estimatedValuePaise: 2000000,
      assignedTo: rep._id,
      lostReason: 'Budget constrained under ₹10,000; opted for no-code template site.',
      scoreExplanation: {
        serviceFit: { score: 15, reason: 'Basic portfolio site' },
        budgetFit: { score: 4, reason: 'Budget ₹8,000 below minimum ₹20,000 package' },
        timelineReadiness: { score: 8, reason: 'Wanted delivery in 5 days' },
        requirementCompleteness: { score: 5, reason: 'Minimal scope' },
        engagementIntent: { score: 3, reason: 'Declined custom build' }
      }
    });

    const lead13 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1013',
      name: 'Harshvardhan Nair',
      email: 'harsh@swiftpay.fin',
      phone: '+91 97444 55667',
      companyName: 'SwiftPay Fintech',
      source: 'referral',
      serviceInterest: mobileService._id,
      salesStage: PIPELINE_STAGES.NEGOTIATION,
      priority: LEAD_PRIORITIES.HIGH,
      score: 93,
      estimatedValuePaise: 12100000,
      assignedTo: owner._id,
      nextFollowUpDate: relativeDate(1, 11, 30),
      scoreExplanation: {
        serviceFit: { score: 25, reason: 'Fintech merchant app with biometric auth & offline sync' },
        budgetFit: { score: 20, reason: 'Series-A funded, ₹1,20,000+ approved' },
        timelineReadiness: { score: 18, reason: 'Security audit & beta release in 8 weeks' },
        requirementCompleteness: { score: 15, reason: 'Full Figma screens and API contract ready' },
        engagementIntent: { score: 15, reason: 'Human takeover active with Ashish' }
      }
    });

    const lead14 = await Lead.create({
      workspaceId: workspace._id,
      leadNumber: 'LD-1014',
      name: 'Tanvi Kulkarni',
      email: 'tanvi@greenleaforganics.co.in',
      phone: '+91 97555 66778',
      companyName: 'GreenLeaf Organics',
      source: 'website_inquiry',
      serviceInterest: aiService._id,
      salesStage: PIPELINE_STAGES.QUALIFYING,
      priority: LEAD_PRIORITIES.MEDIUM,
      score: 68,
      estimatedValuePaise: 3350000,
      assignedTo: rep2._id,
      scoreExplanation: {
        serviceFit: { score: 22, reason: 'AI WhatsApp bot for D2C order tracking & subscriptions' },
        budgetFit: { score: 14, reason: '₹30,000–₹40,000 range discussed' },
        timelineReadiness: { score: 13, reason: 'Next month rollout' },
        requirementCompleteness: { score: 10, reason: 'Confirming Shopify webhook access' },
        engagementIntent: { score: 9, reason: 'Active qualification dialogue' }
      }
    });

    const allLeads = [
      lead1, lead2, lead3, lead4, lead5, lead6, lead7,
      lead8, lead9, lead10, lead11, lead12, lead13, lead14
    ];

    console.log(`✅ Created ${allLeads.length} realistic demo leads across all 9 pipeline stages.`);

    // 6. Lead Requirements & Qualification Assessments
    await LeadRequirement.create([
      {
        workspaceId: workspace._id,
        leadId: lead1._id,
        serviceCategory: 'Web Development',
        businessType: 'Coaching Institute',
        problemToSolve: 'Need web platform for student registration, fee tracking, and admin dashboard',
        requiredFeatures: ['Student Registration', 'Online Fee Tracking', 'Admin Dashboard'],
        preferredIntegrations: ['Razorpay', 'WhatsApp Cloud API'],
        approxScope: 'Coaching portal for 500+ active students',
        budgetRange: { minPaise: 4000000, maxPaise: 5000000, currency: 'INR', rawText: '₹40,000 - ₹50,000' },
        expectedTimeline: { deadlineDays: 21, rawText: '3 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange', 'expectedTimeline']
      },
      {
        workspaceId: workspace._id,
        leadId: lead2._id,
        serviceCategory: 'Web Development',
        businessType: 'Healthcare Clinic',
        problemToSolve: 'Replace manual spreadsheet bookings with a patient portal and automated appointment reminders',
        requiredFeatures: ['Patient Intake Forms', 'Doctor Slot Calendar', 'WhatsApp Reminders'],
        preferredIntegrations: ['Google Calendar', 'Razorpay'],
        approxScope: 'Multi-doctor dental clinic with 3 chairs',
        budgetRange: { minPaise: 3000000, maxPaise: 4500000, currency: 'INR', rawText: '₹30,000 - ₹45,000' },
        expectedTimeline: { deadlineDays: 21, rawText: '3 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange', 'expectedTimeline']
      },
      {
        workspaceId: workspace._id,
        leadId: lead6._id,
        serviceCategory: 'Mobile Apps',
        businessType: 'Financial Advisory',
        problemToSolve: 'Give HNI clients an iOS/Android app to view SIP returns and approve portfolio rebalancing',
        requiredFeatures: ['Biometric Auth', 'Portfolio Charts', 'Push Alerts'],
        preferredIntegrations: ['CAMS / KFintech API'],
        approxScope: '1,200 active wealth advisory clients',
        budgetRange: { minPaise: 7000000, maxPaise: 8500000, currency: 'INR', rawText: '₹70,000 - ₹85,000' },
        expectedTimeline: { deadlineDays: 45, rawText: '6-7 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange']
      },
      {
        workspaceId: workspace._id,
        leadId: lead7._id,
        serviceCategory: 'E-Commerce',
        businessType: 'AgriTech D2C',
        problemToSolve: 'Build morning-slot fresh produce storefront with multi-warehouse dark store inventory routing',
        requiredFeatures: ['Pincode Delivery Slots', 'Multi-Warehouse Inventory', 'GST Invoicing'],
        preferredIntegrations: ['Razorpay', 'Zoho Books'],
        approxScope: '400 SKUs across 4 Pune & Mumbai dark stores',
        budgetRange: { minPaise: 8000000, maxPaise: 9500000, currency: 'INR', rawText: '₹80,000 - ₹95,000' },
        expectedTimeline: { deadlineDays: 35, rawText: '5 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange', 'expectedTimeline']
      },
      {
        workspaceId: workspace._id,
        leadId: lead9._id,
        serviceCategory: 'Web Development',
        businessType: 'Diagnostics Lab',
        problemToSolve: 'Automated patient test report portal with QR-verified PDF downloads and WhatsApp alerts',
        requiredFeatures: ['Patient OTP Login', 'Lab Report PDF Vault', 'WhatsApp Alerts'],
        preferredIntegrations: ['LIMS Webhook', 'WhatsApp Cloud API'],
        approxScope: '3 diagnostic centers processing 300 patients/day',
        budgetRange: { minPaise: 5000000, maxPaise: 6000000, currency: 'INR', rawText: '₹50,000 - ₹60,000' },
        expectedTimeline: { deadlineDays: 28, rawText: '4 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange', 'expectedTimeline']
      },
      {
        workspaceId: workspace._id,
        leadId: lead10._id,
        serviceCategory: 'AI & Automation',
        businessType: 'EdTech Platform',
        problemToSolve: 'Qualify 80+ daily student counseling inquiries automatically and sync hot leads to HubSpot',
        requiredFeatures: ['AI Admissions Bot', 'HubSpot Sync', 'Counselor Calendar Booking'],
        preferredIntegrations: ['HubSpot', 'WhatsApp Cloud API'],
        approxScope: '2,500 monthly leads across 6 degree programs',
        budgetRange: { minPaise: 6000000, maxPaise: 7500000, currency: 'INR', rawText: '₹60,000 - ₹75,000' },
        expectedTimeline: { deadlineDays: 25, rawText: '3-4 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange']
      },
      {
        workspaceId: workspace._id,
        leadId: lead13._id,
        serviceCategory: 'Mobile Apps',
        businessType: 'Fintech SaaS',
        problemToSolve: 'Merchant settlement mobile app with offline receipt queue and FaceID transaction approval',
        requiredFeatures: ['Offline Sync', 'Biometric Auth', 'Push Notifications', 'Settlement Dashboard'],
        preferredIntegrations: ['NPCI UPI API', 'AWS KMS'],
        approxScope: '5,000+ retail merchants',
        budgetRange: { minPaise: 11500000, maxPaise: 14000000, currency: 'INR', rawText: '₹1,15,000 - ₹1,40,000' },
        expectedTimeline: { deadlineDays: 56, rawText: '8 weeks' },
        confirmedFields: ['businessType', 'requiredFeatures', 'budgetRange', 'expectedTimeline']
      }
    ]);

    await QualificationAssessment.create([
      {
        workspaceId: workspace._id,
        leadId: lead1._id,
        scores: { serviceFit: 25, budgetFit: 20, timelineReadiness: 20, requirementCompleteness: 13, engagementIntent: 10 },
        totalScore: 88,
        rulesTriggered: [
          { ruleName: 'exact_service_match', pointsAwarded: 25, reason: 'Matched Custom Web Application & Portal' },
          { ruleName: 'budget_aligned', pointsAwarded: 20, reason: 'Budget ₹40k-₹50k covers ₹41.5k estimate' },
          { ruleName: 'feasible_timeline', pointsAwarded: 20, reason: '21-day delivery fits base + addons' }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead2._id,
        scores: { serviceFit: 25, budgetFit: 20, timelineReadiness: 18, requirementCompleteness: 14, engagementIntent: 15 },
        totalScore: 92,
        rulesTriggered: [
          { ruleName: 'exact_service_match', pointsAwarded: 25, reason: 'Clinic portal fits Growth scope' },
          { ruleName: 'appointment_booked', pointsAwarded: 15, reason: 'Prospect booked 30-min consultation' }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead7._id,
        scores: { serviceFit: 25, budgetFit: 19, timelineReadiness: 18, requirementCompleteness: 15, engagementIntent: 14 },
        totalScore: 91,
        rulesTriggered: [
          { ruleName: 'referral_source_boost', pointsAwarded: 10, reason: 'Warm founder referral' },
          { ruleName: 'high_value_deal', pointsAwarded: 15, reason: 'Deal size ₹86,000 in final negotiation' }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead13._id,
        scores: { serviceFit: 25, budgetFit: 20, timelineReadiness: 18, requirementCompleteness: 15, engagementIntent: 15 },
        totalScore: 93,
        rulesTriggered: [
          { ruleName: 'enterprise_threshold_exceeded', pointsAwarded: 20, reason: 'Estimate > ₹1,00,000 triggers senior handoff' }
        ]
      }
    ]);

    // 7. Create Estimates across multiple statuses
    const [est1, est2, est3, est4, est5, est6] = await Estimate.create([
      {
        workspaceId: workspace._id,
        leadId: lead1._id,
        estimateNumber: 'EST-2026-001',
        version: 1,
        serviceId: webService._id,
        status: ESTIMATE_STATUSES.PRELIMINARY,
        currency: 'INR',
        subtotalPaise: 4150000,
        discountPaise: 0,
        totalPaise: 4150000,
        lineItems: [
          { name: 'Custom Web Application & Portal (Base Scope)', description: 'Base responsive portal architecture, backend database, authentication', unitPricePaise: 2000000, quantity: 1, totalPaise: 2000000, ruleCode: 'BASE_SERVICE', isAddon: false },
          { name: 'Student Registration & Portal Addon', description: 'Student onboarding, batch assignment, profile management', unitPricePaise: 800000, quantity: 1, totalPaise: 800000, ruleCode: 'student_portal', isAddon: true },
          { name: 'Online Fee & Payment Gateway Integration', description: 'Automated fee invoices, Razorpay integration, instant receipts', unitPricePaise: 600000, quantity: 1, totalPaise: 600000, ruleCode: 'payment_gateway', isAddon: true },
          { name: 'Admin Dashboard & Analytics', description: 'Financial reporting, student attendance tracking, CSV exports', unitPricePaise: 750000, quantity: 1, totalPaise: 750000, ruleCode: 'admin_dashboard', isAddon: true }
        ],
        assumptions: [
          'Coaching institute will provide logos, course syllabi, and test data.',
          'Payment gateway Merchant Account will be created in client name.'
        ],
        exclusions: ['Payment gateway transaction percentage fees (charged directly by Razorpay).']
      },
      {
        workspaceId: workspace._id,
        leadId: lead2._id,
        estimateNumber: 'EST-2026-002',
        version: 1,
        serviceId: webService._id,
        status: ESTIMATE_STATUSES.APPROVED,
        currency: 'INR',
        subtotalPaise: 3500000,
        discountPaise: 0,
        totalPaise: 3500000,
        approvedBy: owner._id,
        approvedAt: relativeDate(-1, 15, 0),
        lineItems: [
          { name: 'Custom Web Application & Portal (Base Scope)', description: 'Clinic portal with doctor schedules and patient intake', unitPricePaise: 2000000, quantity: 1, totalPaise: 2000000, ruleCode: 'BASE_SERVICE', isAddon: false },
          { name: 'Admin Dashboard & Analytics', description: 'Appointment volume & clinic utilization KPIs', unitPricePaise: 750000, quantity: 1, totalPaise: 750000, ruleCode: 'admin_dashboard', isAddon: true },
          { name: 'Online Fee & Payment Gateway Integration', description: 'Consultation pre-payment via UPI / Razorpay', unitPricePaise: 600000, quantity: 1, totalPaise: 600000, ruleCode: 'payment_gateway', isAddon: true },
          { name: 'WhatsApp & SMS Automated Alerts', description: '24h & 2h patient visit reminders', unitPricePaise: 350000, quantity: 1, totalPaise: 350000, ruleCode: 'whatsapp_notifications', isAddon: true }
        ],
        assumptions: ['Clinic provides doctor roster and treatment fee list.'],
        exclusions: ['WhatsApp Business API per-conversation Meta charges.']
      },
      {
        workspaceId: workspace._id,
        leadId: lead7._id,
        estimateNumber: 'EST-2026-003',
        version: 2,
        serviceId: ecommerceService._id,
        status: ESTIMATE_STATUSES.APPROVED,
        currency: 'INR',
        subtotalPaise: 8600000,
        discountPaise: 0,
        totalPaise: 8600000,
        approvedBy: owner._id,
        approvedAt: relativeDate(-2, 18, 0),
        lineItems: [
          { name: 'Growth D2C Store Package', description: 'Unlimited SKUs, delivery slots, Shiprocket integration', unitPricePaise: 6500000, quantity: 1, totalPaise: 6500000, ruleCode: 'BASE_PACKAGE', isAddon: false },
          { name: 'Inventory & Multi-Warehouse Tracking', description: '4 dark-store inventory pools with low-stock alerts', unitPricePaise: 1200000, quantity: 1, totalPaise: 1200000, ruleCode: 'ecommerce_addon', isAddon: true },
          { name: 'GST Billing & ERP Sync', description: 'Zoho Books automated GST invoice sync', unitPricePaise: 900000, quantity: 1, totalPaise: 900000, ruleCode: 'erp_sync', isAddon: true }
        ],
        assumptions: ['Initial 400-SKU CSV provided before Sprint 1.'],
        exclusions: ['Third-party cold-chain fleet GPS hardware.']
      },
      {
        workspaceId: workspace._id,
        leadId: lead10._id,
        estimateNumber: 'EST-2026-004',
        version: 1,
        serviceId: aiService._id,
        status: ESTIMATE_STATUSES.PRELIMINARY,
        currency: 'INR',
        subtotalPaise: 6850000,
        discountPaise: 0,
        totalPaise: 6850000,
        lineItems: [
          { name: 'Omnichannel AI Closer Package', description: 'Web + WhatsApp qualification, quoting, and calendar routing', unitPricePaise: 6000000, quantity: 1, totalPaise: 6000000, ruleCode: 'BASE_PACKAGE', isAddon: false },
          { name: 'HubSpot / Salesforce Bidirectional Sync', description: 'Sync qualified prospects and transcripts to HubSpot', unitPricePaise: 850000, quantity: 1, totalPaise: 850000, ruleCode: 'crm_webhook_sync', isAddon: true }
        ],
        assumptions: ['EdSpark provides HubSpot Private App token and program brochures.'],
        exclusions: ['LLM token inference usage beyond 500k monthly tokens.']
      },
      {
        workspaceId: workspace._id,
        leadId: lead13._id,
        estimateNumber: 'EST-2026-005',
        version: 1,
        serviceId: mobileService._id,
        status: ESTIMATE_STATUSES.DRAFT,
        currency: 'INR',
        subtotalPaise: 12600000,
        discountPaise: 500000,
        totalPaise: 12100000,
        lineItems: [
          { name: 'Scale Production App Package', description: 'Cross-platform merchant app with real-time settlement stream', unitPricePaise: 11000000, quantity: 1, totalPaise: 11000000, ruleCode: 'BASE_PACKAGE', isAddon: false },
          { name: 'Push Notifications & Deep Linking', description: 'Instant payout alerts and deep-linked dispute resolution', unitPricePaise: 500000, quantity: 1, totalPaise: 500000, ruleCode: 'push_notifications', isAddon: true },
          { name: 'Offline-First Sync & Biometric Auth', description: 'Offline receipt queue + FaceID/TouchID signing', unitPricePaise: 1100000, quantity: 1, totalPaise: 1100000, ruleCode: 'offline_biometric', isAddon: true }
        ],
        assumptions: ['SwiftPay supplies sandbox settlement APIs and Apple/Google developer accounts.'],
        exclusions: ['External CERT-In penetration testing audit fees.']
      },
      {
        workspaceId: workspace._id,
        leadId: lead12._id,
        estimateNumber: 'EST-2026-006',
        version: 1,
        serviceId: webService._id,
        status: ESTIMATE_STATUSES.REJECTED,
        currency: 'INR',
        subtotalPaise: 2000000,
        discountPaise: 0,
        totalPaise: 2000000,
        lineItems: [
          { name: 'Starter Portal', description: '5-view responsive portfolio & consultation form', unitPricePaise: 2000000, quantity: 1, totalPaise: 2000000, ruleCode: 'BASE_PACKAGE', isAddon: false }
        ],
        assumptions: ['Client supplies interior project photography.'],
        exclusions: ['3D floorplan rendering tools.']
      }
    ]);

    console.log('✅ Created 6 Estimates across draft, preliminary, approved, and rejected statuses.');

    // 8. Create Appointments (upcoming + completed + cancelled, non-overlapping per rep)
    await Appointment.create([
      {
        workspaceId: workspace._id,
        leadId: lead2._id,
        salesRepId: rep._id,
        appointmentType: APPOINTMENT_TYPES.CONSULTATION,
        startTime: relativeDate(2, 11, 0),
        endTime: relativeDate(2, 11, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/care-dental-demo',
        status: APPOINTMENT_STATUSES.SCHEDULED,
        bookingSource: 'ai_conversation',
        idempotencyKey: 'seed_apt_002',
        notes: 'Demo appointment scheduling portal and patient intake workflows.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead9._id,
        salesRepId: rep2._id,
        appointmentType: APPOINTMENT_TYPES.SOLUTION_DEMO,
        startTime: relativeDate(1, 15, 0),
        endTime: relativeDate(1, 15, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/medlink-architecture',
        status: APPOINTMENT_STATUSES.SCHEDULED,
        bookingSource: 'ai_conversation',
        idempotencyKey: 'seed_apt_003',
        notes: 'Walk through LIMS PDF ingestion and patient OTP verification.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead7._id,
        salesRepId: owner._id,
        appointmentType: APPOINTMENT_TYPES.CONSULTATION,
        startTime: relativeDate(0, 17, 0),
        endTime: relativeDate(0, 17, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/kisanfresh-msa',
        status: APPOINTMENT_STATUSES.SCHEDULED,
        bookingSource: 'manual',
        idempotencyKey: 'seed_apt_004',
        notes: 'Finalize milestone schedule and sign MSA for 4 dark stores.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead13._id,
        salesRepId: owner._id,
        appointmentType: APPOINTMENT_TYPES.DISCOVERY_CALL,
        startTime: relativeDate(1, 11, 30),
        endTime: relativeDate(1, 12, 0),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/swiftpay-security',
        status: APPOINTMENT_STATUSES.SCHEDULED,
        bookingSource: 'manual',
        idempotencyKey: 'seed_apt_005',
        notes: 'Review biometric signing flow and offline transaction queue.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead4._id,
        salesRepId: owner._id,
        appointmentType: APPOINTMENT_TYPES.CONSULTATION,
        startTime: relativeDate(-3, 14, 0),
        endTime: relativeDate(-3, 14, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/rao-logistics-kickoff',
        status: APPOINTMENT_STATUSES.COMPLETED,
        bookingSource: 'ai_conversation',
        idempotencyKey: 'seed_apt_006',
        notes: 'Completed technical scoping; prospect converted to Won.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead11._id,
        salesRepId: rep2._id,
        appointmentType: APPOINTMENT_TYPES.SOLUTION_DEMO,
        startTime: relativeDate(-2, 16, 0),
        endTime: relativeDate(-2, 16, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/cloudbite-demo',
        status: APPOINTMENT_STATUSES.COMPLETED,
        bookingSource: 'ai_conversation',
        idempotencyKey: 'seed_apt_007',
        notes: 'Demoed multi-kitchen order routing; deal closed.'
      },
      {
        workspaceId: workspace._id,
        leadId: lead12._id,
        salesRepId: rep._id,
        appointmentType: APPOINTMENT_TYPES.DISCOVERY_CALL,
        startTime: relativeDate(-1, 12, 0),
        endTime: relativeDate(-1, 12, 30),
        timezone: 'Asia/Kolkata',
        meetingLink: 'https://meet.leadcloser.ai/session/craftnest-intro',
        status: APPOINTMENT_STATUSES.CANCELLED,
        bookingSource: 'ai_conversation',
        idempotencyKey: 'seed_apt_008',
        cancellationReason: 'Prospect opted for no-code template builder due to budget constraint.'
      }
    ]);

    console.log('✅ Created 7 Appointments (4 scheduled, 2 completed, 1 cancelled).');

    // 9. Create Conversations & Messages
    const [conv1, conv2, conv3, conv4, conv5, conv6, conv7] = await Conversation.create([
      {
        workspaceId: workspace._id,
        leadId: lead1._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.ESTIMATE_READY,
        currentEstimateId: est1._id,
        questionsAnswered: [
          { topic: 'problem', answered: true },
          { topic: 'features', answered: true },
          { topic: 'budget', answered: true },
          { topic: 'timeline', answered: true }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead5._id,
        status: CONVERSATION_STATUSES.PENDING_HUMAN_REVIEW,
        currentOutcome: CONVERSATION_OUTCOMES.HUMAN_REVIEW_REQUIRED,
        escalationReason: 'Client requested custom blockchain certificate integration and negotiable enterprise discount'
      },
      {
        workspaceId: workspace._id,
        leadId: lead2._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.APPOINTMENT_BOOKED,
        currentEstimateId: est2._id,
        questionsAnswered: [
          { topic: 'problem', answered: true },
          { topic: 'features', answered: true },
          { topic: 'budget', answered: true },
          { topic: 'timeline', answered: true }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead6._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.QUALIFIED,
        questionsAnswered: [
          { topic: 'problem', answered: true },
          { topic: 'features', answered: true },
          { topic: 'budget', answered: true }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead9._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.APPOINTMENT_BOOKED,
        questionsAnswered: [
          { topic: 'problem', answered: true },
          { topic: 'features', answered: true },
          { topic: 'budget', answered: true },
          { topic: 'timeline', answered: true }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead10._id,
        status: CONVERSATION_STATUSES.ACTIVE,
        currentOutcome: CONVERSATION_OUTCOMES.ESTIMATE_READY,
        currentEstimateId: est4._id,
        questionsAnswered: [
          { topic: 'problem', answered: true },
          { topic: 'features', answered: true },
          { topic: 'budget', answered: true }
        ]
      },
      {
        workspaceId: workspace._id,
        leadId: lead13._id,
        status: CONVERSATION_STATUSES.HUMAN_TAKEOVER,
        currentOutcome: CONVERSATION_OUTCOMES.HUMAN_REVIEW_REQUIRED,
        currentEstimateId: est5._id,
        takenOverBy: owner._id,
        takenOverAt: relativeDate(0, 9, 45),
        escalationReason: 'High-value fintech deal (>₹1,00,000) with custom security & offline requirements'
      }
    ]);

    await Message.create([
      // Conv 1: Rahul Verma
      {
        workspaceId: workspace._id,
        conversationId: conv1._id,
        senderType: 'customer',
        content: 'Hi, I need a website for my coaching institute. I want student registration, online fee tracking, and an admin dashboard. What would it cost?'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv1._id,
        senderType: 'ai_agent',
        content: 'Hello! I would be glad to help design a solution for your coaching institute. To provide an exact transparent estimate: do you have a specific target timeline and expected student volume in mind?',
        intentDetected: INTENTS.REQUIREMENT_DISCOVERY
      },
      {
        workspaceId: workspace._id,
        conversationId: conv1._id,
        senderType: 'customer',
        content: 'We need this delivered within 3 weeks. We have around 500 students. Our budget is around ₹40,000 to ₹50,000.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv1._id,
        senderType: 'ai_agent',
        content: 'Based on your requirements for a Custom Web Application & Portal with Student Registration, Online Fee Tracking, and Admin Dashboard, here is our transparent estimate breakdown:\n\n• Custom Web Application & Portal (Base Scope): ₹20,000\n• Student Registration & Portal Addon: ₹8,000\n• Online Fee & Payment Gateway Integration: ₹6,000\n• Admin Dashboard & Analytics: ₹7,500\n\nTotal Estimated Investment: ₹41,500\n\nWould you like to schedule a quick 30-minute consultation with our lead technical architect to review these requirements?',
        intentDetected: INTENTS.PRICING_INQUIRY
      },

      // Conv 2: Neha Kapoor (Pending Human Review)
      {
        workspaceId: workspace._id,
        conversationId: conv2._id,
        senderType: 'customer',
        content: 'We are launching an online fine-jewelry storefront and need custom blockchain authenticity certificates on every order plus a 15% enterprise discount.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv2._id,
        senderType: 'ai_agent',
        content: 'Thank you for sharing those details for Luxe Jewels! Custom blockchain certificate verification and bespoke enterprise pricing require a solution architect review. I have flagged your conversation for our senior team—someone will step in shortly.',
        intentDetected: INTENTS.HUMAN_ASSISTANCE_REQUEST
      },

      // Conv 3: Dr. Ananya Sen (Appointment Booked)
      {
        workspaceId: workspace._id,
        conversationId: conv3._id,
        senderType: 'customer',
        content: 'Hi! Care Dental Clinic needs an online patient booking portal with automated WhatsApp reminders and UPI pre-payment. Our budget is ₹35k–₹45k.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv3._id,
        senderType: 'ai_agent',
        content: 'That fits our Custom Web Application & Portal cleanly (₹35,000 including Admin Dashboard, Payment Gateway, and WhatsApp Alerts). Would you like me to book a 30-minute consultation with Priya Sharma?',
        intentDetected: INTENTS.ESTIMATE_REQUEST
      },
      {
        workspaceId: workspace._id,
        conversationId: conv3._id,
        senderType: 'customer',
        content: 'Yes please, 11:00 AM two days from now works great.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv3._id,
        senderType: 'ai_agent',
        content: 'Confirmed! Your consultation with Priya Sharma is scheduled for 11:00 AM IST. Meeting link: https://meet.leadcloser.ai/session/care-dental-demo',
        intentDetected: INTENTS.CONSULTATION_REQUEST
      },

      // Conv 4: Meera Iyer
      {
        workspaceId: workspace._id,
        conversationId: conv4._id,
        senderType: 'customer',
        content: 'Looking for an iOS & Android wealth advisory app for ~1,200 clients with biometric login and SIP push alerts. Budget is ₹70,000 to ₹85,000.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv4._id,
        senderType: 'ai_agent',
        content: 'Great fit! Our Mobile App Development suite supports FaceID/Fingerprint auth and segmented push alerts. Are you targeting a 6–7 week delivery window?',
        intentDetected: INTENTS.TIMELINE_DISCUSSION
      },

      // Conv 5: Vikramaditya Joshi
      {
        workspaceId: workspace._id,
        conversationId: conv5._id,
        senderType: 'customer',
        content: 'We run 3 diagnostic labs and want patients to download QR-verified PDF reports via OTP + WhatsApp notification.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv5._id,
        senderType: 'ai_agent',
        content: 'We have booked a Solution Demo with Rohan Kulkarni tomorrow at 3:00 PM IST to walk through our LIMS webhook integration and WhatsApp report delivery.',
        intentDetected: INTENTS.DEMO_REQUEST
      },

      // Conv 6: Sanya Bansal
      {
        workspaceId: workspace._id,
        conversationId: conv6._id,
        senderType: 'customer',
        content: 'We get 80+ admissions inquiries daily at EdSpark. Can your AI bot qualify leads on WhatsApp and push them into HubSpot?'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv6._id,
        senderType: 'ai_agent',
        content: 'Yes! Our Omnichannel AI Closer package (₹60,000) + HubSpot Bidirectional Sync (₹8,500) totals ₹68,500. I have prepared EST-2026-004 for your team.',
        intentDetected: INTENTS.ESTIMATE_REQUEST
      },

      // Conv 7: Harshvardhan Nair (Human Takeover)
      {
        workspaceId: workspace._id,
        conversationId: conv7._id,
        senderType: 'customer',
        content: 'SwiftPay needs a merchant mobile app with offline settlement queuing and biometric signing. We have ₹1.2L–₹1.4L budgeted for Phase 1.'
      },
      {
        workspaceId: workspace._id,
        conversationId: conv7._id,
        senderType: 'ai_agent',
        content: 'Because your project exceeds our ₹1,00,000 enterprise threshold and includes fintech security compliance, I am routing you directly to our Founder, Ashish Gupta.',
        intentDetected: INTENTS.HUMAN_ASSISTANCE_REQUEST
      },
      {
        workspaceId: workspace._id,
        conversationId: conv7._id,
        senderType: 'human_agent',
        senderId: owner._id,
        content: 'Hi Harshvardhan, Ashish here. I have drafted EST-2026-005 (₹1,21,000 after a ₹5,000 founder partner credit) and look forward to our call tomorrow at 11:30 AM.'
      }
    ]);

    console.log('✅ Created 7 Conversations and 19 Messages.');

    // 10. Create Automation Rules
    await AutomationRule.create([
      {
        workspaceId: workspace._id,
        name: 'Auto-Draft Follow-Up for Qualified Leads',
        description: 'Generate an approval-ready follow-up email whenever a lead reaches score >= 75.',
        triggerEvent: 'high_score_reached',
        conditions: { minScore: 75 },
        action: { type: 'create_followup_draft', params: { channel: 'email', delayHours: 2 } },
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Escalate High-Value Quotes (> ₹1L)',
        description: 'Trigger human review & notify workspace owner when an estimate exceeds ₹1,00,000.',
        triggerEvent: 'estimate_generated',
        conditions: { minScore: 70 },
        action: { type: 'escalate_human', params: { notifyRole: 'owner' } },
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Post-Booking Calendar Reminder',
        description: 'Notify assigned sales rep immediately when AI books a consultation slot.',
        triggerEvent: 'appointment_booked',
        conditions: {},
        action: { type: 'notify_rep', params: { sendPreCallBrief: true } },
        isActive: true
      },
      {
        workspaceId: workspace._id,
        name: 'Stalled Estimate Nudge (24h)',
        description: 'Create a gentle check-in draft if an estimate sits unreviewed for 24 hours.',
        triggerEvent: 'stalled_conversation',
        conditions: { inactiveHours: 24, pipelineStage: PIPELINE_STAGES.ESTIMATE_SENT },
        action: { type: 'create_followup_draft', params: { template: 'estimate_reminder' } },
        isActive: true
      }
    ]);

    // 11. Create Follow-Up Tasks
    await FollowUpTask.create([
      {
        workspaceId: workspace._id,
        leadId: lead1._id,
        salesRepId: rep._id,
        type: 'estimate_reminder',
        subject: 'Next steps on EST-2026-001 for Apex Coaching Institute',
        bodyDraft: 'Hi Rahul,\n\nSharing a quick check-in on estimate EST-2026-001 (₹41,500) for your 500-student coaching portal. Let us know if you would like to lock in a kickoff slot this week so we hit your 3-week launch goal!\n\nBest,\nPriya Sharma',
        channel: 'email',
        status: 'draft',
        scheduledFor: relativeDate(0, 16, 0),
        requiresApproval: true
      },
      {
        workspaceId: workspace._id,
        leadId: lead10._id,
        salesRepId: rep._id,
        type: 'estimate_reminder',
        subject: 'EdSpark Omnichannel AI Closer Proposal (EST-2026-004)',
        bodyDraft: 'Hi Sanya,\n\nFollowing up on your AI admissions bot + HubSpot sync estimate (₹68,500). Happy to set up a live sandbox walkthrough for your counseling leads anytime tomorrow.\n\nWarm regards,\nPriya Sharma',
        channel: 'email',
        status: 'draft',
        scheduledFor: relativeDate(1, 10, 30),
        requiresApproval: true
      },
      {
        workspaceId: workspace._id,
        leadId: lead6._id,
        salesRepId: rep2._id,
        type: 'high_priority_alert',
        subject: 'FinEdge Advisory — Mobile App Scope & Estimate Ready',
        bodyDraft: 'Hi Meera,\n\nThank you for sharing FinEdge Advisory’s mobile app requirements (biometric auth + SIP push notifications). Would Thursday afternoon work to review the architecture and phased quote?\n\nBest,\nRohan Kulkarni',
        channel: 'email',
        status: 'approved',
        scheduledFor: relativeDate(0, 18, 0),
        requiresApproval: true
      },
      {
        workspaceId: workspace._id,
        leadId: lead4._id,
        salesRepId: owner._id,
        type: 'post_consultation',
        subject: 'Kickoff Summary & Sprint 1 Plan — Rao Logistics',
        bodyDraft: 'Hi Siddharth,\n\nThank you for finalizing the dispatch portal engagement! Our engineering squad has provisioned your staging workspace and Sprint 1 kickoff notes are attached.\n\nBest,\nAshish Gupta',
        channel: 'email',
        status: 'sent',
        scheduledFor: relativeDate(-2, 11, 0),
        sentAt: relativeDate(-2, 11, 5),
        requiresApproval: false,
        deliveryResult: { provider: 'simulated_email_adapter', status: 'delivered' }
      },
      {
        workspaceId: workspace._id,
        leadId: lead3._id,
        salesRepId: rep._id,
        type: 'stalled_lead_nudge',
        subject: 'Quick check-in on UrbanFit Gyms member app',
        bodyDraft: 'Hi Kabir,\n\nChecking back in to see if you had a chance to confirm the wearable sync requirements with your co-founder so we can finalize your MVP estimate.\n\nBest,\nPriya Sharma',
        channel: 'email',
        status: 'draft',
        scheduledFor: relativeDate(1, 12, 0),
        requiresApproval: true
      }
    ]);

    // 12. Create Notifications
    await Notification.create([
      {
        workspaceId: workspace._id,
        userId: null,
        title: 'Human Handoff Requested: Luxe Jewels',
        message: 'Neha Kapoor requested custom blockchain certificate integration and an enterprise discount.',
        type: 'handoff_request',
        link: '/inbox',
        isRead: false
      },
      {
        workspaceId: workspace._id,
        userId: owner._id,
        title: 'High-Value Lead > ₹1,00,000: SwiftPay Fintech',
        message: 'Harshvardhan Nair (Score 93) requires founder approval on EST-2026-005 (₹1,21,000).',
        type: 'high_value_lead',
        link: '/estimates',
        isRead: false
      },
      {
        workspaceId: workspace._id,
        userId: rep._id,
        title: 'Appointment Booked: Care Dental Clinic',
        message: 'AI booked a 30-min consultation with Dr. Ananya Sen in 2 days at 11:00 AM IST.',
        type: 'appointment_booked',
        link: '/appointments',
        isRead: false
      },
      {
        workspaceId: workspace._id,
        userId: rep2._id,
        title: 'Solution Demo Booked: MedLink Diagnostics',
        message: 'Vikramaditya Joshi scheduled a demo for tomorrow at 3:00 PM IST.',
        type: 'appointment_booked',
        link: '/appointments',
        isRead: false
      },
      {
        workspaceId: workspace._id,
        userId: null,
        title: 'Deal Won: CloudBite Kitchens (₹77,000)',
        message: 'Devansh Patel signed off on multi-kitchen e-commerce build.',
        type: 'system',
        link: '/pipeline',
        isRead: true
      }
    ]);

    // 13. Create Recent Audit Logs
    await AuditLog.create([
      {
        workspaceId: workspace._id,
        userId: owner._id,
        action: 'conversation.human_takeover',
        resourceType: 'conversation',
        resourceId: conv7._id.toString(),
        details: { lead: 'Harshvardhan Nair', reason: 'High-value fintech scoping' }
      },
      {
        workspaceId: workspace._id,
        userId: owner._id,
        action: 'estimate.approved',
        resourceType: 'estimate',
        resourceId: est3._id.toString(),
        details: { estimateNumber: 'EST-2026-003', totalPaise: 8600000 }
      },
      {
        workspaceId: workspace._id,
        userId: rep._id,
        action: 'appointment.scheduled',
        resourceType: 'lead',
        resourceId: lead2._id.toString(),
        details: { leadNumber: 'LD-1002', source: 'ai_conversation' }
      },
      {
        workspaceId: workspace._id,
        userId: rep2._id,
        action: 'lead.stage_updated',
        resourceType: 'lead',
        resourceId: lead11._id.toString(),
        details: { from: 'negotiation', to: 'won', dealValuePaise: 7700000 }
      },
      {
        workspaceId: workspace._id,
        userId: rep._id,
        action: 'estimate.generated',
        resourceType: 'estimate',
        resourceId: est1._id.toString(),
        details: { estimateNumber: 'EST-2026-001', totalPaise: 4150000 }
      },
      {
        workspaceId: workspace._id,
        userId: admin._id,
        action: 'automation.rule_enabled',
        resourceType: 'workspace',
        resourceId: workspace._id.toString(),
        details: { rule: 'Escalate High-Value Quotes (> ₹1L)' }
      }
    ]);

    console.log('✅ Created Automation Rules, Follow-Up Tasks, Notifications, and Audit Logs.');
    console.log('🎉 Seed complete! Ready for local execution.');
    return { workspace, owner, rep, rep2, admin };
  } catch (error) {
    console.error('❌ Seeder error:', error);
    throw error;
  }
};

module.exports = { seedData };

if (require.main === module) {
  seedData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
