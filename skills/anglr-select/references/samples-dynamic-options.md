# Samples: dynamic and remote options

Usage samples for @anglr/select v17.3.0, taken from the package readme (compile-validated), except where noted. All use standalone components, OnPush and signals. `ItemsService` in the remote samples is an app service: `search(query): Promise<Item[]>`, `getDetail(id): Promise<Item|null>`, `Item = {id: string, name: string}`.

## Contents

- Lazy / Dynamic Options
- Dynamic Options with Remote Data (adapted from readme)
- Dynamic Option Getter (Object Values) (adapted from readme)
- Option Groups from Code (not from readme)

## Lazy / Dynamic Options

Options can be loaded asynchronously. Use signals and `@for` to render them once loaded; here the options show up after 2.5 seconds:

```typescript
// basicLazy.component.ts
import {Component, ChangeDetectionStrategy, WritableSignal, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectFormControl} from '@anglr/select';

interface Item
{
    id: string;
    name: string;
}

@Component(
{
    selector: 'basic-lazy-sample',
    templateUrl: 'basicLazy.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicLazySampleComponent
{
    protected selectField = form(signal<string|null>(null));
    protected lazyOptions: WritableSignal<Item[]> = signal([]);

    constructor()
    {
        // Simulate async loading
        setTimeout(() =>
        {
            this.lazyOptions.set(
            [
                {id: 'first', name: 'First value text'},
                {id: 'second', name: 'Second value text'},
                {id: 'third', name: 'Third value text'},
            ]);
        }, 2500);
    }
}
```

```html
<!-- basicLazy.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select [formField]="selectField">
    @for (option of lazyOptions(); track option.id) {
        <ng-option [value]="option.id" [text]="option.name"/>
    }
</ng-select>
```

## Dynamic Options with Remote Data (adapted from readme)

Use `CodeOptionsGatherer` + `DynamicValueHandler` + `FilterLiveSearch` to load options from a remote API. The options are fetched again whenever the live-search text changes. `ItemsService.search(query)` returns a `Promise<Item[]>`, where `Item` has an `id` and a `name`. The `optionGetter` is required whenever the value is set or reset from code (initial value, `setValue`, form reset → `null`); without it the default getter shows `please provide your optionGetter`:

```typescript
// dynamic.component.ts
import {Component, ChangeDetectionStrategy, effect, inject, Signal, viewChild, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {CodeOptionsGatherer, DynamicValueHandler, FilterLiveSearch, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {getSearch} from '@anglr/select/extensions';
import {RecursivePartial} from '@jscrpt/common';

import {ItemsService} from './items.service';

@Component(
{
    selector: 'dynamic-sample',
    templateUrl: 'dynamic.component.html',
    imports:
    [
        Select,
        JsonPipe,
        FormField,
        SelectFormControl,
    ],
    providers:
    [
        ItemsService,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicSampleComponent
{
    private itemsSvc: ItemsService = inject(ItemsService);

    protected optionsGatherer: CodeOptionsGatherer<string> = new CodeOptionsGatherer<string>();
    protected selectField = form(signal<string|null>(null));
    protected select: Signal<Select<string>> = viewChild.required<Select<string>>('select');

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
            valueHandler:
            {
                type: DynamicValueHandler,
                options:
                {
                    // resolves values written from outside; null/undefined = cleared
                    optionGetter: async (value: string|null|undefined) =>
                    {
                        if(value == null)
                        {
                            return null;
                        }

                        const item = await this.itemsSvc.getDetail(value);

                        if(!item)
                        {
                            return null;
                        }

                        return {
                            group: signal(null),
                            text: signal(item.name),
                            value: signal(item.id),
                        };
                    },
                },
            },
        },
        optionsGatherer: this.optionsGatherer,
    };

    constructor()
    {
        effect(async () =>
        {
            const search = this.select().executeAndReturn(getSearch());
            const result = await this.itemsSvc.search(search);

            this.optionsGatherer.setAvailableOptions(
                result.map(item =>
                ({
                    value: signal(item.id),
                    text: signal(item.name),
                    group: signal(null),
                })),
            );
        });
    }
}
```

```html
<!-- dynamic.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select #select [selectOptions]="selectOptions" [formField]="selectField"/>
```

## Dynamic Option Getter (Object Values) (adapted from readme)

When option values are objects but the form stores only a key, use `valueExtractor` to produce the public value, and `DynamicValueHandlerOptions.optionGetter` to resolve the option for a value written from outside (such as the initial value). The form below starts with `'second'` and the select displays its text once `ItemsService.getDetail(id)` (returning `Promise<Item|null>`) resolves:

