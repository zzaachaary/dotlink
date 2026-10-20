import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

// A deliberately small DOM surface. The real served script and WebCrypto execute unchanged.
export function setupBrowser(script, { exposeApi = false, clipboardAvailable = true } = {}) {
  const elements = new Map(), copies = [];
  function element(id, dataset = {}) {
    const listeners = new Map(), attributes = new Map();
    const value = { id, dataset, value: '', checked: false, disabled: false, hidden: true, textContent: id,
      addEventListener(name, callback) { const list = listeners.get(name) ?? []; list.push(callback); listeners.set(name, list); },
      async dispatch(name) { for (const callback of listeners.get(name) ?? []) await callback(); },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name); },
      focus() { value.focused = true; }, select() { value.selected = true; },
    };
    if (id) elements.set(id, value);
    return value;
  }
  for (const id of ['status', 'seal-key', 'device-token', 'device-registry', 'fresh-install', 'generate', 'public-origin',
    'callback-url', 'mcp-url', 'mcp-fresh-url', 'ingest-url', 'credentials', 'fresh-path', 'existing-path', 'insecure',
    'guide-notifications', 'owner-github-id', 'github-client-id',
    'config-origin', 'config-owner-id', 'config-ingest', 'config-client-id', 'config-seal-key', 'config-registry']) element(id);
  const prompt = element('subscription-prompt', { valueEn: 'Subscribe to notifications.\nEnglish prompt.', valueZh: '订阅通知。\n中文提示词。' });
  prompt.hidden = false;
  const fields = ['seal-key', 'device-token', 'device-registry', 'config-seal-key', 'config-registry'];
  const copyFields = [...fields, 'config-origin', 'config-owner-id', 'config-ingest', 'config-client-id', 'subscription-prompt'];
  const placeholder = elements.get('owner-github-id');
  Object.assign(placeholder.dataset, { placeholderEn: 'Your numeric GitHub ID', placeholderZh: '你的 GitHub 数字 ID' });
  const groups = {
    '[data-language]': ['en', 'zh-CN'].map(language => element('', { language })),
    '[data-mode]': ['fresh', 'existing'].map(mode => element('', { mode })),
    '[data-reveal]': fields.map(reveal => element('', { reveal })),
    '[data-copy]': copyFields.map(copy => element('', { copy })),
    '[data-mask]': fields.map(mask => element('', { mask })),
    '[data-en]': [],
    '[data-value-en]': [prompt],
    '[data-placeholder-en]': [placeholder],
    '[data-aria-label-en]': [element('', { ariaLabelEn: 'Setup navigation', ariaLabelZh: '设置导航' })],
    '[data-config-pending]': [element(''), element('')],
    '[data-config-ready]': [element(''), element('')],
    '[data-validation="owner-github-id"]': [element('')],
  };
  const document = {
    documentElement: { lang: 'en' },
    getElementById(id) { if (!elements.has(id)) throw new Error(`Unknown fixture ID: ${id}`); return elements.get(id); },
    querySelectorAll(selector) { if (!(selector in groups)) throw new Error(`Unknown fixture selector: ${selector}`); return groups[selector]; },
    querySelector(selector) {
      const label = /^label\[for="([^"]+)"\]$/.exec(selector);
      if (label && copyFields.includes(label[1])) return { textContent: label[1] };
      const mask = /^\[data-mask="([^"]+)"\]$/.exec(selector);
      if (mask) return groups['[data-mask]'].find(item => item.dataset.mask === mask[1]);
      throw new Error(`Unknown fixture selector: ${selector}`);
    },
  };
  const api = runInNewContext(`${script}\n;${exposeApi ? '({ generateCredentials, createCredentialSession })' : 'undefined'};`, {
    document, location: { origin: 'https://fresh.example' }, isSecureContext: true, crypto: webcrypto,
    navigator: { clipboard: { async writeText(text) {
      if (!clipboardAvailable) throw new Error('clipboard_denied');
      copies.push(text);
    } } }, TextEncoder, btoa,
  }, { timeout: 1000 });
  return { elements, groups, document, copies, api };
}
