const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SchedulingEngine = require('../src/services/schedulingEngine');
const AvailabilityRule = require('../src/models/AvailabilityRule');
const Appointment = require('../src/models/Appointment');
const Lead = require('../src/models/Lead');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const { APPOINTMENT_STATUSES } = require('../src/config/constants');

let mongoServer;
let workspaceId;
let repId;
let leadId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const ws = await Workspace.create({ name: 'Sched WS', slug: 'sched-ws' });
  workspaceId = ws._id;

  const rep = await User.create({
    workspaceId,
    name: 'Sales Rep 1',
    email: 'rep1@test.com',
    passwordHash: 'hash'
  });
  repId = rep._id;

  const lead = await Lead.create({
    workspaceId,
    leadNumber: 'LD-111',
    name: 'Booking Lead'
  });
  leadId = lead._id;

  // Working hours: Mon-Fri 10:00 to 18:00
  for (let day = 0; day <= 6; day++) {
    await AvailabilityRule.create({
      workspaceId,
      userId: repId,
      dayOfWeek: day,
      startTime: '10:00',
      endTime: '18:00',
      slotDurationMinutes: 30,
      bufferMinutes: 15
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Appointment Scheduling & Concurrency Engine', () => {
  test('generates unbooked slots within working hours', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const result = await SchedulingEngine.getAvailableSlots({
      workspaceId,
      salesRepId: repId,
      startDateStr: dateStr,
      endDateStr: dateStr
    });

    expect(result.slots.length).toBeGreaterThan(0);
    const firstSlot = result.slots[0];
    expect(firstSlot.durationMinutes).toBe(30);
    expect(firstSlot.salesRepId.toString()).toBe(repId.toString());
  });

  test('successfully books an available slot with meeting link', async () => {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 2);
    slotTime.setHours(11, 0, 0, 0);

    const booking = await SchedulingEngine.bookAppointment({
      workspaceId,
      leadId,
      salesRepId: repId,
      startTime: slotTime.toISOString(),
      idempotencyKey: 'key-test-001'
    });

    expect(booking.isIdempotentReplay).toBe(false);
    expect(booking.appointment.status).toBe(APPOINTMENT_STATUSES.SCHEDULED);
    expect(booking.appointment.meetingLink).toContain('https://meet.leadcloser.ai/');
  });

  test('enforces idempotency: repeating identical key returns same appointment without duplicating', async () => {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 2);
    slotTime.setHours(11, 0, 0, 0);

    const replay = await SchedulingEngine.bookAppointment({
      workspaceId,
      leadId,
      salesRepId: repId,
      startTime: slotTime.toISOString(),
      idempotencyKey: 'key-test-001' // Same idempotency key!
    });

    expect(replay.isIdempotentReplay).toBe(true);
    expect(replay.message).toContain('existing confirmed booking');

    const count = await Appointment.countDocuments({ workspaceId, idempotencyKey: 'key-test-001' });
    expect(count).toBe(1);
  });

  test('rejects overlapping slot conflict for the same sales rep', async () => {
    const conflictingTime = new Date();
    conflictingTime.setDate(conflictingTime.getDate() + 2);
    conflictingTime.setHours(11, 15, 0, 0); // Overlaps 11:00 to 11:30

    await expect(
      SchedulingEngine.bookAppointment({
        workspaceId,
        leadId,
        salesRepId: repId,
        startTime: conflictingTime.toISOString(),
        idempotencyKey: 'key-test-conflict'
      })
    ).rejects.toThrow('Slot conflict');
  });

  test('allows cancellation of an appointment', async () => {
    const slotTime = new Date();
    slotTime.setDate(slotTime.getDate() + 3);
    slotTime.setHours(14, 0, 0, 0);

    const booking = await SchedulingEngine.bookAppointment({
      workspaceId,
      leadId,
      salesRepId: repId,
      startTime: slotTime.toISOString(),
      idempotencyKey: 'key-test-to-cancel'
    });

    const cancelled = await SchedulingEngine.cancelAppointment({
      workspaceId,
      appointmentId: booking.appointment._id,
      reason: 'Client requested reschedule'
    });

    expect(cancelled.status).toBe(APPOINTMENT_STATUSES.CANCELLED);
    expect(cancelled.cancellationReason).toBe('Client requested reschedule');
  });
});
