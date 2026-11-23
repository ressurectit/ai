# Built-in items: basic, css, handlebars, rest, tinymce, math, custom components

Catalog of @anglr/dynamic 1.1.0 items for writing metadata. Generated with `scripts/dynamic-items.mjs`
and annotated; `null|undefined` is omitted from types. Run the script on `node_modules/@anglr/dynamic`
to get the same data for the installed version.

## Contents

- How to read entries
- basic-components (`withBasicComponents()`)
- css-components (`withCssComponents()`)
- handlebars-components (`withHandlebarsComponents()`)
- rest-components (`withRestComponents()`)
- tinymce-components (`withTinyMceComponents()`)
- math-components (`withMathComponents()`)
- custom-components / custom-relations (`withCustomComponents()`, `withCustomRelations()`)

## How to read entries

- Heading: `package/name` (what goes into metadata) — kind: *layout* (layout only), *layout + relations*
  (in relations as `layout-components` entry), *relations (pure node)* (relations entry with its own package).
- Interface lines: option keys of `options` (layout) or `relationsOptions` (pure nodes, `*RelationsOptions`);
  `*ExtensionOptions` interfaces of a container are keys for its **children's** options.
- `children:` — `@DescendantsGetter`, the property that holds child metadata.
- `extensions: ComponentStylingExtension` → `cssClass`, `margin`, `padding`, `textStyling` are valid too.
- `relations in · out` — input / output names; `+ dynamic` → names from `relationsOptions` (`relations-metadata.md` → 5).
- `palette defaults` — options of a newly dropped item in the editor, a good minimal set.

## basic-components (`withBasicComponents()`)

### `basic-components/block` — layout
- `BlockComponentOptions`: `content: LayoutComponentMetadata`
- children: `options => options?.content ? [options?.content] : []`
- extensions: ComponentStylingExtension

### `basic-components/button` — layout + relations
- note: `click` emits a new empty object on every click (event; `skipInit`), `icon` is a CSS class (Font Awesome), `type` `'button'|'submit'`, presets from `BUTTONS_PRESETS`; library CSS defines only `btn`, `btn-primary`, `btn-info`, `btn-success`, `btn-danger`, `btn-icon` (other classes must come from the app)
- `ButtonComponentOptions`: `text: string`, `icon: string`, `disabled: boolean`, `buttonCssClass: string`, `tooltip: string`, `type: ButtonType`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `disabled` · out: `click` ({skipInit: true, sync: true})
- palette defaults: `{ text: 'Click me', disabled: false, buttonCssClass: 'btn btn-primary', type: 'button', }`

### `basic-components/debounceValue` — relations (pure node)
- `DebounceValueRelationsOptions`: `delay: number`
- relations in: `value` · out: `value`

### `basic-components/deconstruct` — relations (pure node)
- `DeconstructRelationsOptions`: `properties: ComponentEndpointDef<TValue>[]`
- relations in: `object` · out: + dynamic

### `basic-components/empty` — relations (pure node)
- relations in: `value` · out: `result`

### `basic-components/firstNonNull` — relations (pure node)
- `FirstNonNullRelationsOptions`: `properties: string[]`
- relations in: `data1`, `data2`, + dynamic · out: `data`

### `basic-components/gridPanel` — layout
- note: `rows[].height` / `columns[].width` are CSS track sizes joined into `grid-template-rows/columns` (`'auto'` when empty); every entry of `areas` is a `basic-components/gridPanelArea` node
- `GridPanelComponentOptions` (extends RowsColumnsOptions): `areas: LayoutComponentMetadata<GridPanelAreaComponentOptions>[]`
- children: `options => options?.areas ?? []`
- extensions: ComponentStylingExtension

### `basic-components/gridPanelArea` — layout
- note: only inside `gridPanel.areas` (not in palette); coordinates are CSS grid line numbers, the content is the single node in `component`
- `GridPanelAreaComponentOptions`: `gridRowStart: number`, `gridRowEnd: number`, `gridColumnStart: number`, `gridColumnEnd: number`, `component?: LayoutComponentMetadata`
- children: `options => options?.component ? [options.component] : []`

### `basic-components/htmlBlock` — layout + relations
- note: renders `content` as HTML; the `content` relations input replaces it
- `HtmlBlockComponentOptions`: `content: string`
- extensions: RelationsRegistrationExtension, ComponentStylingExtension
- relations in: `content` · out: —
- palette defaults: `{ content: '<div>This is your <strong>HTML</strong> block</div>' }`

### `basic-components/ifBlock` — layout + relations
- note: renders `content` while condition is truthy; starts from `options.condition` (`false` when missing), then follows the `condition` input; no styling extension
- `IfBlockComponentOptions`: `content: LayoutComponentMetadata`, `condition: boolean`
- children: `options => options?.content ? [options?.content] : []`
- extensions: RelationsRegistrationExtension
- relations in: `condition` · out: —
- palette defaults: `{ condition: true, }`

