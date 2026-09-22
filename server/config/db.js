const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Supports local MongoDB and MongoDB Atlas.
 * Does NOT crash the server on failure — retries with exponential backoff.
 */

let retryCount = 0;
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 3000; // 3 seconds

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    console.error('\n❌ MongoDB URI not found in environment variables (MONGO_URI / MONGODB_URI).');
    console.log('   → Set MONGO_URI in your .env file or Render environment variables.\n');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // 15s timeout
      socketTimeoutMS: 45000,
      // Allow invalid certs for networks with TLS-intercepting proxies
      tlsAllowInvalidCertificates: true,
    });

    retryCount = 0; // Reset on success
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}\n`);
  } catch (error) {
    retryCount++;
    console.error(`\n❌ MongoDB Connection Error (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
    console.log('   → Check MongoDB Atlas credentials and IP Whitelist (allow 0.0.0.0/0 on Atlas).\n');

    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(1.5, retryCount - 1), 60000); // Max 60s
      console.log(`   ⏳ Retrying in ${Math.round(delay / 1000)}s...\n`);
      setTimeout(connectDB, delay);
    } else {
      console.error(`\n🚨 Max retries (${MAX_RETRIES}) reached. Server will continue without DB.\n`);
    }
  }
};

// Handle connection events after initial connect
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
  // Mongoose handles reconnect automatically, but log it
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully.');
  retryCount = 0;
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB runtime error: ${err.message}`);
});

module.exports = connectDB;
