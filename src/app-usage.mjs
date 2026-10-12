// Trigger observations are incomplete evidence. Never infer a close from upload time or another app opening.
export function summarizeAppUsage(observations, from, until) {
  const ordered = [...observations].sort((a, b) => a.measured - b.measured || a.id.localeCompare(b.id));
  const totals = new Map(), sessions = [];
  let active = null, missing = 0, ambiguous = 0;
  for (let index = 0; index < ordered.length;) {
    const time = ordered[index].measured, group = [];
    while (index < ordered.length && ordered[index].measured === time) group.push(ordered[index++]);
    if (group.length > 1) {
      if (time >= from) ambiguous += group.length;
      active = null;
      continue;
    }
    const observation = group[0];
    if (observation.transition === 'opened') {
      if (active && time >= from) missing++;
      active = observation;
      continue;
    }
    if (!active || active.app !== observation.app) {
      if (time >= from) missing++;
      active = null;
      continue;
    }
    if (time >= from && time <= until) {
      const duration = Math.max(0, (time - Math.max(from, active.measured)) / 1000);
      const total = totals.get(active.app) ?? { app: active.app, estimated_seconds: 0, complete_sessions: 0 };
      total.estimated_seconds += duration; total.complete_sessions++;
      totals.set(active.app, total);
      sessions.push({ app: active.app, opened_at: new Date(active.measured).toISOString(),
        closed_at: new Date(time).toISOString(), estimated_seconds_in_window: duration,
        clipped_to_window: active.measured < from });
    }
    active = null;
  }
  return { is_estimate: true, source: 'shortcuts_app_trigger',
    window_start: new Date(from).toISOString(), window_end: new Date(until).toISOString(),
    observation_count: ordered.filter(row => row.measured >= from).length,
    apps: [...totals.values()].sort((a, b) => b.estimated_seconds - a.estimated_seconds || a.app.localeCompare(b.app)),
    sessions: sessions.slice(-200), sessions_truncated: sessions.length > 200,
    unpaired_transitions: missing, ambiguous_transitions: ambiguous,
    unclosed_observation: active ? { app: active.app, opened_at: new Date(active.measured).toISOString() } : null,
    limitations: 'Estimated from observed open/close triggers, not system Screen Time. Missing events, lock screen and process termination can distort durations. An unclosed observation does not prove the app is still open.' };
}
