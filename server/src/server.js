// Performance guard: prevent slow recursive parent lookups for optional database drivers
const Module = require('module');
const origResolve = Module._resolveFilename;
const optionalMissingDrivers = new Set([
  'aws4', 'kerberos', 'snappy', 'socks', '@mongodb-js/zstd',
  'gcp-metadata', '@aws-sdk/credential-providers', 'snappy/package.json'
]);
Module._resolveFilename = function(request, parent, isMain, options) {
  if (optionalMissingDrivers.has(request)) {
    const err = new Error(`Cannot find module '${request}'`);
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return origResolve.call(this, request, parent, isMain, options);
};

console.log('>>> [server.js] PROCESS STARTED <<<');
console.time('[server.js] dotenv loaded in');
require('dotenv').config();
console.timeEnd('[server.js] dotenv loaded in');

console.time('[server.js] http loaded in');
const http = require('http');
console.timeEnd('[server.js] http loaded in');

console.time('[server.js] app loaded in');
const app = require('./app');
console.timeEnd('[server.js] app loaded in');

console.time('[server.js] connectDB loaded in');
const { connectDB } = require('./config/db');
console.timeEnd('[server.js] connectDB loaded in');

console.time('[server.js] initializeSockets loaded in');
const { initializeSockets } = require('./sockets/socketHandler');
console.timeEnd('[server.js] initializeSockets loaded in');

console.time('[server.js] Workspace loaded in');
const Workspace = require('./models/Workspace');
console.timeEnd('[server.js] Workspace loaded in');

console.time('[server.js] seedData loaded in');
const { seedData } = require('./scripts/seed');
console.timeEnd('[server.js] seedData loaded in');

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    console.log(`⚡ Starting LeadCloser AI Server initialization (PORT: ${PORT})...`);
    await connectDB();

    // Auto-seed if database is empty
    const wsCount = await Workspace.countDocuments();
    if (wsCount === 0) {
      console.log('🌱 Database is empty. Running initial demo seeder...');
      await seedData();
    }

    const server = http.createServer(app);
    initializeSockets(server);

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        if (PORT === 5000 || PORT === '5000') {
          console.error(`👉 Tip: On macOS, AirPlay Receiver uses port 5000 by default. Set PORT=5001 in your .env or turn off AirPlay Receiver in System Settings > General > AirDrop & AirPlay.`);
        }
      } else {
        console.error('❌ Server encountered an error:', error);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`🚀 LeadCloser AI Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
