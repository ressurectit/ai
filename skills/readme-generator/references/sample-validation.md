# Sample validation in universal-demo

Every code sample in the readme must compile and work against the library's
**current source**. These samples are also the input for skills that teach
agents how to consume the package, so a broken or invented sample spreads
further than the readme. To prevent that, every sample is first implemented as
a runnable page in a green-field app,
[universal-demo](https://github.com/kukjevov/ng-universal-demo.git). It must
pass a strict production build and be approved by the user before it's copied
into the readme.

## Contents

1. What gets validated
2. Set up the worktree
3. Implement the samples as pages
4. Build and fix
5. User review
6. Copy into the readme
7. Re-validate after changes
8. Cleanup

---

## 1. What gets validated

Validate **all** TypeScript, HTML template and SCSS code blocks in the readme:
the Quick Start, API snippets, the extensibility example and every sample. In
update mode this includes the samples that were already in the readme.
Validate them all, not only the new ones, because older ones may have drifted.

Not validated:

- `bash` install commands
- pure type/signature listings that only restate the API (for example, an
  interface copied from the `.d.ts`). Check those against the source instead.

A readme block may be a **fragment** (only the template, or only the
`provideX()` call). That's fine, but the fragment must be a **verbatim
excerpt** of a validated demo file. Don't write a fragment that has no
compiled counterpart.

## 2. Set up the worktree

Run the bundled script from the library repo:

```bash
<skill-dir>/scripts/setup-demo-worktree.sh <library-repo-path>
```

The script:

- looks for a clone of `ng-universal-demo` among the **siblings** of the
  library repo, and clones it as `../universal-demo` when none exists
- creates (or reuses) a **separate worktree**
  `../universal-demo-readme-<slug>` on branch `readme-samples/<slug>` from
  origin's default branch, so the user's own demo checkout is never touched
- runs `npm ci` in the worktree when `node_modules` is missing
- builds the library from its current source (`npm run bundle`, or `build`),
  packs it with `npm pack` and installs the tarball into the worktree with
  `--no-save --legacy-peer-deps`. The packed version is
  `0.0.0-placeholder`, so the peer-range check has to be relaxed.

It prints `DEMO_WORKTREE=…`, `DEMO_BRANCH=…` and `LIB_SLUG=…`. Use these
values below. Use `--dry-run` to see what it would do. The first run takes a
few minutes (cloning and `npm ci`), so tell the user before starting it.

If the library build fails, stop and report it. A readme can't be validated
against a library that doesn't build.

## 3. Implement the samples as pages

Before writing anything, read the worktree's existing conventions:
`app/boot/app.component.routes.ts`, the lazy-component pages
`app/pages/notFound/` and `app/pages/accessDenied/` (`*.route.ts` plus
`*.component.ts`), and `app/modules/menu/components/mainMenu/`. Follow the
same patterns. Samples use **lazy component routing** (`loadComponent`), not
lazy modules or route decorators:

- each page has a `<name>.route.ts` exporting a `Route` with
  `loadComponent: () => import('./<name>.component')`
- the component is a standalone `export default class` with **no** routing
  or authorization decorators
- names are camelCase, like the existing pages (`accessDenied`, `notFound`)

Layout:

```
app/pages/samples/<slug>/
├── samples.routes.ts               # parent Route 'samples/<slug>' with children = all routes below
├── index/                          # landing page listing all samples with links
│   ├── index.route.ts              # path: ''
│   └── index.component.ts|html
├── <sampleName>/                   # one folder per readme sample (camelCase of heading)
│   ├── <sampleName>.route.ts       # path: '<sampleName>', loadComponent
│   ├── <sampleName>.component.ts   # export default class
│   ├── <sampleName>.component.html   (when the readme shows a template)
│   └── <sampleName>.component.scss   (when the readme shows styles)
└── readme-samples.json             # mapping, see below
```

`samples.routes.ts` looks like this:

```typescript
import {Route} from '@angular/router';

import {indexRoute} from './index/index.route';
import {customDataLoaderRoute} from './customDataLoader/customDataLoader.route';

/**
 * Routes for readme samples of @anglr/grid
 */
export const samplesAnglrGridRoute: Route =
{
    path: 'samples/anglr-grid',
    children:
    [
        indexRoute,
        customDataLoaderRoute,
    ],
};
```

- Register the parent route in `app.component.routes.ts` next to
  `accessDeniedRoute`. It must come **before** `notFoundRoute`, because that
  one is the `**` catch-all.
- Add one menu link to `samples/<slug>` in the main menu.
- Each sample page route is `samples/<slug>/<sampleName>`.
- **One folder per readme sample.** Put the code that appears in the readme
  into these files exactly as it will appear. Keep demo-only scaffolding
  (the `.route.ts` file, the `default` export, a heading, mock data) clearly
  separated so it's easy to leave out or adjust when copying. For example,
  keep mock data in a `<sampleName>.data.ts` file. In the readme, show the
  component as a named `export class`.
- Supporting code a sample needs (a custom plugin class, a service, an
  `app.config` provider) goes into the sample's folder as its own file. Put
  providers on the sample component or on its route (`providers`), not into
  the global `app.config.ts`, so samples stay isolated.
- Use **mock data**, not real HTTP endpoints. Use an in-memory
  `Observable`/`signal` or a small local service, so every page renders
  without a backend.
- Apply the readme's **obfuscation rules** to the demo code too. The branch
  may be pushed or shared.
- The same house style applies (Allman braces, 4-space indents, `inject()`,
  signals, OnPush, standalone).

`readme-samples.json` maps the readme to the code. It makes update mode and
re-validation cheap:

```json
{
    "library": "@anglr/grid",
    "readme": "../ng-grid/readme.md",
    "samples":
    [
        {
            "heading": "Custom data loader plugin",
            "route": "samples/anglr-grid/customDataLoader",
            "files": ["customDataLoader/customDataLoader.component.ts", "customDataLoader/myDataLoader.ts"]
        }
    ]
}
```

## 4. Build and fix

From the worktree, run:

```bash
npm run build 2>&1 | tail -n 80
```

The build uses `strictTemplates`, `noUnusedLocals` and extended diagnostics
treated as errors. That's intentional: a sample that only compiles in a lax
setup isn't good enough. Fix every error and warning that comes from sample
code, then rebuild until it's clean. When a sample can't be made to compile
against the public API, that's a finding. Either the sample was wrong (fix
or drop it), or the library is missing an export (tell the user, and don't
paper over it with deep imports from `src/` paths).

