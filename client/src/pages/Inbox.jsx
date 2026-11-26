import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Bot,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTools, setExpandedTools] = useState({});

  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations || []);
        if (!selectedConvId && res.data.conversations.length > 0) {
          setSelectedConvId(res.data.conversations[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (convId) => {
    if (!convId) return;
    try {
      const res = await api.get(`/conversations/${convId}`);
      if (res.data.success) {
        setActiveConvData(res.data);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationDetail(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    const content = inputMessage.trim();
    setInputMessage('');

    try {
      // If conversation is human takeover or user is human agent, send as human_agent
      const isTakeover = activeConvData?.conversation?.status === 'human_takeover';
      const senderType = isTakeover ? 'human_agent' : 'customer';

      const res = await api.post(`/conversations/${selectedConvId}/messages`, {
        content,
        senderType
      });

      if (res.data.success) {
        fetchConversationDetail(selectedConvId);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleTakeover = async () => {
    try {
      await api.post(`/conversations/${selectedConvId}/takeover`);
      fetchConversationDetail(selectedConvId);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeAI = async () => {
    try {
      await api.post(`/conversations/${selectedConvId}/resume`);
      fetchConversationDetail(selectedConvId);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleToolExpand = (msgId) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const conv = activeConvData?.conversation;
  const lead = conv?.leadId;
  const reqs = activeConvData?.requirements;
  const estimate = conv?.currentEstimateId;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-bg-main overflow-hidden">
      {/* 1. Left List: Conversations Queue */}
      <div className="w-80 border-r border-border-dark flex flex-col bg-bg-sidebar shrink-0">
        <div className="p-4 border-b border-border-dark">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-text-main">Conversations</h2>
            <button
              onClick={fetchConversations}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-elevated transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-lg bg-bg-card p-1 border border-border-dark text-[11px] font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'all' ? 'bg-accent-primary text-bg-main font-bold shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending_human_review')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'pending_human_review' ? 'bg-status-danger text-white font-bold shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              Review ({conversations.filter((c) => c.status === 'pending_human_review').length})
            </button>
            <button
              onClick={() => setFilterStatus('human_takeover')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'human_takeover' ? 'bg-status-warning text-bg-main font-bold shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              Takeover
            </button>
          </div>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-dark/60">
          {filteredConversations.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-10">No conversations in this filter</p>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c._id === selectedConvId;
              const isPendingHandoff = c.status === 'pending_human_review';
              const isTakeover = c.status === 'human_takeover';

              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedConvId(c._id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-bg-card border-l-4 border-accent-primary'
                      : 'hover:bg-bg-elevated/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-text-main truncate max-w-[140px]">
                      {c.leadId?.name || 'Prospect'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.leadId?.priority === 'high'
                          ? 'bg-status-danger/20 text-status-danger'
                          : 'bg-accent-primary/20 text-accent-primary'
                      }`}
                    >
                      {c.leadId?.score || 0} pts
                    </span>
                  </div>

                  <p className="text-[11px] text-text-muted truncate mb-2">
                    {c.leadId?.companyName || c.leadId?.email || 'Web Chat Inquiry'}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated border border-border-dark text-text-muted capitalize">
                      {c.currentOutcome?.replace(/_/g, ' ')}
                    </span>
                    {isPendingHandoff && (
                      <span className="flex items-center gap-1 text-[10px] text-status-danger font-bold animate-pulse">
                        <AlertCircle className="w-3 h-3" /> Handoff
                      </span>
                    )}
                    {isTakeover && (
                      <span className="flex items-center gap-1 text-[10px] text-status-warning font-semibold">
                        <UserCheck className="w-3 h-3" /> Human Rep
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Workspace: Live Chat */}
      <div className="flex-1 flex flex-col bg-bg-main relative">
        {/* Chat Header Bar */}
        <div className="h-14 border-b border-border-dark px-6 flex items-center justify-between bg-bg-sidebar shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-xs uppercase">
              {lead?.name?.[0] || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-main">{lead?.name || 'Prospect'}</span>
                <span className="text-[10px] font-mono bg-bg-elevated text-text-muted px-1.5 py-0.5 rounded border border-border-dark">
                  {lead?.leadNumber}
                </span>
              </div>
              <span className="text-[11px] text-text-muted">{lead?.companyName || lead?.email || 'Active Discovery'}</span>
            </div>
          </div>

          {/* Takeover Control */}
          <div className="flex items-center gap-3">
            {conv?.status === 'human_takeover' ? (
              <button
                onClick={handleResumeAI}
                className="px-3 py-1.5 rounded-lg bg-accent-primary/20 text-accent-primary border border-accent-primary/40 text-xs font-semibold hover:bg-accent-primary/30 flex items-center gap-1.5 transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                Resume AI Bot
              </button>
            ) : (
              <button
                onClick={handleTakeover}
                className="px-3 py-1.5 rounded-lg bg-status-warning/20 text-status-warning border border-status-warning/40 text-xs font-semibold hover:bg-status-warning/30 flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Take Over Conversation
              </button>
            )}
          </div>
        </div>

        {/* Handoff Banner if pending review */}
        {conv?.status === 'pending_human_review' && (
          <div className="bg-status-danger/15 border-b border-status-danger/30 p-2.5 px-6 flex items-center justify-between text-xs text-status-danger">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Human Escalation Triggered:</strong> {conv.escalationReason || 'Requirements require review.'}
              </span>
            </div>
            <button
              onClick={handleTakeover}
              className="px-3 py-1 bg-status-danger text-white rounded text-[11px] font-bold hover:bg-status-danger/90 transition-colors"
            >
              Take Over Now
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-xs">
              <Bot className="w-8 h-8 mx-auto text-accent-primary/40 mb-2" />
              No messages yet in this session.
            </div>
          ) : (
            messages.map((m) => {
              const isCustomer = m.senderType === 'customer';
              const isAi = m.senderType === 'ai_agent';
              const isHumanAgent = m.senderType === 'human_agent';

              return (
                <div
                  key={m._id}
                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isCustomer && <User className="w-3 h-3 text-text-muted" />}
                    {isAi && <Bot className="w-3 h-3 text-accent-secondary" />}
                    {isHumanAgent && <UserCheck className="w-3 h-3 text-status-warning" />}
                    <span className="text-[10px] font-semibold text-text-muted capitalize">
                      {isCustomer ? 'Prospect' : isAi ? 'LeadCloser AI' : 'Sales Representative'}
                    </span>
                    <span className="text-[9px] text-text-muted">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                      isCustomer
                        ? 'bg-bg-elevated border border-border-dark text-text-main rounded-tl-sm'
                        : isHumanAgent
                        ? 'bg-status-warning/15 border border-status-warning/30 text-text-main rounded-tr-sm'
                        : 'bg-accent-primary/15 border border-accent-primary/30 text-text-main rounded-tr-sm'
                    }`}
                  >
                    {m.content}

                    {/* AI Tool Calls Trace Pill */}
                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border-dark/60">
                        <button
                          type="button"
                          onClick={() => toggleToolExpand(m._id)}
                          className="flex items-center gap-1 text-[10px] font-mono font-semibold text-accent-secondary hover:underline"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Tool Executions ({m.toolCalls.length})</span>
                          {expandedTools[m._id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {expandedTools[m._id] && (
                          <div className="mt-2 space-y-1.5 font-mono text-[10px] bg-bg-card p-2.5 rounded-lg border border-border-dark">
                            {m.toolCalls.map((tc, idx) => (
                              <div key={idx} className="border-b border-border-dark/40 pb-1.5 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between text-accent-primary">
                                  <span>⚙️ {tc.toolName}</span>
                                  <span className="text-text-muted">{tc.executionTimeMs}ms</span>
                                </div>
                                {tc.result && (
                                  <p className="text-text-muted truncate mt-0.5">
                                    Result: {JSON.stringify(tc.result).slice(0, 80)}...
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-border-dark bg-bg-sidebar">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                conv?.status === 'human_takeover'
                  ? 'Type your message as sales representative...'
                  : 'Type prospect message to test AI qualification & pricing response...'
              }
              className="flex-1 bg-bg-card border border-border-dark rounded-xl px-4 py-3 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="px-5 py-3 rounded-xl bg-accent-primary text-bg-main font-bold text-xs flex items-center gap-2 hover:bg-accent-primary/90 disabled:opacity-50 transition-all shadow-md shadow-accent-primary/20"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[10px] text-text-muted px-1">
            <span>
              Mode:{' '}
              <strong className="text-text-main capitalize">
                {conv?.status === 'human_takeover' ? 'Human Takeover (Bot Paused)' : 'Autonomous AI Agent'}
              </strong>
            </span>
            <span>Deterministic Pricing Engine Active</span>
          </div>
        </div>
      </div>

      {/* 3. Right Drawer: Lead Profile, Qualification, Estimate, & Next Action */}
      <div className="w-96 border-l border-border-dark bg-bg-sidebar flex flex-col overflow-y-auto shrink-0 p-5 space-y-6">
        {/* Profile Card */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Lead Profile</h3>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                lead?.priority === 'high'
                  ? 'bg-status-danger/20 text-status-danger'
                  : 'bg-accent-primary/20 text-accent-primary'
              }`}
            >
              {lead?.priority?.replace('_', ' ') || 'needs review'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-card border border-border-dark space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Company</span>
              <span className="font-semibold text-text-main truncate">{lead?.companyName || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Email</span>
              <span className="font-semibold text-text-main truncate">{lead?.email || 'Anonymous'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Pipeline Stage</span>
              <span className="font-semibold text-accent-secondary uppercase text-[11px]">
                {lead?.salesStage?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Qualification Score Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Qualification Score</h3>
            <span className="text-sm font-extrabold text-accent-primary">{lead?.score || 0} / 100</span>
          </div>
          <div className="p-3.5 rounded-xl bg-bg-card border border-border-dark space-y-2 text-xs">
            {lead?.scoreExplanation && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Service Fit</span>
                  <span className="font-semibold text-text-main">
                    {lead.scoreExplanation.serviceFit?.score || 0} pts
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Budget Fit</span>
                  <span className="font-semibold text-text-main">
                    {lead.scoreExplanation.budgetFit?.score || 0} pts
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Timeline Readiness</span>
                  <span className="font-semibold text-text-main">
                    {lead.scoreExplanation.timelineReadiness?.score || 0} pts
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Completeness</span>
                  <span className="font-semibold text-text-main">
                    {lead.scoreExplanation.requirementCompleteness?.score || 0} pts
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Structured Requirements Checklist */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            Extracted Requirements
          </h3>
          <div className="p-3.5 rounded-xl bg-bg-card border border-border-dark space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">Service & Business</span>
              <p className="font-semibold text-text-main">
                {reqs?.businessType || 'Discovering...'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">Required Features</span>
              {reqs?.requiredFeatures && reqs.requiredFeatures.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {reqs.requiredFeatures.map((f, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-bg-elevated border border-border-dark text-[10px] text-accent-secondary font-medium"
                    >
                      ✓ {f}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-[11px]">No features extracted yet</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-dark/60">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Budget Range</span>
                <span className="font-semibold text-text-main">{reqs?.budgetRange?.rawText || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Target Timeline</span>
                <span className="font-semibold text-text-main">{reqs?.expectedTimeline?.rawText || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deterministic Estimate Breakdown */}
        {estimate && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Preliminary Estimate</h3>
              <span className="text-[10px] font-mono text-accent-secondary">v{estimate.version}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-bg-card border border-border-dark space-y-3 text-xs">
              <div className="divide-y divide-border-dark/60 text-[11px]">
                {estimate.lineItems?.map((li, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <span className="text-text-muted truncate max-w-[170px]">{li.name}</span>
                    <span className="font-semibold text-text-main">
                      ₹{(li.totalPaise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border-dark flex justify-between items-center text-xs">
                <span className="font-bold text-text-muted">Total Estimated:</span>
                <span className="text-sm font-extrabold text-status-success">
                  ₹{(estimate.totalPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>

              <p className="text-[9px] text-text-muted italic">
                Calculated strictly via backend catalog rules. LLM cannot modify line items.
              </p>
            </div>
          </div>
        )}

        {/* Next Best Action */}
        <div className="p-3.5 rounded-xl bg-accent-primary/10 border border-accent-primary/30 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-accent-primary text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Next Recommended Action
          </div>
          <p className="text-text-main text-[11px] leading-relaxed">
            {conv?.currentOutcome === 'estimate_ready'
              ? 'Present consultation slots to lock in technical requirements.'
              : conv?.currentOutcome === 'appointment_booked'
              ? 'Prepare discovery brief and review lead profile before consultation.'
              : 'Continue requirement discovery and confirm budget range.'}
          </p>
        </div>
      </div>
    </div>
  );
}
