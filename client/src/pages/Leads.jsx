import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', phone: '', companyName: '', notes: '' });

  const fetchLeads = async () => {
    try {
      let url = `/leads?limit=50`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (stageFilter) url += `&stage=${encodeURIComponent(stageFilter)}`;
      if (priorityFilter) url += `&priority=${encodeURIComponent(priorityFilter)}`;

      const res = await api.get(url);
      if (res.data.success) {
        setLeads(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, stageFilter, priorityFilter]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leads', newLeadForm);
      if (res.data.success) {
        setShowAddModal(false);
        setNewLeadForm({ name: '', email: '', phone: '', companyName: '', notes: '' });
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-main tracking-tight">Leads & CRM Directory</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Single source of truth for prospect requirements, scores, and commercial records
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-accent-primary text-bg-main font-bold text-xs flex items-center gap-2 hover:bg-accent-primary/90 shadow-md shadow-accent-primary/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Manual Lead
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-bg-card p-4 rounded-xl border border-border-dark">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prospect name, email, company, or lead ID..."
            className="w-full bg-bg-elevated border border-border-dark rounded-lg py-2 pl-10 pr-4 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-bg-elevated border border-border-dark rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-accent-primary"
          >
            <option value="">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualifying">Qualifying</option>
            <option value="qualified">Qualified</option>
            <option value="estimate_sent">Estimate Sent</option>
            <option value="meeting_scheduled">Meeting Scheduled</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won Deal</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-bg-elevated border border-border-dark rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-accent-primary"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-bg-card border border-border-dark rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-dark bg-bg-elevated/40 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Lead</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Score & Priority</th>
                <th className="py-3 px-4">Deal Value</th>
                <th className="py-3 px-4">Assigned Rep</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/60">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-text-muted">
                    No leads matching current search criteria
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l._id} className="hover:bg-bg-elevated/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {l.name?.[0] || 'L'}
                        </div>
                        <div>
                          <p className="font-bold text-text-main">{l.name}</p>
                          <span className="text-[10px] text-text-muted font-mono">{l.leadNumber}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-text-muted space-y-0.5">
                      <p className="text-text-main font-medium">{l.companyName || '—'}</p>
                      <p className="text-[11px] truncate max-w-[150px]">{l.email || l.phone || 'Web Visitor'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bg-elevated border border-border-dark text-accent-secondary">
                        {l.salesStage?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-text-main">{l.score || 0} pts</span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            l.priority === 'high'
                              ? 'bg-status-danger/20 text-status-danger'
                              : 'bg-accent-primary/20 text-accent-primary'
                          }`}
                        >
                          {l.priority}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-status-success">
                      {l.estimatedValuePaise > 0
                        ? `₹${(l.estimatedValuePaise / 100).toLocaleString('en-IN')}`
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-text-muted">
                      {l.assignedTo?.name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate('/inbox')}
                        className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-dark hover:border-accent-primary text-text-main font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Chat</span>
                        <ChevronRight className="w-3.5 h-3.5 text-accent-primary" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card border border-border-dark rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-text-main mb-4">Add New Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-muted mb-1 font-semibold">Prospect Full Name</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                  placeholder="e.g. Ramesh Patel"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                  placeholder="ramesh@company.in"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 font-semibold">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                  placeholder="+91 98765 00000"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1 font-semibold">Company Name</label>
                <input
                  type="text"
                  value={newLeadForm.companyName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, companyName: e.target.value })}
                  className="w-full bg-bg-elevated border border-border-dark rounded-lg p-2.5 text-text-main focus:outline-none focus:border-accent-primary"
                  placeholder="Patel Logistics"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border-dark text-text-muted hover:text-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-accent-primary text-bg-main font-bold hover:bg-accent-primary/90"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
