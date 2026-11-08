---
name: ressurectit-skill-creator
description: >-
  Create or update an agent skill that teaches AI agents how to consume one
  RessurectIT npm package (`@anglr/*`, `@jscrpt/*`, `@css-styles/*`; repos like
  ng-grid, ng-select, ng-common, jscrpt-common, ng-animations). Wraps the
  generic skill-creator with RessurectIT context: the skill is pinned to one
  package version (usually the latest release), built from the package's
  readme.md and source code, covers every public feature, and keeps SKILL.md
  small with details in references/scripts/assets. Use this whenever the user
  asks to create, generate, write, refresh, update or bump a skill for a
  RessurectIT / `@anglr` / `@jscrpt` / `@css-styles` package or library repo,
  or says an existing package skill (anglr-grid, anglr-select, css-styles, …)
  is outdated or should target a new version — even if they only say "make a
  skill for ng-select" or "teach agents how to use this library".
---

# RessurectIT package skill creator

Produce a skill that lets an agent **use a RessurectIT package correctly and
completely**: know every feature, pick the right building block, configure it,
extend it — for **one specific package version**.

This skill is a layer on top of **skill-creator**. Load skill-creator's
`SKILL.md` first (it's in the available skills list) and follow its guidance
on intent capture, description writing, progressive disclosure and testing.
Skip its python tooling (eval viewer, benchmark aggregation, packaging,
description optimizer) unless the user explicitly asks for it.
This file only adds what is specific to RessurectIT package skills.

## Contents

- Non-negotiables
- Workflow: 1 locate · 2 research · 3 write · 4 verify · 5 test · 6 report
- Files: `references/research.md`, `references/update-mode.md`,
  `assets/package-skill-template.md`, `scripts/package-api.mjs` (self-test:
  `node --test scripts/package-api.test.mjs` — run it after changing the script)

## Non-negotiables (and why)

1. **One version per skill.** APIs change between majors; a skill mixing
   versions makes agents write code that doesn't compile. Record the version
   in frontmatter `metadata` and in a visible line under the title (see
   `assets/package-skill-template.md`). Never write version history
   ("since", "previously", "new in") — the skill describes that version only.
2. **Sources: readme.md first, source code as truth.** The readme gives the
   concepts, intended usage and validated samples. The source decides what
   actually exists. When they disagree, the source wins; note readme drift in
   the final report.
3. **Complete coverage.** The agent should not discover a feature only by
   reading `node_modules`. Every public export of every entry point is either
   documented somewhere in the skill or deliberately skipped as internal.
   `scripts/package-api.mjs coverage` checks this.
4. **Lean SKILL.md, ToC first.** The generated `SKILL.md` is a router: what the package
   is, when to use which part, install, one quick start, key decisions, and
   pointers. Everything else (option tables, plugin catalogs, samples, styling,
   extensibility) goes to `references/*.md`; reusable boilerplate to
   `assets/`; deterministic helpers to `scripts/`. Aim for ≲200 lines in
   `SKILL.md`; split a reference by area once it grows past ~500 lines
   (e.g. `samples-forms.md`, `samples-remote.md`) — plan the split upfront
   when you can see it coming, one `##` heading per sample/topic. **Every
   markdown file (SKILL.md included) starts with a `## Contents` list** as its
   first `##` section (a 1–3 line intro before it is fine; in `SKILL.md` an
   inline one-line list saves lines), so an agent sees the structure first and
   jumps straight to what it needs instead of reading everything. Every
   bundled file must be linked from `SKILL.md`. Apply the same rules to this
   skill when you edit it.
5. **No leaks.** Content from consumer projects must be anonymised exactly as
   in readme-generator's "Obfuscation" rules (neutral names, no project
   names/paths/URLs).

## Workflow

### 1. Locate package, version and output

```bash
node <this-skill>/scripts/package-api.mjs info <package-repo>
```

Gives name, resolved version (RessurectIT repos keep `0.0.0-placeholder` in
`package.json`; the real version comes from the latest `v*` git tag, then the
changelog top entry), npm `latest` (set `SKIP_NPM=1` when offline),
dependencies, entry points, presence of readme/changelog/styles/demo.
`entryPointsForManualReview` lists entry points without `.ts` sources (e.g.
plain JS) and `stylesExports` the SCSS entry points — both are invisible to
the export inventory, so research and document them by hand.

