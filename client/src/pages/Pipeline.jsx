import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  MoreVertical
} from 'lucide-react';
import api from '../services/api';

const STAGES = [
  { id: 'new', label: 'New', color: 'border-blue-500/40 text-blue-400' },
  { id: 'contacted', label: 'Contacted', color: 'border-indigo-500/40 text-indigo-400' },
  { id: 'qualifying', label: 'Qualifying', color: 'border-purple-500/40 text-purple-400' },
  { id: 'qualified', label: 'Qualified', color: 'border-accent-primary/60 text-accent-primary' },
  { id: 'estimate_sent', label: 'Estimate Sent', color: 'border-accent-secondary/60 text-accent-secondary' },
  { id: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'border-status-success/60 text-status-success' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-status-warning/60 text-status-warning' },
  { id: 'won', label: 'Won Deal', color: 'border-emerald-500 text-emerald-400' },
  { id: 'lost', label: 'Lost', color: 'border-status-danger/40 text-status-danger' },
];

export default function Pipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads?limit=100');
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
  }, []);

  const handleMoveStage = async (leadId, newStage) => {
    try {
      await api.patch(`/leads/${leadId}/stage`, { stage: newStage });
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-main tracking-tight">Sales Pipeline Kanban</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time visual tracking of leads through commercial stages
          </p>
        </div>
      </div>

      {/* Horizontal Scrollable Stages Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-210px)] select-none">
        {STAGES.map((stg) => {
          const stageLeads = leads.filter((l) => l.salesStage === stg.id);
          const totalValPaise = stageLeads.reduce((acc, curr) => acc + (curr.estimatedValuePaise || 0), 0);

          return (
            <div
              key={stg.id}
              className="w-72 bg-bg-card border border-border-dark rounded-xl flex flex-col shrink-0 overflow-hidden shadow-sm"
            >
              {/* Stage Header */}
              <div className="p-3.5 border-b border-border-dark bg-bg-elevated/40">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${stg.color}`}>
                    {stg.label}
                  </span>
                  <span className="text-[11px] font-extrabold bg-bg-card px-2 py-0.5 rounded-full border border-border-dark text-text-main">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Pipeline Value:</span>
                  <span className="font-semibold text-text-main">
                    ₹{(totalValPaise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Stage Cards Container */}
              <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                {stageLeads.length === 0 ? (
                  <div className="h-24 border border-dashed border-border-dark/60 rounded-lg flex items-center justify-center text-text-muted text-[11px]">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((l) => (
                    <div
                      key={l._id}
                      className="p-3 rounded-lg bg-bg-elevated border border-border-dark hover:border-accent-primary/50 transition-all shadow-sm space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-text-muted">{l.leadNumber}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            l.priority === 'high'
                              ? 'bg-status-danger/20 text-status-danger'
                              : 'bg-accent-primary/20 text-accent-primary'
                          }`}
                        >
                          {l.score || 0} pts
                        </span>
                      </div>

                      <div>
                        <h4
                          onClick={() => navigate('/inbox')}
                          className="font-bold text-xs text-text-main hover:text-accent-primary cursor-pointer truncate"
                        >
                          {l.name}
                        </h4>
                        <p className="text-[11px] text-text-muted truncate">{l.companyName || l.email || 'Website Visitor'}</p>
                      </div>

                      {l.estimatedValuePaise > 0 && (
                        <div className="pt-1.5 border-t border-border-dark/60 flex items-center justify-between text-[11px]">
                          <span className="text-text-muted">Value</span>
                          <span className="font-bold text-status-success">
                            ₹{(l.estimatedValuePaise / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Stage Move Dropdown */}
                      <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">Move to:</span>
                        <select
                          value={l.salesStage}
                          onChange={(e) => handleMoveStage(l._id, e.target.value)}
                          className="bg-bg-card border border-border-dark rounded px-1.5 py-0.5 text-[10px] text-text-main focus:outline-none focus:border-accent-primary"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
