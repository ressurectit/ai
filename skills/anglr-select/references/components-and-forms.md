# Components and form integration

## Contents

- `Select` (`ng-select`)
- `Option` (`ng-option`), `OptionGroup` (`ng-option-group`)
- `SelectModule`
- Form bridges: `SelectFormControl`, `SelectControlValueAccessor`, `WithDirectAccess`
- Option and value interfaces

## `Select` — `<ng-select>`

`Select<TValue = unknown, TPublicValue = TValue>`; standalone, OnPush. Host
gets class `selectOptions.cssClasses.selectElement` (`select-component`).
Provides its own `SelectBus` and `SelectPluginInstances` (one per select).
`TValue` = type of option values, `TPublicValue` = type of the value written to
forms (differs when `valueExtractor` maps options, e.g. object → id).

| Input | Type | Notes |
| --- | --- | --- |
| `[selectOptions]` | `RecursivePartial<SelectOptions<TValue, TPublicValue>>` | deep-merged with the current options on every set (see `plugins.md`) |
| `[disabled]` | `boolean` (attribute-friendly) | sets `selectOptions.readonly` (disabled == readonly in this library) |
| `[readonly]` | `boolean` (attribute-friendly) | sets `selectOptions.readonly` |

Static attribute `multiple` (read via `@Attribute`) sets `selectOptions.multiple: true`.

Public API — `SelectApi` interface (what actions/functions and plugins see):

| Member | Type | Description |
| --- | --- | --- |
| `selectOptions` | `SelectOptions` | current merged options; assigning a partial object **merges** it (setter on `Select`) |
| `initialized` | `Signal<boolean>` | `true` once all 9 plugins exist and have options; resets to `false` while a plugin is being swapped |
| `events` | `SelectEvents` | `focus`, `click`, `blur` (`Observable<SelectEvent>`), `setFocus()` |
| `getPlugin(SelectPluginType.X)` | typed plugin | live plugin instance (overloads per slot); only valid after `initialized()` |
| `execute(...actions)` | `void` | runs `SelectAction`s `(select: SelectApi) => void` |
| `executeAndReturn(fn)` | `TResult` | runs a `SelectFunction` `(select: SelectApi) => TResult` |

Other public members of `Select` (not part of `SelectApi`):

| Member | Type | From |
| --- | --- | --- |
| `availableOptions` | `Signal<readonly SelectOptionState[] \| undefined \| null>` | `OptionsGatherer` — `<ng-option>` content children (descendants, so `@for`/groups work) |
| `normalStateTemplate`, `optionTemplate`, `normalStateTagTemplate` | `Signal<TemplateRef<…> \| undefined \| null>` | `TemplateGatherer` — gathered template directives |
| `disabled`, `readonly` | `InputSignalWithTransform<boolean, string \| boolean>` | inputs (see above) |

Get the instance with `viewChild.required<Select<string>>('select')` (template
ref `#select`) or `viewChild.required(Select)`.

`Select` implements `OptionsGatherer` and `TemplateGatherer` itself — those are
the defaults of `selectOptions.optionsGatherer` / `templateGatherer`.

## `Option` — `<ng-option>`

`Option<TValue>` implements `SelectOptionState<TValue>`.

| Input | Type | Default |
| --- | --- | --- |
| `[value]` / `value="…"` | `TValue \| undefined \| null` | `undefined` |
| `[text]` / `text="…"` | `string` | `''` |

`group` is resolved automatically from an enclosing `<ng-option-group>`.
Options are queried as descendants of `<ng-select>`, so wrapping them in
`@for`, `@if` or `<ng-option-group>` is fine. Render it self-closing: `<ng-option value="a" text="A"/>`.

## `OptionGroup` — `<ng-option-group>`

| Input | Type |
| --- | --- |
| `text` | `string` (**required**) |

Has a unique `id`; the popup renders a group header followed by its options.
Customize the header with `*optionGroupTemplate="let text"` placed inside the
`<ng-option-group>`. Import `OptionGroup` (and `OptionGroupTemplate` when used).

```html
<ng-select [formField]="field">
    <ng-option-group text="Fruits">
        <ng-option value="apple" text="Apple"/>
        <ng-option value="banana" text="Banana"/>
    </ng-option-group>
    <ng-option-group text="Vegetables">
        <ng-option value="carrot" text="Carrot"/>
        <ng-option value="pea" text="Pea"/>
    </ng-option-group>
</ng-select>
```

