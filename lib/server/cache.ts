import Redis from "ioredis";

declare global {
  var __aiHomeSchoolRedis: Redis | undefined;
}

export function cache() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not configured");
  if (!global.__aiHomeSchoolRedis) {
    global.__aiHomeSchoolRedis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }
  return global.__aiHomeSchoolRedis;
}

export async function cacheHealth() {
  const client = cache();
  if (client.status === "wait") await client.connect();
  return client.ping();
}
