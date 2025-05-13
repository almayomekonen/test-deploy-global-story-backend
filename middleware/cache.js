const cache = new Map();
const DEFAULT_TTL = 60 * 1000;
const MAX_CACHE_SIZE = 100;

const enforceMaxCacheSize = () => {
  if (cache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = cache.size - MAX_CACHE_SIZE;
    const keysIterator = cache.keys();
    for (let i = 0; i < entriesToDelete; i++) {
      const key = keysIterator.next().value;
      cache.delete(key);
    }
  }
};

setInterval(() => {
  const now = Date.now();
  let count = 0;
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key);
    }
    if (++count > 20) break;
  }
}, 30 * 1000);

const cacheMiddleware = (ttl = 60) => {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    if (req.user) {
      return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse && cachedResponse.expiry > Date.now()) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(cachedResponse.data);
    }

    const originalJson = res.json;

    res.json = function (data) {
      if (res.statusCode >= 400) {
        return originalJson.call(this, data);
      }

      cache.set(key, {
        data,
        expiry: Date.now() + ttl * 1000,
      });

      enforceMaxCacheSize();
      res.set("X-Cache", "MISS");

      return originalJson.call(this, data);
    };

    next();
  };
};

// In middleware/cache.js
// Make sure intelligentCache is exported correctly
const intelligentCache = () => {
  return (req, res, next) => {
    if (req.user) {
      return next();
    }

    const path = req.path;
    let ttl = 0;

    if (path.match(/^\/api\/posts\/popular/)) {
      ttl = 300;
    } else if (path.match(/^\/api\/posts\/[a-f0-9]{24}$/)) {
      ttl = 120;
    } else if (path.match(/^\/api\/posts$/)) {
      ttl = 60;
    } else if (path.match(/^\/api\/posts\/category\//)) {
      ttl = 180;
    }

    if (ttl > 0) {
      return cacheMiddleware(ttl)(req, res, next);
    }

    next();
  };
};

const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (typeof pattern === "string" && key.includes(pattern)) {
      cache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      cache.delete(key);
    }
  }
};

module.exports = {
  cacheMiddleware,
  intelligentCache,
  invalidateCache,
};
