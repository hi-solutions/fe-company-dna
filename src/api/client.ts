import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Defensive rate-limit: prevent the same endpoint from being called more than once per 500ms
const lastCallMap = new Map<string, number>();
const RATE_LIMIT_MS = 500;

// Since default credentials "include" is requested:
client.use({
  onRequest({ request }) {
    const key = `${request.method}:${request.url}`;
    const now = Date.now();
    const lastCall = lastCallMap.get(key);

    if (lastCall && now - lastCall < RATE_LIMIT_MS) {
      // Abort duplicate rapid calls
      const controller = new AbortController();
      controller.abort();
      return new Request(request, {
        credentials: 'include',
        signal: controller.signal,
      });
    }

    lastCallMap.set(key, now);
    return new Request(request, { credentials: 'include' });
  }
});
