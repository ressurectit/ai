#!/usr/bin/env node
// herdr-subagents: spawn / monitor / collect / close `pi` subagents in Herdr panes.
//
//   node subagents.mjs run    [spec.json|-] [flags]  spawn + monitor + print results + close (one call)
//   node subagents.mjs spawn  [spec.json|-] [flags]  spawn + send task, return immediately
//   node subagents.mjs wait   [name...] [--timeout MS] [--keep]   monitor, print results, close finished
//   node subagents.mjs status                         live state incl. retries / provider errors
//   node subagents.mjs close  [name...|--all]
//   node subagents.mjs health [--reset]               remembered provider/model problems
//
// Spec (JSON on stdin with "-" or a file): an agent object, an array of them, or
//   { "defaults": {...agent fields...}, "agents": [ {...}, ... ] }
// Agent fields: task (required), name, role, mode ("append"|"replace"), model, fallbackModels
//   (string[]), thinking, timeout (ms), cwd, piArgs (string[] passed to pi).
// Single-agent flags: --task --name --role --mode --model --fallback a,b --thinking --timeout --cwd
//
// Exit code: 0 = every agent ok, 2 = at least one failed/blocked/timed out, 1 = usage/internal error.
//
// Provider problems: each subagent's pi session (JSONL) is watched. pi already retries transient
// errors (rate limit, 5xx, network) itself; when it gives up, or on non-retryable errors
// (quota/billing, auth, unknown model), the error is classified, remembered per model
// (state.health, with TTL) and the subagent is restarted on the next fallback model. Without
// a usable fallback it is reported to the parent as FAILED <class> with a hint.
//
// Layout: max 4 panes per tab, 2x2 grid built as: split right -> split right column down ->
// split left column down. The parent's own tab is used only while it contains nothing but the
// parent + our subagents. Extra subagents go to new tabs ("subagents", "subagents 2", ...).

import { execFile, execFileSync } from 'node:child_process';
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// ---------- herdr helpers ----------
function herdr(args) {
  try {
    const out = execFileSync('herdr', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out).result;
  } catch (e) {
    const raw = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
    let msg = raw || e.message;
    try { const j = JSON.parse(raw); msg = `${j.error?.code}: ${j.error?.message}`; } catch {}
    throw new Error(`herdr ${args.slice(0, 2).join(' ')} failed: ${msg}`);
  }
}
const herdrTry = (args) => { try { return herdr(args); } catch { return null; } };
function herdrAsync(args) {
  return new Promise((res) => {
    execFile('herdr', args, { encoding: 'utf8', maxBuffer: 16 << 20 }, (err, stdout, stderr) => {
      const raw = `${stdout ?? ''}${stderr ?? ''}`.trim();
      let j = null; try { j = JSON.parse(raw); } catch {}
      res({ ok: !err, result: j?.result ?? null, error: j?.error ?? (err ? { code: 'error', message: raw || err.message } : null) });
    });
  });
}
function screenText(pane, lines = 80) {
  try { return execFileSync('herdr', ['pane', 'read', pane, '--source', 'recent', '--lines', String(lines)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return ''; }
}
// Last meaningful lines of a pane (drops blanks, rules and the pi footer).
function paneTail(pane, n = 10) {
  const lines = screenText(pane).split('\n').map((l) => l.trimEnd());
  const cut = lines.findLastIndex((l) => /^\u2500{10,}/.test(l.trim()));
  const body = (cut > 0 ? lines.slice(0, cut) : lines).filter((l) => l.trim() && !/^\u2500+$/.test(l.trim()));
  return body.slice(-n).join('\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- context / state ----------
function die(msg) { console.error(`error: ${msg}`); process.exit(1); }
if (process.env.HERDR_ENV !== '1') die('Not running inside Herdr (HERDR_ENV!=1); cannot spawn subagents.');
const WS = process.env.HERDR_WORKSPACE_ID;
const PARENT = process.env.HERDR_PANE_ID;
const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
const DIR = resolve(process.env.HERDR_SUBAGENTS_DIR || join(tmpdir(), 'herdr-subagents', `${safe(WS)}-${safe(PARENT)}`));
const STATE = join(DIR, 'state.json');
const AGENT_DIR = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent');
mkdirSync(DIR, { recursive: true });

function loadState() {
  let s; try { s = JSON.parse(readFileSync(STATE, 'utf8')); } catch { s = {}; }
  return { agents: {}, tabs: [], health: {}, ...s };
}
const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2));

// ---------- arg parsing ----------
function parseArgs(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2), next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[k] = true; else { flags[k] = next; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}
function readSpec(src, flags) {
  let spec;
  if (src) spec = JSON.parse(src === '-' ? readFileSync(0, 'utf8') : readFileSync(src, 'utf8'));
  else if (flags.task) spec = {};
  else die('missing spec: pass a JSON file, "-" for stdin, or --task "..."');
  let defaults = {}, agents;
  if (Array.isArray(spec)) agents = spec;
  else if (spec.agents) { agents = spec.agents; defaults = spec.defaults ?? {}; }
  else agents = [spec];
  const f = {};
  for (const k of ['task', 'name', 'role', 'mode', 'model', 'thinking', 'timeout', 'cwd']) if (typeof flags[k] === 'string') f[k] = flags[k];
  if (typeof flags.fallback === 'string') f.fallbackModels = flags.fallback.split(',').map((s) => s.trim()).filter(Boolean);
  if (Object.keys(f).length) { if (src) defaults = { ...defaults, ...f }; else agents = [f]; }
  return agents.map((a) => ({ ...defaults, ...a }));
}

// ---------- names ----------
function slug(s) {
  const n = String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[^a-z]+/, '').slice(0, 24).replace(/_+$/, '');
  return n || 'sa';
}
function uniqueName(want, taken) {
  const base = slug(want);
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) { const n = `${base.slice(0, 28)}_${i}`; if (!taken.has(n)) return n; }
}

