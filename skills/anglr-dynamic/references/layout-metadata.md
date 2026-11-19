# Writing layout metadata by hand

How to assemble `LayoutComponentMetadata` JSON that renders correctly and stays editable in
`<layout-editor>`, and how to find every property name an item accepts.

## Contents

1. Node shape
2. Ids, displayName, scope
3. Finding the options of an item
4. Finding where children live (descendants)
5. Styling and child-extension options
6. Scoped containers (listBlock, dataTable)
7. Layouts loaded by id (templateBlock, custom components)
8. Recipes
9. Checklist

## 1. Node shape

```ts
interface LayoutComponentMetadata<TOptions = any>     // @anglr/dynamic/layout
{
    id: string;                 // unique within the rendered layout (also the relations id)
    package: string;            // e.g. 'basic-components', 'my-components', 'custom-components'
    name: string;               // item name inside package, e.g. 'stackPanel'
    displayName?: string;       // label shown in editors (component tree, relations nodes)
    scope?: string|null;        // relations scope id (see 6)
    options: TOptions|undefined|null;   // item options + extension options + children
}
```

The root is a single node (usually a container such as `stackPanel`). The whole tree is one
object — children are nested inside `options` of their parent.

## 2. Ids, displayName, scope

- `id`: any unique string; the editor generates `<name>-<random>` (e.g. `stackPanel-a1b2c3d4e5`),
  following that convention keeps hand-written and edited metadata consistent. Use readable ids
  (`button-save`) — relations reference them.
- Ids must be unique across the whole rendered layout, including content of nested containers.
  A `templateBlock` / custom component renders a *separate* layout, so its inner ids only need to be
  unique inside that stored layout.
- `displayName` is optional, editors fall back to `name`/`id`.
- `scope` is only needed for scoped containers and their descendants (section 6).

## 3. Finding the options of an item

`options` is the item's **options interface** (`<Name>ComponentOptions`, file `<name>.options.ts`),
available at runtime as `this.options` of the component. Where to look:

| Source | Where |
| --- | --- |
| Built-in items | `references/items-basic.md`, `references/items-forms-grid.md` |
| Installed package (exact version) | `node <skill>/scripts/dynamic-items.mjs node_modules/@anglr/dynamic --item <name>` |
| Manually in `node_modules` | `node_modules/@anglr/dynamic/<entry>/src/dynamicItems/<name>/<name>.options.d.ts` (`<entry>` = `basic-components`, `form`, `material-components`, `grid-components`, …; core form base classes in `form/src/misc/*.options.d.ts`) |
| Own package in the project | `<package folder>/dynamicItems/<name>/<name>.options.ts`, or run `dynamic-items.mjs <package folder>` |
| Options also exported by the entry point | `import {StackPanelComponentOptions} from '@anglr/dynamic/basic-components'` — type the JSON with it |

Type hand-written metadata, the compiler then checks the keys:

```ts
const card: LayoutComponentMetadata<ButtonComponentOptions> = {id: 'button-ok', package: 'basic-components', name: 'button', options: {text: 'OK', type: 'button', disabled: false, buttonCssClass: 'btn btn-primary', icon: null, tooltip: null}};
```

Also useful:

- `metadata/<name>.layoutMetadata.ts` → `metaInfo.defaultOptions` = options the editor puts on a
  newly dropped item — a good minimal starting point (shown as *palette defaults* in the catalog).
- `metadata/<name>.model.ts` → which options the properties editor edits (decorated with
  `@LayoutPropertyName/Type`).
- Option values are read as-is, there is no schema validation; missing options are `undefined`.
  Always store an `options` object, even `{}` — extensions are initialized from it.

## 4. Finding where children live (descendants)

There is **no generic `children` option**. Each container decides the property (or properties)
holding child metadata and declares it with `@DescendantsGetter` on the component class:

```ts
@DescendantsGetter<StackPanelComponentOptions>(options => options?.children ?? [])   // stackPanel
@DescendantsGetter<BlockComponentOptions>(options => options?.content ? [options.content] : [])   // block
```

The getter is the source of truth: the renderer template renders exactly these nodes
(`*layoutComponentRenderer="options?.content"`), the editor's component tree, `LayoutComponentsIteratorService`
and `FormComponentControlBuilder` walk the tree through it, and `addDescendant` in the item's
`metadata/<name>.layoutMetadata.ts` writes into the same property.

How to find it:

