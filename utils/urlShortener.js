/**
 * URL Shortening Utilities
 * Uses Base62 encoding (0-9, a-z, A-Z) for compact short codes
 */

const crypto = require('crypto');

// Base62 character set (62 characters total)
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SHORT_CODE_LENGTH = parseInt(process.env.SHORT_CODE_LENGTH) || 6;

/**
 * Generate a random short code using Base62 encoding
 * @param {number} length - Length of the short code
 * @returns {string} Random short code
 */
const generateShortCode = (length = SHORT_CODE_LENGTH) => {
  let shortCode = '';
  
  // Generate random bytes and convert to Base62
  const bytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    shortCode += BASE62_CHARS[bytes[i] % 62];
  }
  
  return shortCode;
};

/**
 * Convert a number to Base62 string (alternative method)
 * Useful for sequential ID-based short codes
 * @param {number} num - Number to encode
 * @returns {string} Base62 encoded string
 */
const encodeBase62 = (num) => {
  if (num === 0) return BASE62_CHARS[0];
  
  let encoded = '';
  while (num > 0) {
    encoded = BASE62_CHARS[num % 62] + encoded;
    num = Math.floor(num / 62);
  }
  
  return encoded;
};

/**
 * Decode Base62 string back to number
 * @param {string} str - Base62 encoded string
 * @returns {number} Decoded number
 */
const decodeBase62 = (str) => {
  let decoded = 0;
  
  for (let i = 0; i < str.length; i++) {
    decoded = decoded * 62 + BASE62_CHARS.indexOf(str[i]);
  }
  
  return decoded;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

/**
 * Normalize URL (add protocol if missing, remove trailing slash)
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
const normalizeUrl = (url) => {
  let normalized = url.trim();
  
  // Add https:// if no protocol specified
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = 'https://' + normalized;
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  return normalized;
};

/**
 * Generate a hash-based short code (for consistent encoding)
 * Same URL always gets the same short code
 * @param {string} url - URL to hash
 * @returns {string} Hash-based short code
 */
const generateHashBasedCode = (url) => {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  // Take first 6 characters and convert to base62 range
  let code = '';
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    const charIndex = parseInt(hash.substr(i * 2, 2), 16) % 62;
    code += BASE62_CHARS[charIndex];
  }
  return code;
};

module.exports = {
  generateShortCode,
  encodeBase62,
  decodeBase62,
  isValidUrl,
  normalizeUrl,
  generateHashBasedCode,
};