---
name: anglr-dynamic
description: >-
  Builds metadata-driven Angular UIs with @anglr/dynamic v1.x — JSON layout trees
  (`LayoutComponentMetadata`) rendered by `*layoutComponentRenderer`, relations graphs
  (`RelationsComponentMetadata[]`, `RelationsManager.setRelations`) wiring `@DynamicOutput()`
  outputs to inputs, `provideDynamic(withLayoutRuntime() | withLayoutRelationsRuntime() |
  withLayoutEditor() | withRelationsEditor() …, withBasicComponents() …)`, built-in packages
  (basic, form, material, css, handlebars, rest, tinymce, math, grid), own packages of dynamic
  items (`LayoutComponentBase`, `@PureRelationsComponent`, `DynamicModuleProvider`,
  `DynamicFeature`), `<layout-editor>` / `<relations-editor>`, custom/static components, dynamic
  forms. Trigger for writing or fixing layout/relations JSON by hand, finding an item's options,
  children property or relations endpoints, page builders, JSON/server-driven UI, form builders,
  drag & drop designers or node editors in @anglr/* projects, even when @anglr/dynamic is not named.
metadata:
  package: "@anglr/dynamic"
  version: "1.1.0"
  repository: "https://github.com/ressurectit/ng-dynamic"
---

# @anglr/dynamic

> Created for **@anglr/dynamic v1.1.0**. APIs of other versions may differ — check the installed
> version (`node_modules/@anglr/dynamic/package.json`) and warn the user if it doesn't match.

## Contents

When to use what · Installation & setup · Entry points · Quick start · Writing metadata by hand ·
Key concepts · Pitfalls · Scripts · References · Links

Pages are plain JSON: a **layout** (tree of `{id, package, name, options}` nodes) and **relations**
(graph connecting outputs of components/nodes to inputs of others). Items come from lazily loaded
**packages**; editors produce the same JSON. Everything lives in a DI scope created by `provideDynamic()`.

## When to use what

| Need | Use | Details |
| --- | --- | --- |
| Render a stored/JSON page | `provideDynamic(withLayoutRuntime(), withBasicComponents())` + `*layoutComponentRenderer` | `references/setup.md` |
| Page with logic (show/hide, enable, compute, REST) | `withLayoutRelationsRuntime()` + `RelationsManager.setRelations()` | `references/relations-metadata.md` |
| **Write/fix layout JSON by hand** | options, children property, child-extension options per item | `references/layout-metadata.md` |
| **Write/fix relations JSON by hand** | ids, packages, endpoint names, `outputs: []`, scopes | `references/relations-metadata.md` |
| Options / children / endpoints of a built-in item | catalog or `scripts/dynamic-items.mjs` | `references/items-basic.md`, `references/items-forms-grid.md` |
| Own component / node / package | `LayoutComponentBase`, `@PureRelationsComponent`, `type.ts`, `with…()` feature | `references/own-package.md` |
| Drag & drop page designer / node editor | `<layout-editor>`, `<relations-editor>` | `references/editors.md` |
| Replace a built-in/own properties editor block | `{provide: ExistingControlComponent, useValue: MyControlComponent}` after `provideDynamic()` | `references/editors.md` → 7a |
| Form from metadata | `withFormComponents()`, `withFormControlBuilder()`, `FORM_COMPONENT_CONTROL` | `references/samples.md` |
| Reusable stored layouts | `templateBlock`, custom components, `MetadataStorage` | `references/samples.md` |
| Angular components in your template inside relations | static components | `references/samples.md` |
| Theme / CSS variables | `@anglr/dynamic/styles` | `references/styling.md` |
| Any other export (tokens, loaders, services) | API index | `references/api-index-core.md`, `references/api-index-packages.md` |

## Installation & setup

```bash
npm install @anglr/dynamic
```

Required build setup (details in `references/setup.md`): `tsconfig` `experimentalDecorators: true` and
`useDefineForClassFields: false`; `angular.json` loaders `".monaco-type": "text"`, `".ttf": "file"`.
Editors additionally need Monaco assets, `@anglr/common` providers (permanent storage, position,
`TitledDialogService`), `DndModule.forRoot({backend: HTML5Backend})` (+ `DndService` when not in root) and library CSS.
`ng serve` needs `"prebundle": false`, otherwise built-in items render as *not found*.
Optional deps per entry point: `postcss`+`postcss-prefix-selector` (css), `handlebars`,
`@anglr/rest` (rest), `tinymce`+`@tinymce/tinymce-angular`, `@anglr/grid` (grid).

## Entry points

| Import path | Contains |
| --- | --- |
| `@anglr/dynamic` | `provideDynamic`, features, loaders, `PackageManager`, `MetadataStorage`, history, hotkeys, code editor |
| `…/layout` · `…/layout-editor` | layout runtime (`*layoutComponentRenderer`, `LayoutComponentBase`) · `<layout-editor>`, editor metadata, property decorators |
| `…/relations` · `…/relations-editor` | relations runtime (`@DynamicOutput`, `RelationsManager`) · `<relations-editor>`, `RelationsNodeBase` |
| `…/layout-relations` | `withLayoutRelationsRuntime/Editor`, `LayoutManager`, custom components/relations |
| `…/relations-debugger` | experimental relations debugger |
| `…/basic-components`, `…/form`, `…/material-components`, `…/css-components`, `…/handlebars-components`, `…/rest-components`, `…/tinymce-components`, `…/math-components`, `…/grid-components` | built-in packages, `with…Components()` features, options interfaces |
| `…/styles`, `…/styles/themes/{dark,light}` | SCSS |

## Quick start

```ts
import {Component, ChangeDetectionStrategy, inject} from '@angular/core';
import {provideDynamic} from '@anglr/dynamic';
import {LayoutComponentMetadata, LayoutComponentRendererDirective} from '@anglr/dynamic/layout';
import {RelationsComponentMetadata, RelationsManager} from '@anglr/dynamic/relations';
import {withLayoutRelationsRuntime} from '@anglr/dynamic/layout-relations';
import {withBasicComponents} from '@anglr/dynamic/basic-components';

@Component(
{
    selector: 'dynamic-page',
    template: '<ng-container *layoutComponentRenderer="layout"/>',
    imports: [LayoutComponentRendererDirective],
    providers: [provideDynamic(withLayoutRelationsRuntime(), withBasicComponents())],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicPageComponent
{
    protected layout: LayoutComponentMetadata =
    {
        id: 'root', package: 'basic-components', name: 'stackPanel',
        options:
        {
            children:
            [
                {id: 'toggle', package: 'basic-components', name: 'toggleButton', options: {onText: 'Hide', offText: 'Show', state: false}},
                {id: 'details', package: 'basic-components', name: 'ifBlock', options: {condition: false, content: {id: 'text', package: 'basic-components', name: 'textBlock', options: {text: 'Details'}}}},
            ],
        },
    };

    constructor()
    {
        const relations: RelationsComponentMetadata[] =
        [
            {id: 'toggle', package: 'layout-components', name: 'toggle', relationsOptions: null, outputs: [{outputName: 'toggle', inputs: [{id: 'details', inputName: 'condition'}]}]},
            {id: 'details', package: 'layout-components', name: 'details', relationsOptions: null, outputs: []},
        ];

        inject(RelationsManager).setRelations(relations);
    }
}
```

## Writing metadata by hand (summary)

1. **Pick items** — `package` + `name` from the catalog (`references/items-*.md`) or run
   `node <skill>/scripts/dynamic-items.mjs node_modules/@anglr/dynamic --brief` (and on the project's own package folder).
2. **Options** — keys of the item's `*ComponentOptions` interface + `ComponentStylingExtension` keys
   (`cssClass`, `margin`, `padding`, `textStyling`) + child-extension keys of the **parent** (`flex` under `stackPanel`).
3. **Children** — never a generic `children`: the property is whatever the item's `@DescendantsGetter`
   returns (`children[]`, `content`, `template`, `areas[]`, `tabs[].content`, `columns`, `plugin`, …).
4. **Relations** — one entry per participant, layout components as `{id: <layoutId>, package: 'layout-components', name: <layoutId>}`,
   edges on the source (`outputs[].inputs[] = {id, inputName}`), **always `outputs: []`** even without edges.
5. **Validate** — `node <skill>/scripts/check-metadata.mjs --layout l.json --relations r.json --items node_modules/@anglr/dynamic [--items src/app/<ownPackage>]`.

## Key concepts

- **Scope**: each `provideDynamic()` (usually in a component's `providers`) is an independent page; renderer, relations processor and editors live there, not in root.
- **Core feature + features**: one core feature decides runtime/editor; package features (`withBasicComponents()`) contribute only the parts that scope needs, so the same list works for runtime and editors.
- **Item kinds**: layout component, layout + relations component (has `RelationsRegistrationExtension`), pure relations node (non-visual, created from relations metadata), static component (your template component registering itself).
- **Rendered components are detached** from change detection — call `invalidateVisuals()` after own state changes.
- **Relations transfer** on assignment of `@DynamicOutput()` properties, batched and async by default; equal values are skipped, so assign new object/array instances.

## Pitfalls

- Relations entry without `outputs` is ignored by the runtime → always `outputs: []` (the editor writes it too).
- Layout components in relations use package `'layout-components'` and `name === id` (the layout id), never their real package.
- Only items with `RelationsRegistrationExtension` (catalog: *layout + relations*) can be relations endpoints; `textBlock`, `stackPanel` can't.
- `logicalAnd` needs both `cond1` and `cond2` connected (they default to `false`); `firstNonNull` picks the first *truthy* value.
- `withRelationsMetadataStorage()` only applies with a core feature containing the layout runtime; relations editor scopes always need `withPackageManager()`.
- `DynamicModule` is the type of a lazily loaded ES module, not an NgModule — there is no `forRoot()`; setup is `provideDynamic()`. There is no generic `children` option and no `(output)` binding syntax in metadata.
- Use plain properties (not signals) for relations inputs/outputs; keep `useDefineForClassFields: false`.
- Relations debugger shows nothing unless the build `define` sets `ngRelationsDebugger: true` (default `false`).

## Scripts

- `scripts/dynamic-items.mjs <root> [--brief|--json] [--package p] [--item n]` — lists items under a folder (installed package, library repo or own package): package, kind, options interfaces, children getter, child extensions, relations inputs/outputs, editor defaults.
- `scripts/check-metadata.mjs --layout … --relations … [--items …]` — validates hand-written JSON.

## References

Each file starts with its own Contents list; read only what the task needs.

- `references/layout-metadata.md` — layout JSON rules, finding children/options properties, styling, scopes, recipes.
- `references/relations-metadata.md` — relations JSON rules, node packages, endpoint lookup, dynamic endpoints, scopes, propagation, custom components/relations.
- `references/items-basic.md` — catalog: basic, css, handlebars, rest, tinymce, math, custom-components items.
- `references/items-forms-grid.md` — catalog: form, material, grid items (+ data table structure).
- `references/setup.md` — project setup, `provideDynamic`, all features, tokens, build globals.
- `references/own-package.md` — own items/packages: layout, layout+relations, pure node, files, providers, feature.
- `references/editors.md` — layout/relations editors, properties editor (decorators, controls, types), defaults, history, hotkeys, package manager, debugger.
- `references/samples.md` — forms, metadata storage/`templateBlock`, custom components, static components.
- `references/styling.md` — SCSS mixins, themes, `--dynamic-*` variables.
- `references/api-index-core.md` — every export of core, layout, form, relations, layout-editor (+ schematics note).
- `references/api-index-packages.md` — every export of layout-relations, relations-editor, relations-debugger and built-in packages.

## Links

- Readme: https://github.com/ressurectit/ng-dynamic · API docs and demo: https://ressurectit.github.io
