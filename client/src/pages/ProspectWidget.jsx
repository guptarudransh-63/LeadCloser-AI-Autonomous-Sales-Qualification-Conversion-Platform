import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Calendar,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Video,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  {
    title: '🎓 Coaching Institute',
    text: 'Hi, I need a website for my coaching institute. I want student registration, online fee tracking, and an admin dashboard. What would it cost?'
  },
  {
    title: '⏱️ Target Timeline & Budget',
    text: 'We have 500 students and need this ready within 3 weeks. Our budget is around ₹45,000.'
  },
  {
    title: '📅 Consultation Request',
    text: 'Can we schedule a 30-minute discovery consultation?'
  },
  {
    title: '👤 Speak with Human',
    text: 'Can I speak to a real person from your sales team?'
  }
];

export default function ProspectWidget() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [bookedApt, setBookedApt] = useState(null);

  const messagesEndRef = useRef(null);

  const startSession = async () => {
    try {
      const res = await api.post('/conversations', {});
      if (res.data.success) {
        setConversationId(res.data.conversationId);
        setLeadId(res.data.leadId);
        // Initial greeting
        setMessages([
          {
            senderType: 'ai_agent',
            content: 'Hello! Welcome to Apex Digital Solutions. How can we help you scale your business today? Feel free to describe your requirements, timeline, or ask about our services and pricing.',
            createdAt: new Date().toISOString()
          }
        ]);
        // Also fetch availability in background for quick slot buttons
        const slotRes = await api.get('/appointments/availability');
        if (slotRes.data.success) {
          setAvailableSlots(slotRes.data.slots?.slice(0, 3) || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sending || !conversationId) return;

    setInputMessage('');
    setSending(true);

    // Optimistically add customer message
    const tempUserMsg = {
      senderType: 'customer',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post(`/conversations/${conversationId}/messages`, {
        content: text,
        senderType: 'customer'
      });

      if (res.data.success) {
        if (res.data.aiResponse) {
          setMessages((prev) => [
            ...prev,
            {
              senderType: 'ai_agent',
              content: res.data.aiResponse,
              createdAt: new Date().toISOString(),
              toolTraces: res.data.toolTraces
            }
          ]);
        }

        // Check if estimate was created or updated in tool traces
        const estTrace = res.data.toolTraces?.find((t) => t.toolName === 'calculate_estimate');
        if (estTrace?.result) {
          setEstimate(estTrace.result);
        }

        // Check if appointment booked
        const bookTrace = res.data.toolTraces?.find((t) => t.toolName === 'book_appointment');
        if (bookTrace?.result) {
          setBookedApt(bookTrace.result);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleBookSlot = (slot) => {
    handleSendMessage(`Please book the consultation slot for ${slot.startTime}`);
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4 md:p-8">
      {/* Top Banner Navigation back to CRM */}
      <div className="max-w-3xl w-full mb-4 flex items-center justify-between text-xs">
        <button
          onClick={() => navigate('/inbox')}
          className="flex items-center gap-1.5 text-accent-primary hover:underline font-semibold"
        >
          ← Return to CRM Sales Inbox
        </button>

        {leadId && (
          <button
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-1.5 bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/30 px-3 py-1 rounded-lg font-semibold hover:bg-accent-secondary/25 transition-colors"
          >
            <span>View this Lead in CRM</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Chat Box */}
      <div className="max-w-3xl w-full bg-bg-card border border-border-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[750px]">
        {/* Chat Widget Header */}
        <div className="p-4 px-6 bg-bg-sidebar border-b border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center text-bg-main shadow-md shadow-accent-primary/20">
              <Bot className="w-5 h-5 text-[#0B0F14]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-text-main">Apex Digital Solutions</h3>
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              </div>
              <p className="text-[11px] text-text-muted">LeadCloser AI Sales Agent • Online</p>
            </div>
          </div>

          <button
            onClick={startSession}
            title="Restart conversation"
            className="p-2 rounded-lg bg-bg-card border border-border-dark text-text-muted hover:text-text-main hover:bg-bg-elevated transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Estimate Floater if active */}
        {estimate && (
          <div className="bg-bg-elevated/90 border-b border-border-dark p-3 px-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-status-success/20 text-status-success px-2 py-0.5 rounded font-bold uppercase">
                Estimate Ready
              </span>
              <span className="text-text-muted text-[11px]">Calculated via catalog rules:</span>
              <span className="font-extrabold text-status-success text-sm">{estimate.total}</span>
            </div>
            <span className="text-[10px] text-text-muted">v{estimate.version}</span>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => {
            const isCustomer = m.senderType === 'customer';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                    isCustomer
                      ? 'bg-accent-primary text-bg-main font-medium rounded-tr-sm'
                      : 'bg-bg-elevated border border-border-dark text-text-main rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {/* Interactive Consultation Slot Selector inside the chat */}
          {messages.length > 2 && availableSlots.length > 0 && !bookedApt && (
            <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border-dark space-y-2.5 max-w-[85%]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-accent-secondary">
                <Calendar className="w-4 h-4" />
                <span>Instant Consultation Slot Booking</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Select an available appointment time with our lead architect:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => handleBookSlot(slot)}
                    className="p-2.5 rounded-lg bg-bg-card border border-border-dark hover:border-accent-primary text-xs text-left transition-colors group"
                  >
                    <span className="font-bold text-text-main group-hover:text-accent-primary block">
                      {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-text-muted block">
                      {new Date(slot.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sending && (
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <div className="w-2 h-2 rounded-full bg-accent-secondary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-accent-secondary animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-accent-secondary animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] ml-1">Analyzing requirements & catalog pricing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-bg-sidebar border-t border-border-dark/60 flex gap-2 overflow-x-auto text-[11px]">
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp.text)}
              className="px-3 py-1 rounded-full bg-bg-card border border-border-dark text-text-muted hover:text-text-main hover:border-accent-primary whitespace-nowrap transition-colors shrink-0"
            >
              {qp.title}
            </button>
          ))}
        </div>

        {/* Inbound Message Input */}
        <div className="p-4 px-6 bg-bg-sidebar border-t border-border-dark">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe your project, required features, budget, or timeline..."
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
        </div>
      </div>
    </div>
  );
}
