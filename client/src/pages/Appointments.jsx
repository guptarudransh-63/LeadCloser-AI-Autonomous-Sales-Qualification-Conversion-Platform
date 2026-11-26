import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  User,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [leadsList, setLeadsList] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  const fetchAppointments = async () => {
    try {
      const [aptRes, slotRes, leadRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/appointments/availability'),
        api.get('/leads?limit=50')
      ]);

      if (aptRes.data.success) setAppointments(aptRes.data.appointments || []);
      if (slotRes.data.success) setAvailableSlots(slotRes.data.slots || []);
      if (leadRes.data.success) {
        setLeadsList(leadRes.data.data || []);
        if (leadRes.data.data.length > 0) setSelectedLeadId(leadRes.data.data[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (aptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post(`/appointments/${aptId}/cancel`, { reason: 'Cancelled by agent' });
      fetchAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedLeadId) return;

    setBookingStatus('Booking slot...');
    try {
      const res = await api.post('/appointments', {
        leadId: selectedLeadId,
        salesRepId: selectedSlot.salesRepId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        idempotencyKey: `dash_${selectedLeadId}_${selectedSlot.startTime}`,
        appointmentType: 'consultation'
      });

      if (res.data.success) {
        setShowBookModal(false);
        setSelectedSlot(null);
        setBookingStatus('');
        fetchAppointments();
      }
    } catch (err) {
      setBookingStatus(err.response?.data?.error || 'Failed to book slot.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-main tracking-tight">Appointment Scheduling Engine</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Concurrency-protected consultation bookings synchronized with staff working hours
          </p>
        </div>
        <button
          onClick={() => setShowBookModal(true)}
          className="px-4 py-2.5 rounded-xl bg-accent-primary text-bg-main font-bold text-xs flex items-center gap-2 hover:bg-accent-primary/90 shadow-md shadow-accent-primary/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Book Consultation Slot
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduled Appointments */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent-primary" />
            Confirmed Appointments ({appointments.length})
          </h3>

          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="p-8 rounded-xl bg-bg-card border border-border-dark text-center text-text-muted text-xs">
                No appointments booked yet.
              </div>
            ) : (
              appointments.map((apt) => {
                const isScheduled = apt.status === 'scheduled';
                return (
                  <div
                    key={apt._id}
                    className="p-5 rounded-xl bg-bg-card border border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isScheduled
                              ? 'bg-status-success/20 text-status-success'
                              : 'bg-status-danger/20 text-status-danger'
                          }`}
                        >
                          {apt.status}
                        </span>
                        <span className="text-xs font-bold text-text-main capitalize">
                          {apt.appointmentType?.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-text-main">{apt.leadId?.name}</h4>
                      <p className="text-xs text-text-muted">
                        Sales Rep: <span className="text-text-main font-medium">{apt.salesRepId?.name}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
                        <span className="flex items-center gap-1.5 text-accent-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(apt.startTime).toLocaleString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {apt.meetingLink && (
                          <a
                            href={apt.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent-primary hover:underline font-mono text-[11px]"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Join Video Call
                          </a>
                        )}
                      </div>
                    </div>

                    {isScheduled && (
                      <button
                        onClick={() => handleCancel(apt._id)}
                        className="px-3 py-1.5 rounded-lg border border-border-dark text-text-muted hover:text-status-danger hover:border-status-danger text-xs transition-colors self-start sm:self-auto"
                      >
                        Cancel Slot
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Real-time Live Available Slots */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-secondary" />
            Real Available Slots ({availableSlots.length})
          </h3>

          <div className="bg-bg-card border border-border-dark rounded-xl p-4 shadow-sm space-y-2.5 max-h-[500px] overflow-y-auto">
            <p className="text-[11px] text-text-muted mb-2">
              Calculated dynamically from Mon-Fri 10:00–18:00 IST with 15-min buffers:
            </p>

            {availableSlots.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">No available slots in current window</p>
            ) : (
              availableSlots.map((slot, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setShowBookModal(true);
                  }}
                  className="p-3 rounded-lg bg-bg-elevated border border-border-dark hover:border-accent-primary text-xs flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-text-main group-hover:text-accent-primary transition-colors">
                      {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-[10px] text-text-muted">
                      {new Date(slot.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-[10px] bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded font-semibold">
                    Reserve
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Book Slot Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-text-main mb-2">Lock & Book Consultation</h3>
            {selectedSlot && (
              <p className="text-xs text-accent-secondary mb-4 font-semibold">
                Slot: {new Date(selectedSlot.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}

            {bookingStatus && (
              <div className="mb-4 p-2.5 rounded-lg bg-bg-elevated text-status-warning text-xs border border-border-dark">
                {bookingStatus}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4 text-xs">
              <div>
                <label className="block text-text-muted mb-1 font-semibold">Select Lead to Schedule</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                >
                  {leadsList.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name} ({l.leadNumber}) - {l.companyName || 'No Company'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border-dark text-text-muted hover:text-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-accent-primary text-bg-main font-bold hover:bg-accent-primary/90"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