// ---------- models & health ----------
let modelCache;
function availableModels() {
  if (modelCache !== undefined) return modelCache;
  try {
    const out = execFileSync('pi', ['--list-models'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
    modelCache = out.split('\n').slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2).map(([p, m]) => `${p}/${m}`);
    if (!modelCache.length) modelCache = null;
  } catch { modelCache = null; } // unknown -> skip validation
  return modelCache;
}
function defaultModel() {
  try { const s = JSON.parse(readFileSync(join(AGENT_DIR, 'settings.json'), 'utf8')); return s.defaultProvider && s.defaultModel ? `${s.defaultProvider}/${s.defaultModel}` : null; }
  catch { return null; }
}
const modelKey = (m) => (m ? String(m).replace(/:(off|minimal|low|medium|high|xhigh|max)$/, '') : defaultModel() || 'default');
function checkModel(m) { // -> null if fine, else reason
  if (!m) return null;
  const list = availableModels();
  if (!list) return null;
  const k = modelKey(m);
  if (list.includes(k) || (!k.includes('/') && list.some((x) => x.endsWith(`/${k}`)))) return null;
  const id = k.split('/').pop().toLowerCase();
  const near = list.filter((x) => x.toLowerCase().includes(id.slice(0, Math.max(4, id.length - 4)))).slice(0, 5);
  return `model not in \`pi --list-models\`${near.length ? `; similar: ${near.join(', ')}` : ''}`;
}

// Error classes. `ttl` = how long a model is avoided after this error; `fallback` = restart on next model.
const CLASSES = {
  quota_exceeded:       { ttl: 60 * 60e3, fallback: true,  hint: 'quota/budget/premium allowance used up; retrying this model will not help: switch provider/model' },
  auth_error:           { ttl: 30 * 60e3, fallback: true,  hint: 'credentials missing/expired/invalid (pi auth, /login, LiteLLM key); ask the user' },
  model_unavailable:    { ttl: 60 * 60e3, fallback: true,  hint: 'model unknown or not enabled on this provider; check `pi --list-models`' },
  rate_limited:         { ttl: 3 * 60e3,  fallback: true,  hint: "rate limit persisted after pi's automatic retries; retry later, run fewer parallel agents on this provider, or use another provider" },
  provider_unreachable: { ttl: 5 * 60e3,  fallback: true,  hint: 'provider/LiteLLM server unreachable or failing (network, DNS, TLS, 5xx); check server/VPN or use another provider' },
  context_overflow:     { ttl: 0,         fallback: true,  hint: 'task did not fit the model context; split the task or use a larger-context model' },
  provider_error:       { ttl: 2 * 60e3,  fallback: true,  hint: 'unclassified provider error; see message' },
  startup_failed:       { ttl: 0,         fallback: true,  hint: 'pi did not start in the pane; see screen output' },
  crashed:              { ttl: 0,         fallback: false, hint: 'pi exited unexpectedly; see screen output' },
};
function classify(msg) {
  const m = String(msg ?? '');
  if (/quota|insufficient_quota|billing|budget|credit balance|available balance|premium request|allowance|usage limit|monthly limit|spend limit|ExceededBudget|payment required|\b402\b/i.test(m)) return 'quota_exceeded';
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|authenticat|invalid[ _-]?(api[ _-]?)?key|api key|no api key|token (has )?expired|permission denied|not logged in|\/login/i.test(m)) return 'auth_error';
  if (/model[^\n]{0,40}(not found|does not exist|not supported|unknown|invalid|not available|ambiguous)|model_not_found|no models match|invalid model|unknown provider|\b404\b/i.test(m)) return 'model_unavailable';
  if (/context[ _-]?(length|window)|context_length_exceeded|prompt is too long|too many tokens|maximum context|input is too long/i.test(m)) return 'context_overflow';
  if (/\b429\b|rate.?limit|too many requests|RateLimitError|throttl|ResourceExhausted|overloaded|at capacity|server_busy|high demand/i.test(m)) return 'rate_limited';
  if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|getaddrinfo|fetch failed|connection (error|refused|lost)|network.?error|socket hang up|other side closed|timed? ?out|\b(500|502|503|504|520|524)\b|bad gateway|service.?unavailable|gateway|upstream|certificate|self[- ]signed|ssl|tls|APIConnectionError|InternalServerError/i.test(m)) return 'provider_unreachable';
  return 'provider_error';
}
function healthOf(state, key) {
  const h = state.health[key];
  if (!h) return null;
  if (Date.now() - h.at > (CLASSES[h.cls]?.ttl ?? 0)) { delete state.health[key]; return null; }
  return h;
}
const ago = (t) => fmtDur(Date.now() - t);

