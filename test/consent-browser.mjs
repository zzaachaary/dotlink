// Optional browser regression using existing Playwright and Chrome; all traffic stays on loopback.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { registerHooks } from 'node:module';
const { chromium } = await import(process.env.DOTLINK_PLAYWRIGHT_MODULE || 'playwright');
const hooks = registerHooks({ resolve(specifier, context, next) {
  return specifier === 'cloudflare:workers'
    ? { url: 'data:text/javascript,export class WorkerEntrypoint {}', shortCircuit: true }
    : next(specifier, context);
} });
const { authorization } = await import('../src/auth.mjs');
hooks.deregister();

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const close = server => new Promise(resolve => server.close(resolve));
const received = [];
const callback = createServer((request, response) => { received.push(request.url); response.end('Cancellation returned'); });
let consent, browser;
try {
  const clientOrigin = await listen(callback);
  const env = { OWNER_GITHUB_ID: '123', GITHUB_CLIENT_ID: 'test-only', GITHUB_CLIENT_SECRET: 'test-only',
    OAUTH_PROVIDER: {
      async parseAuthRequest() { return { scope: ['phone:read'], redirectUri: `${clientOrigin}/callback` }; },
      async describeConsent() { return { clientName: 'Synthetic browser fixture', redirectHost: '127.0.0.1', redirectIsLoopback: true }; },
      async beginConsent() { return { handle: 'synthetic-handle', headers: new Headers() }; },
      async denyConsent(request, handle) {
        assert.equal(handle, 'synthetic-handle');
        return { headers: new Headers({ Location: `${clientOrigin}/callback?error=access_denied&state=preserved` }) };
      },
    } };
  consent = createServer(async (request, response) => {
    try {
      if (request.url === '/setup/style.css') { response.end(''); return; }
      let body = '';
      for await (const chunk of request) body += chunk;
      const result = await authorization(new Request(`${env.PUBLIC_ORIGIN}${request.url}`, {
        method: request.method, headers: request.headers, ...(body ? { body } : {}),
      }), env);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(await result.text());
    } catch { response.writeHead(500); response.end('Synthetic fixture failure'); }
  });
  env.PUBLIC_ORIGIN = await listen(consent);
  browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true,
    ignoreDefaultArgs: ['--unsafely-disable-devtools-self-xss-warnings'] });
  const page = await browser.newPage(), violations = [];
  await page.route('**/*', route => [clientOrigin, env.PUBLIC_ORIGIN].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort());
  page.on('console', message => { if (message.type() === 'error' && message.text().includes('form-action')) violations.push(message.text()); });
  for (const [language, button] of [['en', 'Cancel'], ['zh-CN', '取消']]) {
    await page.goto(`${env.PUBLIC_ORIGIN}/authorize?lang=${language}`);
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForURL(`${clientOrigin}/callback?error=access_denied&state=preserved`, { timeout: 3000 });
  }
  assert.equal(received.filter(url => url === '/callback?error=access_denied&state=preserved').length, 2);
  assert.deepEqual(violations, []);
  console.log(JSON.stringify({ result: 'passed', cancellationsReturned: 2, formActionViolations: 0 }));
} finally {
  if (browser) await browser.close();
  if (consent?.listening) await close(consent);
  if (callback.listening) await close(callback);
}
