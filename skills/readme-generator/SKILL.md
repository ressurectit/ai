---
name: readme-generator
description: >-
  Create or update the `readme.md` of a RessurectIT library project (npm
  packages such as `@anglr/*`, `@jscrpt/*`, `@css-styles/*`, repos like
  ng-select, ng-grid, ng-common, jscrpt-common). Writes a full, general-purpose
  library README — overview, installation, quick start, API/concepts, features,
  extensibility, styling and samples — from the library's source code and from
  usage samples, with any consumer-project specifics obfuscated. In update mode
  it finds when the readme was last updated, reads the changelog since that
  revision, and brings the readme up to the library's current state. Use this
  whenever the user asks to write, generate, create, refresh, update, extend or
  "add samples to" a readme / README / documentation for a RessurectIT or
  `@anglr` project, or says the readme is outdated / missing — even if they
  don't say "readme" explicitly (e.g. "document this library", "docs for the
  new version").
---

# Readme Generator (RessurectIT libraries)

Write a `readme.md` that tells a developer **what the library is, what it
offers, how to use it and how to extend it** — describing only the library's
**current** state.

Three principles override everything else:

1. **The readme is general — never leak consumer projects.** Samples often come
   from real applications. Anything that identifies such a project must be
   obfuscated (see "Obfuscation"). The reader must not be able to tell where a
   sample came from.
2. **The readme describes the current version only.** It isn't a changelog. No
   "new in 12.0", "previously", "since version" or version-history notes. A
   removed or renamed API disappears from the readme or is shown under its new
   name.
3. **Ground every statement in code.** Read the real source (exports,
   doc-comments, options interfaces, default values) before describing
   anything. Every code snippet must compile against the current public API.
   Don't invent inputs, options or behavior.

## 0. Detect the mode

Find the readme in the repo root (`readme.md`; also check `README.md`).

- **Create mode**: the readme is missing, or it's only a stub (badges, title,
  a few API/sample links, one-line description — no real documentation; e.g.
  under ~40 lines with no usage sections). Follow "Create workflow".
- **Update mode**: the readme already documents the library. Follow "Update
  workflow".

If unsure, tell the user what you found and ask.

## Sample sources

The readme should be rich in realistic samples. Allowed sources:

1. **The project's own `demo/` folder** (if present). Use it freely. Look at
   `demo/app/**` for components that use the library.
2. **ressurectit.github.io demo-site samples.** Use them freely. They're often
   not in the library repo. If you can't find them at an obvious location, ask
   the user for the local path to the site sources, or skip them.
3. **Consumer projects the user points you to.** Use only projects the user
   explicitly names or gives a path to. Never go searching the disk for other
   repositories that use the library. All of their content must be obfuscated.

In **create mode**, if the user didn't name any consumer project, **ask for
one or more** ("Do you have a project that uses this library that I can take
inspiration from? A path is enough."). Mention that anything taken from it
will be anonymised. If they have none, continue with `demo/` and site samples.

## Obfuscation (applies to every sample and every sentence)

Readers must see only the library's public API plus neutral, generic
application code. When taking anything from a consumer project (and when in
doubt, from any source):

- **Rename domain-specific identifiers** — components, services, models,
  fields, routes, methods — to neutral English names that describe the *role*,
  not the business: `ContractOverviewComponent` → `ItemsOverviewComponent`,
  `getInvoices()` → `getItems()`, `customerName` → `name`. Translate
  non-English identifiers to generic English. Keep names consistent within
  one sample.
- **Remove** project/product/company/customer names, internal package scopes
  that aren't public RessurectIT packages, file-system paths (`d:\git\…`,
  `/home/…`), internal URLs, API endpoints, hosts, ticket numbers, author
  names and project-specific comments.
- **Strip business logic** unrelated to the library. Keep the minimal code
  that shows the usage pattern, and replace the rest with simple placeholders
  (`items`, `DataService`, `Item`).
- **Never write where a sample came from.** Avoid "taken from a real
  application", "used in project X" or "from our app". Phrase it as "A
  common pattern is…" or "An application can…".
- The library's own public API, its RessurectIT dependencies (`@anglr/*`,
  `@jscrpt/*`, `@css-styles/*`), public demo-site links and Angular/npm
  packages are fine. They're what's being documented.

Before writing the file, **scan your draft for leaks**. Grep it for every
consumer-project name, path fragment, distinctive identifier and non-English
word you saw while reading the sources. Fix every hit.

## Create workflow

### 1. Understand the library

- `package.json` (name, description, peer dependencies with versions,
  `exports` → entry points / subpackages), and each subpackage's
  `package.json` (directories other than `src` such as `extensions/`,
  `material/`, `forms/`).
- `src/index.ts` and the public exports of every entry point. Read the
  important classes/components/directives/interfaces and their doc-comments.
- Options/config interfaces and their defaults, DI tokens and `provide…()`
  functions. They show what's configurable and extensible.
- `styles/` (themes, CSS variables, mixins) if present.
- The existing changelog, which helps you find the important concepts.

Build a mental model: the core concept, the main building blocks, how they
fit together, the extension points (plugins, DI tokens, abstract classes,
interfaces to implement, custom templates, actions/extension methods) and
what's swappable.