If the demo itself fails to build **before** you add anything (an upstream
issue), report that to the user instead of fixing the demo.

## 5. User review

Once the build is clean, hand it to the user:

- the worktree path and the start command: `cd <worktree> && npm start`
  (dev server plus mock server). Mention that the main menu may only show
  after logging in, and that the sample URLs work directly.
- a numbered list of samples, each with its URL
  (`http://localhost:<port>/samples/<slug>/<sampleName>`) and the readme
  heading it belongs to

Ask whether they're satisfied with each sample, or what to change. Apply the
feedback in the demo, rebuild, and repeat until they approve. Don't write the
samples into the readme before approval. Rewriting the readme after every
review round wastes time.

## 6. Copy into the readme

Copy each approved sample from its demo files into the readme:

- Copy verbatim, leaving out only the demo scaffolding (`.route.ts` files,
  the `default` export → named `export class`, mock-data files, page
  headings). If you leave out a meaningful part, say so
  in the text (for example, "`ItemsService` returns an `Observable<Item[]>`").
  Don't use `...` inside code that a reader would copy.
- Import paths must be the **public package paths** (`@anglr/grid`,
  `@anglr/grid/extensions`), exactly as in the demo files. Relative imports
  stay relative only for files that are also shown.
- Keep the explanation sentences from the readme workflow. A sample without
  context is much less useful for a later consumer skill.

## 7. Re-validate after changes

If the library source changes during the work, re-run the setup script. It
reuses the worktree and only rebuilds and reinstalls the library. Then
rebuild the demo.

In update mode, when a `readme-samples/<slug>` branch already exists from an
earlier run, the script reuses it. Read `readme-samples.json` to find the
existing sample pages, update them for the changes, and add pages for any
readme samples that are missing.

## 8. Cleanup

After the readme is written, **offer** cleanup and wait for an explicit
answer. Never remove anything without confirmation:

```bash
git -C <demo-repo> worktree remove <worktree>       # removes the worktree directory
git -C <demo-repo> branch -D readme-samples/<slug>   # only if the user doesn't want to keep the branch
```

Mention that keeping the branch makes the next update run faster, because
the existing pages are reused. The packed tarball in `/tmp/readme-samples-*`
can go too, also with confirmation. The library's build output (from `npm run
bundle`) is git-ignored. Mention that `npm run clean` in the library removes
it, if the user wants that.