// ---------- layout ----------
const tabLayout = (paneId) => herdr(['pane', 'layout', '--pane', paneId]).layout;
// Next split for a tab holding n (1..3) panes, producing a 2x2 grid.
function nextSplit(layout) {
  const ps = layout.panes, A = layout.area;
  if (ps.length === 1) return { pane: ps[0].pane_id, dir: 'right' };
  if (ps.length === 2) {
    const [a, b] = ps;
    if (a.rect.x !== b.rect.x) return { pane: (a.rect.x > b.rect.x ? a : b).pane_id, dir: 'down' };
    return { pane: (a.rect.y > b.rect.y ? a : b).pane_id, dir: 'right' };
  }
  const big = [...ps].sort((p, q) => q.rect.width * q.rect.height - p.rect.width * p.rect.height || q.rect.x - p.rect.x)[0];
  return { pane: big.pane_id, dir: big.rect.height >= A.height - 1 ? 'down' : 'right' };
}
function allocatePane(state, cwd) {
  const managed = new Set(Object.values(state.agents).map((a) => a.pane).filter(Boolean));
  const owned = (ps, extra) => ps.every((p) => managed.has(p.pane_id) || extra.has(p.pane_id));
  const pl = tabLayout(PARENT);
  if (pl.panes.length < 4 && owned(pl.panes, new Set([PARENT]))) return splitIn(pl, cwd);
  state.tabs = state.tabs.filter((t) => herdrTry(['tab', 'get', t.tab]));
  for (const t of state.tabs) {
    const anyPane = Object.values(state.agents).find((a) => a.tab === t.tab && a.pane)?.pane;
    if (!anyPane) continue;
    const l = herdrTry(['pane', 'layout', '--pane', anyPane])?.layout;
    if (l && l.panes.length < 4 && owned(l.panes, new Set())) return splitIn(l, cwd);
  }
  const used = new Set(herdr(['tab', 'list', '--workspace', WS]).tabs.map((t) => t.label));
  let label = 'subagents';
  for (let i = 2; used.has(label); i++) label = `subagents ${i}`;
  const r = herdr(['tab', 'create', '--workspace', WS, '--cwd', cwd, '--label', label, '--no-focus']);
  state.tabs.push({ tab: r.tab.tab_id, label });
  return { pane: r.root_pane.pane_id, tab: r.tab.tab_id };
}
function splitIn(layout, cwd) {
  const { pane, dir } = nextSplit(layout);
  const r = herdr(['pane', 'split', pane, '--direction', dir, '--ratio', '0.5', '--cwd', cwd, '--no-focus']);
  return { pane: r.pane.pane_id, tab: r.pane.tab_id };
}