### `basic-components/listBlock` — layout + relations
- note: renders `template` once per item of the `data` input (array); per item it emits `datum`, `index`, `first`, `last` under the listBlock id inside the item's scope; set `scope` on listBlock + template nodes
- `ListBlockComponentOptions`: `template: LayoutComponentMetadata`
- children: `options => options?.template ? [options?.template] : []`
- scoped: yes
- extensions: ComponentStylingExtension, RelationsRegistrationExtension, ListBlockDataExtension
- relations in: `data` · out: `datum`, `index`, `first`, `last`

### `basic-components/logicalAnd` — relations (pure node)
- note: `result = cond1 && cond2 && all properties`; unconnected `cond1`/`cond2` stay `false`
- `LogicalAndRelationsOptions`: `properties: string[]`
- relations in: `cond1`, `cond2`, + dynamic · out: `result`

### `basic-components/logicalOr` — relations (pure node)
- `LogicalOrRelationsOptions`: `properties: string[]`
- relations in: `cond1`, `cond2`, + dynamic · out: `result`

### `basic-components/match` — relations (pure node)
- relations in: `value`, `valueToMatch` · out: `result`

### `basic-components/merge` — relations (pure node)
- `MergeRelationsOptions`: `properties: string[]`
- relations in: + dynamic · out: `mergedObject`

### `basic-components/negation` — relations (pure node)
- relations in: `condition` · out: `negatedCondition`

### `basic-components/notFound` — relations
- note: internal placeholder node of the relations editor for items that can't be loaded; don't use in metadata

### `basic-components/stackPanel` — layout
- note: flex container (`horizontal` → row, else column; `wrap`); each child may set `flex` (child extension)
- `StackPanelComponentOptions`: `horizontal: boolean`, `wrap: boolean`, `children: LayoutComponentMetadata[]`
- `StackPanelFlexExtensionOptions`: `flex: string`
- children: `options => options?.children ?? []`
- childExtensions: StackPanelFlexExtension
- extensions: ComponentStylingExtension

### `basic-components/state` — relations (pure node)
- note: input functions run compiled JS, format in `relations-metadata.md` → 6
- `StateRelationsOptions`: `inputFunctions: Dictionary<StateRelationsInputFunctionData>`
- `StateRelationsInputFunctionData`: `id: string`, `code: string`
- `StateRelationsEditorOptions`: `contents: StringDictionary`
- relations in: `initState`, + dynamic · out: `state`

### `basic-components/syncValues` — relations (pure node)
- `SyncValuesRelationsOptions`: `triggerSync: boolean`, `idleTimeout: number`, `syncProperties: string[]`
- relations in: `trigger`, + dynamic · out: + dynamic

### `basic-components/templateBlock` — layout
- note: renders layout `LAYOUT_METADATA_STORAGE.getMetadata(layoutId)` with its own isolated relations from `RELATIONS_METADATA_STORAGE` (needs `withLayoutMetadataStorage()`, optionally `withRelationsMetadataStorage()`); no children, no relations endpoints
- `TemplateBlockComponentOptions`: `layoutId: string`
- extensions: ComponentStylingExtension

### `basic-components/textBlock` — layout
- `TextBlockComponentOptions`: `text: string`
- extensions: ComponentStylingExtension
- palette defaults: `{ text: 'This is your text' }`

### `basic-components/toggleButton` — layout + relations
- note: `toggle` emits the boolean state (initially `options.state`), button shows `onText`/`offText`
- `ToggleButtonComponentOptions`: `onText: string`, `offText: string`, `state: boolean`, `disabled: boolean`, `buttonCssClass: string`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `disabled` · out: `toggle`
- palette defaults: `{ onText: 'On', offText: 'Off', state: true, disabled: false, buttonCssClass: 'btn btn-primary', }`

### `basic-components/transformData` — relations (pure node)
- note: `code` is compiled JS assigning `exports.default = function(data) {…};`, format in `relations-metadata.md` → 6
- `TransformDataRelationsOptions`: `id: string`, `code: string`
- `TransformDataRelationsEditorOptions`: `content: string`
- relations in: `data` · out: `transformedData`

### `basic-components/trigger` — relations (pure node)
- `TriggerRelationsOptions`: `endpoints: ComponentEndpointDef[]`
- relations in: `trigger`, + dynamic · out: + dynamic

### `basic-components/value` — relations (pure node)
- note: emits `relationsOptions.value` (constant of any JSON type) once on init
- `ValueRelationsOptions`: `value: TValue`
- relations in: — · out: `value`

## css-components (`withCssComponents()`)

Needs `postcss`, `postcss-prefix-selector`. `style` is CSS text scoped (prefixed) to the block.

### `css-components/styleBlock` — layout
- `StyleBlockComponentOptions`: `content: LayoutComponentMetadata`, `style: string`
- children: `options => options?.content ? [options?.content] : []`
- extensions: ComponentStylingExtension

## handlebars-components (`withHandlebarsComponents()`)

Needs `handlebars`. `template` is a Handlebars template rendered with the `data` input.