- Target version = latest released version unless the user says otherwise.
  If `notes` report HEAD past the tag, look at `changedSinceTag`: docs-only
  changes (readme, changelog) are fine to use together with the tagged
  source; source changes, unreleased changelog entries or an npm mismatch →
  tell the user and ask which state to document.
- **Always ask where to write the skill** (the user wants to decide each
  time). Suggest `<ai-repo>/skills/<skill-name>` if an ai/skills repo is known.
- Skill name: scope + package without `@`, joined by `-`: `@anglr/grid` →
  `anglr-grid`, `@jscrpt/common` → `jscrpt-common`. A family of packages
  documented together keeps its family name (`@css-styles/*` → `css-styles`).
- If a skill already exists there → **update mode**: read
  `references/update-mode.md` and follow it instead of steps 2–4.

### 2. Research

Read `references/research.md` and follow it. Output: a feature inventory
(every concept, building block, option, extension point, entry point) with
the source file for each, plus candidate samples (readme first).

### 3. Write the skill

Copy `assets/package-skill-template.md` to `<skill-dir>/SKILL.md` and fill
it in. Typical layout:

```
<skill-name>/
├── SKILL.md            router: when-to-use table, install, quick start, pointers
├── references/         one file per natural area (components, directives, plugins,
│                       providers-and-tokens, extensions, styling, extensibility,
│                       samples); each starts with `## Contents`
├── assets/             optional boilerplate agents copy (custom plugin skeleton, theme override)
└── scripts/            optional deterministic helpers
```

Write the description the skill-creator way (pushy, trigger words,
alternatives it should win over) and include the version major in it.
Keep it under the 1024-character frontmatter limit — name the main building
blocks, not every option.

Samples: prefer readme samples verbatim (they're meant to be compile-validated
by readme-generator, but not all are — when feasible, type-check TypeScript
samples with strict `tsc` against the package's `src` and `node_modules`).
Compiling isn't the same as behaving correctly, though: if
a readme sample contradicts the source, fix it and mark it
"(adapted from readme)", and report the readme bug. For anything new, check
every identifier, selector, input and option against the source. Anonymise
domain or non-English names taken from `demo/` too. Follow the house code
style (4-space indent, Allman braces, standalone + OnPush, `inject()`,
signals).

Names agents commonly guess wrong (exports removed in an earlier major,
names of similar libraries) belong in a "Pitfalls" list phrased as current
facts ("there is no `NgSelectModule`; import `SelectModule`"), not as
history.

### 4. Verify

```bash
node <this-skill>/scripts/package-api.mjs coverage <package-repo> <skill-dir>
```

For each `MISSING` export: document it in the right reference, or consciously
skip it (internal base classes, render-only helper components, re-exported
internals). A directive/component/pipe also counts when a selector part or
pipe name *unique to it* appears (shared and generic names like `formControl`,
`ngModel`, `input` never count); those are listed as `via selector` —
spot-check that each is really described, not just mentioned in passing.
The `skill checks` part of the output flags a missing
`metadata.version`, a description over 1024 chars, `SKILL.md` over 200 lines,
files without a Contents list, references that should be split, broken
pointers and bundled files referenced from nowhere — fix all of them.

Coverage only proves a name is *mentioned*, not that what's said is true.
Spot-check the key claims (defaults, what an attribute/option really does,
the prose around samples) against the implementation, including component
`.html` templates. Then re-read `SKILL.md` as an agent that has never seen
the package: can it pick the right API for a typical task and find the
details within one hop? The script only sees TypeScript exports, so verify
SCSS mixins/variables/CSS custom properties from `styles/` manually.

### 5. Test (lightweight by default)

Offer one trial: a realistic consumer prompt ("add a select with live search
bound to a reactive form…") run with the new skill via a subagent; review the
produced code together. More prompts or the full skill-creator eval loop only
if the user asks.

### 6. Report

- package, documented version and how it was resolved
- skill path and file list with line counts
- coverage numbers per entry point and the list of deliberately skipped exports
- readme ↔ source discrepancies found (stale docs, undocumented features)
- open questions / places where samples are thin
