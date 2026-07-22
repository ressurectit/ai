---
name: changelog-generator
description: >-
  Generate a changelog entry from the currently staged changes in a git
  repository (`git diff --staged`) and write it into the project's changelog
  file, following a fixed entry format. Use this whenever the user asks to
  "generate a changelog", "write a changelog entry", "update the changelog",
  "add release notes", or otherwise wants to turn the current staged /
  working-directory state into changelog content — even if they don't name the
  file explicitly. Built for npm library projects that maintain a hand-written
  changelog and publish to a registry.
---

# Changelog Generator

Turn the changes a developer has **staged** for their next commit into a clean,
human-readable changelog entry, written in the fixed format specified below.

A changelog is read by humans deciding whether to upgrade, so it must describe
*what changed on the public API and why it matters to a consumer of the
library* — never a line-by-line restatement of the diff.

Two principles override everything else:

1. **The format is fixed — it's specified in this document.** Don't re-derive it
   from the file on each run. Follow the "Entry format" section below. The only
   thing to copy from the target file is its mechanical whitespace and line
   endings (see step 7).
2. **Only staged changes count.** Unstaged edits are intentionally ignored so
   the entry matches exactly the commit the user is about to make.

## Workflow

Do these in order — each step feeds the next.

### 1. Read the staged changes

```bash
git diff --staged            # the actual changes (source of truth)
git diff --staged --stat     # quick map of which files/dirs changed
```

If `git diff --staged` is empty, stop and tell the user there's nothing staged —
there's no meaningful entry to write. Suggest they `git add` what they want
documented.

### 2. Identify the important changes

Only changes to the **public API** belong in a changelog. Include:

- **new public API** — exported classes, directives, pipes, components,
  interfaces, enums, functions, constants, decorators, providers, options, and
  **styles / CSS variables**.
- **bug fixes** — corrected behavior on that public surface (including missing
  or broken styles).
- **breaking changes** — anything forcing a consumer to change code or
  environment (removed/renamed exports, changed signatures, raised minimum
  versions of dependencies).

Leave out internal refactors, tests, formatting, and build churn unless they
change observable behavior. Padding the entry with internal noise makes it
useless.

Read the actual source for each staged symbol to get its correct kind and its
doc-comment — don't invent descriptions.

Assign each change a **severity**, which maps to a section: **Bug Fixes**,
**Features**, or **BREAKING CHANGES**.

### 3. Compute the version and date

The version is derived from git, not from `package.json`:

- **major.minor** comes from the **current branch name** (branches are named
  `major.minor`, e.g. `17.1`).
- **patch** comes from the **latest git tag**:
  - If the latest tag's `major.minor` **matches** the branch, increment its
    patch. (branch `17.0`, last tag `17.0.2` → **17.0.3**)
  - Otherwise the patch resets to `0`. (branch `17.0`, last tag `16.0.x` →
    **17.0.0**; branch `17.1`, last tag `17.0.1` → **17.1.0**)

```bash
git rev-parse --abbrev-ref HEAD          # branch → major.minor
git tag --sort=-v:refname | head -1      # latest tag (may have a leading "v")
date +%F                                 # today's date (YYYY-MM-DD)
```

Strip any leading `v` from the tag.

**Confirm the computed version with the user before writing**, e.g. "Branch is
`17.1` and the latest tag is `v17.0.1`, so the new version is `17.1.0` dated
`2026-07-22`. Good?" The maintainer may know release context the git state can't
reveal, so let them override.

### 4. Build the entry — see "Entry format" below.

### 5. Write it into the changelog

Find the changelog (this project: `changelog.md`; other common names:
`CHANGELOG.md`, `CHANGELOG`, `HISTORY.md`).

**First check whether the computed version already has an entry** (a heading like
`## Version 17.1.0 (...)`). This happens when the version was drafted earlier but
not yet released/tagged, and the user is regenerating after staging more changes.

- **If the version already exists → merge** the new changes into that existing
  entry instead of adding a second heading:
  - Keep the existing heading. Update its date to today only if the date format
    tracks the release day (ask if unsure).
  - Add each new bullet into the matching section (`Bug Fixes` / `Features` /
    `BREAKING CHANGES`), creating the section if the entry didn't have it yet,
    and keeping the section order (Bug Fixes → Features → BREAKING CHANGES).
  - Respect the same within-section ordering (`new` before `updated`, `src`
    before subpackages, dependency changes first in breaking). Insert new bullets
    into their correct position among the existing ones, and place subpackage
    bullets under the existing `- subpackage \`@scope/name\`` header if one is
    already there rather than adding a duplicate header.
  - **Don't duplicate** a change that's already listed. If a bullet describes the
    same symbol/change that already exists, update it in place rather than adding
    a near-duplicate.
- **If the version does not exist → insert** the new entry at the **top** of the
  entry list (most-recent-first), directly above the previous latest entry.

Use `edit` so the rest of the file is untouched.

Match the file's mechanical whitespace exactly: this project indents nested
bullets with **3 spaces** for the first level and **6 spaces** for the second,
and uses **CRLF** line endings. Preserve them; don't reformat older entries.