### `handlebars-components/dataBlock` — layout + relations
- `DataBlockComponentOptions`: `template: string`
- extensions: RelationsRegistrationExtension
- relations in: `data` · out: —

### `handlebars-components/dataTemplate` — relations (pure node)
- `DataTemplateRelationsOptions`: `template: string`
- relations in: `template`, `data` · out: `output`

## rest-components (`withRestComponents()`)

Needs `@anglr/rest` and `HttpClient`. `RestParam` = `{name, type: 'BODY'|'PATH'|'QUERY'|'QUERY OBJECT'|'HEADER', configurable, value}`, `method` = `'GET'|'POST'|'PUT'|'PATCH'|'DELETE'`. Behaviour and the "every param configurable" rule: `relations-metadata.md` → 5.

### `rest-components/rest` — relations (pure node)
- `RestRelationsOptions`: `url: string`, `method: MethodType`, `runImmediately: boolean`, `params: RestParam[]`
- relations in: + dynamic · out: `success`, `error`

## tinymce-components (`withTinyMceComponents()`)

Needs `tinymce`, `@tinymce/tinymce-angular` and TinyMCE assets under `ngDynamicTinymcePath` (default `'tinymce'`).

### `tinymce-components/richTextBlock` — layout
- `RichTextBlockComponentOptions`: `content: string`

### `tinymce-components/richTextSource` — relations (pure node)
- `RichTextSourceRelationsOptions`: `content: string`
- relations in: — · out: `htmlString`

## math-components (`withMathComponents()`)

All nodes ignore their `relationsOptions` at runtime; values come only through inputs (constants via `basic-components/value`). `add`/`subtract`: a missing operand passes the other one through.

### `math-components/add` — relations (pure node)
- `MathAddRelationsOptions`: `input1: string|number`, `input2: string|number`
- relations in: `input1`, `input2` · out: `result`

### `math-components/divide` — relations (pure node)
- `MathDivideRelationsOptions`: `input1: string|number`, `input2: string|number`
- relations in: `input1`, `input2` · out: `result`

### `math-components/multiply` — relations (pure node)
- `MathMultiplyRelationsOptions`: `input1: number`, `input2: number`
- relations in: `input1`, `input2` · out: `result`

### `math-components/power` — relations (pure node)
- `MathPowerRelationsOptions`: `input: number`, `exponent: number`
- relations in: `input` · out: `result`

### `math-components/round` — relations (pure node)
- `MathRoundRelationsOptions`: `input: number`, `decimalPlace: number`
- relations in: `input` · out: `result`

### `math-components/subtract` — relations (pure node)
- `MathSubtractRelationsOptions`: `input1: string|number`, `input2: string|number`
- relations in: `input1`, `input2` · out: `result`

## custom-components / custom-relations (`withCustomComponents()`, `withCustomRelations()`)

Virtual packages from `@anglr/dynamic/layout-relations`. Any name not listed below is a stored custom component / custom relation name. Details: `relations-metadata.md` → 9, `samples.md` → Custom components.

### `custom-components/componentInputs` — relations
- note: only inside stored custom component relations; declared inputs become outputs inside (`relations-metadata.md` → 9); `custom-relations/relationsInputs` is the same item for custom relations
- `ComponentInputsRelationsOptions`: `inputs: ComponentEndpointDef[]`
- relations in: — · out: + dynamic

### `custom-components/componentOutputs` — relations
- note: counterpart of `componentInputs`; `custom-relations/relationsOutputs` is the same item for custom relations
- `ComponentOutputsRelationsOptions`: `outputs: ComponentEndpointDef[]`
- relations in: + dynamic · out: —

### `custom-components/<custom name>` (item `customComponent`) — layout + relations
- `CustomComponentComponentOptions`: `name: string`, `placeholderContainers: Dictionary<LayoutComponentMetadata>`, `contentOptions: Dictionary<unknown>`
- `CustomComponentRelationsOptions`: `name: string`
- children: `options => { if(!options?.placeholderContainers) { return []; } const result: LayoutComponentMetadata[] = []; for(const key in options.placeholderContainers) { if(options.placeholderContainers[key]) { …`
- extensions: ComponentStylingExtension, CustomComponentDataExtension, IdSetterExtension
- relations in: + dynamic · out: + dynamic

### `custom-relations/<stored name>` (item `customRelation`) — relations (pure node)
- `CustomRelationRelationsOptions`: `name: string`, `id: string`
- relations in: + dynamic · out: + dynamic

### `custom-components/placeholder` — layout
- note: used inside a stored custom component layout to mark a slot; each instance fills it via `placeholderContainers[<placeholder id>]` = `placeholderContainer` node
- `PlaceholderComponentOptions` (extends CustomComponentComponentOptions): —
- extensions: IdSetterExtension

### `custom-components/placeholderContainer` — layout
- `PlaceholderContainerComponentOptions`: `content: LayoutComponentMetadata`
- children: `options => options?.content ? [options?.content] : []`