// ---------- system prompt ----------
function globalAppendPrompt() {
  // Passing --append-system-prompt disables pi's own APPEND_SYSTEM.md discovery, so inline it.
  const f = join(AGENT_DIR, 'APPEND_SYSTEM.md');
  return existsSync(f) ? readFileSync(f, 'utf8').trim() : '';
}
const fileOrText = (s) => (s && existsSync(s) ? readFileSync(s, 'utf8').trim() : (s ?? '').trim());
function contract(name, resultFile) {
  return `<subagent_contract>
You are a focused SUBAGENT named "${name}", spawned by a parent agent that will read ONLY your result file.
- Do ONLY the assigned task. No unrelated exploration, refactoring or fixes. Do not spawn subagents or Herdr panes yourself.
- Never fabricate or guess. Base every statement on what you actually observed (files read, commands run, real output). Say plainly when something cannot be determined.
- Nobody watches this pane: never ask questions or wait for confirmation. If you need a decision, missing information, or a destructive/risky step, stop and explain it in the result file instead.
- When finished, write ONLY compact final findings (conclusions + the concrete facts the parent needs: paths, names, numbers, short lists; no narrative of your steps) to:
  ${resultFile}
- Then reply with just that path.
</subagent_contract>`;
}

// ---------- session monitoring ----------
// Incrementally reads the newest *.jsonl in an attempt's session dir.
const readers = new Map();
function sessionScan(att) {
  let r = readers.get(att.sessionDir);
  if (!r) readers.set(att.sessionDir, (r = { file: null, off: 0, buf: '', lastAssistant: null, errors: 0, lastErrorMsg: null, tokens: 0, cost: 0, model: null, lastTs: 0 }));
  if (!r.file) {
    try {
      const f = readdirSync(att.sessionDir, { recursive: true }).map(String).filter((x) => x.endsWith('.jsonl')).sort().pop();
      if (f) r.file = join(att.sessionDir, f);
    } catch {}
    if (!r.file) return r;
  }
  const fd = openSync(r.file, 'r');
  try {
    const size = fstatSync(fd).size;
    if (size > r.off) {
      const b = Buffer.alloc(size - r.off);
      readSync(fd, b, 0, b.length, r.off);
      r.off = size;
      const parts = (r.buf + b.toString('utf8')).split('\n');
      r.buf = parts.pop();
      for (const line of parts) {
        let o; try { o = JSON.parse(line); } catch { continue; }
        const msg = o.message;
        if (o.timestamp) r.lastTs = Date.parse(o.timestamp) || r.lastTs;
        if (msg?.role !== 'assistant') continue;
        r.lastAssistant = msg;
        if (msg.model) r.model = `${msg.provider ? `${msg.provider}/` : ''}${msg.model}`;
        r.tokens += msg.usage?.totalTokens ?? 0;
        r.cost += msg.usage?.cost?.total ?? 0;
        if (msg.stopReason === 'error') { r.errors++; r.lastErrorMsg = String(msg.errorMessage ?? 'unknown error').trim(); }
      }
    }
  } finally { closeSync(fd); }
  return r;
}

