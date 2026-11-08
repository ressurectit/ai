# Samples: forms and validation

Form bindings, validation and linked inputs. Same assumptions as
`references/samples-inputs.md` (adapter providers, `providePosition`, a theme).
Taken from the package readme unless marked otherwise.

## Contents

- Signal Forms (`[formField]`)
- Template-driven validation
- Reactive validators
- Linked from/to inputs (period)

## Signal Forms (`[formField]`)

`DateTimeFormControl` is not part of `DateTimeModule` — import it next to `FormField`.

```typescript
import {ChangeDetectionStrategy, Component, signal, WritableSignal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {form, FormField} from '@angular/forms/signals';
import {DatePipesModule, DateTimeFormControl, DateTimeModule, SimpleDatePickerInputDirective} from '@anglr/datetime';

interface Item
{
    dueDate: Date|null;
}

@Component(
{
    selector: 'signal-forms-sample',
    template: `
        <input dateTime simpleDatePickerInput [formField]="itemForm.dueDate">

        <div>Value: {{ itemForm.dueDate().value() | dateFormat }}</div>
        <div>Raw: {{ itemForm.dueDate().value() | json }}</div>
    `,
    imports:
    [
        JsonPipe,
        FormField,
        DateTimeModule,
        DatePipesModule,
        DateTimeFormControl,
        SimpleDatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalFormsComponent
{
    protected readonly item: WritableSignal<Item> = signal<Item>({dueDate: null});
    protected readonly itemForm = form(this.item);
}
```

## Template-driven validation

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DateTimeModule, SimpleDatePickerInputDirective} from '@anglr/datetime';

/**
 * Date input validated by template-driven validators `validate`, `minDateTime`, `maxDateTime`
 */
@Component(
{
    selector: 'template-validators-sample',
    template: `
        <input dateTime simpleDatePickerInput validate
               class="form-control"
               [minDateTime]="minDate"
               [maxDateTime]="maxDate"
               [(ngModel)]="value"
               #model="ngModel">

        <div>Value: {{value | json}}</div>
        <div>Errors: {{model.errors | json}}</div>
    `,
    imports:
    [
        JsonPipe,
        FormsModule,
        DateTimeModule,
        SimpleDatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateValidatorsComponent
{
    protected minDate: string = '2024-01-01';
    protected maxDate: string = '2024-12-31';
    protected value: Date|null = new Date(2025, 0, 15);
}
```

(adapted from readme: template inlined.) The initial value is after max, so
`model.errors` shows `{datetimemax: …}`. Remember that the bounds themselves
are invalid values (strict comparison).

## Reactive validators

```typescript
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DATE_API, DateApi, DateTimeModule, datetimeValidator, datetimeMinValidator, datetimeMaxValidator, DateTimeValueFormat} from '@anglr/datetime';

@Component(
{
    selector: 'validator-example',
    template: `
        <input dateTime dateTimeInput
               class="form-control"
               valueFormat="FormattedString"
               customFormat="yyyy-MM-dd"
               [formControl]="dateControl">

        <div>Value: {{dateControl.value | json}}</div>
        <div>Errors: {{dateControl.errors | json}}</div>
    `,
    imports:
    [
        JsonPipe,
        DateTimeModule,
        ReactiveFormsModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidatorExampleComponent
{
    private readonly dateApi: DateApi<Date> = inject<DateApi<Date>>(DATE_API);

    public readonly dateControl: FormControl = new FormControl('2024-01-15', [
        datetimeValidator(this.dateApi, DateTimeValueFormat.FormattedString, 'yyyy-MM-dd', null),
        datetimeMinValidator(this.dateApi, '2024-01-01', DateTimeValueFormat.FormattedString, 'yyyy-MM-dd', null),
        datetimeMaxValidator(this.dateApi, '2024-12-31', DateTimeValueFormat.FormattedString, 'yyyy-MM-dd', null),
    ]);
}
```

## Linked from/to inputs (period)

The second input's minimum follows the first input live (written for this
skill from the source, not in the readme).

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {DateTimeModule, DateTimePickerModule} from '@anglr/datetime';

@Component(
{
    selector: 'period-sample',
    template: `
        <form [formGroup]="period">
            <input dateTime dateTimeInput withPicker #from="dateTime" formControlName="from">
            <input dateTime dateTimeInput withPicker [minDateTime]="from" formControlName="to">
        </form>
    `,
    imports:
    [
        DateTimeModule,
        ReactiveFormsModule,
        DateTimePickerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodSampleComponent
{
    protected readonly period: FormGroup<{from: FormControl<Date|null>, to: FormControl<Date|null>}> = new FormGroup(
    {
        from: new FormControl<Date|null>(null),
        to: new FormControl<Date|null>(null),
    });
}
```

`#from="dateTime"` needs the explicit `dateTimeInput` attribute (the
`exportAs` belongs to `DateTimeInputDirective`). With composites, bind a value
instead: `[minDateTime]="period.controls.from.value"`.
