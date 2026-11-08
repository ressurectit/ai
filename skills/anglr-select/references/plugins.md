# Plugins, options, providers and tokens

## Contents

- `SelectOptions` (global options) with defaults
- Plugin slots overview
- Built-in plugins and their options (defaults)
- Configuring: `[selectOptions]` vs DI providers, merge order
- Injection tokens and `provide*()` helpers
- Samples (config object, providers)

## `SelectOptions<TValue, TPublicValue, TCssClasses>`

Extends `SelectBusOptions` (the part plugins see through `selectBus.selectOptions()`).
Pass a `RecursivePartial<SelectOptions>` (`RecursivePartial` from `@jscrpt/common`).

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `multiple` | `boolean` | `false` (`true` with `multiple` attribute) | multi-select; value is an array |
| `readonly` | `boolean` | `false` | readonly state (also driven by `disabled`/`readonly` inputs and form state); swaps NormalState ↔ ReadonlyState plugin |
| `placeholder` | `string` | `'please select value'` | shown when nothing selected (localizable) |
| `closeOnSelect` | `boolean` | `true` | close popup after a pick |
| `absolute` | `boolean` | `false` | move popup to `document.body` |
| `containerElement` | `string \| null` | `'div.select-component'` | element created in body to host the absolute popup (so theme CSS still matches) |
| `optionsGatherer` | `OptionsGatherer<TValue>` | the `Select` itself (`<ng-option>` children) | source of options; use `CodeOptionsGatherer` for options from code |
| `templateGatherer` | `TemplateGatherer` | the `Select` itself | source of custom templates |
| `displaySelectedValue` | `(option: SelectOption) => string` | `option => option.text()` | text of selected option(s) in normal/readonly state |
| `displayOptionValue` | `DisplayTextFunc \| null` | `null` (→ `displaySelectedValue`) | text of options in the popup |
| `valueExtractor` | `(option: SelectOption<TValue>) => TPublicValue` | `option => option.value()` | public value written to forms |
| `valueComparer` | `(a: TPublicValue, b: TPublicValue) => boolean` | `===` | matches written values to options |
| `textExtractor` | `(option) => string` | `option => option.text()` | text used for filtering / alphanumeric search |
| `normalize` | `NormalizeTextForComparison` | removes accents (`normalizeAccent`) | applied to both option text and search |
| `textCompare` | `(source, target) => boolean` | `!!source.match(new RegExp(target, 'i'))` | filter predicate; **search is a regex** |
| `cssClasses` | `SelectCssClasses` | `{visualContainer: 'visual-container', selectElement: 'select-component'}` | host / container classes |
| `plugins` | `SelectPluginTypes` | see below | per-slot `{type, options}` (`PluginDescription`) |

Object values, form stores a key:

```typescript
protected selectOptions: RecursivePartial<SelectOptions<Item, string>> =
{
    // RecursivePartial strips call signatures → type the parameter explicitly
    valueExtractor: (option: SelectOption<Item>) => option.value()?.id ?? '',
};
```

## Plugin slots

`selectOptions.plugins.<slot> = {type?: Type<Plugin>, options?: RecursivePartial<Options>}`.
`SelectPluginType` enum values (`'Interactions'`, …) are used with `getPlugin()`.

| Slot key / enum | Interface | Default type | Alternatives in package | Options interface |
| --- | --- | --- | --- | --- |
| `interactions` / `Interactions` | `Interactions` | `SimpleInteractions` | — | `InteractionsOptions` |
| `keyboardHandler` / `KeyboardHandler` | `KeyboardHandler` | `SimpleKeyboardHandler` | — | `SimpleKeyboardHandlerOptions` (base `KeyboardHandlerOptions`) |
| `liveSearch` / `LiveSearch` | `LiveSearch` | `NoLiveSearch` | `FilterLiveSearch`, `EditLiveSearch` | `LiveSearchOptions`, `FilterLiveSearchOptions` |
| `normalState` / `NormalState` | `NormalState` | `SimpleNormalState` | `EditNormalState` | `NormalStateOptions`, `EditNormalStateOptions` |
| `optionsHandler` / `OptionsHandler` | `OptionsHandler` | `SimpleOptionsHandler` | `NoOptionsHandler` | `SimpleOptionsHandlerOptions` (base `OptionsHandlerOptions`) |
| `popup` / `Popup` | `Popup` | `SimplePopup` | — | `PopupOptions` |
| `positioner` / `Positioner` | `Positioner` | `CommonPositioner` | `PopoverPositioner`, `NoPositioner` | `CommonPositionerOptions`, `PopoverPositionerOptions` |
| `readonlyState` / `ReadonlyState` | `ReadonlyState` (= `NormalState`) | `SimpleNormalState` | any NormalState / custom | `ReadonlyStateOptions` (= `NormalStateOptions`) |
| `valueHandler` / `ValueHandler` | `ValueHandler` | `StaticValueHandler` | `DynamicValueHandler` | `ValueHandlerOptions`, `DynamicValueHandlerOptions` |

