export async function generateCredentials(cryptoApi = globalThis.crypto) {
  const sealBytes = cryptoApi.getRandomValues(new Uint8Array(32));
  const tokenBytes = cryptoApi.getRandomValues(new Uint8Array(32));
  const sealKey = btoa(String.fromCharCode(...sealBytes));
  const deviceToken = btoa(String.fromCharCode(...tokenBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(deviceToken));
  const token_sha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  return Object.freeze({ sealKey, deviceToken, registry: JSON.stringify([
    { id: 'iphone-primary', label: 'iPhone', platform: 'ios', enabled: true, token_sha256 },
  ]) });
}

export function createCredentialSession(generator = generateCredentials) {
  let credentials = null, pending = null;
  return {
    current: () => credentials,
    async generate(freshInstallAcknowledged, secureContext) {
      if (!freshInstallAcknowledged) throw new Error('fresh_install_required');
      if (!secureContext) throw new Error('secure_context_required');
      // Repeated clicks share the first operation; language and module controls never call this.
      pending ??= generator().then(value => { credentials = value; return value; });
      return pending;
    },
  };
}

function setupApp(sessionFactory, generator) {
  const session = sessionFactory(generator), byId = id => document.getElementById(id);
  let language = 'en';
  const t = (en, zh) => language === 'zh-CN' ? zh : en;
  const status = byId('status');
  const fields = { sealKey: byId('seal-key'), deviceToken: byId('device-token'), registry: byId('device-registry') };
  Object.values(fields).forEach(field => { field.value = ''; });
  byId('fresh-install').checked = false;
  const fieldLabel = id => document.querySelector(`label[for="${id}"]`).textContent.trim();
  const showLabels = () => {
    document.querySelectorAll('[data-reveal]').forEach(button => {
      const field = byId(button.dataset.reveal), showing = !field.hidden;
      button.textContent = showing ? t('Hide', '隐藏') : t('Show', '显示');
      button.setAttribute('aria-label', `${button.textContent} ${fieldLabel(field.id)}`);
      button.setAttribute('aria-expanded', String(showing));
    });
    document.querySelectorAll('[data-copy]').forEach(button => {
      button.setAttribute('aria-label', `${t('Copy', '复制')} ${fieldLabel(button.dataset.copy)}`);
    });
  };
  const updateGeneration = () => {
    const ready = Boolean(session.current());
    byId('generate').disabled = ready || !byId('fresh-install').checked || !globalThis.isSecureContext || !globalThis.crypto?.subtle;
    byId('generate').textContent = ready ? t('Credentials generated for this session', '本次会话凭据已生成') : t('Generate credentials', '生成凭据');
  };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.language;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-en]').forEach(element => { element.textContent = language === 'zh-CN' ? element.dataset.zh : element.dataset.en; });
    document.querySelectorAll('[data-language]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    status.textContent = '';
    showLabels(); updateGeneration();
  }));
  const origin = location.origin;
  byId('public-origin').value = origin;
  byId('callback-url').value = `${origin}/callback`;
  byId('mcp-url').value = `${origin}/mcp`;
  byId('mcp-fresh-url').value = `${origin}/mcp`;
  byId('ingest-url').value = `${origin}/ingest`;
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const field = byId(button.dataset.copy);
    if (!field.value) return;
    try {
      if (!globalThis.isSecureContext || !navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(field.value);
      status.textContent = t('Copied. Keep private credentials in your own password manager.', '已复制。请将私密凭据保存在自己的密码管理器中。');
    } catch {
      // Safari can deny clipboard access. An explicit copy click may reveal for manual selection.
      field.hidden = false;
      const mask = document.querySelector(`[data-mask="${field.id}"]`);
      if (mask) mask.hidden = true;
      field.focus(); field.select(); showLabels();
      status.textContent = t('Clipboard unavailable. The value is selected; use your device’s Copy command, then hide it.', '剪贴板不可用。已选中内容，请用设备的“复制”命令，然后隐藏。');
    }
  }));
  document.querySelectorAll('[data-reveal]').forEach(button => button.addEventListener('click', () => {
    const field = byId(button.dataset.reveal);
    field.hidden = !field.hidden;
    document.querySelector(`[data-mask="${field.id}"]`).hidden = !field.hidden;
    showLabels();
  }));
  byId('fresh-install').addEventListener('change', updateGeneration);
  byId('generate').addEventListener('click', async () => {
    byId('generate').disabled = true;
    try {
      const credentials = await session.generate(byId('fresh-install').checked, globalThis.isSecureContext);
      for (const [key, field] of Object.entries(fields)) field.value = credentials[key];
      byId('credentials').hidden = false;
      status.textContent = t('Generated once. Back up all three values privately before leaving or refreshing this page.', '已生成一次。离开或刷新页面前，请私密备份下面三项值。');
    } catch {
      status.textContent = t('Could not generate credentials. Use HTTPS and a browser with WebCrypto; no credentials were configured on the server.', '无法生成凭据。请使用 HTTPS 和支持 WebCrypto 的浏览器；服务器配置未被修改。');
    }
    updateGeneration();
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    const existing = button.dataset.mode === 'existing';
    byId('fresh-path').hidden = existing;
    byId('existing-path').hidden = !existing;
    document.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    // Returning to an existing deployment hides, but never changes, any session credentials.
    if (existing) {
      Object.values(fields).forEach(field => { field.hidden = true; });
      document.querySelectorAll('[data-mask]').forEach(mask => { mask.hidden = false; });
      showLabels();
    }
  }));
  document.querySelectorAll('[data-module]').forEach(input => input.addEventListener('change', () => {
    byId(`guide-${input.dataset.module}`).hidden = !input.checked;
  }));
  byId('insecure').hidden = Boolean(globalThis.isSecureContext && globalThis.crypto?.subtle);
  showLabels(); updateGeneration();
}

// Function serialization keeps the exact tested crypto implementation in the local browser asset.
// Dependencies are passed explicitly so bundler symbol renaming cannot break the standalone script.
export const SETUP_SCRIPT = `(${setupApp.toString()})(${createCredentialSession.toString()}, ${generateCredentials.toString()});`;
