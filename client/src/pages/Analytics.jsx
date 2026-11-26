import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Users,
  DollarSign,
  PieChart as PieIcon,
  Calendar
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

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
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
    fetchStats();
  }, []);

  const kpis = data?.kpis || {};
  const pipelineFunnel = data?.pipelineFunnel || [];
  const leadsBySource = data?.leadsBySource || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-text-main tracking-tight">Sales Conversion Analytics</h2>
        <p className="text-xs text-text-muted mt-0.5">
          End-to-end funnel telemetry from inbound conversation to closed deal
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase">Lead-to-Qualified Rate</span>
          <p className="text-3xl font-black text-accent-primary">{kpis.leadToQualifiedRate || 0}%</p>
          <p className="text-[11px] text-text-muted">Proportion of leads matching catalog fit</p>
        </div>

        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase">Lead-to-Won Rate</span>
          <p className="text-3xl font-black text-status-success">{kpis.leadToWonRate || 0}%</p>
          <p className="text-[11px] text-text-muted">Proportion of leads reaching won contract</p>
        </div>

        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase">Average Lead Score</span>
          <p className="text-3xl font-black text-accent-secondary">{kpis.avgScore || 0} / 100</p>
          <p className="text-[11px] text-text-muted">Across all active catalog prospects</p>
        </div>

        <div className="bg-bg-card border border-border-dark rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-text-muted uppercase">Consultations Scheduled</span>
          <p className="text-3xl font-black text-status-warning">{kpis.appointmentsBooked || 0}</p>
          <p className="text-[11px] text-text-muted">Verified calendar bookings</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Pipeline Chart */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-text-main">Conversion Funnel by Pipeline Stage</h3>
          <div className="h-72">
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

        {/* Lead Source Breakdown */}
        <div className="bg-bg-card border border-border-dark rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-text-main">Lead Source Acquisition Channels</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadsBySource}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
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
      </div>
    </div>
  );
}