## Built-in plugins

### `SimpleInteractions` (`simple-interactions`)

Toggles popup on click, selects on option click (`selectOption()`), tracks focus/blur
(emits `select.events`), activates first option when none is active, handles
keyboard actions `SELECT_ACTIVE`, `SELECT_FIRST`, `REMOVE_LAST_SELECTED_VALUE`.

| Option | Default | |
| --- | --- | --- |
| `handleClickOutside` | `true` | close popup on `mouseup` outside select and popup |

### `SimpleKeyboardHandler` (`simple-keyboard-handler`)

Listens to `keydown` on `<ng-select>`: ArrowUp/Down move active option (wraps,
opens popup), Enter selects active option (popup open), Tab/Escape close,
Space opens, alphanumeric keys select first option whose normalized text
starts with typed text (case-sensitive).

| Option | Default | |
| --- | --- | --- |
| `selectFirstDebounceTimeout` | `300` | ms to collect typed characters |
| `openPopupOnSpace` | `true` | Space opens popup |
| `alphanumericSearch` | `true` | type-to-select |
| `liveSearchEvents` | `false` | listen on live-search element too (Backspace on empty input → remove last value) |

### Live search

`LiveSearch` interface: `search: Signal<string>`, `emptyInput: Signal<boolean>`, `focus()`.
Base options `LiveSearchOptions`: `searchDebounceTimeout`, `cssClasses.componentElement`.

| Plugin | Selector | Description | Option defaults |
| --- | --- | --- | --- |
| `NoLiveSearch` | `no-live-search` | `search()` always `''` | `searchDebounceTimeout: 0` |
| `FilterLiveSearch` | `filter-live-search` | text input rendered **inside the popup** — requires `popup.options.liveSearchEnabled: true` | `searchDebounceTimeout: 280` (read once in the constructor — see note below), `texts` (`FilterLiveSearchTexts`): `searchPlaceholder: 'filter options'`, `cssClasses.componentElement: 'live-search-component'` |
| `EditLiveSearch` | `edit-live-search` | input rendered inside `EditNormalState` (used by `edit`); opens popup on input, clears on selection / blur, shows `placeholder` | `searchDebounceTimeout: 280`, `cssClasses` (`EditLiveSearchCssClasses`): `componentElement: 'live-search-component'`, `searchElement: 'live-search-input'`, `multiple: 'select-flex-1'`, `single: 'absolute-input'` |

**`FilterLiveSearch.searchDebounceTimeout` cannot be set via `[selectOptions]`**: it is read
once in the constructor, before `plugins.liveSearch.options` are assigned, so that value is
silently ignored. Only the DI token works (component `providers` or app config):

```typescript
providers: [provideLiveSearchOptions<FilterLiveSearchOptions>({searchDebounceTimeout: 500})],
```

All other built-in plugin options are read reactively (in `computed()`/`effect()` or at use
time), so they can be changed through `[selectOptions]` at any time.

`EditLiveSearch` needs `EditNormalState` (it is moved into its placeholder) — use
them together (the `edit` directive does).

### Normal / readonly state

`NormalState` interface: `focus()`. `NormalStateOptions`: `cancelValue`,
`texts` (`NormalStateTexts`: `cancelTitle`), `cssClasses`. Readonly state uses the same component types.

| Plugin | Description | Defaults |
| --- | --- | --- |
| `SimpleNormalState` (`simple-normal-state`) | `<button role="combobox">` with value text (or `normalStateTemplate`), optional cancel button, caret button (always rendered) | `cancelValue: false`, `texts.cancelTitle: 'cancel selected values'`, `cssClasses` (`SimpleNormalStateCssClasses`): `componentElement: 'normal-state-component'`, `element: 'normal-state-element'`, `value: 'select-align-self-center'`, `carret: 'normal-state-carret'`, `carretIcon: 'fas fa-caret-down select-align-self-center'`, `cancel: 'normal-state-cancel'`, `cancelIcon: 'fas fa-times select-align-self-center'` |
| `EditNormalState` (`edit-normal-state`) | hosts `EditLiveSearch` input, tags for multiple (`normalStateTagTemplate`) | `cancelValue: true`, `carret: true`, `texts.cancelTitle`, `cssClasses` (`EditNormalStateCssClasses`): `componentElement`, `value: 'normal-state-value'`, `tag: 'select-tag'`, `carret: 'fas fa-caret-down select-align-self-center'`, `cancel`, `cancelIcon`, `valueWrapper`, `valueMultiple`, `valueSingle` |

