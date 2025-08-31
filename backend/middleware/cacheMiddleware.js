// middleware/cacheMiddleware.js
const cache = new Map();

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Create cache key from request URL and query parameters
    const key = req.originalUrl || req.url;
    
    // Check if we have cached data
    const cached = cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < (duration * 1000)) {
      // Return cached response
      return res.json(cached.data);
    }
    
    // Store original res.json function
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Cache the response
      cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      
      // Call original json function
      originalJson.call(this, data);
    };
    
    next();
  };
};

// Clear cache periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 600000) { // 10 minutes
      cache.delete(key);
    }
  }
}, 600000);

module.exports = cacheMiddleware;