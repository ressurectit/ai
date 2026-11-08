# Extensibility: custom plugins, bus, gatherers, utilities

## Contents

- How plugins are created
- `SelectPlugin` contract
- `SelectBus` (shared state and events)
- `SelectPluginInstances`
- Utility functions, types, decorators
- Custom options source (`OptionsGatherer`, `CodeOptionsGatherer`)
- Custom plugin examples (readme): ReadonlyState, OptionsHandler, ValueHandler
- Checklist

## How plugins are created

`Select` creates every plugin with `ViewContainerRef.createComponent(type)` inside
its own template (non-visual slots first, then normal/readonly state and
popup inside `div.visual-container`). So a plugin is a **standalone component**
that gets the select's element injector:

- `inject(SelectBus)`, `inject(SelectPluginInstances)`, `inject(ElementRef)`
- optional `@Inject(<SLOT>_OPTIONS) @Optional()` constructor param for DI options
- the select then assigns `plugin.options = plugins.<slot>.options` (only when
  options are given). Use `@CopyOptionsAsSignal()` on the `options` property so
  the assignment **merges** into defaults and is readable in signals/effects.

Register via `plugins.<slot>.type` in `[selectOptions]` or
`provide<Slot>Type(MyPlugin)`.

## `SelectPlugin<TOptions, TValue, TPublicValue, TAction>`

| Member | Type |
| --- | --- |
| `selectPlugins` | `SelectPluginInstances<TValue, TPublicValue>` |
| `pluginElement` | `ElementRef<HTMLElement>` |
| `options` | `TOptions` |
| `selectBus` | `SelectBus<TValue, TPublicValue, TAction>` |

Slot interfaces add: `LiveSearch` → `search`, `emptyInput` signals + `focus()`;
`NormalState`/`ReadonlyState` → `focus()`; `OptionsHandler` →
`availableOptions`, `listOptions` signals; `ValueHandler` → `value` signal +
`setValue()`; `Interactions`, `KeyboardHandler`, `Popup`, `Positioner` → nothing
extra. Option base interfaces: `PluginOptions` (empty marker),
`VisualPluginOptions<TCssClasses>` (`cssClasses`). CSS-class marker interfaces:
`NormalStateCssClasses`, `ReadonlyStateCssClasses`, `PopupCssClasses`,
`LiveSearchCssClasses`, `SelectCssClasses`.

## `SelectBus<TValue, TPublicValue, TAction>` (one per select)

| Member | Kind | Purpose |
| --- | --- | --- |
| `id` | `string` | unique id (popup `id`, aria) |
| `selectOptions` | `Signal<SelectBusOptions>` | current global options |
| `selectElement` | `Signal<ElementRef<HTMLElement>>` | `<ng-select>` element |
| `selectedOptions` | `WritableSignal<SelectOptionState \| SelectOptionState[] \| null>` | the selection (source of `value`) |
| `popupVisible` | `WritableSignal<boolean>` | popup open state |
| `hasFocus` / `hasFocusComputed` | signal | focus state |
| `optionActivate` | `Subject<SelectEvent<SelectOptionState>>` | "select this option" (`null` data = clear) |
| `markOption` | `Subject<SelectEvent<SelectOptionState>>` | make option active (opens popup) |
| `keyboardAction` | `Subject<SelectEvent<KeyboardAction<TAction>>>` | keyboard → interactions (`SimpleKeyboardActionTypes`) |
| `showPopup` / `hidePopup` | `Subject<SelectEvent>` | open / close requests |
| `internalsFocus` / `internalsBlur` | `Subject<SelectEvent>` | report focus of internal elements |
| `focusSet` | `Subject<void>` | request to focus (from `setFocus()`) |
| `focus` / `click` / `blur` | `Subject<SelectEvent>` | public events (`select.events`); visual plugins emit `click` on user click |
| `setFocus()` | method | focuses NormalState and LiveSearch |

Keyboard actions: `SelectActiveKeyboardAction` (`'SELECT_ACTIVE'`),
`SelectFirstKeyboardAction` (`'SELECT_FIRST'`, `search`),
`RemoveLastSelectedValueKeyboardAction` (`'REMOVE_LAST_SELECTED_VALUE'`), union
`SimpleKeyboardActions`, base `KeyboardAction<TType>`.

## `SelectPluginInstances`

Class holding one `WritableSignal` per slot (`interactions`, `keyboardHandler`,
`liveSearch`, `normalState`, `optionsHandler`, `popup`, `positioner`,
`readonlyState`, `valueHandler`; may be `null`) plus PascalCase getters
(`Interactions`, `LiveSearch`, `OptionsHandler`, …) that **throw** when the
plugin doesn't exist yet. In effects prefer the nullable signal
(`this.selectPlugins.liveSearch()?.search()`) unless the plugin is guaranteed.

