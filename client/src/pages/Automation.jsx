import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  CheckCircle2,
  Clock,
  Shield,
  Send,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

export default function Automation() {
  const [followUps, setFollowUps] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('followups');

  const fetchData = async () => {
    try {
      const [fRes, aRes] = await Promise.all([
        api.get('/automation/follow-ups'),
        api.get('/automation/audit-logs')
      ]);

      if (fRes.data.success) setFollowUps(fRes.data.followUps || []);
      if (aRes.data.success) setAuditLogs(aRes.data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveFollowUp = async (id) => {
    try {
      const res = await api.post(`/automation/follow-ups/${id}/approve`);
      if (res.data.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-text-main tracking-tight">Automation & Follow-Up Workflows</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Autonomous drafting, human review gates, and immutable audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-dark space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('followups')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'followups'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Mail className="w-4 h-4" />
          Follow-Up Drafts Queue ({followUps.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Shield className="w-4 h-4" />
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Follow-up drafts queue */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          {followUps.length === 0 ? (
            <div className="p-12 rounded-xl bg-bg-card border border-border-dark text-center text-text-muted text-xs">
              No pending follow-up drafts in the queue.
            </div>
          ) : (
            followUps.map((task) => {
              const isSent = task.status === 'sent';
              return (
                <div
                  key={task._id}
                  className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isSent
                            ? 'bg-status-success/20 text-status-success'
                            : 'bg-status-warning/20 text-status-warning'
                        }`}
                      >
                        {task.status}
                      </span>
                      <span className="font-bold text-text-main">
                        To: {task.leadId?.name} ({task.leadId?.email || 'Customer'})
                      </span>
                      <span className="text-text-muted text-[11px] capitalize">
                        • {task.type?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {!isSent && (
                      <button
                        onClick={() => handleApproveFollowUp(task._id)}
                        className="px-3.5 py-1.5 rounded-lg bg-accent-primary text-bg-main font-bold text-xs flex items-center gap-1.5 hover:bg-accent-primary/90 transition-colors self-start sm:self-auto"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Approve & Dispatch
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-lg bg-bg-elevated border border-border-dark space-y-1.5">
                    <p className="font-bold text-text-main">Subject: {task.subject}</p>
                    <p className="text-text-muted leading-relaxed whitespace-pre-wrap text-[11px]">
                      {task.bodyDraft}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Channel: {task.channel?.toUpperCase()}</span>
                    <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Audit Logs Table */}
      {activeTab === 'audit' && (
        <div className="bg-bg-card border border-border-dark rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-dark bg-bg-elevated/40 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark/60">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-bg-elevated/30">
                    <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-text-main">
                      {log.userId?.name || 'System Agent'}
                    </td>
                    <td className="py-3 px-4 text-text-muted capitalize">
                      {log.resourceType}: <span className="font-mono text-[11px]">{log.resourceId?.slice(-6)}</span>
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