1. Catalog line `children:` (built-in items) or `dynamic-items.mjs --item <name>` → `descendants`.
2. In sources: `rg -n "DescendantsGetter" <folder>`; in the installed package:
   `rg -n "DescendantsGetter" node_modules/@anglr/dynamic/es2022` (compiled JS keeps the call).
3. `addDescendant` in the layout editor metadata shows the shape the editor writes (array splice vs single value).
4. No getter → the item is a leaf (or renders a layout loaded by id, like `templateBlock`).

Built-in containers:

| Item | Children property | Shape |
| --- | --- | --- |
| `basic-components/stackPanel` | `children` | `LayoutComponentMetadata[]` |
| `basic-components/block`, `ifBlock` | `content` | single node |
| `basic-components/listBlock` | `template` | single node, rendered once per `data` item (scoped) |
| `basic-components/gridPanel` | `areas` | `gridPanelArea` nodes, each with `component` (single node) |
| `css-components/styleBlock` | `content` | single node |
| `form-components/formGroup` | `children` | `LayoutComponentMetadata[]` |
| `material-components/expansionPanel`, `tab` | `children` | `LayoutComponentMetadata[]` |
| `material-components/tabGroup` | `tabs[].content` | `{title, content}` per tab |
| `grid-components/dataTable` | `columns`, `paging`, `dataLoader`, `metadataSelector` | fixed slot nodes, see `items-forms-grid.md` |
| `grid-components/gridColumns` · `gridColumn` | `columns[]` · `header`, `content` | |
| `grid-components/gridColumnHeader`, `gridColumnContent` | `content` | single node |
| `grid-components/dataLoader`, `paging`, `metadataSelector` | `plugin` | single node |
| `custom-components/<custom>` | `placeholderContainers` | dictionary `placeholderId → placeholderContainer` node |
| `custom-components/placeholderContainer` | `content` | single node |

## 5. Styling and child-extension options

Options consumed by **extensions** are plain keys of the same `options` object:

| Keys | Valid when | Effect |
| --- | --- | --- |
| `cssClass: string` (space separated), `margin: {top,right,bottom,left}`, `padding: {top,right,bottom,left}` (CSS strings, e.g. `'8px'`), `textStyling: {fontSize: '14px', fontWeight: 200\|400\|600\|700}` | item's `type.ts` exports `ComponentStylingExtension` in `extensions` (catalog: *extensions*) | applied to the host element |
| `flex: string` (e.g. `'1'`, `'0 0 200px'`) | node is a **direct child** of `stackPanel` (its `childExtensions` = `StackPanelFlexExtension`) | sets `style.flex` of the child host |

Rules:

- `extensions` export of `type.ts` → options of the item itself; `childExtensions` export of the
  **parent's** `type.ts` → options read from **each child's** `options`. In the catalog this shows as
  *childExtensions* on the container; the option keys come from `<name>Extensions.options.ts`
  (e.g. `StackPanelFlexExtensionOptions {flex}`).
- Styling keys on an item without `ComponentStylingExtension` (e.g. `ifBlock`) are ignored — wrap it in a `block`.
- `TextFontWeight` enum (`@anglr/dynamic/layout`): `Light = 200`, `Normal = 400`, `SemiBold = 600`, `Bold = 700`.

## 6. Scoped containers (listBlock, dataTable)

`listBlock` (and `dataTable` rows) render their template many times. Each rendering opens a
**relations scope** so components inside get their own relations instances.

- Give the scoped container a `scope` id and copy the same `scope` to every node inside its
  template — that's what the editor writes (`scope ??= generateId(10)` on the container, children inherit it).
  At runtime the scope is also inherited through DI, but keep metadata consistent so relations
  editors and `check-metadata.mjs` see it.
- Relations of nodes inside the template, and pure nodes that must exist once per rendered item,
  carry the same `scope` (see `relations-metadata.md` → Scopes).
- `listBlock` options: only `template`; data come through its relations input `data` (array), and
  each rendered item exposes outputs `datum`, `index`, `first`, `last` under the listBlock's id.

## 7. Layouts loaded by id (templateBlock, custom components)

- `basic-components/templateBlock` `{layoutId}` renders the layout returned by
  `LAYOUT_METADATA_STORAGE.getMetadata(layoutId)` and its own relations from
  `RELATIONS_METADATA_STORAGE`. It has no children in metadata and no relations endpoints — its inner
  relations are isolated.
