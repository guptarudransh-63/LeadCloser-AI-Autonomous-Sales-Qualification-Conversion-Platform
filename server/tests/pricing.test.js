const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PricingEngine = require('../src/services/pricingEngine');
const Service = require('../src/models/Service');
const PricingRule = require('../src/models/PricingRule');
const Lead = require('../src/models/Lead');
const Workspace = require('../src/models/Workspace');
const Estimate = require('../src/models/Estimate');
const { ROLES, ESTIMATE_STATUSES } = require('../src/config/constants');

let mongoServer;
let workspaceId;
let serviceId;
let leadId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const ws = await Workspace.create({
    name: 'Test Agency',
    slug: 'test-agency',
    currency: 'INR'
  });
  workspaceId = ws._id;

  const s = await Service.create({
    workspaceId,
    name: 'Website Development',
    slug: 'website-development',
    category: 'Web',
    description: 'Custom site',
    basePricePaise: 2000000, // ₹20,000
    pricingModel: 'base_plus_addons'
  });
  serviceId = s._id;

  await PricingRule.create([
    {
      workspaceId,
      serviceId,
      name: 'Student Portal',
      code: 'student_portal',
      amountPaise: 800000, // ₹8,000
      isActive: true
    },
    {
      workspaceId,
      serviceId,
      name: 'Fee Tracking',
      code: 'payment_gateway',
      amountPaise: 600000, // ₹6,000
      isActive: true
    }
  ]);

  const lead = await Lead.create({
    workspaceId,
    leadNumber: 'LD-999',
    name: 'Test Prospect'
  });
  leadId = lead._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Deterministic Pricing Engine', () => {
  test('calculates exact itemized pricing in paise with base + add-ons', async () => {
    const result = await PricingEngine.calculate({
      workspaceId,
      serviceId,
      addonCodes: ['student_portal', 'payment_gateway']
    });

    // Base: 2,000,000 + Addons: 800,000 + 600,000 = 3,400,000 paise (₹34,000)
    expect(result.subtotalPaise).toBe(3400000);
    expect(result.totalPaise).toBe(3400000);
    expect(result.lineItems).toHaveLength(3);
    expect(result.formattedTotal).toBe('₹34,000');
    expect(result.lineItems[0].name).toContain('Website Development');
    expect(result.lineItems[1].name).toBe('Student Portal');
    expect(result.lineItems[2].name).toBe('Fee Tracking');
  });

  test('blocks unauthorized discount attempts by sales agents', async () => {
    const result = await PricingEngine.calculate({
      workspaceId,
      serviceId,
      addonCodes: ['student_portal'],
      requestedDiscountPaise: 500000, // ₹5,000 discount
      userRole: ROLES.SALES_AGENT
    });

    // Sales rep cannot approve discounts, so discountPaise remains 0 and review flag is set
    expect(result.discountPaise).toBe(0);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.unresolvedItems[0]).toContain('requires Business Owner approval');
  });

  test('allows owner to approve discount within total bounds', async () => {
    const result = await PricingEngine.calculate({
      workspaceId,
      serviceId,
      addonCodes: ['student_portal'],
      requestedDiscountPaise: 500000,
      userRole: ROLES.OWNER
    });

    // Subtotal: 2,800,000 - Discount: 500,000 = 2,300,000 paise
    expect(result.discountPaise).toBe(500000);
    expect(result.totalPaise).toBe(2300000);
    expect(result.formattedTotal).toBe('₹23,000');
  });

  test('creates versioned estimate and marks old versions as superseded', async () => {
    const calc1 = await PricingEngine.calculate({ workspaceId, serviceId, addonCodes: [] });
    const est1 = await PricingEngine.createOrUpdateEstimate({
      workspaceId,
      leadId,
      serviceId,
      calculationResult: calc1
    });

    expect(est1.version).toBe(1);
    expect(est1.status).toBe(ESTIMATE_STATUSES.PRELIMINARY);

    // Now recalculate with add-on
    const calc2 = await PricingEngine.calculate({ workspaceId, serviceId, addonCodes: ['student_portal'] });
    const est2 = await PricingEngine.createOrUpdateEstimate({
      workspaceId,
      leadId,
      serviceId,
      calculationResult: calc2
    });

    expect(est2.version).toBe(2);
    expect(est2.totalPaise).toBe(2800000);

    // Check that previous estimate is marked as SUPERSEDED
    const prevEstimate = await Estimate.findById(est1._id);
    expect(prevEstimate.status).toBe(ESTIMATE_STATUSES.SUPERSEDED);
  });
});
