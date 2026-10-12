// Test-only entrypoint. It is never referenced by the deployment configuration.
import production from '../../src/worker.mjs';
import { mcp } from '../../src/mcp.mjs';
import { authorization } from '../../src/auth.mjs';
import { AuthorizationError, CimdFetchError, getOAuthApi } from '@cloudflare/workers-oauth-provider';
import { providerOptions } from '../../src/oauth-options.mjs';
export { PhoneBridge } from '../../src/bridge.mjs';
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/__test/complete-authorization') {
      // Substitute only the upstream identity check. The real provider still validates
      // the registered client, redirect, PKCE, token exchange, scopes and MCP audience.
      const url = new URL(request.url); url.pathname = '/authorize';
      const oauth = getOAuthApi(providerOptions(env), env);
      const original = await oauth.parseAuthRequest(new Request(url));
      return Response.json(await oauth.completeAuthorization({ request: original,
        userId: env.OWNER_GITHUB_ID, scope: original.scope, metadata: {}, props: { owner: env.OWNER_GITHUB_ID } }));
    }
    if (new URL(request.url).pathname === '/__test/auth-error') {
      const errors = [
        new AuthorizationError('invalid_request', { description: 'Invalid redirect URI' }),
        new AuthorizationError('invalid_request', { description: 'Authorization request was sent to an unconfigured endpoint' }),
        new CimdFetchError('https://private.example/secret', new Error('secret=do-not-disclose')),
        new AuthorizationError('invalid_request', { description: 'secret=do-not-disclose' }),
        new CimdFetchError('https://private.example/secret', new Error('Failed to fetch client metadata: HTTP 403')),
        new CimdFetchError('https://private.example/secret', new Error('Failed to fetch client metadata: HTTP 429')),
        new CimdFetchError('https://private.example/secret', new Error('Client metadata fetch timed out after 5000ms')),
      ];
      const error = errors[Number(new URL(request.url).searchParams.get('case'))];
      return authorization(new Request('https://bridge.example.com/authorize'), { ...env,
        GITHUB_CLIENT_ID: 'test', GITHUB_CLIENT_SECRET: 'test',
        OAUTH_PROVIDER: { parseAuthRequest: async () => { throw error; } },
      });
    }
    if (new URL(request.url).pathname === '/__test/read') return mcp(request, env, {
      auth: { userId: env.OWNER_GITHUB_ID, scope: ['phone:read'] }, props: { owner: env.OWNER_GITHUB_ID },
    });
    return production.fetch(request, env, ctx);
  },
};
