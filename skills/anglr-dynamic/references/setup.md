# Setup, provideDynamic and features

## Contents

1. Installation and dependencies
2. Project setup (tsconfig, loaders, assets, globals)
3. Application-level providers for editors
4. provideDynamic and scopes
5. Core features
6. Additional features
7. Package features
8. Main DI tokens

## 1. Installation and dependencies

```bash
npm install @anglr/dynamic
```

Installed with it: `@angular/{core,common,forms,cdk,material}`, `@anglr/common`, `@jscrpt/common`,
`@ng-dnd/core`, `react-dnd-html5-backend`, `angular2-hotkeys`, `monaco-editor`, `d3`, `lodash-es`, `rxjs`.

| Optional dependency | Needed by |
| --- | --- |
| `postcss`, `postcss-prefix-selector` | `@anglr/dynamic/css-components` |
| `handlebars` | `@anglr/dynamic/handlebars-components` |
| `@anglr/rest` | `@anglr/dynamic/rest-components` |
| `@tinymce/tinymce-angular`, `tinymce` | `@anglr/dynamic/tinymce-components` |
| `@anglr/grid` | `@anglr/dynamic/grid-components` |

## 2. Project setup

`tsconfig.json` → `compilerOptions` (decorators such as `@DynamicOutput()`, `@LayoutPropertyName()`
define accessors on the prototype):

```json
"experimentalDecorators": true,
"useDefineForClassFields": false
```

`angular.json` → `architect.build.options` (core imports `monaco-editor` with a `.ttf` font,
basic-components import `.monaco-type` typings):

```json
"loader":
{
    ".monaco-type": "text",
    ".ttf": "file"
}
```

- **Monaco assets** (code editors: code properties controls, `state`/`transformData` nodes): serve
  `node_modules/monaco-editor/min` as asset folder `monaco-editor` or provide `MONACO_EDITOR_RESOURCES_PATH`
  (default `'monaco-editor/vs'`). Pure runtime rendering doesn't need them.
- **TinyMCE assets** (only `tinymce-components`): served under the global `ngDynamicTinymcePath` (default `'tinymce'`).
- **Styles**: editors and built-in components need the library CSS (`styling.md`).
- **Build-time globals** (Angular build `define`):

| Global | Default | Effect |
| --- | --- | --- |
| `ngDesignerMetadata` | `true` | `false` turns editor metadata decorators (`@LayoutEditorMetadata`, `@RelationsEditorMetadata`, `@LayoutProperty*`) into no-ops for runtime-only builds (`@DescendantsGetter` stays) |
| `ngRelationsDebugger` | `true` | `false` skips relations debugger hooks |
| `ngDynamicTinymcePath` | `'tinymce'` | TinyMCE asset path |

## 3. Application-level providers for editors

Runtime rendering needs only `provideDynamic()`. Editors use services from `@anglr/common`:

| Provider | Needed for |
| --- | --- |
| `providePermanentStorage(LocalPermanentStorage)` (`@anglr/common`, `@anglr/common/store`) | layout editor (properties editor state, live events), `withPackageManager('NAME')` |
| `providePosition(FloatingUiDomPosition)` (`@anglr/common`, `@anglr/common/floating-ui`) | layout editor overlays/placeholders, relations debugger |
| `TitledDialogService` + `importProvidersFrom(MatDialogModule)` (`@anglr/common/material`) | relations node properties, code editor dialogs |
| `HotkeyModule.forRoot()` (`angular2-hotkeys`) + `AppHotkeysService` (`@anglr/common/hotkeys`) | `withEditorHotkeys()` |
| `importProvidersFrom(DndModule.forRoot({backend: HTML5Backend}))` (`@ng-dnd/core`, `react-dnd-html5-backend`) | layout editor drag & drop (can be on the editor route) |

## 4. provideDynamic and scopes

```ts
provideDynamic(coreFeatures: CoreDynamicFeature[]|CoreDynamicFeature, ...features: DynamicFeature[]): Provider[]
```