Cancel button emits `optionActivate` with `null` → clears value.

### Options handler

`OptionsHandler` interface: `availableOptions` (all options from gatherer) and
`listOptions` (what the popup shows) signals.
`OptionsHandlerOptions<TValue>`: `newOptionGetter: (text: string) => SelectOption<TValue>` (default `undefined`) and `newOptionOnlyWhenNoOptions` (default `false`).

| Plugin | Description | Extra option |
| --- | --- | --- |
| `SimpleOptionsHandler` | filters `availableOptions` by `search()` using `normalize` + `textCompare`; prepends the synthetic "add new option" entry when `newOptionGetter` is set and search is non-empty | `listSelected: true` — `false` hides already-selected options |
| `NoOptionsHandler` | no filtering (use when the server already filters, e.g. `CodeOptionsGatherer`); still supports `newOptionGetter` | — |

### `SimplePopup` (`simple-popup`)

Renders the listbox when `popupVisible` (or `options.visible`), groups,
`optionTemplate`, check mark for selected options in multiple, "no options" text,
live-search placeholder, search highlighting (host directive `HighlightInstance`).

| Option | Default |
| --- | --- |
| `visible` | `false` (force always visible) |
| `liveSearchEnabled` | `false` (render LiveSearch plugin element inside popup — needed for `FilterLiveSearch`) |
| `searchHighlighting` | `true` |
| `texts` (`PopupTexts`) | `noAvailableOptions: 'no options available'`, `addNewOption: 'add new option'`, `optionsList: 'options list'` (aria-label) |
| `cssClasses` (`SimplePopupCssClasses`) | `componentElement: 'popup-component'`, `option: 'option'`, `optionGroup: 'option-group'`, `optionText: 'option-text'`, `optionChecked: 'fas fa-check'`, `popupContainer: 'popup-container'`, `active: 'active'`, `selected: 'selected'`, `inGroup: 'in-group'` |

### Positioners

Base interfaces: `Positioner`, `PositionerOptions` (empty marker).

