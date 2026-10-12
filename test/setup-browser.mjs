// Optional local UI QA using an already-installed Playwright and Chrome; never installs dependencies.
// Start a loopback preview first. DOTLINK_PLAYWRIGHT_MODULE may point to a bundled Playwright entry.
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.DOTLINK_PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.DOTLINK_PREVIEW_ORIGIN || 'http://127.0.0.1:43187';
const url = new URL(origin);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'UI QA only permits a local preview');
const output = process.env.DOTLINK_QA_DIR || tmpdir();
const browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true,
  ignoreDefaultArgs: ['--unsafely-disable-devtools-self-xss-warnings'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(`${origin}/setup`);
  const desktop = join(output, 'dotlink-setup-desktop-en.png');
  const mobile = join(output, 'dotlink-setup-mobile-zh.png');
  await page.screenshot({ path: desktop, fullPage: true });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#mcp-fresh-url').inputValue(), `${origin}/mcp`);
  assert.equal(await page.locator('#generate').isDisabled(), true);
  await page.locator('#fresh-install').check();
  await page.locator('#generate').click();
  await page.locator('#credentials').waitFor({ state: 'visible' });
  const first = await page.locator('#device-token').inputValue();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await page.locator('#device-token').isVisible(), false);
  await page.getByRole('button', { name: '简体中文', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  await page.locator('[data-module="focus"]').check();
  assert.equal(await page.locator('#guide-focus').isVisible(), true);
  assert.equal(await page.locator('#device-token').inputValue(), first);
  assert.equal(await page.locator('#generate').isDisabled(), true);
  await page.locator('[data-reveal="device-token"]').click();
  assert.equal(await page.locator('#device-token').isVisible(), true);
  await page.locator('[data-reveal="device-token"]').click();
  await page.locator('[data-mode="existing"]').click();
  assert.equal(await page.locator('#existing-path').isVisible(), true);
  await page.locator('[data-mode="fresh"]').click();
  assert.equal(await page.locator('#device-token').inputValue(), first);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new Error('denied'); } },
  }));
  await page.locator('[data-copy="device-token"]').click();
  assert.equal(await page.locator('#device-token').isVisible(), true);
  assert.match(await page.locator('#status').textContent(), /剪贴板不可用/);
  assert.equal(await page.locator('#device-token').evaluate(element => element.selectionEnd - element.selectionStart), 43);
  await page.locator('[data-reveal="device-token"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: mobile, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#device-token').inputValue(), '');
  assert.equal(await page.locator('#credentials').isVisible(), false);
  assert.equal(await page.locator('#fresh-install').isChecked(), false);
  assert.deepEqual(errors, []);
  assert.equal(requests.every(request => request.startsWith(`${origin}/setup`)), true);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  console.log(JSON.stringify({ result: 'passed', pageErrors: errors.length, externalRequests: 0, desktop, mobile }));
} finally { await browser.close(); }