- `custom-components/<customName>` renders a stored layout + relations (stored under `<customName>`)
  as one item; options `{name: '<customName>', contentOptions: {<innerId>: {<option>: value}}, placeholderContainers: {…}}`.
  `contentOptions` is deep-merged into options of the inner components at runtime (the editor's
  options dialog offers only properties listed in the custom component's `configurableProperties`). Requires `withCustomComponents()` and
  both metadata storages. See `samples.md`.

## 8. Recipes

Stack with fixed sidebar and flexible content, styled:

```json
{
    "id": "stackPanel-root", "package": "basic-components", "name": "stackPanel",
    "options":
    {
        "horizontal": true, "wrap": false,
        "padding": {"top": "8px", "right": "8px", "bottom": "8px", "left": "8px"},
        "children":
        [
            {"id": "block-sidebar", "package": "basic-components", "name": "block", "options": {"flex": "0 0 240px", "cssClass": "sidebar", "content": {"id": "textBlock-menu", "package": "basic-components", "name": "textBlock", "options": {"text": "Menu"}}}},
            {"id": "htmlBlock-main", "package": "basic-components", "name": "htmlBlock", "options": {"flex": "1", "content": "<p>Main content</p>"}}
        ]
    }
}
```

CSS grid with two areas (`gridRowStart/End`, `gridColumnStart/End` are CSS grid line numbers):

```json
{
    "id": "gridPanel-main", "package": "basic-components", "name": "gridPanel",
    "options":
    {
        "rows": [{"height": "auto"}], "columns": [{"width": "1fr"}, {"width": "2fr"}],
        "areas":
        [
            {"id": "gridPanelArea-left", "package": "basic-components", "name": "gridPanelArea", "options": {"gridRowStart": 1, "gridRowEnd": 2, "gridColumnStart": 1, "gridColumnEnd": 2, "component": {"id": "textBlock-left", "package": "basic-components", "name": "textBlock", "options": {"text": "Left"}}}},
            {"id": "gridPanelArea-right", "package": "basic-components", "name": "gridPanelArea", "options": {"gridRowStart": 1, "gridRowEnd": 2, "gridColumnStart": 2, "gridColumnEnd": 3, "component": {"id": "textBlock-right", "package": "basic-components", "name": "textBlock", "options": {"text": "Right"}}}}
        ]
    }
}
```

Material tabs (needs `withMaterialComponents()`); the editor puts a `material-components/tab`
container (`children[]`) into every `tabs[].content`, do the same:

```json
{"id": "tabGroup-main", "package": "material-components", "name": "tabGroup", "options": {"tabs": [
    {"title": "General", "content": {"id": "tab-general", "package": "material-components", "name": "tab", "options": {"children": [
        {"id": "textBlock-general", "package": "basic-components", "name": "textBlock", "options": {"text": "General settings"}}]}}},
    {"title": "Advanced", "content": {"id": "tab-advanced", "package": "material-components", "name": "tab", "options": {"children": []}}}
]}}
```

List of items (data via relations, see `relations-metadata.md` → listBlock example):

```json
{"id": "listBlock-users", "package": "basic-components", "name": "listBlock", "scope": "users-scope", "options": {"template":
    {"id": "htmlBlock-user", "package": "basic-components", "name": "htmlBlock", "scope": "users-scope", "options": {"content": ""}}}}
```

Programmatic walk over any layout (uses descendants getters, works for own items too):

```ts
const iterator = inject(LayoutComponentsIteratorService).getIteratorFor(layout);   // @anglr/dynamic/layout-editor

for await(const item of iterator)
{
    console.log(item.metadata.id, item.parent?.metadata.id, item.level, item.levelIndex);
}
```

`LayoutComponentsIteratorService` is provided by the layout editor and form builder features; in
another scope provide it yourself (it needs `LAYOUT_COMPONENTS_LOADER`, i.e. the layout runtime).

## 9. Checklist

- [ ] every node: `id` (unique), `package`, `name`, `options` object
- [ ] package of each item is enabled in `provideDynamic()` (`withBasicComponents()`, own `with…()`)
- [ ] option keys come from the item's options interface, styling keys only on items with `ComponentStylingExtension`
- [ ] child-extension keys (`flex`) only on direct children of the container that declares them
- [ ] children stored in the property returned by the container's `@DescendantsGetter`
- [ ] scoped containers and their descendants share one `scope`
- [ ] run `scripts/check-metadata.mjs --layout … --items node_modules/@anglr/dynamic`
