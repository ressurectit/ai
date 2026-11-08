# Samples: basics, modes and templates

Usage samples for @anglr/select v17.3.0, taken from the package readme (compile-validated), except where noted. All use standalone components, OnPush and signals.

## Contents

- Basic Select
- Multiple Select
- Edit / Type-ahead Mode
- Live Search (Filter)
- Search Highlighting
- Custom Templates

## Basic Select

Minimal select with reactive forms. Picking an option writes its `value` into the `FormControl`:

```typescript
// basic.component.ts
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Option, Select, SelectControlValueAccessor} from '@anglr/select';

@Component(
{
    selector: 'basic-sample',
    templateUrl: 'basic.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        ReactiveFormsModule,
        SelectControlValueAccessor,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicSampleComponent
{
    protected selectControl: FormControl<string|null> = new FormControl<string|null>(null);
}
```

```html
<!-- basic.component.html -->
<div>Value: {{ selectControl.value | json }}</div>

<ng-select [formControl]="selectControl">
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
    <ng-option value="fourth" text="Fourth value text"/>
    <ng-option value="fifth" text="Fifth value text"/>
</ng-select>
```

## Multiple Select

Multi-select with signal forms. The `multiple` attribute enables multi-selection: the value is an array and the default `SimpleNormalState` shows the selected texts joined by `, ` (tags with remove buttons only together with `edit`, i.e. `EditNormalState`). `SelectMultipleKeepPopup` keeps the popup open after each pick:

```typescript
// multiple.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectFormControl, SelectMultipleKeepPopup} from '@anglr/select';

@Component(
{
    selector: 'multiple-sample',
    templateUrl: 'multiple.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        FormField,
        SelectFormControl,
        SelectMultipleKeepPopup,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultipleSampleComponent
{
    protected selectField = form(signal<string[]|null>(null));
}
```

```html
<!-- multiple.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select multiple [formField]="selectField">
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
    <ng-option value="fourth" text="Fourth value text"/>
    <ng-option value="fifth" text="Fifth value text"/>
</ng-select>
```

## Edit / Type-ahead Mode

Add the `edit` directive for a type-ahead experience. The normal state becomes a text input that filters options as you type (Space is typed as text). Works for both single and multi-select:

```typescript
// edit.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectEdit, SelectFormControl, SelectMultipleKeepPopup} from '@anglr/select';

@Component(
{
    selector: 'edit-sample',
    templateUrl: 'edit.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        FormField,
        SelectEdit,
        SelectFormControl,
        SelectMultipleKeepPopup,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditSampleComponent
{
    protected selectField = form(signal<string|null>(null));
    protected selectMultipleField = form(signal<string[]|null>([]));
}
```

```html
<!-- edit.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<!-- Single edit -->
<ng-select [formField]="selectField" edit>
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
</ng-select>

<div>Values: {{ selectMultipleField().value() | json }}</div>

<!-- Multiple edit -->
<ng-select multiple [formField]="selectMultipleField" edit>
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
</ng-select>
```

## Live Search (Filter)

Enable a filter text input inside the popup using `FilterLiveSearch`. The popup only lists options whose text contains the typed text:

```typescript
// liveSearch.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {Option, Select, SelectOptions, FilterLiveSearch, SelectFormControl} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'live-search-sample',
    templateUrl: 'liveSearch.component.html',
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
export class LiveSearchSampleComponent
{
    protected selectField = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions> =
    {
        plugins:
        {
            popup:
            {
                options:
                {
                    liveSearchEnabled: true,
                },
            },
            liveSearch:
            {
                type: FilterLiveSearch,
            },
        },
    };
}
```

```html
<!-- liveSearch.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select [selectOptions]="selectOptions" [formField]="selectField">
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
    <ng-option value="fourth" text="Fourth value text"/>
    <ng-option value="fifth" text="Fifth value text"/>
</ng-select>
```

## Search Highlighting

The popup highlights live-search matches in option texts using the CSS Highlight API. For custom option templates, mark the elements whose text should be highlighted with the `HighlightText` directive. Typing into the filter highlights matches only in the text part, not in the bold value:

```typescript
// searchHighlighting.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {FilterLiveSearch, HighlightText, Option, OptionTemplate, Select, SelectFormControl, SelectOptions} from '@anglr/select';
import {RecursivePartial} from '@jscrpt/common';

@Component(
{
    selector: 'search-highlighting-sample',
    templateUrl: 'searchHighlighting.component.html',
    imports:
    [
        Select,
        Option,
        FormField,
        HighlightText,
        OptionTemplate,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchHighlightingSampleComponent
{
    protected field = form(signal<string|null>(null));

    protected selectOptions: RecursivePartial<SelectOptions> =
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

```html
<!-- searchHighlighting.component.html -->
<ng-select [selectOptions]="selectOptions" [formField]="field">
    <ng-option value="a" text="Apple"/>
    <ng-option value="b" text="Banana"/>

    <span *optionTemplate="let option">
        <strong>{{ option.value() }}</strong>
        <span highlightText> - {{ option.text() }}</span>
    </span>
</ng-select>
```

## Custom Templates

Use `[normalStateTemplate]` and `[optionTemplate]` to completely customize rendering. The selected value is shown between arrows and every option shows its value and text:

```typescript
// customTemplate.component.ts
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {DisplayValue, NormalStateTemplate, Option, OptionTemplate, Select, SelectFormControl} from '@anglr/select';

@Component(
{
    selector: 'custom-template-sample',
    templateUrl: 'customTemplate.component.html',
    imports:
    [
        Select,
        Option,
        JsonPipe,
        FormField,
        DisplayValue,
        OptionTemplate,
        SelectFormControl,
        NormalStateTemplate,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomTemplateSampleComponent
{
    protected selectField = form(signal<string|null>(null));
}
```

```html
<!-- customTemplate.component.html -->
<div>Value: {{ selectField().value() | json }}</div>

<ng-select [formField]="selectField">
    <ng-option value="first" text="First value text"/>
    <ng-option value="second" text="Second value text"/>
    <ng-option value="third" text="Third value text"/>
    <ng-option value="fourth" text="Fourth value text"/>
    <ng-option value="fifth" text="Fifth value text"/>

    <!-- Custom normal state: shows arrows around the display value -->
    <span *normalStateTemplate="let normalState">
        =&gt; {{ normalState.selectBus.selectedOptions() | displayValue }} &lt;=
    </span>

    <!-- Custom option template: shows value and text -->
    <span *optionTemplate="let option">
        {{ option.value() }} - {{ option.text() }}
    </span>
</ng-select>
```

