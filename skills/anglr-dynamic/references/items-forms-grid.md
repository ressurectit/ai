# Built-in items: form, material, grid

Catalog of @anglr/dynamic 1.1.0 form, Angular Material and `@anglr/grid` items. Entry format is
explained in `items-basic.md` → How to read entries.

## Contents

- Form fields: common options and relations
- form-components (`withFormComponents()`)
- material-components (`withMaterialComponents()`)
- grid-components (`withGridComponents()`)
- Data table structure
- Data table relations

## Form fields: common options and relations

Every field (`form-components` and `material-components`) extends these option classes:

| Class | Keys |
| --- | --- |
| `FormComponentOptions` (`@anglr/dynamic/form`) | `controlName: string\|null` (name in the parent `FormGroup`), `controlType: 'FormControl'\|'FormArray'\|'FormGroup'` (`FormComponentControlType`, default `'FormControl'`) |
| `FormFieldComponentOptions` | + `label`, `placeholder` |
| `MaterialFormFieldComponentOptions` (`@anglr/dynamic/material-components`) | + `hint`, `appearance` (`MatFormFieldAppearance`, default `'outline'`) |

- The field takes its control from the parent control provided as `FORM_COMPONENT_CONTROL`
  (`parent.get(controlName)`); without parent/`controlName` it creates a standalone control.
  So a field used only for relations (`valueOutput` → logic, no form submit) needs no `formGroup`,
  no `withFormControlBuilder()` and no `FORM_COMPONENT_CONTROL` — `withFormComponents()` is enough.
  `FormComponentControlBuilder.build(layout)` (from `withFormControlBuilder()`) creates the matching
  `FormGroup` from all `controlName`s, nesting groups for `formGroup` items with `controlType: 'FormGroup'`.
- Relations: inputs `value` (patches the control), `required` (adds/removes `Validators.required`),
  `disabled` (disables/enables); output `valueOutput` (current value, emitted on every control change).
- `select` (both packages): input `values` = `{code, value}[]` (option value = `code`, text = `value`);
  feed it through relations (e.g. a `value` node) — the built-in default list is placeholder data
  (`foo`/`bar`). `multiple: true` for multi select.
- `form-components/radio`: `options: {code, text}[]`. `material-components/radio`: `options` is a
  single label string (renders one radio button).
- `form-components/datepicker` renders `<input type="date">` (value `'yyyy-mm-dd'` string), `period` a text input.

## form-components (`withFormComponents()`)

### `form-components/checkbox` — layout + relations
- `CheckboxComponentOptions` (extends FormComponentOptions): `label: string`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', }`

