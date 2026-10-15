import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

// A deliberately small DOM surface. The real served script and WebCrypto execute unchanged.
export function setupBrowser(script, { exposeApi = false } = {}) {
  const elements = new Map(), copies = [];
  function element(id, dataset = {}) {
    const listeners = new Map(), attributes = new Map();
    const value = { id, dataset, value: '', checked: false, disabled: false, hidden: true, textContent: id,
      addEventListener(name, callback) { const list = listeners.get(name) ?? []; list.push(callback); listeners.set(name, list); },
      async dispatch(name) { for (const callback of listeners.get(name) ?? []) await callback(); },
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name); }, focus() {}, select() {},
    };
    if (id) elements.set(id, value);
    return value;
  }
  for (const id of ['status', 'seal-key', 'device-token', 'device-registry', 'fresh-install', 'generate', 'public-origin',
    'callback-url', 'mcp-url', 'mcp-fresh-url', 'ingest-url', 'credentials', 'fresh-path', 'existing-path', 'insecure',
    'guide-notifications', 'guide-battery', 'guide-focus']) element(id);
  const fields = ['seal-key', 'device-token', 'device-registry'];
  const groups = {
    '[data-language]': ['en', 'zh-CN'].map(language => element('', { language })),
    '[data-mode]': ['fresh', 'existing'].map(mode => element('', { mode })),
    '[data-module]': ['notifications', 'battery', 'focus'].map(module => element('', { module })),
    '[data-reveal]': fields.map(reveal => element('', { reveal })),
    '[data-copy]': fields.map(copy => element('', { copy })),
    '[data-mask]': fields.map(mask => element('', { mask })),
    '[data-en]': [],
  };
  const document = {
    documentElement: { lang: 'en' },
    getElementById(id) { if (!elements.has(id)) throw new Error(`Unknown fixture ID: ${id}`); return elements.get(id); },
    querySelectorAll(selector) { if (!(selector in groups)) throw new Error(`Unknown fixture selector: ${selector}`); return groups[selector]; },
    querySelector(selector) {
      const label = /^label\[for="([^"]+)"\]$/.exec(selector);
      if (label && fields.includes(label[1])) return { textContent: label[1] };
      const mask = /^\[data-mask="([^"]+)"\]$/.exec(selector);
      if (mask) return groups['[data-mask]'].find(item => item.dataset.mask === mask[1]);
      throw new Error(`Unknown fixture selector: ${selector}`);
    },
  };
  const api = runInNewContext(`${script}\n;${exposeApi ? '({ generateCredentials, createCredentialSession })' : 'undefined'};`, {
    document, location: { origin: 'https://fresh.example' }, isSecureContext: true, crypto: webcrypto,
    navigator: { clipboard: { async writeText(text) { copies.push(text); } } }, TextEncoder, btoa,
  }, { timeout: 1000 });
  return { elements, groups, document, copies, api };
}
