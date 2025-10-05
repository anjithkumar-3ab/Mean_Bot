const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    
    // Check if mock mode is enabled
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn('\n⚠️  MongoDB is not available, but MOCK MODE is enabled.');
      console.warn('   The system will work with sample data.');
      console.warn('   Database features (save/retrieve records) will not work.\n');
      return null; // Return null instead of exiting
    } else {
      console.error('\n⚠️  MongoDB is not available. Please either:');
      console.error('   1. Install and start MongoDB locally');
      console.error('   2. Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas');
      console.error('   3. Update MONGODB_URI in .env file');
      console.error('   4. Enable mock mode: SET USE_MOCK_DATA=true in .env\n');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
