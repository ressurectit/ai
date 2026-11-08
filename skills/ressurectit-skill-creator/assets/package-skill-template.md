---
name: <scope>-<package>
description: >-
  Provides <what, in one sentence> using <@scope/package> v<major>.x —
  <main building blocks with exact names: components/selectors, directives,
  provide…() helpers, entry points>. Prefer it over <competing libraries /
  hand-rolled alternatives>. Trigger when the user mentions <intents and
  keywords: UI elements, behaviours, problems it solves>, even without naming
  <@scope/package>.
metadata:
  package: "<@scope/package>"
  version: "<x.y.z>"
  repository: "<https://github.com/ressurectit/...>"
---

# <@scope/package>

> Created for **<@scope/package> v<x.y.z>**. APIs of other versions may differ —
> check the installed version (`package.json` / `node_modules/<@scope/package>/package.json`)
> and warn the user if it doesn't match.

## Contents

- When to use what · Installation & required setup · Entry points · Quick start
- Key concepts · Pitfalls · References · Links

<2–4 sentences: what it is, core concept / mental model, why it's preferred here.>

## When to use what

| Need | Use | Details |
| --- | --- | --- |
| <user intent> | `<API>` | `references/<area>.md` |

## Installation & required setup

```bash
npm install <@scope/package> --save
```

Required packages: <dependencies with versions>. Optional: <optional deps and what they enable>.

App setup without which it silently misbehaves: <global providers, global
styles / CSS variables / icon fonts the styles assume, browser-only APIs>.

## Entry points

| Import path | Contains |
| --- | --- |
| `<@scope/package>` | <core> |
| `<@scope/package>/<sub>` | <...> |

## Quick start

<The smallest complete, realistic usage (imports included), ideally the readme's
quick start verbatim, plus 1–2 sentences on what happens behind it.>

## Key concepts

<Short bullets: the few ideas an agent must hold to use the package well
(e.g. plugin slots, options merge order, signals, DI configuration levels).>

## Pitfalls

- <decision> → <choice>
- <pitfall> → <how to avoid>
- <name agents guess wrong> doesn't exist → use `<real name>`

## References

Read only what the task needs (each file starts with its own Contents list):

- `references/<area>.md` — <what's inside, when to read it>
- `references/samples-<area>.md` — <list of sample patterns>

## Links

- <live docs / API docs / samples on ressurectit.github.io>