| Plugin | Description | Options |
| --- | --- | --- |
| `CommonPositioner` (default) | `position: absolute`, min-width = select width (ResizeObserver), places popup below-start with flip and auto-update using `POSITION` from `@anglr/common` (**requires `providePosition(...)`**) | `zIndex: 0` (`null` = don't set) |
| `PopoverPositioner` | native Popover API (`popover="manual"`/`"auto"`), top layer; placement by CSS anchor positioning in the theme (`anchor-name: --popup-anchor`, fallbacks) — needs a browser with anchor positioning | `popoverAuto: false`; with `true` the browser closes on outside click → set `interactions.options.handleClickOutside: false` |
| `NoPositioner` | does nothing (inline popup, style it yourself) | — |

### Value handlers

`ValueHandler` interface: `value: Signal<TPublicValue | TPublicValue[] | null>`,
`setValue(value): PromiseOr<void>`.

| Plugin | Description | Options |
| --- | --- | --- |
| `StaticValueHandler` (default) | selects options from `availableOptions` matching the value via `valueComparer(value, valueExtractor(option))`; postpones the write until options are loaded | — |
| `DynamicValueHandler` | does not search the options; resolves each written value through `optionGetter` (sync or async) — for remote/`CodeOptionsGatherer` options where the selected option may not be in the current list | `optionGetter: (value: TPublicValue) => PromiseOr<SelectOption<TValue> \| undefined \| null>` (default returns a placeholder option with text `'please provide your optionGetter'` — always set it when values are written from outside). In a single select it is also called with `null`/`undefined` when the value is cleared/reset from outside (form reset, bridges call `setValue(null)`) and must then return `null`; in multiple it is called per array item (writing `null` throws) |

## Configuring

### Per instance: `[selectOptions]`

```typescript
protected options: RecursivePartial<SelectOptions<string>> =
{
    plugins:
    {
        liveSearch: {type: FilterLiveSearch},
        popup: {options: {liveSearchEnabled: true}},
    },
};
```

```html
<ng-select [selectOptions]="options" [formField]="field">…</ng-select>
```

Options are typed against the base option interfaces; cast slot-specific ones,
e.g. `{popoverAuto: true} as PopoverPositionerOptions`,
`{carret: false} as EditNormalStateOptions`.

Assigning a new object merges it into the current options (it never resets
other properties); to turn something off, assign it explicitly (`false`, `null`).

### DI: component-, route- or app-wide

| Helper | Token | Applies |
| --- | --- | --- |
| `provideSelectOptions(options)` | `SELECT_OPTIONS` | whole `RecursivePartial<SelectOptions>` |
| `provideInteractionsType(type)` / `provideInteractionsOptions(opts)` | `INTERACTIONS_TYPE` / `INTERACTIONS_OPTIONS` | Interactions |
| `provideKeyboardHandlerType` / `provideKeyboardHandlerOptions<T>` | `KEYBOARD_HANDLER_TYPE` / `KEYBOARD_HANDLER_OPTIONS` | KeyboardHandler |
| `provideLiveSearchType` / `provideLiveSearchOptions<T>` | `LIVE_SEARCH_TYPE` / `LIVE_SEARCH_OPTIONS` | LiveSearch |
| `provideNormalStateType` / `provideNormalStateOptions<T>` | `NORMAL_STATE_TYPE` / `NORMAL_STATE_OPTIONS` | NormalState |
| `provideOptionsHandlerType` / `provideOptionsHandlerOptions<T>` | `OPTIONS_HANDLER_TYPE` / `OPTIONS_HANDLER_OPTIONS` | OptionsHandler |
| `providePopupType` / `providePopupOptions<T>` | `POPUP_TYPE` / `POPUP_OPTIONS` | Popup |
| `providePositionerType` / `providePositionerOptions<T>` | `POSITIONER_TYPE` / `POSITIONER_OPTIONS` | Positioner |
| `provideReadonlyStateType` / `provideReadonlyStateOptions<T>` | `READONLY_STATE_TYPE` / `READONLY_STATE_OPTIONS` | ReadonlyState |
| `provideValueHandlerType` / `provideValueHandlerOptions<T>` | `VALUE_HANDLER_TYPE` / `VALUE_HANDLER_OPTIONS` | ValueHandler |

Put them in `ApplicationConfig.providers` (all selects) or a component's
`providers` (selects in its view). `*Options` tokens are injected by the plugin
constructor (and also by alternative plugins of the same slot, so options of
another plugin type are simply ignored if irrelevant).

Caveat: no built-in plugin injects `READONLY_STATE_OPTIONS`, so
`provideReadonlyStateOptions()` only matters for custom readonly plugins. The
default readonly state is a `SimpleNormalState` and therefore reads
`NORMAL_STATE_OPTIONS` (plus `plugins.readonlyState.options`).

Merge order (later wins): select defaults → `multiple` attribute →
`SELECT_OPTIONS` → `*_TYPE` tokens → directives / `[selectOptions]`.
Per plugin: plugin defaults → `*_OPTIONS` token → `plugins.<slot>.options`.

### Sample: config object (from readme)

```typescript
// configuringPlugins.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {FilterLiveSearch, Option, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'configuring-plugins-sample',
    templateUrl: 'configuringPlugins.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfiguringPluginsSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected options: RecursivePartial<SelectOptions> =
    {
        plugins:
        {
            liveSearch:
            {
                type: FilterLiveSearch,
            },
            popup:
            {
                options:
                {
                    liveSearchEnabled: true,
                },
            },
        },
    };
}
```

### Sample: providers (equivalent of the `edit` directive, from readme)

```typescript
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {EditLiveSearch, EditNormalState, Option, provideKeyboardHandlerOptions, provideLiveSearchType, provideNormalStateType, Select, SelectFormControl, SimpleKeyboardHandlerOptions} from '@anglr/select';

@Component(
{
    selector: 'plugin-providers-sample',
    template: `
        <ng-select [formField]="field">
            <ng-option value="a" text="Alpha"/>
            <ng-option value="b" text="Beta"/>
        </ng-select>
    `,
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    providers:
    [
        provideNormalStateType(EditNormalState),
        provideLiveSearchType(EditLiveSearch),
        provideKeyboardHandlerOptions<SimpleKeyboardHandlerOptions>(
        {
            alphanumericSearch: false,
            liveSearchEvents: true,
            openPopupOnSpace: false,
        }),
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginProvidersSampleComponent
{
    protected field = form(signal<string|null>(null));
}
```

App-wide example (all selects get a clear button and higher z-index):

```typescript
import {ApplicationConfig} from '@angular/core';
import {CommonPositionerOptions, NormalStateOptions, provideNormalStateOptions, providePositionerOptions} from '@anglr/select';

export const appConfig: ApplicationConfig =
{
    providers:
    [
        provideNormalStateOptions<NormalStateOptions>({cancelValue: true}),
        providePositionerOptions<CommonPositionerOptions>({zIndex: 1000}),
    ],
};
```
