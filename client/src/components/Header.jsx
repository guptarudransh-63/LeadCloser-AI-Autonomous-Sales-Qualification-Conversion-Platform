import React, { useState, useEffect } from 'react';
import { Bell, Check, Sparkles, AlertCircle, Calendar, DollarSign, UserCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Header({ title }) {
  const { workspace } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/automation/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/automation/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-16 bg-bg-main border-b border-border-dark flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-text-main tracking-tight">{title}</h1>
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bg-card border border-border-dark text-text-muted">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          {workspace?.name}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Simulation Mode Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/25 text-accent-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Local Simulation: Ready</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-bg-card border border-border-dark text-text-muted hover:text-text-main hover:bg-bg-elevated transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-bg-card border border-border-dark rounded-xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-border-dark mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Alerts & Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-status-danger/20 text-status-danger px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-accent-primary hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">No recent notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-2.5 rounded-lg border text-xs transition-colors ${
                        n.isRead ? 'bg-bg-elevated/40 border-border-dark/60 text-text-muted' : 'bg-bg-elevated border-accent-primary/30 text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        {n.type === 'handoff_request' && <AlertCircle className="w-3.5 h-3.5 text-status-danger" />}
                        {n.type === 'appointment_booked' && <Calendar className="w-3.5 h-3.5 text-status-success" />}
                        {n.type === 'high_value_lead' && <DollarSign className="w-3.5 h-3.5 text-status-warning" />}
                        <span>{n.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-text-muted mt-1.5 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