// ---------- spawning ----------
function buildAttemptFiles(rec, model) {
  const stamp = `${Date.now().toString(36)}${rec.attempts.length}`;
  const base = join(DIR, `${rec.name}-${stamp}`);
  const piArgs = ['--session-dir', `${base}.sessions`, '--append-system-prompt', rec.appendFile];
  if (rec.systemFile) piArgs.push('--system-prompt', rec.systemFile);
  if (model) piArgs.push('--model', model);
  if (rec.thinking) piArgs.push('--thinking', rec.thinking);
  piArgs.push(...rec.piArgs);
  return { sessionDir: `${base}.sessions`, piArgs };
}

// Picks the next usable model (skipping invalid / recently failing ones) and starts pi on it.
// Returns true when an attempt is running, false when no candidates are left (rec.final set).
function startNextAttempt(state, rec) {
  while (rec.next < rec.candidates.length) {
    const model = rec.candidates[rec.next++];
    const key = modelKey(model);
    const bad = checkModel(model);
    if (bad) { rec.notes.push(`skipped ${key}: ${bad}`); rec.lastFailure = { cls: 'model_unavailable', model: key, msg: bad }; continue; }
    const h = healthOf(state, key);
    // avoid a recently failing model while another candidate remains
    if (h && rec.next < rec.candidates.length) { rec.notes.push(`skipped ${key}: ${h.cls} ${ago(h.at)} ago`); rec.lastFailure = { ...h, model: key }; continue; }

    const { sessionDir, piArgs } = buildAttemptFiles(rec, model);
    let slot;
    try { slot = allocatePane(state, rec.cwd); } catch (e) { rec.final = { status: 'failed', cls: 'startup_failed', msg: e.message }; return false; }
    const att = { model: key, sessionDir, pane: slot.pane, tab: slot.tab, started: Date.now() };
    rec.attempts.push(att);
    Object.assign(rec, { pane: slot.pane, tab: slot.tab, nudged: false, promptedAt: Date.now() });
    saveState(state);
    herdrTry(['pane', 'rename', slot.pane, `sa:${rec.name} (${key})`]);
    try {
      herdr(['agent', 'start', rec.name, '--kind', 'pi', '--pane', slot.pane, '--timeout', '90000', '--', ...piArgs]);
    } catch (e) {
      if (!/agent_not_ready/.test(e.message)) {
        const screen = paneTail(slot.pane, 8);
        const cls = /model|provider/i.test(screen) ? classify(screen) : 'startup_failed';
        failAttempt(state, rec, att, cls, (screen || e.message).slice(-400));
        continue;
      }
    }
    const prompt = `TASK:\n${rec.task}\n\nResult file: ${rec.resultFile}`;
    for (let t = 0; t < 3; t++) {
      try { herdr(['agent', 'prompt', rec.name, prompt, '--wait', '--until', 'working', '--until', 'blocked', '--until', 'done', '--until', 'idle', '--timeout', '20000']); break; }
      catch (e) { if (t === 2) rec.notes.push(`prompt not confirmed: ${e.message}`); else execFileSync('sleep', ['2']); }
    }
    return true;
  }
  const lf = rec.lastFailure;
  rec.final = { status: 'failed', cls: lf?.cls ?? 'startup_failed', msg: lf?.msg ?? 'no usable model', model: lf?.model };
  rec.pane = null;
  return false;
}
function failAttempt(state, rec, att, cls, msg) {
  att.error = { cls, msg };
  rec.lastFailure = { cls, msg, model: att.model };
  if (CLASSES[cls]?.ttl) state.health[att.model] = { cls, msg: msg.slice(0, 200), at: Date.now() };
  rec.notes.push(`${att.model}: ${cls} "${oneLine(msg)}"`);
  herdrTry(['pane', 'close', att.pane]);
  rec.pane = null;
  saveState(state);
}
const oneLine = (s, n = 160) => String(s).replace(/\s+/g, ' ').trim().slice(0, n);

