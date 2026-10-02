const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Use default system DNS if setServers is restricted
}

let isConnecting = false;

// Connection lifecycle event listeners
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB Atlas connection pool established.');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB Atlas Connection Warning:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Atlas disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB Atlas reconnected successfully.');
});

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return mongoose.connection;
  }

  isConnecting = true;
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    isConnecting = false;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    isConnecting = false;
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exponential retry backing off safely
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
