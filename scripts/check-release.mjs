import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDirectories = new Set(['src', 'scripts', 'test', 'docs', 'examples', '.github']);
const privateDirectories = new Set(['.git', '.wrangler', 'node_modules', 'work', 'private', '.cache', 'coverage']);
const privateFile = name => name !== '.dev.vars.example' && name !== 'wrangler.example.jsonc' &&
  /^(?:\.dev\.vars|\.env)(?:\.|$)|^wrangler\.(?:local|private)\.|\.(?:log|sqlite(?:-\w+)?|db(?:-\w+)?|pem|key|p12|mobileprovision|shortcut)$|^\.DS_Store$/.test(name);
const licenseHash = 'c0ea4a896d2c8c394b29f9427589996db826cd501c512279ff0ed3ef48fabbe5';
const tokenPattern = new RegExp('(?:gh[pousr]_' + '[A-Za-z0-9]{20,}|github_pat_' + '[A-Za-z0-9_]{20,}|sk-' + '[A-Za-z0-9_-]{24,})');

function safePath(file) {
  return typeof file === 'string' && file.length > 0 && !isAbsolute(file) && !file.includes('\\') &&
    file === posix.normalize(file) && !file.split('/').some(part => part === '..' || privateDirectories.has(part) || privateFile(part));
}

function readPublicFile(root, file) {
  let current = root;
  for (const part of file.split('/')) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('symlink');
  }
  const stat = lstatSync(current);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('not a small regular file');
  const text = readFileSync(current, 'utf8');
  if (text.includes('\0') || text.includes('\uFFFD')) throw new Error('not UTF-8 text');
  return text;
}

function candidates(root, issues, directory = '') {
  const found = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    if (privateDirectories.has(entry.name) || privateFile(entry.name)) continue;
    const file = posix.join(directory, entry.name);
    if (entry.isSymbolicLink()) { issues.push(`${file}: symlink is not publishable`); continue; }
    if (entry.isDirectory()) {
      if (!directory && !publicDirectories.has(entry.name)) issues.push(`${file}: unreviewed directory (not traversed)`);
      else found.push(...candidates(root, issues, file));
    } else found.push(file);
  }
  return found;
}