```typescript
// dynamicOptionGetter.component.ts
import {Component, ChangeDetectionStrategy, effect, inject, Signal, viewChild, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {CodeOptionsGatherer, DynamicValueHandler, FilterLiveSearch, Select, SelectFormControl, SelectOption, SelectOptions} from '@anglr/select';
import {getSearch} from '@anglr/select/extensions';
import {RecursivePartial} from '@jscrpt/common';

import {Item, ItemsService} from './items.service';

@Component(
{
    selector: 'dynamic-option-getter-sample',
    templateUrl: 'dynamicOptionGetter.component.html',
    imports:
    [
        Select,
        JsonPipe,
        FormField,
        SelectFormControl,
    ],
    providers:
    [
        ItemsService,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicOptionGetterSampleComponent
{
    private itemsSvc: ItemsService = inject(ItemsService);

    protected optionsGatherer: CodeOptionsGatherer<Item> = new CodeOptionsGatherer<Item>();
    protected select: Signal<Select<Item, string>> = viewChild.required<Select<Item, string>>('select');

    // initial value is only an id, the option for it is resolved using optionGetter
    protected selectField = form(signal<string|null>('second'));

    protected selectOptions: RecursivePartial<SelectOptions<Item, string>> =
    {
        // RecursivePartial strips call signatures → type the parameter explicitly
        valueExtractor: (option: SelectOption<Item>) => option.value()?.id ?? '',
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
            valueHandler:
            {
                type: DynamicValueHandler,
                options:
                {
                    optionGetter: async (value: string|null|undefined) =>
                    {
                        // single select: called with null/undefined on clear/reset
                        if(value == null)
                        {
                            return null;
                        }

                        const item = await this.itemsSvc.getDetail(value);

                        if(!item)
                        {
                            return null;
                        }

                        return {
                            group: signal(null),
                            text: signal(item.name),
                            value: signal(item),
                        };
                    },
                },
            },
        },
        optionsGatherer: this.optionsGatherer,
    };

    constructor()
    {
        effect(async () =>
        {
            const search = this.select().executeAndReturn(getSearch());
            const result = await this.itemsSvc.search(search);

            this.optionsGatherer.setAvailableOptions(
                result.map(item =>
                ({
                    value: signal(item),
                    text: signal(item.name),
                    group: signal(null),
                })),
            );
        });
    }
}
```

```html
<!-- dynamicOptionGetter.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select #select [selectOptions]="selectOptions" [formField]="selectField"/>
```


## Option Groups from Code (not from readme)

Groups for `CodeOptionsGatherer` are plain `SelectOptionGroup` objects. `SimplePopup` groups **consecutive** options whose `group()` is the **same object** (`===`), so create one group object per group, reuse it and keep its options adjacent. `index` is overwritten by the popup (any number works), `id` becomes the DOM `id` of the group element (keep it unique), `template` may be `signal(null)` (default look renders the text):

```typescript
// codeGroups.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {CodeOptionsGatherer, Select, SelectFormControl, SelectOption, SelectOptionGroup, SelectOptions} from '@anglr/select';
import {generateId, RecursivePartial} from '@jscrpt/common';

function createGroup(text: string): SelectOptionGroup
{
    return {
        index: 0,
        id: `group-${generateId(10)}`,
        text: signal(text),
        template: signal(null),
    };
}

@Component(
{
    selector: 'code-groups-sample',
    template: `<ng-select [selectOptions]="selectOptions" [formField]="selectField"/>`,
    imports:
    [
        Select,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeGroupsSampleComponent
{
    protected optionsGatherer: CodeOptionsGatherer<string> = new CodeOptionsGatherer<string>();
    protected selectField = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
    {
        optionsGatherer: this.optionsGatherer,
    };

    constructor()
    {
        const fruit = createGroup('Fruit');
        const vegetables = createGroup('Vegetables');

        const options: SelectOption<string>[] =
        [
            {value: signal('apple'), text: signal('Apple'), group: signal(fruit)},
            {value: signal('pear'), text: signal('Pear'), group: signal(fruit)},
            {value: signal('carrot'), text: signal('Carrot'), group: signal(vegetables)},
            {value: signal('other'), text: signal('Other (no group)'), group: signal(null)},
        ];

        this.optionsGatherer.setAvailableOptions(options);
    }
}
```

The default `StaticValueHandler` is fine here because all options are known; with remote options combine it with `DynamicValueHandler` as above.
