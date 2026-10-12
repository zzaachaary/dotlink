import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestUrl, validateLocalCredential } from '../scripts/enrollment-config.mjs';

test('device enrollment requires an explicit HTTPS ingest endpoint', () => {
  assert.equal(ingestUrl('https://bridge.example.com/ingest'), 'https://bridge.example.com/ingest');
  assert.equal(ingestUrl('https://BRIDGE.example.com:443/ingest'), 'https://bridge.example.com/ingest');
  for (const value of [undefined, null, '', 'http://bridge.example.com/ingest', '/ingest',
    'https://bridge.example.com', 'https://bridge.example.com/ingest/', 'https://bridge.example.com/mcp',
    'https://user:password@bridge.example.com/ingest', 'https://user@bridge.example.com/ingest',
    'https://bridge.example.com/ingest?token=private', 'https://bridge.example.com/ingest?',
    'https://bridge.example.com/ingest#private', 'https://bridge.example.com/ingest#',
    ' https://bridge.example.com/ingest', 'https://bridge.example.com/ingest\n',
    'https://bridge.example.com/ingest\u0000', 'https://bridge.example.com\\ingest', 'https://']) {
    assert.throws(() => ingestUrl(value), { message: 'bridge_ingest_url_missing_or_invalid' });
  }
});

test('reusing a local credential requires the same endpoint and preserves its contents', () => {
  const endpoint = ingestUrl('https://bridge.example.com/ingest');
  const credential = Object.freeze({ device_id: 'iphone-primary', endpoint, token: 'A'.repeat(43) });
  assert.equal(validateLocalCredential(credential, endpoint), credential);
  assert.throws(() => validateLocalCredential(credential, 'https://another.example.com/ingest'),
    { message: 'invalid_local_credential' });
  for (const invalid of [null, [], { ...credential, device_id: 'someone-else' },
    { ...credential, token: undefined }, { ...credential, token: 'A'.repeat(42) }, { ...credential, token: `${'A'.repeat(43)}\n` },
    { ...credential, token: '='.repeat(43) }, { ...credential, endpoint: 'http://bridge.example.com/ingest' }]) {
    assert.throws(() => validateLocalCredential(invalid, endpoint), { message: 'invalid_local_credential' });
  }
});
