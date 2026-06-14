const Redis = require('ioredis');

let publisher = null;
let subscriber = null;

const createClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  client.on('error', (err) => console.warn('Redis error:', err.message));
  client.on('connect', () => console.log('Redis connected'));
  return client;
};

const getPublisher = () => {
  if (!publisher) publisher = createClient();
  return publisher;
};

const getSubscriber = () => {
  if (!subscriber) subscriber = createClient();
  return subscriber;
};

module.exports = { getPublisher, getSubscriber };
