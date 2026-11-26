console.log('[app.js] Initializing Express app...');
console.time('[app.js] Express loaded in');
const express = require('express');
console.timeEnd('[app.js] Express loaded in');

console.time('[app.js] CORS loaded in');
const cors = require('cors');
console.timeEnd('[app.js] CORS loaded in');

console.time('[app.js] CookieParser loaded in');
const cookieParser = require('cookie-parser');
console.timeEnd('[app.js] CookieParser loaded in');

console.time('[app.js] ErrorHandler loaded in');
const errorHandler = require('./middlewares/errorHandler');
console.timeEnd('[app.js] ErrorHandler loaded in');

console.time('[app.js] AuthRoutes loaded in');
const authRoutes = require('./routes/authRoutes');
console.timeEnd('[app.js] AuthRoutes loaded in');

console.time('[app.js] LeadRoutes loaded in');
const leadRoutes = require('./routes/leadRoutes');
console.timeEnd('[app.js] LeadRoutes loaded in');

console.time('[app.js] ConversationRoutes loaded in');
const conversationRoutes = require('./routes/conversationRoutes');
console.timeEnd('[app.js] ConversationRoutes loaded in');

console.time('[app.js] ServiceRoutes loaded in');
const serviceRoutes = require('./routes/serviceRoutes');
console.timeEnd('[app.js] ServiceRoutes loaded in');

console.time('[app.js] EstimateRoutes loaded in');
const estimateRoutes = require('./routes/estimateRoutes');
console.timeEnd('[app.js] EstimateRoutes loaded in');

console.time('[app.js] AppointmentRoutes loaded in');
const appointmentRoutes = require('./routes/appointmentRoutes');
console.timeEnd('[app.js] AppointmentRoutes loaded in');

console.time('[app.js] AnalyticsRoutes loaded in');
const analyticsRoutes = require('./routes/analyticsRoutes');
console.timeEnd('[app.js] AnalyticsRoutes loaded in');

console.time('[app.js] AutomationRoutes loaded in');
const automationRoutes = require('./routes/automationRoutes');
console.timeEnd('[app.js] AutomationRoutes loaded in');

console.log('✅ [app.js] All routes loaded successfully!');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'LeadCloser AI',
    timestamp: new Date().toISOString(),
    simulationMode: process.env.SIMULATION_MODE === 'true'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/automation', automationRoutes);

// Error Handler
app.use(errorHandler);

module.exports = app;
