---
name: herdr-subagents
description: "Complete, self-contained playbook for delegating work to subagents by spawning Herdr panes that each run a `pi` instance. Use this whenever you (the parent agent) want to offload one or more focused subtasks — research, file/code investigation, running a build or tests, gathering facts — to a child agent so you can keep your own context lean and only absorb the compact findings. Trigger whenever the user or your plan mentions subagents, delegating, spawning a child agent/pi, running subtasks in parallel, 'open a herdr pane and run pi', fan-out research, or offloading investigation. You do NOT need to read the herdr or pi skills/docs first — everything required is here. Requires HERDR_ENV=1."
---

# Herdr Subagents

This skill lets you (the **parent** agent) delegate **subtasks** to **subagents**. Each
subagent is a fresh `pi` instance running inside its own Herdr pane. The subagent does one
narrow task, writes a **compact result file**, and you read only that file. This keeps your
own context small: you never have to see the subagent's step-by-step work, only its findings.

You already have everything you need below. You do **not** need to read the `herdr` or `pi`
skills or any other documentation to run this workflow.

## When to use this

Use a subagent when a subtask is **self-contained** and its intermediate steps are noise you
don't want in your context — for example:

- "Find every place `FooService` is used and summarize the call sites."
- "Read these 8 files and tell me which ones import `rxjs`."
- "Run the test suite and report only failures."
- "Research how library X does Y and give me a 5-bullet summary."

Prefer doing trivial one-step things yourself. Delegate when the investigation is bulky, or
when several independent subtasks can run in parallel.

## Prerequisite check

Before anything, confirm you are inside a Herdr-managed pane:

```bash
test "${HERDR_ENV:-}" = 1 && echo "in herdr" || echo "NOT in herdr"
```

If this is not `in herdr`, stop and tell the user you cannot spawn subagents because you are
not running inside Herdr. Do not attempt the rest of the workflow.

