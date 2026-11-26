import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Estimates() {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEstimateId, setExpandedEstimateId] = useState(null);

  const fetchEstimates = async () => {
    try {
      const res = await api.get('/estimates');
      if (res.data.success) {
        setEstimates(res.data.estimates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  const handleApprove = async (estId) => {
    try {
      const res = await api.post(`/estimates/${estId}/approve`);
      if (res.data.success) {
        fetchEstimates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = (id) => {
    setExpandedEstimateId(expandedEstimateId === id ? null : id);
  };

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-text-main tracking-tight">Estimates & Quoting Vault</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Deterministic, precision-safe price proposals with strict versioning and discount guardrails
        </p>
      </div>

      <div className="space-y-4">
        {estimates.length === 0 ? (
          <div className="p-12 rounded-xl bg-bg-card border border-border-dark text-center text-text-muted text-xs">
            No estimates generated yet. Run a conversation in the Sales Inbox to auto-calculate an estimate!
          </div>
        ) : (
          estimates.map((est) => {
            const isApproved = est.status === 'approved';
            const isSuperseded = est.status === 'superseded';
            const isPreliminary = est.status === 'preliminary';
            const isExpanded = expandedEstimateId === est._id;

            return (
              <div
                key={est._id}
                className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-4 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-main">
                        {est.estimateNumber}
                      </span>
                      <span className="text-[10px] font-mono bg-bg-elevated text-accent-secondary px-2 py-0.5 rounded border border-border-dark">
                        v{est.version}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isApproved
                            ? 'bg-status-success/20 text-status-success'
                            : isSuperseded
                            ? 'bg-bg-elevated text-text-muted'
                            : 'bg-accent-primary/20 text-accent-primary'
                        }`}
                      >
                        {est.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-main">
                      {est.leadId?.name} — {est.serviceId?.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Total Amount</span>
                      <span className="text-lg font-extrabold text-status-success">
                        ₹{(est.totalPaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {isPreliminary && isOwnerOrAdmin && (
                      <button
                        onClick={() => handleApprove(est._id)}
                        className="px-3.5 py-2 rounded-lg bg-status-success/20 border border-status-success/40 text-status-success hover:bg-status-success/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Approve Quote
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(est._id)}
                      className="p-2 rounded-lg bg-bg-elevated border border-border-dark text-text-muted hover:text-text-main transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Itemized Breakdown & Assumptions */}
                {isExpanded && (
                  <div className="pt-4 border-t border-border-dark space-y-4 text-xs">
                    <div>
                      <h5 className="font-bold text-text-main mb-2">Itemized Breakdown</h5>
                      <div className="divide-y divide-border-dark/60 bg-bg-elevated rounded-lg p-3">
                        {est.lineItems?.map((li, idx) => (
                          <div key={idx} className="py-2 flex justify-between items-center first:pt-0 last:pb-0">
                            <div>
                              <p className="font-semibold text-text-main">{li.name}</p>
                              {li.description && (
                                <p className="text-[11px] text-text-muted">{li.description}</p>
                              )}
                            </div>
                            <span className="font-mono font-bold text-text-main">
                              ₹{(li.totalPaise / 100).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assumptions & Exclusions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {est.assumptions && est.assumptions.length > 0 && (
                        <div className="p-3 bg-bg-elevated rounded-lg border border-border-dark">
                          <h6 className="font-bold text-text-muted text-[11px] uppercase mb-1.5">Assumptions</h6>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-text-muted">
                            {est.assumptions.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {est.exclusions && est.exclusions.length > 0 && (
                        <div className="p-3 bg-bg-elevated rounded-lg border border-border-dark">
                          <h6 className="font-bold text-text-muted text-[11px] uppercase mb-1.5">Exclusions</h6>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-text-muted">
                            {est.exclusions.map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
