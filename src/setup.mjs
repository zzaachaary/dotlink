import { SETUP_SCRIPT } from './setup-client.mjs';
import { SETUP_HTML, SETUP_CSS } from './setup-page.mjs';

export function setupResponse(request) {
  const assets = new Map([
    ['/setup', ['text/html; charset=utf-8', SETUP_HTML]],
    ['/setup/', ['text/html; charset=utf-8', SETUP_HTML]],
    ['/setup/style.css', ['text/css; charset=utf-8', SETUP_CSS]],
    ['/setup/app.js', ['text/javascript; charset=utf-8', SETUP_SCRIPT]],
  ]);
  const asset = assets.get(new URL(request.url).pathname);
  if (!asset) return null;
  const headers = new Headers({
    'Content-Type': asset[0], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (!['GET', 'HEAD'].includes(request.method)) {
    headers.set('Allow', 'GET, HEAD');
    return new Response(null, { status: 405, headers });
  }
  return new Response(request.method === 'HEAD' ? null : asset[1], { headers });
}
