# Research: building the feature inventory

Goal: know **everything** the package offers in the target version, before
writing a line of the skill. Work through the steps in order; write findings
into a scratch inventory (in memory or a temp file outside the skill).

## Contents

1. Make sure you read the right version
2. readme.md (primary narrative source)
3. Public API (source of truth)
4. Reconcile
5. Shape the inventory for writing

## 1. Make sure you read the right version

If HEAD is not at the target tag, read sources from the tag without touching
the working tree:

```bash
git -C <repo> show v<version>:readme.md
git -C <repo> show v<version>:src/index.ts
git -C <repo> worktree add /tmp/<pkg>-v<version> v<version>   # for bigger reads; ask before removing it later
```

Run `package-api.mjs inventory` against that checkout.

## 2. readme.md (primary narrative source)

Read it fully. Extract:

- one-paragraph *what is it* and the core concept / mental model
- features list, entry points table, installation and peer dependencies
- every code sample, with the pattern it demonstrates
- extensibility section (plugins, DI tokens, abstract classes, templates)
- styling / theming section (SCSS entry, CSS variables, mixins)
- links (live docs, API docs, samples on ressurectit.github.io)

The readme is maintained by readme-generator, so samples are compile-checked
and anonymised — reuse them verbatim where possible.

## 3. Public API (source of truth)

```bash
node <skill>/scripts/package-api.mjs inventory <repo>
```

Lists every export per entry point, grouped by kind. Then read the source of
the important ones — not just names. Read `.ts`, `.html` and `.scss` only;
repos often contain stale build output (`*.d.ts`, `*.js`, `*.map`) next to
sources — exclude it from greps (`rg -g '!*.d.ts' -g '!*.map' -g '!*.js'`).

- **Components / directives / pipes** — selector, `exportAs`, inputs (incl.
  signal `input()`/`model()`), outputs, host bindings, content/template
  directives they expect, doc-comments.
- **Component templates (`.html`)** — much real behaviour lives there
  (which option flags are actually read, what's rendered when, CSS/icon
  classes). An option declared in an interface but never read is a finding.
- **Options / config interfaces** — every property, its type, and its
  **default value** (search for `defaultOptions`, `DEFAULT_*`, `provide*`).
- **DI** — `InjectionToken`s and `provide…()` functions: what can be
  configured app-wide vs per instance, and the merge order. Grep who
  actually injects each token; a token nobody injects is a no-op.
- **Plugin / strategy interfaces and built-in implementations** — which slot,
  default, alternatives, how to write a custom one.
- **Functions / actions / operators / decorators** — signature, purpose,
  typical call site.
- **Enums and types** — values agents will need in code.
- **Deprecated APIs** — note them as "don't use, use X instead" (no history).

Also check:

- `package.json` dependencies/peer/optional deps, and each sub-entry's
  `package.json`.
- `styles/` (SCSS entry points, mixins, CSS variables, themes) — and what the
  styles assume from outside: CSS variables from other packages (e.g.
  `--size-*` from `@css-styles/common`), icon fonts (Font Awesome classes),
  global resets. These become "required setup" in the skill.
- `changelog.md` — the latest major's entries highlight the concepts that
  matter now and BREAKING changes agents might trip over (describe the current
  state only).
- `demo/` in the repo — extra realistic usage. Demo code may use domain or
  non-English names; rename them neutrally when you reuse it.

## 4. Reconcile

For every readme statement, confirm it in source. Record:

- readme mentions something that no longer exists → don't document; report
- source exports something the readme doesn't mention → document from source
  (doc-comments + implementation); report as readme gap
- internals exported only for technical reasons (base classes used by built-in
  plugins, render helper components) → may be skipped; list them in the report

## 5. Shape the inventory for writing

Group the features into the areas that will become reference files, and
decide for each:

- how an agent recognises it needs this feature (user intent → API) — this
  feeds the *When to use* table and the description
- the minimal correct usage, and the main options
- pitfalls (required providers, imports, signal vs observable, ordering of
  plugins, SSR/browser-only parts)

Ask the user for a consumer project only if samples for an important feature
are missing from the readme, demo and site samples; anonymise anything taken
from it.
