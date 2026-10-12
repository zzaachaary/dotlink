import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAppUsage } from '../src/app-usage.mjs';
import { RETENTION_MS, validateEvent } from '../src/protocol.mjs';
const now = Date.parse('2026-09-30T12:00:00Z');
const observation = (app, transition, measured) => ({ id: crypto.randomUUID(), app, transition, measured });
test('usage clips cross-window sessions and never charges upload delay as usage', () => {
  const report = summarizeAppUsage([
    observation('WeChat', 'closed', now - 1000), observation('WeChat', 'opened', now - 61000),
  ], now - 30000, now);
  assert.equal(report.apps[0].estimated_seconds, 29);
  assert.equal(report.sessions[0].clipped_to_window, true);
  assert.equal(report.is_estimate, true);
});
test('missing, repeated and ambiguous transitions do not invent completed sessions', () => {
  const report = summarizeAppUsage([
    observation('A', 'opened', now - 10000), observation('B', 'opened', now - 9000),
    observation('A', 'closed', now - 8000), observation('B', 'closed', now - 7000),
    observation('A', 'opened', now - 6000), observation('A', 'closed', now - 6000),
    observation('C', 'opened', now - 5000),
  ], now - 20000, now);
  assert.deepEqual(report.apps, []);
  assert.equal(report.unpaired_transitions, 3);
  assert.equal(report.ambiguous_transitions, 2);
  assert.equal(report.unclosed_observation.app, 'C');
});
test('batch schema bounds observations and rejects invented durations or duplicate IDs', () => {
  const row = { id: crypto.randomUUID(), app: 'WeChat', transition: 'opened', measured_at: new Date(now).toISOString() };
  const input = { v: 1, event_id: crypto.randomUUID(), device_id: 'iphone-primary', kind: 'app_activity_batch',
    occurred_at: new Date(now).toISOString(), payload: { source: 'shortcuts_app_trigger', measured_at: new Date(now).toISOString(), observations: [row] } };
  assert.equal(validateEvent(input, now).kind, 'app_activity_batch');
  const withRows = observations => ({ ...input, payload: { ...input.payload, observations } });
  const shortcutRow = { ...row, id: 'sc-123456789-987654321' };
  assert.equal(validateEvent(withRows([shortcutRow]), now).payload.observations[0].id, shortcutRow.id);
  assert.throws(() => validateEvent(withRows([shortcutRow, shortcutRow]), now), /duplicate_observation_id/);
  assert.throws(() => validateEvent(withRows([]), now), /invalid_app_batch/);
  assert.throws(() => validateEvent(withRows(Array(201).fill(row)), now), /invalid_app_batch/);
  assert.throws(() => validateEvent(withRows([row, row]), now), /duplicate_observation_id/);
  assert.throws(() => validateEvent(withRows([{ ...row, duration_seconds: 50 }]), now), /invalid_fields/);
  assert.throws(() => validateEvent(withRows([{ ...row, measured_at: new Date(now - RETENTION_MS).toISOString() }]), now), /outside_retention/);
});