## Utility functions (exported)

| Function | Purpose |
| --- | --- |
| `selectOption(selectBus, option)` | select/toggle option (multiple toggles; `null` clears); respects `closeOnSelect` |
| `togglePopup(selectBus)` | flip `popupVisible` |
| `handleClickOutside(document, selectBus, selectPlugins)` | registers outside-`mouseup` closing, returns unregister function |
| `compareValueAndOption(value, option, selectBus)` | `valueComparer(value, valueExtractor(option))` |
| `compareSelectOptions(a, b, selectBus)` | same option or equal extracted values |
| `computedValue.call(valueHandler)` | public value from `selectBus.selectedOptions()` (use with `computed(computedValue.bind(this))`) |
| `hasValue(selected)` | non-null option or non-empty array |
| `CopyOptionsAsSignal()` | property decorator: setter deep-merges into current value, stored as signal |

Types: `SelectAction`, `SelectFunction`, `DisplayTextFunc`, `ValueEqualityFunc`,
`ValueExtractorFunc`, `TextExtractorFunc`, `TextComparerFunc`,
`NormalizeTextForComparison`, `ValueComputedFunc`, `OptionGetterFunc`,
`NewOptionGetterFunc`, `SimpleKeyboardActionTypes`, `SimpleKeyboardActions`.
Interfaces `PluginDescription<TPlugin, TOptions>` (`{type, options}`) and
`SelectPluginTypes` (the `plugins` map).

## Options from code: `OptionsGatherer` / `CodeOptionsGatherer`

`selectOptions.optionsGatherer` is anything with
`availableOptions: Signal<readonly SelectOptionState[] | null | undefined>`.
`CodeOptionsGatherer<TValue>` is the ready-made one:

```typescript
protected optionsGatherer: CodeOptionsGatherer<string> = new CodeOptionsGatherer<string>();
// selectOptions: {optionsGatherer: this.optionsGatherer, …}
this.optionsGatherer.setAvailableOptions(items.map(item =>
({
    value: signal(item.id),
    text: signal(item.name),
    group: signal(null),
})));
```

`availableOptions()` is `null` until the first `setAvailableOptions()` (the
default `StaticValueHandler` postpones written values until then). Pair with
`DynamicValueHandler` + `optionGetter` when the selected value may be missing
from the current list (server search). Ignore stale responses when the search
changes quickly:

```typescript
let lastQuery = '';

effect(async () =>
{
    const query = this.select().executeAndReturn(getSearch());
    lastQuery = query;

    const result = await this.itemsSvc.search(query);

    if(lastQuery !== query)
    {
        return;
    }

    this.optionsGatherer.setAvailableOptions(result.map(item => ({value: signal(item.id), text: signal(item.name), group: signal(null)})));
});
```

## Custom plugin examples (from readme)

### Implementing a Custom Plugin

To create a custom plugin, implement the corresponding plugin interface (or extend a provided base class) and register it via `selectOptions` or a provider. A plugin is a standalone component that the select creates dynamically. It gets the shared `SelectPluginInstances`, its own `ElementRef` and the `SelectBus` through `inject()`, and the select assigns `options` from the plugin description.

**Example: Custom ReadonlyState Plugin**

A custom readonly state that renders the selected values as plain text, or "No value selected":

