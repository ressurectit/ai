---
name: herdr-subagents
description: "Delegate focused subtasks to subagents — fresh `pi` instances in Herdr panes — via one reusable script, and read back only their compact result files. Supports per-subagent role (system-prompt append or replace), model and fallback models; detects and reports provider problems (rate limits, quota, unreachable LiteLLM, auth, unknown model) and fails over automatically. Use whenever you want to offload research, code investigation, builds/tests or fact gathering to child agents to keep your context lean, or run subtasks in parallel. Trigger on: subagents, delegate, spawn a child agent/pi, fan-out, parallel subtasks, 'open a herdr pane and run pi'. Self-contained: no need to read herdr/pi docs. Requires HERDR_ENV=1."
---

# Herdr Subagents

Everything goes through one script; do **not** hand-roll `herdr pane split` / `agent start` calls.

```bash
S=~/.agents/skills/herdr-subagents/scripts/subagents.mjs
```

It handles: Herdr check, unique names, pane placement (2×2 grid, new tabs on overflow), starting
`pi` with role/model, the subagent contract, sending the task, monitoring, provider-error detection
and model fallback, one nudge if the result file is missing, printing results with
model/time/tokens/cost, and closing finished panes.

## Usage

**One call (preferred): spawn → wait → print results → close.**

```bash
node $S run - <<'EOF'
{ "defaults": { "model": "github-copilot/claude-sonnet-5", "fallbackModels": ["litellm/<id>", "anthropic/claude-sonnet-5"], "timeout": 600000 },
  "agents": [
    { "name": "rxjs_usage", "task": "List every file under src/ importing rxjs; group by operator." },
    { "name": "test_fail", "role": "You are a meticulous QA engineer.", "task": "Run `npm test`; report only failing tests with error messages." },
    { "name": "lib_research", "model": "anthropic/claude-opus-5", "task": "How does lib X implement Y? 5 bullets." }
  ] }
EOF
```

Single agent without JSON: `node $S run --name find_foo --task "..." [--role "..."] [--model M] [--fallback M2,M3]`.

**Async (keep working while they run):** `node $S spawn -` (same JSON) → do other work →
`node $S wait [names...]`. Also: `node $S status` (live state incl. errors/retries),
`node $S health [--reset]`, `node $S close <names...>|--all`. Exit code: 0 all ok, 2 any problem.

Output per agent: `## <name> — ok (model, time, tokens, $cost)` followed by the result file content.
That is the only thing you need to read.

### Agent fields

| field | meaning |
|---|---|
| `task` | **required.** Self-contained instructions; the child has none of your context, so include paths, names and what output you want. |
| `name` | `[a-z][a-z0-9_-]`; auto-derived and auto-suffixed if taken. |
| `role` | Text, or a path to a file. Omitted → pi's default system prompt. |
| `mode` | `append` (default): role is appended to pi's default system prompt (keeps tool docs, rules, AGENTS.md, skills). `replace`: role becomes the whole base system prompt — cheaper per turn but no built-in tool guidance; use only for narrow, simple roles. |
| `model` | `provider/id` (optionally `:thinking`). Omitted → pi's default model. |
| `fallbackModels` | Ordered `provider/id` list tried when the current model fails at provider level. Prefer other providers (Copilot quota ≠ LiteLLM ≠ Anthropic). |
| `thinking` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. |
| `timeout` | ms per agent (default 900000). |
| `cwd` | Working dir (default: current). |
| `piArgs` | Extra pi CLI args, e.g. `["--tools","read,bash"]` for a read-only investigator. |

`defaults` apply to every agent; CLI flags (`--model`, `--timeout`, ...) act as defaults too.

Always appended (both modes): your global `APPEND_SYSTEM.md` and the **subagent contract** — do
only the task, no fabrication, never ask/wait for confirmation (report blockers instead), no
nested subagents, write compact findings to the result file.

## Layout (automatic)

- Max 4 panes per tab as a 2×2 grid: split right → split right column down → split left column down.
- Parent's tab is used only while it holds just the parent + our subagents (→ up to 3 subagents).
- Overflow goes to new background tabs `subagents`, `subagents 2`, … (4 each; the root pane is used).
- Freed slots are refilled; closing a tab's last pane closes the tab. Focus never moves.

## Provider problems (automatic)

pi itself retries transient errors (429 rate limit, 5xx, network) ~3× with backoff, and never
retries quota/billing. The script watches each subagent's session log and reacts:

1. **Preflight:** models not in `pi --list-models` are skipped (similar ids are suggested).
2. **Health memory:** a model that just failed is skipped for later agents while a fallback
   remains: quota 60 min, auth 30 min, unreachable 5 min, rate limit 3 min (`health` shows it).
3. **On failure** (pi gave up, or a non-retryable error) the error is classified, the pane closed
   and the agent restarted with the same task on the next `fallbackModels` entry.
4. **Reported to you** in the block: `problems: <model>: <class> "<msg>"` on success after
   failover, or `## name — FAILED <class>` with `error:` and `hint:` when nothing is left.

| class | typical cause | what to do |
|---|---|---|
| `quota_exceeded` | Copilot premium quota, LiteLLM budget, billing | other provider/model; same model won't recover soon |
| `rate_limited` | 429 still failing after pi's retries | retry later, fewer parallel agents on that provider, or other provider |
| `provider_unreachable` | LiteLLM server down, DNS/VPN/TLS, 5xx, timeouts | check server/VPN; use another provider |
| `auth_error` | missing/expired key or login | tell the user (`pi auth`, `/login`); don't guess |
| `model_unavailable` | unknown or disabled model | pick from `pi --list-models` |
| `context_overflow` | task too big | split the task or larger-context model |
| `provider_error` / `startup_failed` / `crashed` | other | read `error:`/last output |

Tell the user when a provider is failing (quota, unreachable LiteLLM, auth); don't silently
switch to costlier models they didn't list.

Other non-ok outcomes keep the pane open and show the last screen lines:
`BLOCKED` (dialog/approval: answer via `herdr agent prompt <name> "..."` or ask the user, then
`wait <name>`), `TIMEOUT` (`wait <name> --timeout MS` or `close <name>`), `FAILED no_result`.

## Rules

- Delegate only self-contained, bulky or parallelisable work; do trivial steps yourself.
- Prefer one `run` with all independent agents over several calls; dependent steps → sequential `run`s.
- Only close panes/agents this script created. Never close user panes, tabs or the Herdr server.
- Scratch files (prompts, results, sessions) live in `$TMPDIR/herdr-subagents/<ws>-<pane>/`
  (override: `HERDR_SUBAGENTS_DIR`). `scripts/session-stats.mjs <session.jsonl>` gives detailed stats.
