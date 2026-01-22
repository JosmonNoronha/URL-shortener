/**
 * URL Routes
 * Defines API endpoints for URL shortening service
 */

const express = require('express');
const router = express.Router();
const urlService = require('../services/urlService');

/**
 * POST /api/shorten
 * Create a shortened URL
 * 
 * Request body:
 * {
 *   "url": "https://example.com/very/long/url"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "shortCode": "abc123",
 *     "shortUrl": "http://localhost:3000/abc123",
 *     "originalUrl": "https://example.com/very/long/url"
 *   }
 * }
 */
router.post('/shorten', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate input
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Create short URL
    const result = await urlService.createShortUrl(url);

    res.status(result.isNew ? 201 : 200).json({
      success: true,
      data: {
        shortCode: result.shortCode,
        shortUrl: result.shortUrl,
        originalUrl: result.originalUrl,
        isNew: result.isNew,
      },
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create short URL',
    });
  }
});

/**
 * GET /api/stats/:shortCode
 * Get statistics for a shortened URL
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "shortCode": "abc123",
 *     "originalUrl": "https://example.com",
 *     "clickCount": 42,
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "lastAccessed": "2024-01-02T00:00:00.000Z"
 *   }
 * }
 */
router.get('/stats/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const stats = await urlService.getUrlStats(shortCode);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

/**
 * DELETE /api/url/:shortCode
 * Delete a shortened URL
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "URL deleted successfully"
 * }
 */
router.delete('/url/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const deleted = await urlService.deleteShortUrl(shortCode);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found',
      });
    }

    res.json({
      success: true,
      message: 'URL deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete URL',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;