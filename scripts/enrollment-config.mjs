// Pure validation shared with offline tests; never logs configuration or credentials.
export function ingestUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('https://') || /[\s\u0000-\u001f\u007f\\?#]/.test(value))
    throw new Error('bridge_ingest_url_missing_or_invalid');
  let url;
  try { url = new URL(value); }
  catch { throw new Error('bridge_ingest_url_missing_or_invalid'); }
  if (url.protocol !== 'https:' || !url.hostname || url.pathname !== '/ingest' || url.username || url.password || url.search || url.hash)
    throw new Error('bridge_ingest_url_missing_or_invalid');
  return url.href;
}

export function validateLocalCredential(credential, endpoint) {
  if (!credential || typeof credential !== 'object' || Array.isArray(credential) ||
      credential.device_id !== 'iphone-primary' || credential.endpoint !== endpoint ||
      typeof credential.token !== 'string' || credential.token.length !== 43 || !/^[A-Za-z0-9_-]{43}$/.test(credential.token))
    throw new Error('invalid_local_credential');
  return credential;
}
