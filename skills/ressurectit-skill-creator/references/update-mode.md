# Update mode: retarget an existing package skill to a new version

The skill always describes exactly one version, so updating means rewriting it
in place for the new version (git history keeps the old one).

## Contents

1. Find the baseline
2. Collect what changed
3. Apply changes
4. Re-verify and bump

## 1. Find the baseline

- Read `metadata.version` from the existing skill's frontmatter (fallback: the
  "Created for … vX" line; if neither exists, treat the skill as unversioned
  and ask the user which version it was written for, or do a full re-research).
- Resolve the target version with `package-api.mjs info`.
- If they're equal, ask whether the user wants a quality pass instead (coverage
  check + restructure) — then skip to step 4.

## 2. Collect what changed

```bash
git -C <repo> diff v<old>..v<new> -- changelog.md readme.md
git -C <repo> diff v<old>..v<new> --stat -- . ':!demo'
```

The changelog is the primary list. Read the current source for each relevant
entry. Also diff the export inventories:

```bash
git -C <repo> worktree add /tmp/<pkg>-v<old> v<old>
node <skill>/scripts/package-api.mjs inventory /tmp/<pkg>-v<old> --json > /tmp/old.json
node <skill>/scripts/package-api.mjs inventory <repo> --json > /tmp/new.json
```

Compare the symbol lists (added / removed per entry point). Ask before removing
the temporary worktree.

## 3. Apply changes

- new API / feature → document in the right reference; add to *When to use*
  and description triggers if it's user-facing
- changed options / signatures / defaults → update tables and samples in place
- removed / renamed → grep the whole skill for the old name (samples
  included) and remove or rewrite
- dependency bumps → installation / peer dependency info
- new entry point → entry-point table + new reference file if needed

Write as if the skill had always described the new version — no "new in",
"changed in", "previously".

## 4. Re-verify and bump

- update `metadata.version`, the "Created for" line and the version major in
  the description
- run `package-api.mjs coverage` and fix gaps
- check `SKILL.md` is still lean; move grown sections to references
- report as in the main workflow, plus the changelog range covered
