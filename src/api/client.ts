import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Since default credentials "include" is requested:
client.use({
  onRequest({ request }) {
    // Modify request to include credentials
    return new Request(request, { credentials: 'include' });
  }
});
