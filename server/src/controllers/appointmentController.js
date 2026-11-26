const Appointment = require('../models/Appointment');
const SchedulingEngine = require('../services/schedulingEngine');
const Workspace = require('../models/Workspace');

exports.getAvailability = async (req, res, next) => {
  try {
    const { startDate, endDate, salesRepId, timezone, workspaceSlug } = req.query;

    let targetWorkspaceId = req.workspaceId;
    if (!targetWorkspaceId && workspaceSlug) {
      const ws = await Workspace.findOne({ slug: workspaceSlug });
      if (ws) targetWorkspaceId = ws._id;
    }
    if (!targetWorkspaceId) {
      const ws = await Workspace.findOne();
      if (ws) targetWorkspaceId = ws._id;
    }

    if (!startDate || !endDate) {
      const today = new Date();
      const inSevenDays = new Date();
      inSevenDays.setDate(today.getDate() + 7);
      const startStr = today.toISOString().split('T')[0];
      const endStr = inSevenDays.toISOString().split('T')[0];

      const availability = await SchedulingEngine.getAvailableSlots({
        workspaceId: targetWorkspaceId,
        salesRepId,
        startDateStr: startStr,
        endDateStr: endStr,
        timezone: timezone || 'Asia/Kolkata'
      });
      return res.json({ success: true, ...availability });
    }

    const availability = await SchedulingEngine.getAvailableSlots({
      workspaceId: targetWorkspaceId,
      salesRepId,
      startDateStr: startDate,
      endDateStr: endDate,
      timezone: timezone || 'Asia/Kolkata'
    });

    res.json({ success: true, ...availability });
  } catch (error) {
    next(error);
  }
};

exports.bookAppointment = async (req, res, next) => {
  try {
    const { leadId, salesRepId, startTime, endTime, appointmentType, timezone, idempotencyKey, notes, bookingSource } = req.body;

    let targetWorkspaceId = req.workspaceId;
    if (!targetWorkspaceId) {
      const ws = await Workspace.findOne();
      targetWorkspaceId = ws._id;
    }

    const booking = await SchedulingEngine.bookAppointment({
      workspaceId: targetWorkspaceId,
      leadId,
      salesRepId,
      startTime,
      endTime,
      appointmentType,
      timezone,
      idempotencyKey,
      notes,
      bookingSource: bookingSource || (req.user ? 'manual' : 'ai_conversation')
    });

    res.status(201).json({ success: true, ...booking });
  } catch (error) {
    next(error);
  }
};

exports.listAppointments = async (req, res, next) => {
  try {
    const { status, salesRepId, leadId } = req.query;
    const filter = { workspaceId: req.workspaceId };
    if (status) filter.status = status;
    if (salesRepId) filter.salesRepId = salesRepId;
    if (leadId) filter.leadId = leadId;

    const appointments = await Appointment.find(filter)
      .populate('leadId', 'name leadNumber email phone')
      .populate('salesRepId', 'name email role')
      .sort({ startTime: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const apt = await SchedulingEngine.cancelAppointment({
      workspaceId: req.workspaceId,
      appointmentId: req.params.id,
      reason,
      actorId: req.user?._id
    });
    res.json({ success: true, message: 'Appointment cancelled.', appointment: apt });
  } catch (error) {
    next(error);
  }
};