```typescript
import {Component, ChangeDetectionStrategy, ElementRef, inject} from '@angular/core';
import {ReadonlyState, ReadonlyStateOptions, SelectBus, SelectPluginInstances} from '@anglr/select';

@Component(
{
    selector: 'custom-readonly-state',
    template: `
        <div class="custom-readonly">
            @if (selectBus.selectedOptions(); as selected) {
                @if (isArray(selected)) {
                    @for (opt of selected; track $index) {
                        <span class="tag">{{ opt.text() }}</span>
                    }
                } @else {
                    <span>{{ selected.text() }}</span>
                }
            } @else {
                <em>No value selected</em>
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomReadonlyStateComponent implements ReadonlyState
{
    public readonly selectPlugins: SelectPluginInstances = inject(SelectPluginInstances);
    public readonly pluginElement: ElementRef<HTMLElement> = inject(ElementRef);
    public readonly selectBus: SelectBus = inject(SelectBus);

    public options: ReadonlyStateOptions =
    {
        cancelValue: false,
        texts:
        {
            cancelTitle: '',
        },
        cssClasses: {},
    };

    protected isArray = Array.isArray;

    public focus(): void
    {
        // no-op for readonly
    }
}
```

**Register the custom plugin.** The select below is readonly, so it renders the custom component instead of the normal state:

```typescript
// customReadonlyState.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField, readonly} from '@angular/forms/signals';
import {Option, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

import {CustomReadonlyStateComponent} from './customReadonlyStatePlugin.component';

@Component(
{
    selector: 'custom-readonly-state-sample',
    templateUrl: 'customReadonlyState.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomReadonlyStateSampleComponent
{
    protected field = form(signal<string|null>('a'), path => readonly(path));

    protected selectOptions: RecursivePartial<SelectOptions> =
    {
        plugins:
        {
            readonlyState:
            {
                type: CustomReadonlyStateComponent,
            },
        },
    };
}
```

```html
<!-- customReadonlyState.component.html -->
<ng-select [selectOptions]="selectOptions" [formField]="field">
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

**Example: Custom OptionsHandler Plugin**

`OptionsHandlerBase` provides the injected plugin fields and the *add new option* support, so a custom options handler only needs `options`, `availableOptions` and `listOptions`. This one filters options by the live-search text and lists them sorted alphabetically, regardless of the order of the `<ng-option>` elements:

```typescript
import {Component, ChangeDetectionStrategy, computed, Signal} from '@angular/core';
import {OptionsHandler, OptionsHandlerBase, OptionsHandlerOptions, SelectOptionState} from '@anglr/select';

/**
 * Options handler that filters options by live search text and lists them sorted alphabetically by text
 */
@Component(
{
    selector: 'sorted-options-handler',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortedOptionsHandler<TValue = unknown, TPublicValue = TValue> extends OptionsHandlerBase<TValue, TPublicValue> implements OptionsHandler<TValue, TPublicValue>
{
    public options: OptionsHandlerOptions<TValue> =
    {
        newOptionGetter: null,
        newOptionOnlyWhenNoOptions: false,
    };

    public readonly availableOptions: Signal<readonly SelectOptionState<TValue>[]|undefined|null> = computed(() => this.selectBus.selectOptions().optionsGatherer.availableOptions());

    public readonly listOptions: Signal<readonly SelectOptionState<TValue>[]|undefined|null> = computed(() =>
    {
        const search = this.selectPlugins.LiveSearch.search();
        const options = this.selectBus.selectOptions();

        return this.availableOptions()
            ?.filter(option => !search || options.textCompare(options.normalize(options.textExtractor(option)), options.normalize(search)))
            .sort((first, second) => options.textExtractor(first).localeCompare(options.textExtractor(second)));
    });
}
```

```typescript
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {FilterLiveSearch, Option, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

import {SortedOptionsHandler} from './sortedOptionsHandler.component';

@Component(
{
    selector: 'custom-options-handler-sample',
    template: `
        <ng-select [selectOptions]="selectOptions" [formField]="field">
            <ng-option value="c" text="Cherry"/>
            <ng-option value="a" text="Apple"/>
            <ng-option value="b" text="Banana"/>
        </ng-select>
    `,
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomOptionsHandlerSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions> =
    {
        plugins:
        {
            optionsHandler:
            {
                type: SortedOptionsHandler,
            },
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

**Custom ValueHandler**

A value handler implements `ValueHandler`: a `value` signal and a `setValue(value)` method. `setValue` returns `PromiseOr<void>`, so a value handler can resolve the written value asynchronously, as `DynamicValueHandler` does with its `optionGetter`. `SelectFormControl`, `SelectControlValueAccessor` and `WithDirectAccess` wait for the returned promise and keep the written value meanwhile.

---

`OptionsHandlerBase<TValue, TPublicValue, TOptions>` (abstract directive) gives
`selectPlugins`, `pluginElement`, `selectBus` and a protected `firstOption`
signal with the synthetic "add new option" entry computed from
`options.newOptionGetter` + live search; prepend it in `listOptions` (respect
`newOptionOnlyWhenNoOptions`) if you want that feature.

## Checklist for a custom plugin

- standalone `@Component`, `changeDetection: OnPush`, template `''` for non-visual slots
- implements the slot interface with the 4 `SelectPlugin` members via `inject()`
- default `options` object complete (plugins read options synchronously); add
  `@CopyOptionsAsSignal()` if you want partial `plugins.<slot>.options` merged
- visual plugins: emit `selectBus.click` / `internalsFocus` / `internalsBlur`
  / `optionActivate` like the built-ins so interactions and form `touched` work
- register with `plugins.<slot>.type` or `provide<Slot>Type()`