function spawn(agents) {
  const state = loadState();
  const taken = new Set((herdrTry(['agent', 'list'])?.agents ?? []).map((a) => a.name).filter(Boolean));
  for (const n of Object.keys(state.agents)) taken.add(n);
  const out = [], names = [];
  for (const [i, a] of agents.entries()) {
    if (!a.task) die(`agent #${i + 1} has no "task"`);
    const name = uniqueName(a.name || a.task.split(/\s+/).slice(0, 3).join('_'), taken);
    taken.add(name);
    const base = join(DIR, `${name}-${Date.now().toString(36)}`);
    const role = fileOrText(a.role);
    const mode = a.mode === 'replace' ? 'replace' : 'append';
    if (mode === 'replace' && !role) die(`agent ${name}: mode "replace" needs a role`);
    const resultFile = `${base}.result.md`;
    const appendFile = `${base}.append.md`;
    writeFileSync(appendFile, [globalAppendPrompt(), mode === 'append' && role ? `<subagent_role>\n${role}\n</subagent_role>` : '', contract(name, resultFile)].filter(Boolean).join('\n\n') + '\n');
    let systemFile = null;
    if (mode === 'replace') { systemFile = `${base}.system.md`; writeFileSync(systemFile, role + '\n'); }
    const fallbacks = Array.isArray(a.fallbackModels) ? a.fallbackModels : a.fallbackModels ? [a.fallbackModels] : [];
    const rec = {
      name, task: a.task.trim(), cwd: resolve(a.cwd || process.cwd()), resultFile, appendFile, systemFile,
      thinking: a.thinking ?? null, piArgs: Array.isArray(a.piArgs) ? a.piArgs.map(String) : [],
      candidates: [a.model || null, ...fallbacks].filter((m, j, arr) => arr.indexOf(m) === j), next: 0,
      timeout: Number(a.timeout) || 900000, created: Date.now(), attempts: [], notes: [], pane: null, tab: null, final: null,
    };
    state.agents[name] = rec;
    names.push(name);
    startNextAttempt(state, rec);
    saveState(state);
    const att = rec.attempts.at(-1);
    out.push(rec.final
      ? `FAILED ${name}: ${rec.final.cls} ${oneLine(rec.final.msg)}`
      : `spawned ${name} pane=${rec.pane} tab=${rec.tab} model=${att.model}${rec.notes.length ? ` (${rec.notes.join('; ')})` : ''}`);
  }
  console.log(out.join('\n'));
  return names;
}

