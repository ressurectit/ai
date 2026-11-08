# `@anglr/select/extensions`

## Contents

- Functions (incl. writing your own)
- Sample (from readme)

## Functions

Helper functions run against a `Select` instance through
`select.execute(action)` (for `SelectAction`s) or
`select.executeAndReturn(fn)` (for `SelectFunction`s).

```typescript
import {getSearch, getSelectedOption, getSelectedOptions, getValue, setReadonly, setValue} from '@anglr/select/extensions';
```

| Function | Kind | Returns / does |
| --- | --- | --- |
| `getValue()` | `SelectFunction` | ValueHandler `value()` — `TPublicValue \| TPublicValue[] \| null`; `undefined` before init |
| `setValue(value)` | `SelectAction` | `valueHandler.setValue(value)` (not awaited); ignored before init |
| `getSearch()` | `SelectFunction` | LiveSearch `search()`; `''` before init |
| `getSelectedOption()` | `SelectFunction` | selected `SelectOption` (or `null`) of a single select; **throws** when `selectedOptions()` is an array (multiple select with a selection) — a multiple select with nothing selected (`null`) returns `null`; `undefined` before init |
| `getSelectedOptions()` | `SelectFunction` | `SelectOption \| SelectOption[] \| null`; `undefined` before init |
| `setReadonly(readonly = true)` | `SelectAction` | merges `{readonly}` into `selectOptions` (works before init) |

The `get*` functions read signals (including `select.initialized()`), so used in
`computed()` / `effect()` they re-run when the select initializes and when
values change. Typical access: `viewChild.required<Select<string>>('select')`.

Writing your own: any `(select: SelectApi<TValue, TPublicValue>) => T` works with
`executeAndReturn`, e.g.

```typescript
import {SelectFunction, SelectPluginType} from '@anglr/select';

export function isPopupOpen<TValue, TPublicValue>(): SelectFunction<boolean, TValue, TPublicValue>
{
    return select => select.initialized() && select.getPlugin(SelectPluginType.Popup).selectBus.popupVisible();
}
```

## Sample (from readme)

**Usage:** the page shows the value, live-search text and selected option text of the first select, and the texts of all options selected in the multiple select. The buttons change the value and toggle readonly:

```typescript
// extensions.component.ts
import {Component, ChangeDetectionStrategy, computed, Signal, viewChild} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FilterLiveSearch, Option, Select, SelectOption, SelectOptions} from '@anglr/select';
import {getSearch, getSelectedOption, getSelectedOptions, getValue, setReadonly, setValue} from '@anglr/select/extensions';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'extensions-sample',
    templateUrl: 'extensions.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtensionsSampleComponent
{
    protected select: Signal<Select<string>> = viewChild.required<Select<string>>('select');
    protected multiSelect: Signal<Select<string>> = viewChild.required<Select<string>>('multiSelect');

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
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

    // reactive reads, recomputed whenever the select changes
    protected value: Signal<string|string[]|undefined|null> = computed(() => this.select().executeAndReturn(getValue()));
    protected search: Signal<string> = computed(() => this.select().executeAndReturn(getSearch()));
    protected selectedOption: Signal<SelectOption<string>|undefined|null> = computed(() => this.select().executeAndReturn(getSelectedOption()));
    protected selectedTexts: Signal<string[]> = computed(() =>
    {
        const options = this.multiSelect().executeAndReturn(getSelectedOptions());

        return (Array.isArray(options) ? options : options ? [options] : []).map(option => option.text());
    });

    protected selectSecond(): void
    {
        this.select().execute(setValue('second'));
    }

    protected toggleReadonly(): void
    {
        const select = this.select();

        select.execute(setReadonly(!select.selectOptions.readonly));
    }
}
```

```html
<!-- extensions.component.html -->
<ng-select #select [selectOptions]="selectOptions">
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
</ng-select>

<button type="button" (click)="selectSecond()">select second</button>
<button type="button" (click)="toggleReadonly()">toggle readonly</button>

<div>Value: {{ value() | json }}</div>
<div>Search: {{ search() }}</div>
<div>Selected option text: {{ selectedOption()?.text() }}</div>

<ng-select #multiSelect multiple>
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
</ng-select>

<div>Selected texts: {{ selectedTexts().join(', ') }}</div>
```