function checkLinks(file, source, files, issues) {
  const markdown = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  const links = [...markdown.matchAll(/\]\((<?[^\s)]+>?)(?:\s+"[^"]*")?\)/g)].map(match => match[1]);
  links.push(...[...markdown.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map(match => match[1]));
  for (let target of links) {
    target = target.replace(/^<|>$/g, '');
    if (/^https?:/.test(target)) {
      try {
        const url = new URL(target);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      } catch { issues.push(`${file}: malformed or unsafe external Markdown link`); }
      continue;
    }
    if (target.startsWith('#') || target.startsWith('mailto:')) continue;
    if (/^[a-z][a-z0-9+.-]*:|^\//i.test(target)) { issues.push(`${file}: unsupported Markdown link`); continue; }
    let path;
    try { path = decodeURIComponent(target.split(/[?#]/)[0]); }
    catch { issues.push(`${file}: malformed local Markdown link`); continue; }
    const linked = posix.normalize(posix.join(posix.dirname(file), path));
    if (!files.has(linked)) issues.push(`${file}: link target is not in release manifest: ${linked}`);
  }
}

export function checkRelease(root, { documentRoot = root, includeFiles = false } = {}) {
  const issues = [], contents = new Map();
  let manifest, manifestText;
  try { manifestText = readPublicFile(root, 'release-files.json'); manifest = JSON.parse(manifestText); }
  catch { return { checked: 0, issues: ['release-files.json: missing or invalid manifest'] }; }
  if (!Array.isArray(manifest) || manifest.length === 0 || manifest.some(file => !safePath(file)))
    return { checked: 0, issues: ['release-files.json: use an explicit nonempty array of safe relative file paths'] };
  const files = new Set(manifest);
  if (files.size !== manifest.length) issues.push('release-files.json: duplicate file path');
  for (const file of candidates(root, issues)) if (!files.has(file)) issues.push(`${file}: not in release manifest`);
  for (const file of manifest) {
    const sourceRoot = file.endsWith('.md') || file === 'LICENSE' || file === 'NOTICE' ? documentRoot : root;
    try { contents.set(file, file === 'release-files.json' ? manifestText : readPublicFile(sourceRoot, file)); }
    catch { issues.push(`${file}: missing, oversized, non-text, or symlinked file`); }
  }
  for (const [file, source] of contents) {
    if (tokenPattern.test(source) || /-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----/.test(source))
      issues.push(`${file}: possible credential (value not printed)`);
    const assignments = source.matchAll(/["']?(?:GITHUB_CLIENT_SECRET|BRIDGE_SEAL_KEY|DEVICE_REGISTRY|CLOUDFLARE_API_TOKEN)["']?\s*:\s*["']([^"'\r\n]+)["']/g);
    for (const [, value] of assignments) {
      if (!/^(?:test|test-only|fixture-only|\[\]|REPLACE_WITH_[A-Z_]+)$/.test(value)) issues.push(`${file}: literal secret value (value not printed)`);
    }
    if (/\/(?:Users|home)\/[A-Za-z0-9_.-]+\//.test(source)) issues.push(`${file}: personal absolute path`);
    if (file.endsWith('.md')) checkLinks(file, source, files, issues);
  }
  try {
    const pkg = JSON.parse(contents.get('package.json')), lock = JSON.parse(contents.get('package-lock.json'));
    if (pkg.name !== 'dotlink' || pkg.version !== '0.1.0-beta.1' || pkg.private !== true ||
        pkg.license !== 'PolyForm-Noncommercial-1.0.0' || lock.name !== pkg.name || lock.version !== pkg.version ||
        lock.packages[''].name !== pkg.name || lock.packages[''].version !== pkg.version || lock.packages[''].license !== pkg.license)
      issues.push('package metadata: product, beta version, private flag or license mismatch');
    for (const field of ['dependencies', 'devDependencies', 'engines']) {
      if (JSON.stringify(pkg[field]) !== JSON.stringify(lock.packages[''][field])) issues.push(`package-lock.json: root ${field} mismatch`);
    }
  } catch { issues.push('package metadata: missing or invalid JSON'); }
  if (!contents.has('LICENSE') || createHash('sha256').update(contents.get('LICENSE')).digest('hex') !== licenseHash)
    issues.push('LICENSE: expected unmodified PolyForm Noncommercial 1.0.0 text');
  if (!contents.get('NOTICE')?.includes('Required Notice:')) issues.push('NOTICE: required notice missing');
  for (const file of ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.zh-CN.md']) {
    if (!contents.get(file)?.includes('@cloudflare/workers-oauth-provider')) issues.push(`${file}: dependency notices missing`);
  }
  for (const file of ['wrangler.jsonc', 'wrangler.example.jsonc']) {
    try {
      const config = JSON.parse(contents.get(file));
      if (config.keep_vars !== true || 'account_id' in config || 'vars' in config || 'env' in config ||
          JSON.stringify(config.kv_namespaces) !== JSON.stringify([{ binding: 'OAUTH_KV' }]) ||
          JSON.stringify(config.migrations) !== JSON.stringify([{ tag: 'v1', new_sqlite_classes: ['PhoneBridge'] }]))
        issues.push(`${file}: unsafe template configuration or changed migration`);
    } catch { issues.push(`${file}: missing or invalid JSON`); }
  }
  const variables = contents.get('.dev.vars.example');
  if (!variables || variables.split(/\r?\n/).some(line => line.trim() && !line.trim().startsWith('#') && !/^[A-Z_]+=$/.test(line)))
    issues.push('.dev.vars.example: only empty secret placeholders are allowed');
  const result = { checked: contents.size, issues };
  if (includeFiles) result.files = [...contents].map(([path, text]) => ({ path,
    source: path.endsWith('.md') || path === 'LICENSE' || path === 'NOTICE' ? 'canonical-document' : 'code',
    bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') }));
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--docs-root' || !args[1])) {
    console.error('Usage: node scripts/check-release.mjs [--docs-root DIRECTORY]');
    process.exit(1);
  }
  const result = checkRelease(resolve(import.meta.dirname, '..'),
    args.length ? { documentRoot: resolve(args[1]) } : {});
  if (result.issues.length) {
    for (const issue of result.issues) console.error(issue);
    process.exitCode = 1;
  } else console.log(`Release check passed: ${result.checked} explicitly listed text files. Document source: ${args.length ? 'explicit --docs-root' : 'project directory'}. External links were syntax-checked only. No files were exported.`);
}