## `SelectModule`

NgModule importing/exporting `Select`, `Option`, `OptionGroup` only. Prefer
importing the standalone pieces directly; directives and pipes are never in
the module.

## Form bridges

All three wait for `select.initialized()`, write values through the
ValueHandler's `setValue()` (awaiting async handlers such as
`DynamicValueHandler` while keeping the written value), and read back its
`value()` signal. Equality is checked with lodash `isEqual`.

### `SelectFormControl` — `ng-select[formField]` (signal forms)

Implements Angular `FormValueControl`. Model `value`, inputs `disabled`,
`readonly`, model `touched` (set on first focus), `focus()` method.
`disabled() || readonly()` → `selectOptions.readonly`.

```typescript
import {form, FormField, readonly} from '@angular/forms/signals';
// imports: [Select, Option, FormField, SelectFormControl]
protected field = form(signal<string|null>(null));
protected roField = form(signal<string|null>('a'), path => readonly(path));
```

### `SelectControlValueAccessor` — `ng-select[formControl]`, `[formControlName]`, `[ngModel]`

Classic `ControlValueAccessor` (`NG_VALUE_ACCESSOR`). `setDisabledState` →
readonly; touched on focus.

```typescript
import {FormControl, ReactiveFormsModule} from '@angular/forms';
// imports: [Select, Option, ReactiveFormsModule, SelectControlValueAccessor]
protected ctrl: FormControl<string|null> = new FormControl<string|null>(null);
```

```html
<ng-select [formControl]="ctrl">
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

For `[(ngModel)]` import `FormsModule` + `SelectControlValueAccessor`.

### `WithDirectAccess` — `ng-select[withDirectAccess]`

Model `value` for two-way binding without forms:

```html
<ng-select [(value)]="selectedValue" withDirectAccess>
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

```typescript
// imports: [Select, Option, WithDirectAccess]
protected selectedValue = signal<string|null>(null);
```

### Value shape

- single: `TPublicValue | null | undefined`
- `multiple`: `TPublicValue[]` (`null` until something is written/selected,
  `[]` after clearing); writing a non-array throws, except that
  `StaticValueHandler` accepts `null`/`undefined` as "clear".
- With `StaticValueHandler` (default) a written value that matches no option
  selects nothing; if options are not loaded yet (`availableOptions` is
  `null`/`undefined`, e.g. empty `CodeOptionsGatherer`) the value is
  postponed and applied when options arrive.

## Option and value interfaces

| Interface | Members |
| --- | --- |
| `SelectOption<TValue>` | `value: Signal<TValue \| undefined \| null>`, `text: Signal<string>`, `group: Signal<SelectOptionGroup \| undefined \| null>` — what you create in code (`{value: signal(x), text: signal('X'), group: signal(null)}`) |
| `SelectOptionState<TValue>` | `SelectOption` + `index: number`, `active: WritableSignal<boolean>`, `selected: WritableSignal<boolean>` — what plugins/templates receive |
| `SelectOptionStateSyntetic<TValue>` | `SelectOptionState` + `created?: boolean` (the synthetic "add new option" entry) |
| `SelectOptionGroup` | `index: number`, `readonly id: string`, `text: Signal<string>`, `template: Signal<TemplateRef<{$implicit: string}> \| undefined \| null>` |
| `SelectEvents` | `focus`, `click`, `blur` observables + `setFocus()` |
| `SelectEvent<TData>` | `sourceElement: HTMLElement`, `source: SelectApi \| SelectPlugin`, `data: TData \| undefined \| null` |
| `SelectApi<TValue, TPublicValue, TCssClasses>` | interface implemented by `Select` (table above) |
| `OptionsGatherer<TValue>` | `readonly availableOptions: Signal<readonly SelectOptionState<TValue>[] \| undefined \| null>` |
| `TemplateGatherer<TValue, TPublicValue>` | `readonly` `normalStateTemplate`, `optionTemplate`, `normalStateTagTemplate`: `Signal<TemplateRef<…Context> \| undefined \| null>` |
| `InitState` | `{initialized: boolean}` (internal init bookkeeping) |
| `TempValue<TValue>` | `{value?}` — temporary value kept by form bridges during async writes |
