import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Kanban,
  Calendar,
  FileText,
  Sliders,
  Sparkles,
  BarChart3,
  Bot,
  ExternalLink,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'AI Sales Inbox', to: '/inbox', icon: MessageSquare },
  { name: 'Leads & CRM', to: '/leads', icon: Users },
  { name: 'Sales Pipeline', to: '/pipeline', icon: Kanban },
  { name: 'Appointments', to: '/appointments', icon: Calendar },
  { name: 'Estimates', to: '/estimates', icon: FileText },
  { name: 'Services & Pricing', to: '/services', icon: Sliders },
  { name: 'Automation Rules', to: '/automation', icon: Sparkles },
  { name: 'Analytics', to: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const { user, workspace, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-bg-sidebar border-r border-border-dark flex flex-col justify-between h-screen fixed top-0 left-0 z-30 select-none">
      <div>
        {/* App Logo & Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border-dark">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center text-bg-main shadow-lg shadow-accent-primary/20">
            <Bot className="w-5 h-5 text-[#0B0F14]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-text-main">LeadCloser</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate max-w-[130px]">
              {workspace?.name || 'Autonomous Agent'}
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30 font-semibold shadow-sm'
                    : 'text-text-muted hover:text-text-main hover:bg-bg-elevated'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border-dark space-y-2">
        {/* Customer Portal Simulator Link */}
        <button
          onClick={() => navigate('/widget')}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary text-xs font-semibold hover:bg-accent-secondary/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Prospect Chat Portal
          </span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-bg-card border border-border-dark">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-main truncate">{user?.name}</p>
              <span className="text-[10px] text-text-muted capitalize flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-status-success" />
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded text-text-muted hover:text-status-danger hover:bg-bg-elevated transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