If there is **no** changelog file, create one titled `# Changelog` and add this
entry as the first one.

---

## Entry format

### Release heading

```
## Version <major>.<minor>.<patch> (<YYYY-MM-DD>)
```

### Sections and their order

Emit only the sections that have content, always in this order:

1. `### Bug Fixes`
2. `### Features`
3. `### BREAKING CHANGES`

### Ordering within a section

- **Features:** list `new` (added code) first, then `updated` (updated code).
- **BREAKING CHANGES:** lead with **dependency changes** (raised minimum
  versions, new/removed/optional/peer dependencies), then **removed** code, then
  **renamed / changed** code.
- **Every section:** list `src` changes first. Then, for each **subpackage** —
  a directory other than `src` that has its own `package.json` (e.g.
  `extensions/`) — append its changes after the `src` ones, introduced by a
  bullet and nested **one indent level deeper**:

  ```
  - subpackage `@scope/name`
     - <the subpackage's change bullets go here>
  ```

  Use the subpackage's **import subpath** — how a consumer imports it — which
  is not always the raw `package.json` `name`. For example the package whose
  `name` is `@anglr/select-extensions` is imported (and referenced in the
  changelog) as `@anglr/select/extensions`. Prefer the subpath export /
  import path over the bare `name` field, and match how earlier entries wrote
  it.

### Change bullet shape

Every code bullet follows: **keyword → item → kind → [description] → nested
detail**.

1. **keyword** — `new`, `updated`, `removed`, or `fixed`.
2. **item** — the symbol, in backticks: `` `HighlightInstance` ``.
3. **kind** — what it is. May be multi-word: `directive`, `component`,
   `plugin component`, `class`, `interface`, `enum`, `pipe`, `function`,
   `type`, `constant`, `decorator`, `provider function`, `extension method`,
   `module`.
4. **description** — only for `new` items: a short phrase on the **same line**,
   copied from the item's doc-comment (`, that manages highlighting for popup`).
5. **nested detail** (indented) grouped under these labels as applicable:
   - `**inherits**`, `**extends**`, `**implements**`
   - `**properties**`, `**methods**`, `**values**` (enum members)
   - `**new properties**`, `**removed properties**` (on an `updated` item)

   Under each label, list every relevant member. For a method or property, copy
   its doc-comment as the description, **lower-casing the first letter**.
   - For `removed` items, a nested `use \`X\` instead` may point to the
     replacement.
   - For an `updated` item that was renamed, add nested detail `renamed to
     \`X\``.

### Backticks vs. italics

- **Code symbols** (types, members, dependency names, CSS variables) → backticks.
- **Conceptual, non-code terms** → *italics*: e.g. *normal state*, *popup*,
  *live search*, *safe* accessors.

### Styles / CSS variables

Style changes are ordinary bullets. Examples:

- Feature: `updated styles for popup search highlighting, two new css variables
  \`--select-popup-option-searchHighlight-textDecoration\`,
  \`--select-popup-option-searchHighlight-textShadow\``
- Bug fix: `fixed missing styles for styling *normal state* and corresponding
  css variables`

### Breaking-change dependency phrasings

Use these established patterns:

- `minimal supported version of \`Node\` is \`22\` (recommended version is \`26\`)`
- `minimal supported version of \`@angular\` is \`22.0.4\``
- `new dependency \`lodash-es\` minimal supported version is \`4.18.1\``
- `removed dependency on \`@angular/material\``

Free-form breaking bullets are fine too (e.g. `strict null checks`).

---

## Worked examples

**New item with nested detail (Features):**

```markdown
- new `HighlightInstance` directive, that manages highlighting for popup
   - **implements**
      - `OnDestroy`
   - **properties**
      - `searchQuery` signal that represents current search query
      - `enabled` indication whether highlighting is enabled or not
   - **methods**
      - `registerHighlightRanges` registers ranges for highlighting
      - `unregisterHighlightRanges` unregisters ranges from highlighting
```

**Updated item + subpackage (Features):**

```markdown
- updated `PopupOptions` interface
   - **new properties**
      - `searchHighlighting` indication whether is highlighting enabled for popup
- subpackage `@anglr/select/extensions`
   - new `getSearch` extension method, that gets current search value of Select
```

**Breaking changes (dependencies first, then removed, then renamed):**

```markdown
- minimal supported version of `Node` is `22` (recommended version is `26`)
- minimal supported version of `@angular` is `22.0.4`
- removed `SelectHasValuePipe` pipe
- removed `NgSelectEditModule` module
   - use `SelectEdit` directive instead
- updated `NgSelectModule`
   - renamed to `SelectModule`
```

---

## Quality bar

Re-read the finished entry as a developer deciding whether to upgrade:

- Does every bullet describe an observable, public-API change (no internal
  churn, no raw diff)?
- Sections ordered Bug Fixes → Features → BREAKING CHANGES; `new` before
  `updated`; `src` before subpackages; dependency changes leading the breaking
  section?
- Each bullet follows keyword → item → kind → nested detail, with doc-comments
  copied (first letter lower-cased in nested detail)?
- Code in backticks, concepts in italics, indentation and line endings matching
  the file?

Then report the version chosen and a one-line summary of what you added.
