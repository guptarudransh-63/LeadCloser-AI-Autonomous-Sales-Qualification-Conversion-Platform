const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const Workspace = require('../src/models/Workspace');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const { ROLES, PIPELINE_STAGES } = require('../src/config/constants');

let mongoServer;
let ws1;
let ws2;
let owner1Token;
let agent1Token;
let owner2Token;
let leadWs1;
let leadWs2;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Workspace 1
  ws1 = await Workspace.create({ name: 'Alpha Agency', slug: 'alpha-agency' });
  const pwHash = await User.hashPassword('pass123');

  const owner1 = await User.create({
    workspaceId: ws1._id,
    name: 'Owner Alpha',
    email: 'owner@alpha.com',
    passwordHash: pwHash,
    role: ROLES.OWNER
  });

  const agent1 = await User.create({
    workspaceId: ws1._id,
    name: 'Agent Alpha',
    email: 'agent@alpha.com',
    passwordHash: pwHash,
    role: ROLES.SALES_AGENT
  });

  leadWs1 = await Lead.create({
    workspaceId: ws1._id,
    leadNumber: 'LD-ALPHA-1',
    name: 'Alpha Customer'
  });

  // Workspace 2 (Tenant 2)
  ws2 = await Workspace.create({ name: 'Beta Agency', slug: 'beta-agency' });
  const owner2 = await User.create({
    workspaceId: ws2._id,
    name: 'Owner Beta',
    email: 'owner@beta.com',
    passwordHash: pwHash,
    role: ROLES.OWNER
  });

  leadWs2 = await Lead.create({
    workspaceId: ws2._id,
    leadNumber: 'LD-BETA-1',
    name: 'Beta Customer'
  });

  // Log in to get tokens
  const resOwner1 = await request(app).post('/api/auth/login').send({ email: 'owner@alpha.com', password: 'pass123' });
  owner1Token = resOwner1.body.token;

  const resAgent1 = await request(app).post('/api/auth/login').send({ email: 'agent@alpha.com', password: 'pass123' });
  agent1Token = resAgent1.body.token;

  const resOwner2 = await request(app).post('/api/auth/login').send({ email: 'owner@beta.com', password: 'pass123' });
  owner2Token = resOwner2.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Authentication, RBAC & Multi-Tenant Workspace Isolation', () => {
  test('authenticates and returns user with workspace details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${owner1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@alpha.com');
    expect(res.body.workspace.slug).toBe('alpha-agency');
  });

  test('enforces strict workspace isolation: Tenant 1 cannot access Tenant 2 lead', async () => {
    // Owner 1 attempts to fetch Lead from Workspace 2
    const res = await request(app)
      .get(`/api/leads/${leadWs2._id}`)
      .set('Authorization', `Bearer ${owner1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found in this workspace');
  });

  test('updates lead pipeline stage with audit trail', async () => {
    const res = await request(app)
      .patch(`/api/leads/${leadWs1._id}/stage`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ stage: PIPELINE_STAGES.QUALIFIED });

    expect(res.status).toBe(200);
    expect(res.body.lead.salesStage).toBe(PIPELINE_STAGES.QUALIFIED);
  });

  test('allows owner to override lead score with auditable reason', async () => {
    const res = await request(app)
      .post(`/api/leads/${leadWs1._id}/score-override`)
      .set('Authorization', `Bearer ${owner1Token}`)
      .send({ score: 95, reason: 'High intent direct referral from board member' });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(95);
    expect(res.body.priority).toBe('high');
  });

  test('restricts score override from unauthorized sales agents', async () => {
    const res = await request(app)
      .post(`/api/leads/${leadWs1._id}/score-override`)
      .set('Authorization', `Bearer ${agent1Token}`)
      .send({ score: 90, reason: 'Trying to bump score' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });
});
