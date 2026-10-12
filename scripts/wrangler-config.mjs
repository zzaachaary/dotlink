import { lstatSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export function wranglerArguments(args, root, override) {
  const explicit = args.filter(value => value === '--config' || value === '-c' || value.startsWith('--config='));
  if (explicit.length > 1) throw new Error('multiple_wrangler_configs_are_not_supported');
  // check-build supplies its own temporary config. An explicit CLI option wins.
  if (explicit.length) return [...args];
  const configured = override || 'wrangler.jsonc';
  const file = resolve(root, configured), path = relative(root, file);
  if (!path || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`) || !/\.(?:jsonc?|toml)$/.test(file))
    throw new Error('DOTLINK_CONFIG_must_be_a_project_configuration_file');
  let current = root;
  try {
    for (const part of path.split(sep)) {
      current = join(current, part);
      if (lstatSync(current).isSymbolicLink()) throw new Error();
    }
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error();
  } catch { throw new Error('DOTLINK_CONFIG_must_be_a_regular_project_file_without_symlinks'); }
  return [...args, '--config', file];
}

export function wranglerEnvironment(environment, state, dryRun) {
  const env = { ...environment };
  if (dryRun) {
    for (const name of Object.keys(env)) if (/^(?:CLOUDFLARE_|CF_|WRANGLER_)/.test(name)) delete env[name];
    env.CI = 'true';
    env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false';
    env.CLOUDFLARE_AUTH_USE_KEYRING = 'false';
  }
  delete env.DOTLINK_CONFIG;
  return { ...env, XDG_CONFIG_HOME: resolve(state, 'cf-config'), WRANGLER_LOG_PATH: resolve(state, 'cf-logs'),
    WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_SANITIZE: 'true' };
}