// ---------- monitoring ----------
const finished = (st) => st === 'idle' || st === 'done';
async function monitor(names, { timeout, keep }) {
  const state = loadState();
  const list = (names.length ? names : Object.keys(state.agents)).filter((n) => state.agents[n]);
  if (!list.length) { console.log('no subagents'); return 0; }
  const deadline = (rec) => (rec.attempts.at(-1)?.started ?? rec.created) + (Number(timeout) || rec.timeout);

  for (;;) {
    let active = 0;
    for (const name of list) {
      const rec = state.agents[name];
      if (rec.final) continue;
      const att = rec.attempts.at(-1);
      if (!att || !rec.pane) { if (!startNextAttempt(state, rec)) continue; active++; continue; }
      active++;
      const sess = sessionScan(att);
      const g = herdrTry(['agent', 'get', name]);
      const st = g?.agent?.agent_status ?? 'gone';
      const hasResult = !!readResult(rec.resultFile);
      const settled = Date.now() - rec.promptedAt > 4000;

      if (hasResult && finished(st)) { rec.final = { status: 'ok' }; continue; }
      if (st === 'blocked') { rec.final = { status: 'blocked', msg: paneTail(rec.pane) }; continue; }
      if (st === 'gone' || g?.agent?.agent !== 'pi') {
        rec.final = { status: 'failed', cls: 'crashed', msg: paneTail(rec.pane) || 'agent disappeared', model: att.model }; continue;
      }
      // pi gave up on a provider error (it retries transient ones itself while "working")
      if (finished(st) && settled && sess.lastAssistant?.stopReason === 'error') {
        const msg = sess.lastErrorMsg;
        const cls = classify(msg);
        failAttempt(state, rec, att, cls, msg);
        if (!CLASSES[cls].fallback || !startNextAttempt(state, rec)) {
          rec.final ??= { status: 'failed', cls, msg, model: att.model };
          if (rec.final.status === 'failed') rec.final.cls = rec.final.cls ?? cls;
        }
        continue;
      }
      if (finished(st) && settled && !hasResult) {
        if (!rec.nudged) {
          rec.nudged = true; rec.promptedAt = Date.now();
          herdrAsync(['agent', 'prompt', name, `You have not written the result file. Write your findings to ${rec.resultFile} now, then reply with the path only.`]);
        } else rec.final = { status: 'failed', cls: 'no_result', msg: paneTail(rec.pane), model: att.model };
        continue;
      }
      if (Date.now() > deadline(rec)) { rec.final = { status: 'timeout', msg: paneTail(rec.pane), model: att.model }; continue; }
    }
    saveState(state);
    if (!active || list.every((n) => state.agents[n].final)) break;
    await sleep(2000);
  }
  return report(state, list, keep);
}

function report(state, list, keep) {
  const blocks = [];
  let bad = 0;
  for (const name of list) {
    const rec = state.agents[name];
    const f = rec.final;
    let tok = 0, cost = 0, model = rec.attempts.at(-1)?.model ?? '-';
    for (const att of rec.attempts) { const s = sessionScan(att); tok += s.tokens; cost += s.cost; if (s.model && att === rec.attempts.at(-1)) model = s.model; }
    const meta = [model, fmtDur(Date.now() - rec.created), `${tok} tok`, `$${cost.toFixed(4)}`].join(', ');
    const ns = f.status === 'failed' && f.msg ? rec.notes.filter((n) => !n.includes(oneLine(f.msg))) : rec.notes; // don't repeat the final error
    const notes = ns.length ? `\nproblems: ${ns.join(' | ')}` : '';
    if (f.status === 'ok') {
      blocks.push(`## ${name} — ok (${meta})${notes}\n${readResult(rec.resultFile)}`);
      if (!keep) closeAgent(state, name);
      continue;
    }
    bad++;
    const body = readResult(rec.resultFile);
    if (f.status === 'failed' && CLASSES[f.cls]?.fallback !== undefined && f.cls !== 'crashed') {
      // provider-level failure: nothing useful left in the pane
      blocks.push(`## ${name} — FAILED ${f.cls} (${meta})\nerror: ${oneLine(f.msg, 300)}\nhint: ${CLASSES[f.cls].hint}${rec.candidates.length > 1 ? '' : '; set "fallbackModels" to fail over automatically'}${notes}${body ? `\npartial result:\n${body}` : ''}`);
      closeAgent(state, name);
    } else {
      const what = f.status === 'failed' ? `FAILED ${f.cls}` : f.status.toUpperCase();
      const hint = f.status === 'blocked' ? 'waiting on a dialog/approval: answer with `herdr agent prompt <name> ...` / send-keys, or ask the user; then `wait <name>`'
        : f.status === 'timeout' ? 'still running: `wait <name> --timeout MS` to keep waiting, or `close <name>`'
        : CLASSES[f.cls]?.hint ?? 'finished without writing the result file';
      blocks.push(`## ${name} — ${what}; pane ${rec.pane ?? '-'} ${rec.pane ? 'kept open' : 'closed'} (${meta})\nhint: ${hint}${notes}${body ? `\npartial result:\n${body}` : ''}${f.msg ? `\n--- last output ---\n${f.msg}` : ''}`);
      if (!rec.pane) delete state.agents[name];
    }
  }
  saveState(state);
  console.log(blocks.join('\n\n'));
  return bad ? 2 : 0;
}

