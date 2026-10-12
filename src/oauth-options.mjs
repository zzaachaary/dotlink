import { SCOPES } from './auth.mjs';
import { mcp } from './mcp.mjs';
import { routes } from './http.mjs';

export function providerOptions(env) {
  const authOrigin = env.AUTH_ORIGIN || env.PUBLIC_ORIGIN;
  return { apiRoute: '/mcp', apiHandler: { fetch: mcp }, defaultHandler: { fetch: routes },
    authorizeEndpoint: `${authOrigin}/authorize`, tokenEndpoint: `${authOrigin}/oauth/token`, clientRegistrationEndpoint: `${authOrigin}/oauth/register`,
    scopesSupported: [...SCOPES, 'offline_access'], requiredScopes: ['phone:read'],
    resourceMetadata: { resource: `${env.PUBLIC_ORIGIN}/mcp`, authorization_servers: [authOrigin], resource_name: 'Personal Phone Bridge' },
    // Existing ChatGPT registrations retain their CIMD client ID; keep both registration paths.
    clientIdMetadataDocumentEnabled: true, refreshTokenTTL: 2592000, refreshTokenIdleTTL: 2592000 };
}
