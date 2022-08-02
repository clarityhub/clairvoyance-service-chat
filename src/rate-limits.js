const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('service-claire/services/redis');

const limiter = new RateLimit({
  windowMs: /* 1 minute */ 60 * 1000,
  max: 100, // 100 requests per minute
  delayMs: 0,
  store: new RedisStore({
    expiry: /* 1 minute */ 60,
    client: redis,
    prefix: 'rl-chat:',
  }),
});

module.exports = limiter;