const fmtDur = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`; };
const readResult = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

function closeAgent(state, name) {
  const a = state.agents[name];
  if (!a) return false;
  if (a.pane) herdrTry(['pane', 'close', a.pane]); // closing a tab's last pane closes the tab
  delete state.agents[name];
  return true;
}
function closeCmd(names, all) {
  const state = loadState();
  const list = all ? Object.keys(state.agents) : names;
  if (!list.length) die('give subagent names or --all');
  const done = list.filter((n) => closeAgent(state, n));
  state.tabs = state.tabs.filter((t) => herdrTry(['tab', 'get', t.tab]));
  saveState(state);
  console.log(`closed: ${done.join(' ') || '(none)'}`);
}
function statusCmd() {
  const state = loadState();
  const rows = Object.values(state.agents).map((rec) => {
    const att = rec.attempts.at(-1);
    const st = rec.final ? rec.final.status : herdrTry(['agent', 'get', rec.name])?.agent?.agent_status ?? 'gone';
    const s = att ? sessionScan(att) : null;
    const err = s?.errors ? ` errors=${s.errors} last="${oneLine(s.lastErrorMsg, 80)}" (${classify(s.lastErrorMsg)}${st === 'working' ? ', pi retrying' : ''})` : '';
    return `${rec.name}\t${st}\tmodel=${att?.model ?? '-'}\tattempt=${rec.attempts.length}\tpane=${rec.pane ?? '-'}\tresult=${readResult(rec.resultFile) ? 'yes' : 'no'}\t${fmtDur(Date.now() - rec.created)}${err}${rec.notes.length ? `\tproblems: ${rec.notes.join(' | ')}` : ''}`;
  });
  console.log(rows.join('\n') || 'no subagents');
  healthCmd(false, state, true);
}
function healthCmd(reset, state = loadState(), quiet = false) {
  if (reset) { state.health = {}; saveState(state); console.log('health reset'); return; }
  const rows = Object.keys(state.health).map((k) => { const h = healthOf(state, k); return h ? `${k}\t${h.cls}\t${ago(h.at)} ago\t"${oneLine(h.msg, 100)}"` : null; }).filter(Boolean);
  if (rows.length) console.log(`avoided models:\n${rows.join('\n')}`);
  else if (!quiet) console.log('no recent provider problems');
}

// ---------- main ----------
const [cmd, ...rest] = process.argv.slice(2);
const { pos, flags } = parseArgs(rest);
try {
  switch (cmd) {
    case 'spawn': spawn(readSpec(pos[0], flags)); break;
    case 'run': {
      const names = spawn(readSpec(pos[0], flags));
      console.log('');
      process.exitCode = await monitor(names, { timeout: flags.timeout, keep: !!flags.keep });
      break;
    }
    case 'wait': process.exitCode = await monitor(pos, { timeout: flags.timeout, keep: !!flags.keep }); break;
    case 'close': closeCmd(pos, !!flags.all); break;
    case 'status': statusCmd(); break;
    case 'health': healthCmd(!!flags.reset); break;
    case 'classify': console.log(classify(pos.join(' '))); break; // debugging aid
    default:
      console.log('usage: subagents.mjs run|spawn [spec.json|-] [--task T --name N --role R --mode append|replace --model M --fallback M2,M3 --thinking L --timeout MS --cwd D] | wait [names] [--timeout MS] [--keep] | status | health [--reset] | close names|--all');
      process.exitCode = cmd ? 1 : 0;
  }
} catch (e) { die(e.message); }
