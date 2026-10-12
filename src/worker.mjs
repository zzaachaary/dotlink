import OAuthProvider from '@cloudflare/workers-oauth-provider';
import { providerOptions } from './oauth-options.mjs';
import { json, RequestError } from './protocol.mjs';
import { setupResponse } from './setup.mjs';
export { PhoneBridge } from './bridge.mjs';

export default {
  async fetch(request, env, ctx) {
    try {
      const setup = setupResponse(request);
      if (setup) return setup;
      if (!env.PUBLIC_ORIGIN || !env.OWNER_GITHUB_ID) return json({ error: 'bridge_not_configured' }, 503);
      const origin = request.headers.get('origin');
      const allowedOrigins = [env.PUBLIC_ORIGIN, env.AUTH_ORIGIN || env.PUBLIC_ORIGIN];
      if (origin && (!allowedOrigins.includes(origin) || origin !== new URL(request.url).origin))
        return json({ error: 'origin_not_allowed' }, 403);
      return await new OAuthProvider(providerOptions(env)).fetch(request, env, ctx);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      console.error(JSON.stringify({ type: 'request_failure' }));
      return json({ error: 'internal_error' }, 500);
    }
  },
};