### 2. Collect samples

Gather candidates from the sources above. For each candidate, note the
feature or pattern it demonstrates. Try to document **all** distinct patterns
you find. Drop duplicates that show the same pattern twice.

If there are many candidates (roughly more than 8–10), or you can't tell
which matter most, **show the user a short numbered list** (pattern name +
one line about what it shows, already in obfuscated wording) and ask which
are the most important or relevant. Put the important ones first and give
them more explanation. Mark one that you'd strongly recommend with ⭐ and a
short callout explaining why.

### 3. Write the readme

Follow the skeleton in `references/readme-skeleton.md`. Read it now. It's
the house structure used by existing RessurectIT readmes. Keep the order, and
omit sections that don't apply.

Emphasise three things, because they're what readers come for:

- **Features** — what the library offers, as a scannable list or table.
- **Extensibility** — every extension point, how it's plugged in (DI token,
  options, inheritance, template), and a full worked example of a custom
  implementation.
- **Samples** — complete, copy-pasteable snippets (imports included) with a
  sentence or two explaining what each one demonstrates and why you'd use it.

### 4. Review (see "Quality bar"), then write the file and report.

## Update workflow

### 1. Find the last readme update

```bash
git log -1 --format='%H %ad %s' --date=short -- readme.md   # last commit touching readme
git describe --tags --abbrev=0 <hash>                       # version at that time (may fail if no tag)
git status --short readme.md changelog.md                   # uncommitted edits count too
```

Use the readme's actual file name (`readme.md` or `README.md`) and the
project's changelog name in these commands.

Tell the user: "readme was last updated in `<hash>` on `<date>` (around
version `<tag>`)".

### 2. Collect what changed since then

```bash
git diff <hash> -- changelog.md          # changelog entries added since (incl. uncommitted)
git diff <hash> --stat -- . ':!demo'     # which source areas changed
```

The changelog diff is the primary source. Read the new entries (Bug Fixes,
Features, BREAKING CHANGES, subpackages). For each relevant item, read the
current source to understand it.

### 3. Map each change onto the readme

- **New API / feature** → document it in the right section (API tables,
  concepts, extensibility, styling…), and add or extend a sample if it
  changes how people use the library.
- **Updated API** (new options, properties, behavior) → update the existing
  tables, descriptions and samples in place.
- **Breaking: removed / renamed / changed signature** → remove or rewrite
  every mention, **including inside code samples**. Grep the readme for each
  old name.
- **Breaking: dependency versions** → update the Installation / peer
  dependency info.
- **Bug fixes** → usually no change, unless the readme described the old
  (buggy) behavior.
- **New entry point / subpackage** → add it to the entry-point table, the
  Resources/API links and the TOC.

Write the result as if the readme had always described this state. Don't add
version notes, "new" badges or migration history.

Also do a quick **staleness sweep**. Check that the symbols used in existing
samples and tables still exist in the current source, since older drift may
have been missed. While sweeping, also look for **existing leaks**: local
paths, mentions of where samples came from, and domain-specific or
non-English identifiers in samples. Obfuscate them the same way.

### 4. Ask for samples for bigger features

If a change is a **bigger feature** (a new component, plugin type, entry
point, extension mechanism or significant new usage pattern), a reference
table isn't enough. Ask the user whether they have a project or code showing
it in use, and take samples from it (check `demo/` and the site samples too).
The same obfuscation rules apply.

### 5. Edit, review, report

Use `edit` for targeted changes and keep untouched sections as they are.
Update the TOC when you add, rename or remove headings. Run the "Quality bar"
check, then report.

## Style conventions

- Match the existing readme's code style. Typical RessurectIT TypeScript uses
  4-space indents, the Allman brace style, a `@Component(` decorator with its
  object on the next line, `imports:` arrays on separate lines,
  `ChangeDetectionStrategy.OnPush`, `inject()`, signals, standalone
  components and `//######################### … #########################`
  member-section comments in longer samples.
- Put code symbols in backticks and conceptual terms in *italics*. Use
  **bold** for key ideas.
- Use tables for inputs/outputs/properties/methods/options (`| Name | Type |
  Description |`) and for entry points.
- Prefer short explanatory paragraphs before code over long prose after it.
- Use relative anchors in the TOC (`#quick-start`) and GitHub-style slugs.

## Quality bar

Before finishing, re-read the readme as a newcomer and as an existing user:

- Does it explain what the library is, its features, how to install and
  start, and how to extend it?
- Is every snippet valid against the **current** source (imports, names,
  selectors, option shapes)?
- Is there no version history ("new in", "since", "previously",
  "deprecated in vX")?
- **Leak check passed?** No consumer project names, paths, URLs, domain
  identifiers, non-English business terms or "from a real app" phrasing.
- Do the TOC and headings match? Are the links (badges, API, live samples)
  correct for this package?
- Have all found sample patterns been documented, or deliberately skipped
  with the user's agreement?

Then report:

- the mode used
- for update mode, the baseline revision and the changelog range covered
- the sections added or changed
- any places where you'd like more samples from the user
