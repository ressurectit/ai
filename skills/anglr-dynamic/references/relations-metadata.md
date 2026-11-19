# Assembling relations metadata by hand

How to write `RelationsComponentMetadata[]` that the relations runtime wires correctly, how to find
the input/output names of any item and how the built-in nodes with configurable endpoints work.

## Contents

1. Shape
2. Participants and how to reference them
3. Assembly procedure
4. Finding input and output names
5. Nodes with configurable (dynamic) endpoints
6. Code nodes (transformData, state)
7. Data propagation semantics
8. Scopes (listBlock, dataTable rows)
9. Custom components and custom relations
10. Editor format (`RelationsNodeMetadata`)
11. Examples
12. Checklist

## 1. Shape

```ts
interface RelationsComponentMetadata<TOptions = any>   // @anglr/dynamic/relations
{
    id: string;                      // relations id of the participant
    package: string;                 // see section 2
    name: string;                    // see section 2
    displayName?: string;
    scope?: string|null;             // see section 8
    relationsOptions: TOptions|undefined|null;   // options of pure nodes, null for components
    outputs?: RelationOutputMetadata[];          // ALWAYS present, [] when node has no outgoing edges
}

interface RelationOutputMetadata { outputName: string; inputs: RelationInputMetadata[]; }
interface RelationInputMetadata  { id: string; inputName: string; }   // target relations id + target input property
```

Edges are stored **on the source**: `outputs[].inputs[]` lists every `{target id, target input}` the
output feeds. The array is set with `inject(RelationsManager).setRelations(relations)` in the same
`provideDynamic()` scope that renders the layout (calling it again re-initializes all relations).

