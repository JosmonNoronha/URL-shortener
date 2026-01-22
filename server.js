/**
 * Main Server File
 * URL Shortener with Redis Caching
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const urlRoutes = require('./routes/urlRoutes');
const urlService = require('./services/urlService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', urlRoutes);

/**
 * Redirect Route - Handle short URL redirects
 * This is the main feature: /:shortCode redirects to original URL
 * 
 * Example: http://localhost:3000/abc123 -> https://example.com
 */
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Skip if it's a static file request
    if (shortCode.includes('.')) {
      return res.status(404).send('Not found');
    }

    // Get original URL (from cache or database)
    const urlData = await urlService.getOriginalUrl(shortCode);

    if (!urlData) {
      // Short URL not found
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }

    // Collect click metadata
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer'),
    };

    // Increment click count asynchronously (don't wait)
    urlService.incrementClickCount(shortCode, metadata).catch(err => {
      console.error('Error tracking click:', err);
    });

    // Log cache performance
    console.log(`Redirect ${shortCode} -> ${urlData.originalUrl} (source: ${urlData.source})`);

    // Redirect to original URL
    res.redirect(301, urlData.originalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║   URL Shortener Server Started                                    ║
║                                                                   ║
║   Port: ${PORT}                                                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}           ║
║   Base URL: ${process.env.BASE_URL}                               ║
║                                                                   ║
║   Redis Cache: Enabled                                            ║
║   Database: PostgreSQL                                            ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
  console.log('Ready to shorten URLs! 🚀\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;