Capture your own context once (you'll reuse these):

```bash
printf 'WS=%s\nTAB=%s\nPANE=%s\nCWD=%s\n' \
  "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID" "$PWD"
```

`$HERDR_PANE_ID` is **your** pane (the parent). `$PWD` is the working directory subagents
should inherit unless the user says otherwise.

## The core loop (one subagent)

Do these steps for each subtask. Concrete, copy-pasteable commands follow.

1. Pick a **safe unique name** for the subagent (see naming rules).
2. Decide the result file path: `.herdr-subagents/<name>.result.md`.
3. **Split** a sibling pane (background, keep your own focus).
4. **Rename** the new pane so the user can see what it's for.
5. **Start** a `pi` agent in that pane.
6. **Prompt** the agent with the subtask + the strict subagent contract, and `--wait`.
7. **Verify** the agent finished cleanly (idle, not blocked) and the result file exists.
8. **Read** the compact result file — this is the only output you keep.
9. **Close** the pane (this also ends that `pi` instance).

### Names: rules that avoid errors

The agent name must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents. Derive it
from the subtask, e.g. subtask "find rxjs imports" → `find_rxjs_imports`. Keep it short. If a
name might already be live, append a short suffix (`_2`, a timestamp fragment). Bad names are
rejected before anything runs.

### Step-by-step commands

Set up once per batch of subagents:

```bash
mkdir -p .herdr-subagents
```

For a subtask (example name `find_rxjs`):

```bash
# 3. Split a SIBLING pane. Split "right" if your pane is wide, "down" if it's tall/narrow.
#    --no-focus keeps the user looking at YOUR pane. --cwd preserves the working directory.
PANE_JSON=$(herdr pane split --current --direction right --cwd "$PWD" --no-focus)
CHILD_PANE=$(printf '%s' "$PANE_JSON" | grep -o '"pane_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "child pane: $CHILD_PANE"

# 4. Rename the pane so it's obvious what this subagent is doing.
herdr pane rename "$CHILD_PANE" "subagent: find rxjs imports"

# 5. Start a pi agent in that pane. The name (find_rxjs) becomes the agent handle.
herdr agent start find_rxjs --kind pi --pane "$CHILD_PANE" --timeout 60000
```

Choosing split direction: if your pane is wide (many columns) split `--direction right`; if
it's tall or narrow, split `--direction down`. Avoid repeatedly splitting the same direction,
which creates unusably thin panes. You can check with `herdr pane layout --current` and look
at the `width`/`height` of your pane.

**Split for a balanced layout.** When you spawn several subagents, aim for panes of *equal*
size rather than a lopsided patchwork. Grow the layout in even steps: first split into
**halves**, then split those halves into **quarters** (a 2×2 grid of squares), then quarters
into **eighths**. Fill a level completely before starting the next one. Concretely, for N
subagents, jump to the smallest even level that fits them all and make every pane that size:
2 → halves, 3–4 → quarters, 5–8 → eighths. A layout of one half + one quarter + two eighths
is a **bad** split — those four subagents should each get an equal **quarter** instead.
Alternate split directions (`right` then `down`) as you subdivide so the cells stay square-ish
rather than thin strips.

`agent start` returns only once Herdr sees `pi` ready for input (`"interactive_ready":true`,
`"agent_status":"idle"`). If it returns `agent_not_ready`, the child is briefly blocked at
startup; wait a moment and continue — the name still works for prompting.

### The subagent prompt: the contract that keeps children honest

The child `pi` is smart but must stay strictly on task. Always wrap the subtask in this
contract. Fill in `<SUBTASK>` and keep the name/path consistent with the pane you started.

```bash
herdr agent prompt find_rxjs "You are a focused subagent spawned by a parent agent. Follow these rules strictly:
- Do ONLY the task below. Do not explore, refactor, or fix anything else. Do not start unrelated work.
- Do NOT fabricate or guess. If something cannot be determined, say so plainly.
- Base every statement on what you actually observed (files read, commands run, their real output).
- When done, write ONLY your compact final findings to the file .herdr-subagents/find_rxjs.result.md. 'Compact' means the conclusions and the specific facts the parent needs (paths, names, numbers, short lists) — NOT a narrative of your steps.
- After writing that file, reply with just the file path and nothing else.

TASK: <SUBTASK>" --wait --timeout 600000
```

Notes on this call:

- `--wait` blocks until the agent settles at `idle`, `done`, or `blocked`. When it returns
  `idle`/`done`, the child's turn is finished and the result file is written.
- Pick `--timeout` (milliseconds) to fit the task: a quick lookup 120000 (2 min); heavy
  research or a build/test run 600000 (10 min) or more. If the timeout is hit, the command
  returns without the agent necessarily being done — check state before reading (below).
- If the child hits an approval/question dialog it becomes `blocked`. `--wait` returns and you
  must inspect it rather than assume success (see Troubleshooting).

### Verify, then read the result

```bash
# Confirm the agent ended idle (finished) and not blocked/working.
herdr agent get find_rxjs | grep -o '"agent_status":"[^"]*"' | head -1

# Read the compact findings — this is the ONLY thing you keep in your context.
cat .herdr-subagents/find_rxjs.result.md
```

If `agent_status` is `idle` (or `done`) and the file exists with real content, you have your
result. If the file is missing or empty, see Troubleshooting before closing.

### Close the pane (cleanup)

```bash
herdr pane close "$CHILD_PANE"
```

Closing the pane ends that `pi` instance and removes the pane from the user's view. Do this as
soon as you have the result, so panes don't pile up. Only close panes **you** created.

After you've collected results from a batch, you may remove the scratch files:

```bash
rm -f .herdr-subagents/find_rxjs.result.md   # or clean the whole dir when the batch is done
```

## Running multiple subagents

Decide based on whether the subtasks depend on each other.

### Parallel (independent subtasks) — fan out, then collect

Independent subtasks should run at the same time so total wall-clock time is short. Spawn every
pane and start every agent **first** (these calls return quickly), then send each prompt with
`--wait`, then collect.

```bash
mkdir -p .herdr-subagents

# --- Spawn + start all children (fast, non-blocking work) ---
for name in scan_imports scan_tests scan_styles; do
  pj=$(herdr pane split --current --direction right --cwd "$PWD" --no-focus)
  cp=$(printf '%s' "$pj" | grep -o '"pane_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  herdr pane rename "$cp" "subagent: $name"
  herdr agent start "$name" --kind pi --pane "$cp" --timeout 60000
  eval "PANE_$name=$cp"    # remember each pane id
done
```

Then prompt each one. Because `agent prompt --wait` blocks, sending them in sequence still lets
the earlier ones keep working while you wait on the next — but for true parallelism, send the
prompts **without** `--wait` first, then wait on each afterward:

```bash
# Send all prompts (no --wait) so all children work concurrently.
herdr agent prompt scan_imports "<contract + TASK, result path .herdr-subagents/scan_imports.result.md>"
herdr agent prompt scan_tests   "<contract + TASK, result path .herdr-subagents/scan_tests.result.md>"
herdr agent prompt scan_styles  "<contract + TASK, result path .herdr-subagents/scan_styles.result.md>"

# Now wait for each to settle, then read + close.
for name in scan_imports scan_tests scan_styles; do
  herdr agent wait "$name" --timeout 600000
  cat ".herdr-subagents/$name.result.md"
  eval "cp=\$PANE_$name"
  herdr pane close "$cp"
done
```

`herdr agent wait <name>` (without `--until`) settles on `idle`/`done`/`blocked`, same as
`prompt --wait`. Watch pane geometry: keep the panes **evenly sized** (halves → quarters →
eighths, filling each level before the next) rather than a lopsided mix like a half plus a
quarter plus two eighths. Alternate `--direction right`/`down` as you subdivide so cells stay
square-ish. If you need more than ~4 at once, run in smaller waves rather than slicing off
ever-thinner strips.

### Sequential (dependent subtasks)

When a later subtask needs an earlier one's result (or you want to keep the layout simple), run
the full core loop for one subagent, read its result, close its pane, then start the next. This
is slower but easy to reason about and keeps only one extra pane open at a time.

## What you (the parent) do with results

You continue your own work using only the compact findings. You do not need to know how the
subagent obtained them. Summarize or act on the result directly. If a result reveals the
subtask was under-specified, you can spawn a follow-up subagent with a sharper task rather than
re-reading everything yourself.

## Troubleshooting

**Result file missing or empty after `--wait` returned.** Check the agent state and, only as a
fallback, read the pane buffer to see what happened:

```bash
herdr agent get find_rxjs | grep -o '"agent_status":"[^"]*"'
herdr agent read find_rxjs --source recent-unwrapped --lines 120
```

`pi` renders on the terminal's alternate screen, so pane reads may be truncated or empty — this
is exactly why the file-based contract exists. If the child simply forgot the file, re-prompt
it: `herdr agent prompt find_rxjs "Write your findings to .herdr-subagents/find_rxjs.result.md now, then reply with the path only." --wait --timeout 120000`.

**Agent came back `blocked`.** It hit an approval or question dialog. Inspect it:

```bash
herdr agent read find_rxjs --source recent-unwrapped --lines 80
```

Decide what's appropriate. You can send a key (`herdr agent send-keys find_rxjs esc`) to
dismiss, or answer via `herdr agent prompt`. If it's a permission you shouldn't grant on the
user's behalf, surface it to the user instead of guessing.

**`agent_prompt_stalled`.** The prompt produced no observed lifecycle change within a few
seconds. Usually the agent wasn't actually idle yet. Wait briefly and re-check
`herdr agent get`, then re-prompt.

**Name rejected / already in use.** Pick a new name matching `[a-z][a-z0-9_-]{0,31}` and unique
among `herdr agent list`.

**Pane got too narrow.** Split future children `--direction down`, or run in smaller waves.

## Safety rules

- Only close panes and agents **you** created for subtasks. Never close the user's panes,
  tabs, or workspaces, and never stop the Herdr server.
- Always use `--no-focus` so the user keeps looking at your pane, not the background workers.
- Always preserve the working directory with `--cwd "$PWD"` unless the user asked otherwise.
- Read pane/agent IDs from the JSON the commands return — do not guess them.
- Keep subagents on-task: the contract forbids them from wandering, fabricating, or doing
  unrelated work. That constraint is what makes their compact results trustworthy.
