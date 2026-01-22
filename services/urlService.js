/**
 * URL Service Layer
 * Handles business logic for URL shortening
 * Implements caching strategy with Redis
 */

const db = require('../config/database');
const { cache } = require('../config/redis');
const {
  generateShortCode,
  isValidUrl,
  normalizeUrl,
} = require('../utils/urlShortener');

/**
 * Create a shortened URL
 * @param {string} originalUrl - The original long URL
 * @returns {object} Created URL object with short code
 */
const createShortUrl = async (originalUrl) => {
  // Validate URL
  if (!isValidUrl(originalUrl)) {
    throw new Error('Invalid URL format');
  }

  // Normalize the URL
  const normalized = normalizeUrl(originalUrl);

  // Check if URL already exists in database (optional deduplication)
  const existingUrl = await db.query(
    'SELECT short_code, original_url FROM urls WHERE original_url = $1',
    [normalized]
  );

  if (existingUrl.rows.length > 0) {
    // URL already exists, return existing short code
    const existing = existingUrl.rows[0];
    
    // Cache it
    await cache.set(`url:${existing.short_code}`, {
      originalUrl: existing.original_url,
      shortCode: existing.short_code,
    });
    
    return {
      shortCode: existing.short_code,
      originalUrl: existing.original_url,
      shortUrl: `${process.env.BASE_URL}/${existing.short_code}`,
      isNew: false,
    };
  }

  // Generate unique short code
  let shortCode;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    shortCode = generateShortCode();
    
    // Check if short code already exists
    const collision = await db.query(
      'SELECT id FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (collision.rows.length === 0) {
      break; // Unique code found
    }
    
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error('Failed to generate unique short code');
  }

  // Insert into database
  const result = await db.query(
    `INSERT INTO urls (short_code, original_url) 
     VALUES ($1, $2) 
     RETURNING id, short_code, original_url, created_at`,
    [shortCode, normalized]
  );

  const newUrl = result.rows[0];

  // Cache the new URL (proactive caching)
  await cache.set(`url:${shortCode}`, {
    originalUrl: newUrl.original_url,
    shortCode: newUrl.short_code,
  });

  return {
    shortCode: newUrl.short_code,
    originalUrl: newUrl.original_url,
    shortUrl: `${process.env.BASE_URL}/${newUrl.short_code}`,
    createdAt: newUrl.created_at,
    isNew: true,
  };
};

/**
 * Get original URL by short code
 * Implements cache-aside pattern
 * @param {string} shortCode - The short code
 * @returns {object} URL data
 */
const getOriginalUrl = async (shortCode) => {
  // Step 1: Check cache first (fast path)
  const cached = await cache.get(`url:${shortCode}`);
  
  if (cached) {
    // Cache hit - return immediately
    return {
      originalUrl: cached.originalUrl,
      shortCode: cached.shortCode,
      source: 'cache',
    };
  }

  // Step 2: Cache miss - query database
  const result = await db.query(
    'SELECT short_code, original_url FROM urls WHERE short_code = $1',
    [shortCode]
  );

  if (result.rows.length === 0) {
    return null; // URL not found
  }

  const urlData = result.rows[0];

  // Step 3: Update cache for next time
  await cache.set(`url:${shortCode}`, {
    originalUrl: urlData.original_url,
    shortCode: urlData.short_code,
  });

  return {
    originalUrl: urlData.original_url,
    shortCode: urlData.short_code,
    source: 'database',
  };
};

/**
 * Increment click count for a URL
 * Uses asynchronous update (don't block redirect)
 * @param {string} shortCode - The short code
 * @param {object} metadata - Click metadata (IP, user agent, etc.)
 */
const incrementClickCount = async (shortCode, metadata = {}) => {
  try {
    // Update click count in database (non-blocking)
    await db.query(
      `UPDATE urls 
       SET click_count = click_count + 1, 
           last_accessed = CURRENT_TIMESTAMP 
       WHERE short_code = $1`,
      [shortCode]
    );

    // Optionally store detailed click analytics
    if (metadata.ipAddress || metadata.userAgent) {
      await db.query(
        `INSERT INTO clicks (short_code, ip_address, user_agent, referrer)
         VALUES ($1, $2, $3, $4)`,
        [
          shortCode,
          metadata.ipAddress || null,
          metadata.userAgent || null,
          metadata.referrer || null,
        ]
      );
    }

    // Increment counter in cache for real-time stats
    await cache.incr(`clicks:${shortCode}`);
  } catch (error) {
    console.error('Error incrementing click count:', error);
    // Don't throw - we don't want to block the redirect
  }
};

/**
 * Get URL statistics
 * @param {string} shortCode - The short code
 * @returns {object} URL statistics
 */
const getUrlStats = async (shortCode) => {
  const result = await db.query(
    `SELECT 
      short_code,
      original_url,
      created_at,
      click_count,
      last_accessed
     FROM urls 
     WHERE short_code = $1`,
    [shortCode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const stats = result.rows[0];

  // Get recent clicks
  const recentClicks = await db.query(
    `SELECT clicked_at, ip_address, referrer
     FROM clicks
     WHERE short_code = $1
     ORDER BY clicked_at DESC
     LIMIT 10`,
    [shortCode]
  );

  return {
    ...stats,
    recentClicks: recentClicks.rows,
  };
};

/**
 * Delete a shortened URL
 * @param {string} shortCode - The short code to delete
 * @returns {boolean} Success status
 */
const deleteShortUrl = async (shortCode) => {
  // Delete from cache
  await cache.del(`url:${shortCode}`);
  await cache.del(`clicks:${shortCode}`);

  // Delete from database
  const result = await db.query(
    'DELETE FROM urls WHERE short_code = $1 RETURNING id',
    [shortCode]
  );

  return result.rows.length > 0;
};

module.exports = {
  createShortUrl,
  getOriginalUrl,
  incrementClickCount,
  getUrlStats,
  deleteShortUrl,
};