Returns `Provider[]` for component `providers` (recommended — one independent page per component),
route or application config. Core features decide what the scope does; features add providers per
scope type (`DynamicFeatureType`: `LayoutRuntime`, `RelationsRuntime`, `LayoutEditor`, `RelationsEditor`),
only parts relevant to enabled core features are used.

| Scope | Core feature | Typical features |
| --- | --- | --- |
| Render layout | `withLayoutRuntime()` | package features, `withLayoutMetadataStorage()` |
| Relations only (static components) | `withRelationsRuntime()` | package features |
| Layout with relations | `withLayoutRelationsRuntime()` | package features, both metadata storages, `withCustomComponents()`, `withCustomRelations()` |
| Layout editor | `withLayoutEditor()` | `withPackageManager()`, `withEditorHotkeys()`, `withLayoutDefaultsOverride()`, package features |
| Relations editor | `withRelationsEditor()` | `withPackageManager()` (required), `withStaticComponents()`, `withRelationsDefaultsOverride()`, package features |
| Relations editor for a layout | `withLayoutRelationsEditor()` | same as relations editor; `LayoutManager.setLayout(layout)` |

`DynamicFeature` = `new DynamicFeature({layoutRuntime?, layoutEditor?, relationsRuntime?, relationsEditor?})`,
each `{prependProviders: Provider[], providers: Provider[]}` (`FeatureProviders`; the whole object is
`TypedFeatureProviders`). `CoreDynamicFeature` = `new CoreDynamicFeature(type: DynamicFeatureType (bit flags),
featureProviders, ...using: CoreDynamicFeature[])` — `using` merges other core features
(e.g. layout editor uses layout runtime).

## 5. Core features

| Function | Entry point | Provides |
| --- | --- | --- |
| `withLayoutRuntime()` | `/layout` | layout loader + extractors, `LayoutRenderer`, default layout `MetadataStorage` |
| `withLayoutEditor()` | `/layout-editor` | layout runtime + editor renderer, palette loader, editor metadata extractors, `LayoutEditorMetadataManager`, non-persistent `PackageManager`, `LAYOUT_HISTORY_MANAGER`, `EDITOR_METADATA_MANAGER`, `LayoutComponentsIteratorService` |
| `withRelationsRuntime()` | `/relations` | relations loader, `RelationsManager`, `RelationsComponentManager`, `RelationsProcessor`, `RelationsChangeDetector`, `CodeExecutor` |
| `withRelationsEditor()` | `/relations-editor` | palette + node loaders, `RelationsNodeManager`, `ScopeRegister`, `RELATIONS_HISTORY_MANAGER`, `EDITOR_METADATA_MANAGER` |
| `withLayoutRelationsRuntime()` | `/layout-relations` | layout runtime + relations runtime (layout components register into relations) |
| `withLayoutRelationsEditor()` | `/layout-relations` | layout runtime + relations editor; relations-capable components of `LayoutManager.setLayout()` layout become nodes (package `layout-components`) |

## 6. Additional features