**Every participant needs its own entry with an `outputs` array.** The runtime iterates entries and
*skips entries without `outputs`* — such a node gets no `relationsOptions`, a pure node is never
created and a late-registered target never receives the initial value. Use `outputs: []` for pure
sinks/targets (that's exactly what the relations editor saves).

## 2. Participants and how to reference them

| Participant | `id` | `package` | `name` | `relationsOptions` |
| --- | --- | --- | --- | --- |
| Layout component that is also relations component (catalog kind *layout + relations*, `type.ts` exports `RelationsRegistrationExtension`) | its layout `id` | `'layout-components'` | same as `id` | `null` |
| Pure relations node (`@PureRelationsComponent()`) — created by the runtime | any unique id, e.g. `negation-save` | its package (`'basic-components'`, `'math-components'`, own) | item name (`'negation'`) | node options interface (`<Name>RelationsOptions`) |
| Static component (Angular component in your template registering itself) | its fixed relations id | `'static-components'` | same as `id` | `null` |
| Custom component instance in a layout | its layout `id` | `'layout-components'` | same as `id` | `null` |
| Custom relation (stored relations used as one node) | any unique id | `'custom-relations'` | stored relations name | `{name: <stored name>, id: <same as node id>}` |
| Inputs/outputs node inside a stored custom component | any id | `'custom-components'` | `'componentInputs'` / `'componentOutputs'` | `{inputs: ComponentEndpointDef[]}` / `{outputs: …}` |
| Inputs/outputs node inside stored custom relations | any id | `'custom-relations'` | `'relationsInputs'` / `'relationsOutputs'` | same as above |

Layout-only items (`textBlock`, `stackPanel`, `block`, `templateBlock`, …) can't participate. To
display a value, use an item with an input (`htmlBlock.content`, `dataBlock.data`, form fields `value`),
to toggle visibility wrap content in `ifBlock` (`condition`).

## 3. Assembly procedure

1. List data flows as `source.output → target.input` in words
   (`toggle button 'toggle' → ifBlock 'condition'`).
2. Insert pure nodes where data must be transformed (negation, logicalAnd, transformData, value, rest, math…).
3. Check every endpoint name against the catalog / `dynamic-items.mjs` (section 4).
4. Create one entry per participant (section 2), `outputs: []` first.
5. For each flow, find/add the source's `outputs` item with `outputName` and push `{id: target, inputName}`.
   One output may feed many inputs; one input may be fed by several outputs (last transfer wins).
6. Fill `relationsOptions` of pure nodes (catalog: options interface + *palette relationsOptions* defaults).
7. Validate: `node <skill>/scripts/check-metadata.mjs --layout l.json --relations r.json --items node_modules/@anglr/dynamic`.

## 4. Finding input and output names

- **Outputs** are properties decorated with `@DynamicOutput()`; **inputs** are plain public
  properties the item reacts to in `dynamicOnChanges`/`onChanges`. The relations editor node template
  shows both: `<relation-node-input name="…">` / `<relation-node-output name="…">` — `name` equals the
  runtime property name.
- Catalog lines `relations in: … · out: …`, or
  `node <skill>/scripts/dynamic-items.mjs node_modules/@anglr/dynamic --item <name>`
  (reads `@DynamicOutput` from compiled JS in `node_modules/@anglr/dynamic/es2022/**` and node templates
  `node_modules/@anglr/dynamic/<entry>/src/dynamicItems/<name>/node/*.html`).
- Own items: run the script on the package folder, or `rg -n "DynamicOutput|relation-node-(input|output)" <folder>`.
- `+ dynamic` in the catalog means names come from `relationsOptions` (section 5).
- Output options shown in parentheses: `skipInit` (no initial transfer, event-like), `sync` (transferred immediately).

## 5. Nodes with configurable (dynamic) endpoints

Names created from `relationsOptions` at runtime — choose them yourself and use the same strings in edges:

| Node | `relationsOptions` | Inputs | Outputs |
| --- | --- | --- | --- |
| `basic-components/logicalAnd`, `logicalOr` | `{properties: ['a', 'b']}` (may be `[]`) | `cond1`, `cond2` + each property | `result` (AND/OR of all; `cond1`/`cond2` default `false`, so connect both for AND) |
| `basic-components/firstNonNull` | `{properties: […]}` | `data1`, `data2` + properties | `data` (first **truthy** value in order data1, data2, properties) |
| `basic-components/merge` | `{properties: ['firstName', 'age']}` | each property | `mergedObject` (`{firstName, age}`, new object on every change) |
| `basic-components/deconstruct` | `{properties: [{name: 'id', defaultValue: null, skipInit: false}]}` | `object` | each `name` (= `object[name]`) |
| `basic-components/syncValues` | `{syncProperties: ['a'], triggerSync: true, idleTimeout: null}` | `trigger` + each property | each property (sent on `trigger` when `triggerSync`, otherwise after idle timeout) |
| `basic-components/trigger` | `{endpoints: [{name: 'refresh', defaultValue: null, skipInit: true}]}` | `trigger` + each endpoint | each endpoint (re-sends current value when `trigger` changes) |
| `basic-components/state` | `{inputFunctions: {onAdd: {id: 'unique-id', code: '<compiled JS>'}}}` | `initState` + each key of `inputFunctions` | `state` |
| `rest-components/rest` | `{url, method, runImmediately, params: [{name, type, configurable, value}]}` | each **configurable** param `name` | `success`, `error` |
| `custom-components/<custom>` instance | — | inputs of the stored `componentInputs` node | outputs of the stored `componentOutputs` node |
| `custom-relations/<stored>` | `{name, id}` | inputs of stored `relationsInputs` | outputs of stored `relationsOutputs` |

`ComponentEndpointDef` = `{name: string, defaultValue: any, skipInit: boolean}`.

Fixed-endpoint pure nodes for reference: `negation` (`condition` → `negatedCondition`),
`empty` (`value` → `result` = isEmpty), `match` (`value`, `valueToMatch` → `result`; RegExp test, string `==`,
otherwise deep equal), `debounceValue` (`value` → `value`, `{delay: ms}`), `value` (no input → `value`
= `relationsOptions.value`, a constant), math `add|subtract|multiply|divide` (`input1`, `input2` → `result`),
`power`/`round` (`input` → `result`), `dataTemplate` (`template`, `data` → `output`), `richTextSource` (→ `htmlString`).
Math nodes ignore their `relationsOptions` values at runtime — feed constants through a `value` node.

`rest` details: `type` is `'BODY'|'PATH'|'QUERY'|'QUERY OBJECT'|'HEADER'`, path params replace
`{name}` in `url`, method `'GET'|'POST'|'PUT'|'PATCH'|'DELETE'`. The request is sent only when every
param has a non-empty value — and only configurable params can get one (non-configurable params block
the request), so make every param `configurable: true` and feed it, constants through a `value` node.
`runImmediately: true` also requests once on init; otherwise any input change sends the request.
Needs `@anglr/rest` and `HttpClient`.

## 6. Code nodes (transformData, state)

`transformData` (`data` → `transformedData`) and `state` input functions execute **compiled
JavaScript** from `relationsOptions`: `{id: '<unique cache key>', code: '<js>'}`. The code runs as a
CommonJS module body; it must assign `exports.default`:

```json
{"id": "transformData-fullName", "package": "basic-components", "name": "transformData",
 "relationsOptions": {"id": "transformData-fullName-code", "code": "exports.default = function(data) { return data ? data.firstName + ' ' + data.lastName : ''; };"},
 "outputs": [{"outputName": "transformedData", "inputs": [{"id": "htmlBlock-name", "inputName": "content"}]}]}
```

- Code is injected via a `<script>` element and newlines don't survive: terminate every statement
  with `;` and never use `//` comments (use `/* */`).
- `id` caches the compiled function per page — use a unique id per node and change it when code changes.
- `state` input function: `exports.default = function(value) { this.state = Object.assign({}, this.state, {last: value}); };`
  (`this` is the node; assign a new `state` object to emit). Input `initState` resets `state`.
- The editor additionally stores TypeScript source in `nodeMetadata.options.content` (transformData)
  / `nodeMetadata.options.contents[name]` (state); runtime ignores it.

## 7. Data propagation semantics

- Assigning an output property marks it changed; by default changes are delivered **asynchronously in
  one batch** — all inputs of a target changed in a batch arrive in one `dynamicOnChanges(changes)` call,
  followed by `invalidateVisuals()`. `@DynamicOutput({sync: true})` transfers immediately.
- **Initial transfer**: when relations initialize or a component registers later, outputs that have
  ever been assigned send their current value — except outputs with `skipInit` (events like
  `button.click`). Registration order doesn't matter.
- A transfer is skipped when the value is strictly equal (`===`) to the target's current value → emit
  new object/array instances.
- `RelationsChangeDetectorOptions(detectionInSingleRun = true)`; with `false`, changes made during a run go to the next run.
- Inputs set via relations override option-based initial state (e.g. `ifBlock.condition` starts from
  `options.condition`, then follows relations).

## 8. Scopes (listBlock, dataTable rows)

A scoped container renders its template many times; each copy gets its own relations scope.

- Layout: container and all nodes in its template share `scope: '<scopeId>'` (layout-metadata.md → 6).
- Entries of layout components inside the template: same `scope`, `package: 'layout-components'`.
- Pure nodes that must work **per item** get `scope: '<scopeId>'`: the runtime creates one instance per
  rendered item. Pure nodes without `scope` exist once and broadcast to all copies.
- `listBlock`: input `data` (array) on the listBlock entry; per-item outputs `datum`, `index`, `first`,
  `last` are emitted under the **listBlock's id** inside each scope, so wire them from the listBlock entry
  to nodes inside the template.
- `gridColumns` (inside `dataTable`) emits `row`, `index`, `first`, `last` per row the same way.

## 9. Custom components and custom relations

Stored custom component `<customName>` = layout + relations saved in the metadata storages under
`<customName>`. Inside its stored relations:

```json
[
    {"id": "inputs", "package": "custom-components", "name": "componentInputs",
     "relationsOptions": {"inputs": [{"name": "title", "defaultValue": "Untitled", "skipInit": false}]},
     "outputs": [{"outputName": "title", "inputs": [{"id": "htmlBlock-title", "inputName": "content"}]}]},
    {"id": "htmlBlock-title", "package": "layout-components", "name": "htmlBlock-title", "relationsOptions": null, "outputs": []}
]
```

- `componentInputs` turns each declared input into an **output inside**; `componentOutputs`
  (`{outputs: [...]}`) turns each declared output into an **input inside** that inner nodes feed.
- Outside, the instance is a normal `layout-components` entry with inputs = declared inputs and
  outputs = declared outputs (`{id: 'contactCard-first', package: 'layout-components', name: 'contactCard-first', …}`).
- Custom relations work the same with `custom-relations/relationsInputs|relationsOutputs` inside and a
  `custom-relations/<stored name>` node outside (`relationsOptions: {name, id}`). Requires `withCustomRelations()`
  and `withRelationsMetadataStorage()`.

## 10. Editor format (`RelationsNodeMetadata`)

`<relations-editor>` reads/writes `RelationsNodeMetadata[]` (`@anglr/dynamic/relations-editor`) =
runtime entry + `nodeMetadata: {coordinates: {x, y}, scopeConfigurable: boolean, options: any}`.
The runtime accepts it unchanged. When writing metadata meant for the editor, add
`nodeMetadata` with distinct coordinates (e.g. columns 300px apart), `scopeConfigurable: false` for
layout/static components and `true` for pure nodes, `options: null`.

## 11. Examples

Text field drives the save button (enabled only when not empty), value shown live:

```json
[
    {"id": "textField-name", "package": "layout-components", "name": "textField-name", "relationsOptions": null, "outputs": [
        {"outputName": "valueOutput", "inputs": [{"id": "empty-name", "inputName": "value"}, {"id": "htmlBlock-preview", "inputName": "content"}]}]},
    {"id": "empty-name", "package": "basic-components", "name": "empty", "relationsOptions": null, "outputs": [
        {"outputName": "result", "inputs": [{"id": "button-save", "inputName": "disabled"}]}]},
    {"id": "htmlBlock-preview", "package": "layout-components", "name": "htmlBlock-preview", "relationsOptions": null, "outputs": []},
    {"id": "button-save", "package": "layout-components", "name": "button-save", "relationsOptions": null, "outputs": []}
]
```

Load a list from REST when the page starts and render it with `listBlock` (layout: `listBlock-users`
with `scope: "users"` whose template is `htmlBlock-user` with `scope: "users"`):

```json
[
    {"id": "rest-users", "package": "rest-components", "name": "rest", "outputs": [
        {"outputName": "success", "inputs": [{"id": "listBlock-users", "inputName": "data"}]}],
     "relationsOptions": {"url": "api/users", "method": "GET", "runImmediately": true, "params": []}},
    {"id": "listBlock-users", "package": "layout-components", "name": "listBlock-users", "relationsOptions": null, "outputs": [
        {"outputName": "datum", "inputs": [{"id": "transformData-user", "inputName": "data"}]}]},
    {"id": "transformData-user", "package": "basic-components", "name": "transformData", "scope": "users",
     "relationsOptions": {"id": "transformData-user-code", "code": "exports.default = function(user) { return user ? '<b>' + user.name + '</b>' : ''; };"},
     "outputs": [{"outputName": "transformedData", "inputs": [{"id": "htmlBlock-user", "inputName": "content"}]}]},
    {"id": "htmlBlock-user", "package": "layout-components", "name": "htmlBlock-user", "scope": "users", "relationsOptions": null, "outputs": []}
]
```

`success` carries the response body (`null` on error, `error` gets the error). With configurable
params (e.g. `{"name": "id", "type": "PATH", "configurable": true, "value": null}` and url `api/users/{id}`)
the request is re-sent whenever a param input changes.

Constant into an input (`value` node):

```json
{"id": "value-options", "package": "basic-components", "name": "value",
 "relationsOptions": {"value": [{"code": "a", "value": "Option A"}, {"code": "b", "value": "Option B"}]},
 "outputs": [{"outputName": "value", "inputs": [{"id": "select-type", "inputName": "values"}]}]}
```

More complete pages: `samples.md` and the readme samples (layout with relations, pure node, counter).

## 12. Checklist

- [ ] every participant has exactly one entry with `id`, `package`, `name`, `relationsOptions`, `outputs` (array)
- [ ] layout components: `package: 'layout-components'`, `name === id ===` layout id, item kind *layout + relations*
- [ ] pure nodes: real package/name, package feature enabled in `provideDynamic()`, options filled
- [ ] `outputName` exists on the source, `inputName` exists on the target (or is a configured dynamic endpoint)
- [ ] every `inputs[].id` has its own entry
- [ ] scoped items and per-item pure nodes carry the container's `scope`
- [ ] runtime scope uses `withLayoutRelationsRuntime()` (or `withRelationsRuntime()` for static components only)
- [ ] run `scripts/check-metadata.mjs`
