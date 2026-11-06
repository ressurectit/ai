# RessurectIT readme skeleton

This is the house structure, distilled from the existing RessurectIT readmes.
Keep the order. Omit a section when it doesn't apply to the library (for
example, *Styling* for a library without styles, or *Plugins* when there's no
plugin system). Rename a section when a more specific name reads better (for
example, *Date Adapters*, or *Plugin types* instead of *Extensibility*). Split
large sections into `###` subsections.

## Contents

1. Badges
2. Title + intro
3. Table of contents
4. Resources
5. Installation
6. Quick Start
7. Features / Why use this library
8. Core concepts / Architecture
9. API sections
10. Extensibility
11. Styling
12. Samples
13. License

---

## 1. Badges

Use these first two lines. If the stub readme already has the badges, keep
them. They contain the correct AppVeyor project id, which you can't derive.
If the badges are missing, ask the user for the AppVeyor status id, or leave
out the build badge.

```markdown
[![npm version](https://badge.fury.io/js/%40anglr%2Fgrid.svg)](https://badge.fury.io/js/%40anglr%2Fgrid)
[![Build status](https://ci.appveyor.com/api/projects/status/<id>?svg=true)](https://ci.appveyor.com/project/kukjevov/<repo-name>)
```

The npm badge URL-encodes the package name: `@` becomes `%40` and `/`
becomes `%2F`.

## 2. Title + intro

```markdown
# Angular Grid (`@anglr/grid`)
```

Follow the title with 1–3 sentences on what the library is and its key idea
(for example, "fully plugin-based", "signal-driven" or "adapter-based").

If there are multiple entry points, add a table:

```markdown
| Entry point | Description |
| --- | --- |
| `@anglr/grid` | Core components, directives, plugins and interfaces |
| `@anglr/grid/extensions` | Helper actions that operate on a `Grid` instance |
```

Use the **import path** a consumer writes (for example,
`@anglr/select/extensions`), not the subpackage `package.json` name.

## 3. Table of contents

Make it a nested bullet list of anchor links covering every `##` heading and
the relevant `###` ones (including each sample).

## 4. Resources

Use the public demo site links:

```markdown
## Resources

- **API reference**: https://ressurectit.github.io/#/content/api/<repo>/<short>
- **API extensions reference**: https://ressurectit.github.io/#/content/api/<repo>-extensions/<short>-extensions
- **Live samples**: https://ressurectit.github.io/#/content/<short>#samples
```

Add one API link per entry point. If the stub readme already lists the links,
reuse them, since they're known to be correct.

## 5. Installation

````markdown
```bash
npm install @anglr/grid
```

**Peer dependencies**: `@angular/core`, `@angular/common`, `@anglr/common`, `@jscrpt/common`, `rxjs`, …
````

Take the peer dependencies from `package.json`. Mention optional peer
dependencies and what they enable. Add any extra setup, such as style imports
or `provide…()` functions in `app.config.ts`.

## 6. Quick Start

Give the smallest complete working example: imports, component and template.
A reader should be able to paste it and see the library work.

## 7. Features / Why use this library

Add a bullet list with a **bold lead** for each bullet. Cover the capabilities
the library offers and what sets it apart.

## 8. Core concepts / Architecture

Explain the mental model: the main building blocks, how they cooperate, the
lifecycle and the configuration model (options objects, DI tokens, defaults).
For plugin-based libraries, also explain the plugin types and their
lifecycle. Add a small diagram (ASCII) or a table if it helps.

## 9. API sections

Add one `##` per kind of public API that matters: *Components*,
*Directives*, *Pipes*, *Services*, *Validators*, *Decorators*, *Functions*,
*Extensions*, *Form Integration*, *Mixins* (for SCSS libraries), and so on.
For each item:

- the **selector** or signature
- a one-sentence description, taken from the doc-comment
- tables of inputs, outputs, properties and methods (`| Input | Type |
  Description |`)
- a short snippet for anything non-obvious

Document the public, useful surface. Skip internal helpers and the
lifecycle/contract methods that only implement an interface.

## 10. Extensibility

Include this section for any library with extension points. Cover:

- every extension point (plugin interfaces, abstract base classes, DI tokens,
  custom templates, actions/extension methods, adapters, theme hooks)
- how to register a custom implementation (globally via providers, or per
  instance via options)
- **one full worked example** of a custom implementation: an interface
  implementation, a component/class, registration and usage

## 11. Styling

Include this section only if the library ships styles. Cover:

- **setup**: SCSS `@use`/import and the theme include
- **themes**: the available themes
- **CSS custom properties**: a table of the important variables
- how to customise or build a theme, and how to override styles in a
  component

## 12. Samples

Give each sample its own `###` heading named after the **pattern** it
demonstrates, such as *Live Search*, *Custom data loader plugin* or *Reusable
base class for overview pages*. Never name a sample after a project or
business domain.

For each sample:

- write 1–3 sentences on what it demonstrates and when you'd use it
- give complete TypeScript with imports, plus the HTML template and SCSS when
  they matter
- keep only the minimal interesting piece and leave out unrelated services
  and CSS (say so briefly)

Put the most important samples first. For a strongly recommended pattern,
mark the heading with ⭐ and add a blockquote callout explaining the benefits.

## 13. License

```markdown
## License

MIT
```

Check the license against the `LICENSE` file.

---

Separate the major sections with `---` lines if the existing readme does
(both styles exist), and stay consistent within the file.