| Function | Entry point | Applies to | Description |
| --- | --- | --- | --- |
| `withPackageManager(storageName \| Type<PackageManager> \| factoryFn(() => …))` | core | editors | packages offered/used in palettes; a string persists the selection in `PERMANENT_STORAGE` |
| `withEditorHotkeys()` | core | editors | `EditorHotkeys`: `ctrl+s` (emits `save`), `ctrl+z`, `ctrl+y`, `del`, `ctrl+c/x/v` |
| `withLayoutMetadataStorage(Type)` | `/layout` | layout runtime | `MetadataStorage<LayoutComponentMetadata>` for `templateBlock`, custom components |
| `withRelationsMetadataStorage(Type)` | `/relations` | layout runtime part | `MetadataStorage<RelationsComponentMetadata[]>`; use with a core feature containing the layout runtime |
| `withLayoutDefaultsOverride(Type)` / `withRelationsDefaultsOverride(Type)` | `/layout-editor` / `/relations-editor` | editors | `DefaultsOverride` for dropped items |
| `withStaticComponents(Type<StaticComponentsRegister>)` | `/relations-editor` | relations editor | template components as nodes of `static-components` |
| `withCustomComponents(register?, ...refreshObservables)` | `/layout-relations` | layout runtime/editor, relations editor | stored layouts+relations as items of `custom-components` |
| `withCustomRelations(register?, ...refreshObservables)` | `/layout-relations` | relations runtime/editor | stored relations as nodes of `custom-relations` |
| `withFormControlBuilder()` | `/form` | layout runtime | `FormComponentControlBuilder` + `LayoutComponentsIteratorService` |
| `provideStaticPackageSource(name)` | core | editors | adds a package to the package manager (`PACKAGE_SOURCES`) |
| `provideRelationsDebugger()` + `provideRelationsDebuggerImplementation()` | `/relations`, `/relations-debugger` | relations runtime | experimental debugger (`editors.md`) |

`factoryFn(fn)` (core) marks a factory function for `withPackageManager`; `FactoryFn` is its class.

## 7. Package features

`withBasicComponents()`, `withFormComponents()`, `withMaterialComponents()`, `withCssComponents()`,
`withHandlebarsComponents()`, `withRestComponents()`, `withTinyMceComponents()`, `withMathComponents()`,
`withGridComponents()` — each registers one built-in package (package names: `basic-components`,
`form-components`, `material-components`, `css-components`, `handlebars-components`, `rest-components`,
`tinymce-components`, `math-components`, `grid-components`). Own packages: `own-package.md`.

## 8. Main DI tokens

| Token | Entry point | Description |
| --- | --- | --- |
| `EDITOR_METADATA_MANAGER` | core | `EditorMetadataManager.getMetadata()` – current editor metadata |
| `PACKAGE_SOURCES` | core | multi, `PackageSource`s |
| `SCOPE_ID` | core | id of current relations scope |
| `MONACO_EDITOR_RESOURCES_PATH` | core | default `'monaco-editor/vs'` |
| `LAYOUT_METADATA_STORAGE` | `/layout` | layout `MetadataStorage` |
| `LAYOUT_COMPONENT_CHILD_EXTENSIONS` | `/layout` | child extensions of the parent, provided by renderer |
| `LAYOUT_HISTORY_MANAGER`, `LAYOUT_DEFAULTS_OVERRIDE` | `/layout-editor` | editor history / defaults |
| `LAYOUT_EDITOR_PROPERTY_TYPE_CONTROLS` | `/layout-editor` | property type → control component dictionary (not multi) |
| `LAYOUT_EDITOR_PROPERTY_METADATA_PROPERTIES` | `/layout-editor` | symbols where property decorators store data |
| `REFRESH_PALETTE_OBSERVABLES` | `/layout-editor` **and** `/relations-editor` | two distinct multi tokens, one per palette |
| `DYNAMIC_BODY_CONTAINER` | `/layout-editor` | constant CSS selector `'div.dynamic-body-container'` of the element hosting editor overlays (not a token) |
| `RELATIONS_METADATA_STORAGE` | `/relations` | relations `MetadataStorage` |
| `RELATIONS_PROCESSOR_SKIP_INIT` | `/relations` | `true` → processor doesn't initialize relations on creation |
| `RELATIONS_DEBUGGER_TYPE` | `/relations` | debugger implementation type |
| `RELATIONS_HISTORY_MANAGER`, `RELATIONS_DEFAULTS_OVERRIDE` | `/relations-editor` | editor history / defaults (`INVALIDATE_DROP` is a string constant used for canvas invalidation) |
| `FORM_COMPONENT_CONTROL` | `/form` | parent form control for form fields |
| `BUTTONS_PRESETS` | `/basic-components` | `ButtonPreset[]` (`{text?, cssClass}`) offered in button properties |

Loader / module provider / extractor tokens are listed in `own-package.md` → Loading pipeline.
