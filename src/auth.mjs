import { AuthorizationError, CimdFetchError, authorizationErrorRedirect } from '@cloudflare/workers-oauth-provider';
import { json, readText, RequestError } from './protocol.mjs';

export const SCOPES = ['phone:read', 'phone:subscribe'];
const escape = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function consentPage(details, handle, url) {
  const chinese = url.searchParams.get('lang') === 'zh-CN';
  const t = (en, zh) => chinese ? zh : en;
  const languageUrl = language => {
    const params = new URLSearchParams(url.searchParams);
    params.set('lang', language);
    return escape(`/authorize?${params}`);
  };
  return `<!doctype html><html lang="${chinese ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t('Connect to DotLink', '连接 DotLink')}</title><link rel="stylesheet" href="/setup/style.css"></head>
<body><main class="consent-shell"><header class="topbar"><span class="brand"><span class="brand-mark" aria-hidden="true">d.</span>DotLink</span><nav class="language" aria-label="Language / 语言"><a href="${languageUrl('en')}" lang="en" aria-current="${!chinese}">English</a><a href="${languageUrl('zh-CN')}" lang="zh-CN" aria-current="${chinese}">简体中文</a></nav></header>
<section class="card"><p class="eyebrow">${t('PERSONAL BRIDGE ACCESS', '个人 BRIDGE 访问授权')}</p><h1>${t('Connect your phone context?', '允许连接手机数据 Bridge？')}</h1>
<dl class="consent-details"><dt>${t('Client', '客户端')}</dt><dd>${escape(details.clientName)}</dd>${details.clientDomain ? `<dt>${t('Client domain', '客户端域名')}</dt><dd>${escape(details.clientDomain)}</dd>` : ''}<dt>${t('Authorization callback', '授权回调')}</dt><dd>${escape(details.redirectHost)}</dd></dl>
${!details.clientDomain ? `<p class="hint">${t('The client registered its own name; the name alone does not prove its identity.', '客户端名称由其自行登记，名称本身不能证明身份。')}</p>` : ''}
${details.redirectIsLoopback ? `<p class="notice">${t('This callback authorizes an application on this computer.', '该回调会授权本机应用。')}</p>` : ''}
<p>${t('This connection can read all data available on this Bridge for your registered devices from the past seven days and subscribe to new events. This includes notifications, battery, charging, low power mode, location, Focus, Wi-Fi/Bluetooth connections, app open/close observations, and health events if uploaded.', '此连接可读取 Bridge 上本人已登记设备最近七天的全部可用数据，并订阅新增事件，包括已上传的通知、电量、充电、省电模式、位置、专注模式、Wi-Fi／蓝牙连接、App 打开／关闭观测，以及健康事件。')}</p>
<p>${t('The setup page’s module choices are guidance only; they do not restrict this authorization. Notifications may contain private messages. App observations are estimates, not system Screen Time. This project does not configure health collection.', '设置页的模块选择仅用于搭建说明，不会限制本次授权。通知可能包含私人消息。App 观测属于估算，不等于系统屏幕使用时间。本项目不配置健康采集。')}</p>
<p class="hint">${t('GitHub verifies the configured owner only. No repository permission is requested. Offline access allows this connection to refresh its authorization.', 'GitHub 仅验证配置的所有者，不申请仓库权限。离线访问允许此连接刷新授权。')}</p>
<form method="post"><input type="hidden" name="handle" value="${escape(handle)}"><div class="actions"><button class="primary" name="decision" value="approve">${t('Allow and verify with GitHub', '允许并用 GitHub 验证')}</button><button name="decision" value="deny">${t('Cancel', '取消')}</button></div></form></section></main></body></html>`;
}

async function fetchJson(url, init) {
  // Workers supports manual redirects; reject non-2xx below without following Location.
  const response = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new RequestError('identity_provider_failed', 502);
  return response.json();
}

