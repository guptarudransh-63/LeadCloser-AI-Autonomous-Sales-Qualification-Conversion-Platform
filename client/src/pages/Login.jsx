import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/';

  const [email, setEmail] = useState('owner@leadcloser.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-bg-card border border-border-dark rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center text-[#0B0F14] shadow-xl shadow-accent-primary/20 mb-3">
            <Bot className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight">LeadCloser AI</h1>
          <p className="text-xs text-text-muted mt-1 max-w-xs">
            Autonomous Sales Qualification, Deterministic Pricing, and Conversion Platform
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg-elevated border border-border-dark rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg-elevated border border-border-dark rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-bg-main font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/25 transition-all mt-6"
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast-Switch Buttons */}
        <div className="mt-8 pt-6 border-t border-border-dark">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider text-center mb-3">
            Instant Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDemoAccount('owner@leadcloser.ai')}
              type="button"
              className={`p-2 rounded-lg border text-xs text-center transition-all ${
                email === 'owner@leadcloser.ai'
                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-bold'
                  : 'bg-bg-elevated border-border-dark text-text-muted hover:text-text-main'
              }`}
            >
              👑 Owner
            </button>
            <button
              onClick={() => setDemoAccount('priya@leadcloser.ai')}
              type="button"
              className={`p-2 rounded-lg border text-xs text-center transition-all ${
                email === 'priya@leadcloser.ai'
                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-bold'
                  : 'bg-bg-elevated border-border-dark text-text-muted hover:text-text-main'
              }`}
            >
              💼 Sales Rep
            </button>
            <button
              onClick={() => setDemoAccount('admin@leadcloser.ai')}
              type="button"
              className={`p-2 rounded-lg border text-xs text-center transition-all ${
                email === 'admin@leadcloser.ai'
                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary font-bold'
                  : 'bg-bg-elevated border-border-dark text-text-muted hover:text-text-main'
              }`}
            >
              ⚙️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
