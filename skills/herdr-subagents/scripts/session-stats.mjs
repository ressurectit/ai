#!/usr/bin/env node
// Usage: node session-stats.mjs <path-to-session.jsonl>
// Prints total cost (USD), duration, tokens and assistant-turn count for one pi subagent session.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node session-stats.mjs <session.jsonl>');
  process.exit(1);
}

let cost = 0, tokens = 0, turns = 0;
let firstTs = null, lastTs = null;
let model = null;
let activeMs = null, activeHms = null;

for (const line of readFileSync(file, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t) continue;
  let o;
  try { o = JSON.parse(t); } catch { continue; }

  // Persisted active-work duration from the pi-kukko extension (last one wins).
  if (o.type === 'custom' && o.customType === 'pi-kukko-duration' && o.data) {
    if (typeof o.data.activeMs === 'number') activeMs = o.data.activeMs;
    if (typeof o.data.activeHms === 'string') activeHms = o.data.activeHms;
  }

  const ts = o.timestamp ?? o.message?.timestamp;
  if (ts) {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms)) {
      if (firstTs === null || ms < firstTs) firstTs = ms;
      if (lastTs === null || ms > lastTs) lastTs = ms;
    }
  }

  const u = o.message?.usage;
  if (u) {
    turns++;
    cost += u.cost?.total ?? 0;
    tokens += u.totalTokens ?? 0;
    if (o.message?.model) model = o.message.model;
  }
}

const durMs = firstTs !== null && lastTs !== null ? lastTs - firstTs : 0;
const secs = Math.round(durMs / 1000);
const dur = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;

const activeSecs = activeMs !== null ? Math.round(activeMs / 1000) : null;

console.log(JSON.stringify({
  file,
  model,
  assistantTurns: turns,
  totalTokens: tokens,
  costUsd: Number(cost.toFixed(6)),
  // Active working time persisted by pi-kukko (excludes idle waiting). Null if absent.
  activeDurationSeconds: activeSecs,
  activeDuration: activeHms,
  // Wall-clock span of the session incl. idle time, derived from timestamps.
  wallDurationSeconds: secs,
  wallDuration: dur,
}, null, 2));