### `form-components/datepicker` — layout + relations
- `DatepickerComponentOptions` (extends FormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', }`

### `form-components/formGroup` — layout
- `FormGroupComponentOptions` (extends FormComponentOptions): `children: LayoutComponentMetadata[]`
- children: `options => options?.children ?? []`
- extensions: ComponentStylingExtension
- palette defaults: `{ controlType: FormComponentControlType.FormGroup }`

### `form-components/numberField` — layout + relations
- `NumberFieldComponentOptions` (extends FormFieldComponentOptions): `min: number`, `max: number`, `decimalPlaces: number`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', }`

### `form-components/period` — layout + relations
- `PeriodComponentOptions` (extends FormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', }`

### `form-components/radio` — layout + relations
- `RadioComponentOptions` (extends FormComponentOptions): `options: RadioOption[]`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ options: [ { code: '1', text: 'Text', }, ], }`

### `form-components/select` — layout + relations
- `SelectComponentOptions` (extends FormFieldComponentOptions): `multiple: boolean`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled`, `values` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', multiple: false, }`

### `form-components/textarea` — layout + relations
- `TextareaComponentOptions` (extends FormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', }`

### `form-components/textField` — layout + relations
- `TextFieldComponentOptions` (extends FormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', }`

## material-components (`withMaterialComponents()`)

Needs `@angular/material` (and its theme). `tabGroup.tabs[].content` holds a `material-components/tab` node; `tab` input `visible` hides the tab.

### `material-components/checkbox` — layout + relations
- `MaterialCheckboxComponentOptions` (extends FormComponentOptions): `label: string`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', }`

### `material-components/datepicker` — layout + relations
- `MaterialDatepickerComponentOptions` (extends MaterialFormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', }`

### `material-components/expansionPanel` — layout
- `MaterialExpansionPanelComponentOptions`: `children: LayoutComponentMetadata[]`, `expanded: boolean`, `title: string`, `description: string`
- children: `options => options?.children ?? []`
- extensions: ComponentStylingExtension
- palette defaults: `{ expanded: true, title: 'Panel title', }`

### `material-components/numberField` — layout + relations
- `MaterialNumberFieldComponentOptions` (extends MaterialFormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', }`

### `material-components/period` — layout + relations
- `MaterialPeriodComponentOptions` (extends MaterialFormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', }`

### `material-components/radio` — layout + relations
- `MaterialRadioComponentOptions` (extends FormComponentOptions): `options: string`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ options: 'Radio' }`

### `material-components/select` — layout + relations
- `MaterialSelectComponentOptions` (extends MaterialFormFieldComponentOptions): `multiple: boolean`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled`, `values` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', multiple: false, }`

### `material-components/tab` — layout + relations
- `MaterialTabComponentOptions`: `children: LayoutComponentMetadata[]`
- children: `options => options?.children ?? []`
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `visible` · out: —

### `material-components/tabGroup` — layout
- `Tab`: `title: string`, `content: LayoutComponentMetadata`
- `MaterialTabGroupComponentOptions`: `tabs: Tab[]`
- children: `options => options?.tabs ? options?.tabs.map(datum => <LayoutComponentMetadata>datum.content) : []`
- extensions: ComponentStylingExtension

### `material-components/textarea` — layout + relations
- `MaterialTextareaComponentOptions` (extends MaterialFormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', }`

### `material-components/textField` — layout + relations
- `MaterialTextFieldComponentOptions` (extends MaterialFormFieldComponentOptions): —
- extensions: ComponentStylingExtension, RelationsRegistrationExtension
- relations in: `value`, `required`, `disabled` · out: `valueOutput`
- palette defaults: `{ label: 'Input label', placeholder: 'Placeholder', hint: 'Hint', }`

## grid-components (`withGridComponents()`)

Needs `@anglr/grid`. Most items are slots/plugins of `dataTable`, see the structure below.

### `grid-components/asyncDataLoader` — layout + relations
- extensions: RelationsRegistrationExtension
- relations in: `result` · out: `page`, `itemsPerPage`, `ordering`

### `grid-components/basicPaging` — layout
- `BasicPagingComponentOptions`: `initialItemsPerPage: number`
- palette defaults: `{ initialItemsPerPage: 15, }`

### `grid-components/dataLoader` — layout
- `DataLoaderComponentOptions`: `plugin: LayoutComponentMetadata`
- children: `options => { if(!options?.plugin) { return []; } return [options.plugin]; }`

### `grid-components/dataTable` — layout
- `DataTableComponentOptions`: `columns: LayoutComponentMetadata<GridColumnsComponentOptions>`, `paging: LayoutComponentMetadata<PagingComponentOptions>`, `dataLoader: LayoutComponentMetadata<DataLoaderComponentOptions>`, `metadataSelector: LayoutComponentMetadata<MetadataSelectorComponentOptions>`
- children: `options => { if(!options) { return []; } return [options.columns, options.paging, options.dataLoader, options.metadataSelector]; }`
- scoped: yes
- extensions: ComponentStylingExtension

### `grid-components/dialogMetadataSelector` — layout + relations
- `DialogMetadataSelectorComponentOptions`: `storageName: string`, `showButtonVisible: boolean`
- extensions: RelationsRegistrationExtension
- relations in: — · out: `grid`
- palette defaults: `{ showButtonVisible: true, }`

### `grid-components/gridColumn` — layout
- `GridColumnComponentOptions`: `header: LayoutComponentMetadata<GridColumnHeaderComponentOptions>`, `content: LayoutComponentMetadata<GridColumnContentComponentOptions>`, `width: string`, `orderingName: string`, `orderable: boolean`
- children: `options => { if(!options) { return []; } return [options.header, options.content]; }`
- palette defaults: `{ width: '1fr', orderable: false, }`

### `grid-components/gridColumnContent` — layout
- `GridColumnContentComponentOptions`: `content: LayoutComponentMetadata`
- children: `options => { if(!options?.content) { return []; } return [options.content]; }`

### `grid-components/gridColumnHeader` — layout
- `GridColumnHeaderComponentOptions`: `content: LayoutComponentMetadata`
- children: `options => { if(!options?.content) { return []; } return [options.content]; }`

### `grid-components/gridColumns` — layout + relations
- `GridColumnsComponentOptions`: `columns: LayoutComponentMetadata<GridColumnComponentOptions>[]`
- children: `options => { return options?.columns ?? []; }`
- relations in: — · out: `row`, `index`, `first`, `last`

### `grid-components/metadataSelector` — layout
- `MetadataSelectorComponentOptions`: `plugin: LayoutComponentMetadata`
- children: `options => { if(!options?.plugin) { return []; } return [options.plugin]; }`

### `grid-components/paging` — layout
- `PagingComponentOptions`: `plugin: LayoutComponentMetadata`
- children: `options => { if(!options?.plugin) { return []; } return [options.plugin]; }`

### `grid-components/previousNextPaging` — layout
- `PreviousNextPagingComponentOptions`: `initialItemsPerPage: number`
- palette defaults: `{ initialItemsPerPage: 15, }`

### `grid-components/showMetadataSelectorButton` — layout + relations
- extensions: RelationsRegistrationExtension
- relations in: `grid` · out: —

### `grid-components/syncDataLoader` — layout + relations
- extensions: RelationsRegistrationExtension
- relations in: `data` · out: —

## Data table structure

`dataTable` owns four fixed slot nodes; the editor creates them on drop, write them all by hand:

```json
{"id": "dataTable-users", "package": "grid-components", "name": "dataTable", "scope": "users-table", "options": {
    "columns": {"id": "gridColumns-users", "package": "grid-components", "name": "gridColumns", "scope": "users-table", "options": {"columns": [
        {"id": "gridColumn-name", "displayName": "Name", "package": "grid-components", "name": "gridColumn", "scope": "users-table",
         "options": {"width": "1fr", "orderable": true, "orderingName": "name",
            "header": {"id": "gridColumnHeader-name", "package": "grid-components", "name": "gridColumnHeader", "scope": "users-table", "options": {"content":
                {"id": "textBlock-nameHeader", "package": "basic-components", "name": "textBlock", "scope": "users-table", "options": {"text": "Name"}}}},
            "content": {"id": "gridColumnContent-name", "package": "grid-components", "name": "gridColumnContent", "scope": "users-table", "options": {"content":
                {"id": "htmlBlock-name", "package": "basic-components", "name": "htmlBlock", "scope": "users-table", "options": {"content": ""}}}}}}
    ]}},
    "dataLoader": {"id": "dataLoader-users", "package": "grid-components", "name": "dataLoader", "options": {"plugin":
        {"id": "asyncDataLoader-users", "package": "grid-components", "name": "asyncDataLoader", "options": {}}}},
    "paging": {"id": "paging-users", "package": "grid-components", "name": "paging", "options": {"plugin":
        {"id": "basicPaging-users", "package": "grid-components", "name": "basicPaging", "options": {"initialItemsPerPage": 15}}}},
    "metadataSelector": {"id": "metadataSelector-users", "package": "grid-components", "name": "metadataSelector", "options": {"plugin": null}}
}}
```

- Columns: `gridColumns.options.columns[]` of `gridColumn`; each has `header` (`gridColumnHeader`) and
  `content` (`gridColumnContent`) wrappers whose `content` is the rendered node (header once, content per row).
  Column title = `displayName || id`; ordering id = `orderingName || displayName || id`; `width` CSS track (default `'1fr'`).
- `dataLoader.plugin`: `asyncDataLoader` (data from relations input `result`) or `syncDataLoader`
  (input `data` array); `null` → empty sync loader.
- `paging.plugin`: `basicPaging` or `previousNextPaging` (`initialItemsPerPage`); `null` → no paging.
- `metadataSelector.plugin`: `dialogMetadataSelector` (`storageName`, `showButtonVisible`) or `null`.
- `scope`: the table and the column nodes share one scope (rows are rendered in row scopes).

## Data table relations

- `asyncDataLoader` outputs `page`, `itemsPerPage`, `ordering` (`SimpleOrdering`) → feed a `rest`
  node's params; `rest.success` → `asyncDataLoader.result` with `PagedData` `{content: T[], totalElements, totalPages}`.
- `syncDataLoader` input `data` (array) when all data are local.
- Per row, `gridColumns` emits `row` (datum), `index`, `first`, `last` under the **gridColumns id** inside the
  row scope → wire `gridColumns-users.row` to nodes inside column content (with `scope` of the table),
  e.g. `transformData` (scoped) → `htmlBlock.content`.
- `dialogMetadataSelector.grid` → `showMetadataSelectorButton.grid` to place the column-selection button elsewhere.
