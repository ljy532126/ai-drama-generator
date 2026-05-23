/**
 * IP geo-location lookup using free ip-api.com service.
 * Rate limit: 45 requests/minute on free tier.
 */
const https = require('https');

// In-memory cache: IP -> geo data
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function lookup(ip) {
  return new Promise((resolve) => {
    // Skip private/local IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return resolve({ country: '', region: '', city: '' });
    }

    // Strip IPv6 prefix
    const cleanIp = ip.replace('::ffff:', '');

    // Check cache
    const cached = cache.get(cleanIp);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return resolve(cached.data);
    }

    const req = https.get(`https://ip-api.com/json/${cleanIp}?fields=country,regionName,city&lang=en`, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const data = {
            country: json.country || '',
            region: json.regionName || '',
            city: json.city || ''
          };
          cache.set(cleanIp, { data, ts: Date.now() });
          resolve(data);
        } catch {
          resolve({ country: '', region: '', city: '' });
        }
      });
    });
    req.on('error', () => resolve({ country: '', region: '', city: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ country: '', region: '', city: '' }); });
  });
}

module.exports = { lookup };
