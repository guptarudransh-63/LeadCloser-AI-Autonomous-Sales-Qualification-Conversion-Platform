import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  Calendar,
  FileText,
  Trophy,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Clock,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';

const COLORS = ['#8B9CF6', '#55D6BE', '#36C98F', '#F2B95E', '#F16B78'];

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/overview');
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const pipelineFunnel = data?.pipelineFunnel || [];
  const leadsBySource = data?.leadsBySource || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-bg-card to-bg-elevated p-6 rounded-2xl border border-border-dark shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping" />
            <span className="text-xs font-bold text-accent-secondary uppercase tracking-wider">AI Sales Agent Active</span>
          </div>
          <h2 className="text-2xl font-black text-text-main tracking-tight">Sales Qualification & Velocity Hub</h2>
          <p className="text-xs text-text-muted mt-1">
            Autonomous discovery conversations, deterministic estimates, and calendar slot booking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inbox')}
            className="px-4 py-2.5 rounded-xl bg-accent-primary text-bg-main font-bold text-xs flex items-center gap-2 shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Open Sales Inbox
          </button>
          <button
            onClick={() => navigate('/widget')}
            className="px-4 py-2.5 rounded-xl bg-bg-card border border-border-dark text-text-main font-semibold text-xs flex items-center gap-2 hover:bg-bg-elevated transition-colors"
          >
            Launch Chat Portal
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm hover:border-border-dark/80 transition-all">
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text-main">{kpis.totalLeads || 0}</span>
            <span className="text-xs text-status-success font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +{kpis.newLeadsThisPeriod || 0} new
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Active in pipeline</p>
        </div>

        {/* Lead to Qualified Rate */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm hover:border-border-dark/80 transition-all">
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Qualification Rate</span>
            <div className="p-2 rounded-lg bg-accent-secondary/10 text-accent-secondary">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text-main">{kpis.leadToQualifiedRate || 0}%</span>
            <span className="text-xs text-text-muted">({kpis.qualifiedLeads || 0} qualified)</span>
          </div>
          <div className="w-full bg-bg-elevated rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-accent-secondary h-1.5 rounded-full"
              style={{ width: `${Math.min(100, kpis.leadToQualifiedRate || 0)}%` }}
            />
          </div>
        </div>

        {/* Appointments Booked */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm hover:border-border-dark/80 transition-all">
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Consultations Booked</span>
            <div className="p-2 rounded-lg bg-status-success/10 text-status-success">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text-main">{kpis.appointmentsBooked || 0}</span>
            <span className="text-xs text-status-success font-medium">Scheduled</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Validated against staff calendar</p>
        </div>

        {/* Won Deals & Conversion */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm hover:border-border-dark/80 transition-all">
          <div className="flex items-center justify-between text-text-muted mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Won Deals</span>
            <div className="p-2 rounded-lg bg-status-warning/10 text-status-warning">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text-main">{kpis.wonDeals || 0}</span>
            <span className="text-xs text-text-muted font-medium">({kpis.leadToWonRate || 0}% close rate)</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Avg Qualification Score: {kpis.avgScore || 0}/100</p>
        </div>
      </div>

      {/* Pipeline Stage Distribution & Lead Sources Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Bar Chart */}
        <div className="lg:col-span-2 bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-text-main">Pipeline Stage Distribution</h3>
              <p className="text-xs text-text-muted">Volume of active prospects per commercial stage</p>
            </div>
            <button
              onClick={() => navigate('/pipeline')}
              className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Open Kanban Board <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineFunnel}>
                <XAxis dataKey="stage" tick={{ fill: '#98A5B5', fontSize: 10 }} />
                <YAxis tick={{ fill: '#98A5B5', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161E29',
                    borderColor: '#2A3544',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#8B9CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads by Source */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-main mb-1">Lead Sources</h3>
            <p className="text-xs text-text-muted mb-4">Attribution breakdown</p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsBySource}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {leadsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#161E29',
                      borderColor: '#2A3544',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border-dark">
            {leadsBySource.map((s, idx) => (
              <div key={s.source} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-text-muted capitalize">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  {s.source.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-text-main">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Stream */}
      <div className="bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-secondary" />
            <h3 className="text-sm font-bold text-text-main">Audit Log & System Event Stream</h3>
          </div>
          <button
            onClick={() => navigate('/automation')}
            className="text-xs text-text-muted hover:text-text-main"
          >
            View all logs
          </button>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No recent activity logged</p>
          ) : (
            recentActivity.slice(0, 5).map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated/50 border border-border-dark/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-bg-card text-accent-primary font-mono text-[11px] font-bold border border-border-dark">
                    {log.action}
                  </span>
                  <span className="text-text-main font-medium capitalize">
                    {log.resourceType}: <span className="font-mono text-text-muted">{log.resourceId?.slice(-6)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-text-muted text-[11px]">
                  <span>{log.userId?.name || 'System / AI Engine'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
