const Appointment = require('../models/Appointment');
const AvailabilityRule = require('../models/AvailabilityRule');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { APPOINTMENT_STATUSES, PIPELINE_STAGES } = require('../config/constants');
const { logAudit } = require('./auditService');
const { sendNotification } = require('./notificationService');
const { v4: uuidv4 } = require('uuid');

class SchedulingEngine {
  /**
   * Find available appointment slots for a given date range
   */
  static async getAvailableSlots({
    workspaceId,
    salesRepId = null,
    startDateStr, // YYYY-MM-DD
    endDateStr,   // YYYY-MM-DD
    timezone = 'Asia/Kolkata'
  }) {
    let repId = salesRepId;
    if (!repId) {
      // Pick first active sales rep or owner in workspace
      const rep = await User.findOne({ workspaceId, isActive: true }).sort({ role: 1 });
      if (!rep) throw new Error('No available sales representatives in workspace');
      repId = rep._id;
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // Fetch availability rules for this rep
    const rules = await AvailabilityRule.find({
      workspaceId,
      userId: repId,
      isActive: true
    });

    if (rules.length === 0) {
      // Return empty if no rules configured
      return { salesRepId: repId, slots: [] };
    }

    // Fetch existing scheduled appointments in date range
    const existingAppointments = await Appointment.find({
      workspaceId,
      salesRepId: repId,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      startTime: { $gte: start, $lte: end }
    });

    const isSlotBooked = (slotStart, slotEnd) => {
      return existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime).getTime();
        const aptEnd = new Date(apt.endTime).getTime();
        const sStart = slotStart.getTime();
        const sEnd = slotEnd.getTime();
        return Math.max(aptStart, sStart) < Math.min(aptEnd, sEnd);
      });
    };

    const slots = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday
      const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

      for (const rule of dayRules) {
        const [startHour, startMin] = rule.startTime.split(':').map(Number);
        const [endHour, endMin] = rule.endTime.split(':').map(Number);

        let slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMin, 0, 0);

        const dayWindowEnd = new Date(currentDate);
        dayWindowEnd.setHours(endHour, endMin, 0, 0);

        const durationMs = (rule.slotDurationMinutes || 30) * 60 * 1000;
        const bufferMs = (rule.bufferMinutes || 15) * 60 * 1000;

        while (new Date(slotStart.getTime() + durationMs) <= dayWindowEnd) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);

          // Only present future slots
          if (slotStart.getTime() > Date.now()) {
            if (!isSlotBooked(slotStart, slotEnd)) {
              slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                durationMinutes: rule.slotDurationMinutes || 30,
                salesRepId: repId,
                timezone
              });
            }
          }

          slotStart = new Date(slotEnd.getTime() + bufferMs);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      salesRepId: repId,
      totalAvailable: slots.length,
      slots
    };
  }

  /**
   * Book an appointment with idempotency and race condition protection
   */
  static async bookAppointment({
    workspaceId,
    leadId,
    salesRepId = null,
    startTime,
    endTime = null,
    appointmentType = 'consultation',
    timezone = 'Asia/Kolkata',
    idempotencyKey,
    notes = '',
    bookingSource = 'ai_conversation'
  }) {
    if (!idempotencyKey) {
      idempotencyKey = `bk_${Date.now()}_${uuidv4().slice(0, 8)}`;
    }

    // Check idempotency first: If already booked with this key, return it cleanly
    const existing = await Appointment.findOne({ workspaceId, idempotencyKey }).populate('salesRepId', 'name email');
    if (existing) {
      return {
        appointment: existing,
        isIdempotentReplay: true,
        message: 'Returning existing confirmed booking for this idempotency key.'
      };
    }

    let repId = salesRepId;
    if (!repId) {
      const lead = await Lead.findOne({ _id: leadId, workspaceId });
      if (lead && lead.assignedTo) {
        repId = lead.assignedTo;
      } else {
        const rep = await User.findOne({ workspaceId, isActive: true }).sort({ role: 1 });
        if (!rep) throw new Error('No available sales representative found for booking');
        repId = rep._id;
      }
    }

    const start = new Date(startTime);
    let end = endTime ? new Date(endTime) : new Date(start.getTime() + 30 * 60 * 1000);

    // Immediate atomic re-validation: Check for conflicting scheduled appointments
    const conflict = await Appointment.findOne({
      workspaceId,
      salesRepId: repId,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (conflict) {
      const err = new Error('Slot conflict: This time slot is already booked for this sales representative.');
      err.statusCode = 409;
      throw err;
    }

    // Generate meeting link (simulation mode)
    const meetingCode = uuidv4().slice(0, 8);
    const meetingLink = `https://meet.leadcloser.ai/session/${meetingCode}`;

    let appointment;
    try {
      appointment = await Appointment.create({
        workspaceId,
        leadId,
        salesRepId: repId,
        appointmentType,
        startTime: start,
        endTime: end,
        timezone,
        meetingLink,
        status: APPOINTMENT_STATUSES.SCHEDULED,
        bookingSource,
        idempotencyKey,
        notes
      });
    } catch (err) {
      if (err.code === 11000) {
        // Race condition hit: concurrent booking for the exact same slot!
        const conflictErr = new Error('Slot concurrency conflict: This slot was just reserved by another booking.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    }

    // Update lead CRM stage and next follow up
    await Lead.findByIdAndUpdate(leadId, {
      salesStage: PIPELINE_STAGES.MEETING_SCHEDULED,
      nextFollowUpDate: start,
      assignedTo: repId
    });

    await logAudit({
      workspaceId,
      action: 'appointment.booked',
      resourceType: 'appointment',
      resourceId: appointment._id,
      details: {
        leadId,
        salesRepId: repId,
        startTime: start.toISOString(),
        idempotencyKey
      }
    });

    await sendNotification({
      workspaceId,
      userId: repId,
      title: '📅 New Consultation Scheduled',
      message: `Appointment confirmed for ${start.toLocaleString('en-IN', { timeZone: timezone })}`,
      type: 'appointment_booked',
      link: `/appointments`
    });

    const populatedAppointment = await Appointment.findById(appointment._id).populate('salesRepId', 'name email');

    return {
      appointment: populatedAppointment,
      isIdempotentReplay: false,
      message: 'Appointment successfully confirmed and scheduled.'
    };
  }

  /**
   * Cancel an existing appointment
   */
  static async cancelAppointment({ workspaceId, appointmentId, reason = 'Client request', actorId = null }) {
    const apt = await Appointment.findOne({ _id: appointmentId, workspaceId });
    if (!apt) throw new Error('Appointment not found');

    apt.status = APPOINTMENT_STATUSES.CANCELLED;
    apt.cancellationReason = reason;
    await apt.save();

    await logAudit({
      workspaceId,
      userId: actorId,
      action: 'appointment.cancelled',
      resourceType: 'appointment',
      resourceId: appointmentId,
      details: { reason }
    });

    return apt;
  }
}

module.exports = SchedulingEngine;
