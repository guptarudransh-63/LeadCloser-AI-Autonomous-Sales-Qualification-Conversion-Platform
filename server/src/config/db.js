const mongoose = require('mongoose');

let mongoServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadcloser';
  console.log(`[Database] Connecting to MongoDB (${uri})...`);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log(`[Database] Connected to MongoDB: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection at ${uri} failed (${err.message}). Initializing embedded MongoMemoryServer...`);
    try {
      console.log('[Database] Starting MongoMemoryServer instance...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServerInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'leadcloser'
        }
      });
      const inMemoryUri = mongoServerInstance.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] Connected to embedded MongoDB: ${inMemoryUri}`);
    } catch (memErr) {
      console.error('[Database] Fatal: Failed to initialize MongoDB connection', memErr);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServerInstance) {
      await mongoServerInstance.stop();
      mongoServerInstance = null;
    }
  } catch (error) {
    console.error('[Database] Disconnect error:', error);
  }
};

module.exports = { connectDB, disconnectDB };
