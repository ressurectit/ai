# Samples: popup positioning and behavior

Usage samples for @anglr/select v17.3.0, taken from the package readme (compile-validated), except where noted. All use standalone components, OnPush and signals.

## Contents

- Absolute Popup
- Popover Popup
- Cancel Value
- Hide Caret
- Add New Option
- Readonly

## Absolute Popup

Use the `absolute` directive (`SelectAbsolute`) to render the popup as a direct child of `<body>`. The popup isn't clipped by the `overflow: hidden` container around the select:

```html
<!-- absolute.component.html -->
<div style="overflow: hidden; height: 40px;">
    <ng-select [formField]="field" absolute>
        <ng-option value="a" text="A"/>
        <ng-option value="b" text="B"/>
    </ng-select>
</div>
```

## Popover Popup

Use `PopoverPositioner` to display the popup using the native Popover API, so it's rendered in the top layer above any other content. With `popoverAuto` the browser closes the popup on outside click, so the click-outside handling of the interactions plugin is turned off:

```typescript
// popover.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {Option, PopoverPositioner, PopoverPositionerOptions, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'popover-sample',
    templateUrl: 'popover.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopoverSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
    {
        plugins:
        {
            interactions:
            {
                options:
                {
                    handleClickOutside: false,
                },
            },
            positioner:
            {
                type: PopoverPositioner,
                options:
                {
                    popoverAuto: true,
                } as PopoverPositionerOptions,
            },
        },
    };
}
```

```html
<!-- popover.component.html -->
<ng-select [formField]="field" [selectOptions]="selectOptions">
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

## Cancel Value

Show a cancel button in the normal state that clears the selected value:

```typescript
// cancelValue.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'cancel-value-sample',
    templateUrl: 'cancelValue.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CancelValueSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
    {
        plugins:
        {
            normalState:
            {
                options:
                {
                    cancelValue: true,
                },
            },
        },
    };
}
```

```html
<!-- cancelValue.component.html -->
<ng-select [formField]="field" [selectOptions]="selectOptions">
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

## Hide Caret

Hide the dropdown caret, either through the `carret` option of `EditNormalState` (in edit mode), or with the `noCarret` shorthand directive (`SelectNoCarret`). Both only work with `EditNormalState`, i.e. together with `edit` — the default `SimpleNormalState` always renders its caret (adapted from the readme, whose second select lacks `edit`):

```typescript
// hideCaret.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {EditNormalStateOptions, Option, Select, SelectEdit, SelectFormControl, SelectNoCarret, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'hide-caret-sample',
    templateUrl: 'hideCaret.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectEdit,
        SelectNoCarret,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HideCaretSampleComponent
{
    protected field = form(signal<string|null>(null));
    protected otherField = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
    {
        plugins:
        {
            normalState:
            {
                options:
                {
                    carret: false,
                } as EditNormalStateOptions,
            },
        },
    };
}
```

```html
<!-- hideCaret.component.html -->
<ng-select [formField]="field" [selectOptions]="selectOptions" edit>
    <ng-option value="a" text="A"/>
</ng-select>

<ng-select [formField]="otherField" edit noCarret>
    <ng-option value="a" text="A"/>
</ng-select>
```

## Add New Option

Allow users to create new options by typing. Configure `newOptionGetter` on the OptionsHandler: while typing, the popup offers the typed text as the first option, and picking it sets it as the value:

```typescript
// addNewOption.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectEdit, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'add-new-option-sample',
    templateUrl: 'addNewOption.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        FormField,
        SelectEdit,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddNewOptionSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions<string>> =
    {
        plugins:
        {
            optionsHandler:
            {
                options:
                {
                    newOptionGetter: (value: string) =>
                    ({
                        group: signal(null),
                        text: signal(value),
                        value: signal(value),
                    }),
                },
            },
        },
    };
}
```

```html
<!-- addNewOption.component.html -->
<div>Value: {{ field().value() | json }}</div>

<ng-select [formField]="field" [selectOptions]="selectOptions" edit>
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
</ng-select>
```

## Readonly

Use Angular signal forms' `readonly()` rule to toggle the readonly state of the first select. The second select is switched to readonly programmatically with the `setReadonly()` extension:

```typescript
// readonly.component.ts
import {Component, ChangeDetectionStrategy, Signal, signal, viewChild} from '@angular/core';
import {form, FormField, readonly} from '@angular/forms/signals';
import {Option, Select, SelectFormControl} from '@anglr/select';
import {setReadonly} from '@anglr/select/extensions';

@Component(
{
    selector: 'readonly-sample',
    templateUrl: 'readonly.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadonlySampleComponent
{
    protected isReadonly = signal(false);
    protected selectField = form(
        signal<string|null>(null),
        path => readonly(path, () => this.isReadonly()),
    );

    protected select: Signal<Select<string>> = viewChild.required<Select<string>>('select');

    protected setSelectReadonly(): void
    {
        this.select().execute(setReadonly(true));
    }
}
```

```html
<!-- readonly.component.html -->
<button type="button" (click)="isReadonly.set(!isReadonly())">
    {{ isReadonly() ? 'to normal' : 'to readonly' }}
</button>

<ng-select [formField]="selectField">
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>

<button type="button" (click)="setSelectReadonly()">set readonly via extension</button>

<ng-select #select>
    <ng-option value="a" text="A"/>
    <ng-option value="b" text="B"/>
</ng-select>
```

