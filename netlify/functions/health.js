// Netlify Serverless Function - Health Check
const mongoose = require('mongoose');

exports.handler = async (event, context) => {
  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';
      await mongoose.connect(MONGODB_URI);
    }

    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Attendance Automation System - Netlify Serverless',
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatusText[dbStatus] || 'unknown',
          readyState: dbStatus
        },
        platform: 'Netlify Functions',
        note: 'Running in serverless mode - limited functionality'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