export async function authorization(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.OWNER_GITHUB_ID)
    return json({ error: 'authorization_not_configured' }, 503);
  const url = new URL(request.url), oauth = env.OAUTH_PROVIDER;
  const authOrigin = env.AUTH_ORIGIN || env.PUBLIC_ORIGIN;
  try {
    if (url.pathname === '/authorize' && request.method === 'GET') {
      const authRequest = await oauth.parseAuthRequest(request);
      if (authRequest.scope.some(scope => ![...SCOPES, 'offline_access'].includes(scope)))
        return json({ error: 'unsupported_scope' }, 400);
      const redirect = new URL(authRequest.redirectUri);
      if (!['https:', 'http:'].includes(redirect.protocol) || /[\s;,]/.test(redirect.origin))
        return json({ error: 'unsupported_redirect_uri' }, 400);
      const details = await oauth.describeConsent(authRequest);
      const consent = await oauth.beginConsent(authRequest);
      consent.headers.set('Content-Type', 'text/html; charset=utf-8');
      consent.headers.set('Cache-Control', 'no-store');
      consent.headers.set('X-Content-Type-Options', 'nosniff');
      consent.headers.set('Referrer-Policy', 'no-referrer');
      consent.headers.set('X-Frame-Options', 'DENY');
      // Browsers apply form-action to the Cancel POST's redirect as well as its initial target.
      // Use only the provider-validated callback origin, never raw authorization query parameters.
      consent.headers.set('Content-Security-Policy', `default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https://github.com ${redirect.origin}`);
      return new Response(consentPage(details, consent.handle, url), { headers: consent.headers });
    }
    if (url.pathname === '/authorize' && request.method === 'POST') {
      // A size bound prevents oversized form parsing; the provider validates browser-bound consent.
      const raw = await readText(request, 4096);
      const form = new URLSearchParams(raw), handle = form.get('handle') || '';
      if (form.get('decision') !== 'approve') {
        const denied = await oauth.denyConsent(request, handle);
        return new Response(null, { status: 302, headers: denied.headers });
      }
      const approved = await oauth.approveConsent(request, handle, { scope: [...SCOPES, 'offline_access'] });
      const verifier = crypto.randomUUID() + crypto.randomUUID();
      const { state, headers } = await oauth.beginUpstream(approved.request, { data: { verifier }, headers: approved.headers });
      const challenge = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const destination = new URL('https://github.com/login/oauth/authorize');
      destination.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${authOrigin}/callback`,
        state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
      headers.set('Location', destination.href);
      return new Response(null, { status: 302, headers });
    }
    if (url.pathname === '/callback' && request.method === 'GET') {
      const { request: original, data, headers } = await oauth.finishUpstream(request);
      if (url.searchParams.has('error') || !url.searchParams.get('code')) {
        headers.set('Location', authorizationErrorRedirect(original, 'access_denied'));
        return new Response(null, { status: 302, headers });
      }
      const upstream = await fetchJson('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
          code: url.searchParams.get('code'), redirect_uri: `${authOrigin}/callback`, code_verifier: data.verifier }),
      });
      if (typeof upstream.access_token !== 'string') throw new RequestError('identity_provider_failed', 502);
      const user = await fetchJson('https://api.github.com/user', { headers: {
        Accept: 'application/vnd.github+json', Authorization: `Bearer ${upstream.access_token}`, 'User-Agent': 'personal-dot-phone-bridge',
      } });
      // Never persist the upstream GitHub access token; the numeric ID fixes the single owner.
      if (String(user.id) !== env.OWNER_GITHUB_ID) return json({ error: 'owner_only' }, 403);
      const result = await oauth.completeAuthorization({ request: original, userId: env.OWNER_GITHUB_ID,
        scope: original.scope.filter(scope => [...SCOPES, 'offline_access'].includes(scope)), metadata: {}, props: { owner: env.OWNER_GITHUB_ID } });
      headers.set('Location', result.redirectTo);
      return new Response(null, { status: 302, headers });
    }
    return json({ error: 'method_not_allowed' }, 405);
  } catch (error) {
    if (error instanceof AuthorizationError && error.redirectTo) return Response.redirect(error.redirectTo, 302);
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
      // Only fixed categories leave the server, never request values or upstream error messages.
      const reasons = new Map([
        ['Invalid redirect URI', 'redirect_uri_invalid'],
        ['Invalid client_id', 'client_id_invalid'],
        ['client_id is required', 'client_id_missing'],
        ['Authorization request was sent to an unconfigured endpoint', 'authorization_endpoint_invalid'],
      ]);
      let reason = reasons.get(error.description) ?? 'request_invalid';
      if (error instanceof CimdFetchError) {
        const detail = error.detail;
        reason = /^Failed to fetch client metadata: HTTP 403$/.test(detail) ? 'client_metadata_http_403'
          : /^Failed to fetch client metadata: HTTP 429$/.test(detail) ? 'client_metadata_rate_limited'
          : /^Client metadata fetch timed out after \d+ms$/.test(detail) ? 'client_metadata_timeout'
          : 'client_metadata_unavailable';
      }
      return json({ error: 'authorization_failed_restart_connection', reason }, 400);
    }
    throw error;
  }
}
