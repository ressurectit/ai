# Samples: inputs, pickers and display

Complete components (imports included). All assume the app providers from
`references/setup-and-adapters.md` (date-fns adapter + `providePosition`) and
a theme from `references/styling.md`. Samples are taken from the package
readme unless marked otherwise.

## Contents

- Date picker input (reactive form, today on focus)
- Date + time picker input
- Advanced keyboard input with min/max
- Building blocks: input only, + picker, + time
- Today vs now
- Simple vs advanced keyboard handler
- Value formats side by side
- Month/year picker via `pickerOptions`
- Displaying dates with pipes

## Date picker input (reactive form, today on focus)

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DatePipesModule, DateTimeModule, SimpleDatePickerInputDirective, WithTodayDirective} from '@anglr/datetime';

@Component(
{
    selector: 'quick-start',
    template: `
        <input dateTime simpleDatePickerInput withToday
               class="form-control"
               [formControl]="dateControl">

        <div>Value: {{ dateControl.value | dateFormat }}</div>
    `,
    imports:
    [
        DateTimeModule,
        DatePipesModule,
        WithTodayDirective,
        ReactiveFormsModule,
        SimpleDatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickStartComponent
{
    protected readonly dateControl: FormControl<Date|null> = new FormControl<Date|null>(null);
}
```

## Date + time picker input

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateTimeModule, WithNowDirective, SimpleDateTimePickerInputDirective} from '@anglr/datetime';

@Component(
{
    selector: 'date-time-form',
    template: `
        <input dateTime simpleDateTimePickerInput withNow
               class="form-control"
               [formControl]="dateTimeControl">
    `,
    imports:
    [
        DateTimeModule,
        WithNowDirective,
        ReactiveFormsModule,
        SimpleDateTimePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeFormComponent
{
    public readonly dateTimeControl: FormControl = new FormControl(null);
}
```

## Advanced keyboard input with min/max

Segment navigation with arrows; the handler and the picker refuse values
outside the bounds.

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateTimeModule, DatePickerInputDirective} from '@anglr/datetime';

@Component(
{
    selector: 'advanced-date',
    template: `
        <input dateTime datePickerInput
               class="form-control"
               [formControl]="dateControl"
               [minDateTime]="minDate"
               [maxDateTime]="maxDate">
    `,
    imports:
    [
        DateTimeModule,
        ReactiveFormsModule,
        DatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedDateComponent
{
    public readonly dateControl: FormControl = new FormControl(null);
    public minDate: string = '2024-01-01';
    public maxDate: string = '2024-12-31';
}
```

(adapted from readme: dropped the unneeded `DateTimePickerModule` import.)

## Building blocks: input only, + picker, + time

The same result as the composites, assembled from single directives.
`withPicker` needs `DateTimePickerModule`, `withTime` needs `WithTimeDirective`.

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {JsonPipe} from '@angular/common';
import {DatePipesModule, DateTimeModule, DateTimePickerModule, WithTimeDirective} from '@anglr/datetime';

@Component(
{
    selector: 'building-blocks-sample',
    template: `
        <!-- text input only, no picker -->
        <input class="form-control" dateTime dateTimeInput [formControl]="inputControl">
        <div>Raw value: {{inputControl.value | json}} / {{inputControl.value | dateFormat}}</div>

        <!-- with picker -->
        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="pickerControl">
        <div>Date value: {{pickerControl.value | dateFormat}}</div>

        <!-- with picker and time -->
        <input class="form-control" dateTime dateTimeInput withPicker withTime [formControl]="timeControl">
        <div>Date value: {{timeControl.value | dateFormat: 'dateTime'}}</div>
    `,
    imports:
    [
        DateTimePickerModule,
        WithTimeDirective,
        ReactiveFormsModule,
        DatePipesModule,
        DateTimeModule,
        JsonPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildingBlocksSampleComponent
{
    protected inputControl: FormControl<unknown> = new FormControl(null);
    protected pickerControl: FormControl<unknown> = new FormControl(null);
    protected timeControl: FormControl<unknown> = new FormControl(null);
}
```

(adapted from readme: the three "Basic DateTime Input", "Basic DateTime Picker"
and "DateTime with Time" samples merged into one component.)

## Today vs now

`withToday` sets start of today, `withNow` the current time, both only when the
input is focused while empty.

```html
<input class="form-control" dateTime dateTimeInput withPicker withTime withToday [formControl]="datetimeControl">
<input class="form-control" dateTime dateTimeInput withPicker withTime withNow [formControl]="datetimeControl2">
```

Imports: `DateTimeModule`, `DateTimePickerModule`, `WithTimeDirective`,
`WithTodayDirective`, `WithNowDirective`, `ReactiveFormsModule`.

## Simple vs advanced keyboard handler

```html
<!-- arrows: ±1 day / ±1 week -->
<input class="form-control" dateTime dateTimeInput withPicker withSimpleHandler [formControl]="datetimeControl">

<!-- arrows: move between / change date segments -->
<input class="form-control" dateTime dateTimeInput withPicker withHandler [formControl]="datetimeControl2">
```

Imports: `DateTimeModule`, `DateTimePickerModule`,
`SimpleDateTimeInputHandlerDirective`, `DateTimeInputHandlerDirective`,
`ReactiveFormsModule`.

## Value formats side by side

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {JsonPipe} from '@angular/common';
import {DatePipesModule, DateTimeModule, DateTimePickerModule} from '@anglr/datetime';

@Component(
{
    selector: 'data-types-sample',
    template: `
        <!-- Date object -->
        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="datetimeControl" valueFormat="DateInstance">
        <div>{{datetimeControl.value | json}} / {{datetimeControl.value | dateFormat}}</div>

        <!-- milliseconds -->
        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="timestampControl" valueFormat="Timestamp">
        <div>{{timestampControl.value | json}} / {{timestampControl.value | dateFormat}}</div>

        <!-- string, same as displayed text -->
        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="stringControl" valueFormat="FormattedString" customFormat="yyyyMMdd">
        <div>{{stringControl.value | json}} / {{stringControl.value | dateFormat: 'date' : 'yyyyMMdd'}}</div>

        <!-- string in data format, display uses locale format -->
        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="customStringControl" valueFormat="DataString" dataFormat="yyyy-MM-dd">
        <div>{{customStringControl.value | json}} / {{customStringControl.value | dateFormat: 'date' : 'yyyy-MM-dd'}}</div>
    `,
    imports:
    [
        DateTimePickerModule,
        ReactiveFormsModule,
        DatePipesModule,
        DateTimeModule,
        JsonPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTypesSampleComponent
{
    protected datetimeControl: FormControl<unknown> = new FormControl(null);
    protected timestampControl: FormControl<number|null> = new FormControl(null);
    protected stringControl: FormControl<string|null> = new FormControl(null);
    protected customStringControl: FormControl<string|null> = new FormControl(null);
}
```

(adapted from readme: layout markup condensed into the inline template.)
`UnixTimestamp` (seconds) is not shown: its accessor throws on a `null`
value, so it needs a numeric initial value.

## Month/year picker via `pickerOptions`

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {JsonPipe} from '@angular/common';
import {DatePipesModule, DateTimeModule, DateTimePickerModule, DateTimePickerOptions, MonthPickerComponent, YearPickerComponent} from '@anglr/datetime';

@Component(
{
    selector: 'customized-picker-sample',
    template: `
        <div>Raw value: {{datetimeControl.value | json}}</div>
        <div>Date value: {{datetimeControl.value | dateFormat: 'date': 'yyyyMM'}}</div>

        <input class="form-control" dateTime dateTimeInput withPicker [formControl]="datetimeControl" [pickerOptions]="pickerOptions" valueFormat="FormattedString" customFormat="yyyyMM">
    `,
    imports:
    [
        DateTimePickerModule,
        ReactiveFormsModule,
        DatePipesModule,
        DateTimeModule,
        JsonPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomizedPickerSampleComponent
{
    protected datetimeControl: FormControl<unknown> = new FormControl(null);
    protected pickerOptions: Partial<DateTimePickerOptions<unknown>> =
    {
        periodsDefinition:
        {
            month: MonthPickerComponent,
            year: YearPickerComponent,
        },
        defaultPeriod: 'month',
    };
}
```

(adapted from readme: options initialised in the field instead of the constructor, template inlined.)

## Displaying dates with pipes

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DatePipesModule} from '@anglr/datetime';

@Component(
{
    selector: 'display-dates',
    template: `
        <!-- Default date format -->
        <span>{{ createdAt | dateFormat }}</span>

        <!-- Date + time -->
        <span>{{ updatedAt | dateFormat: 'dateTime' }}</span>

        <!-- Custom format -->
        <span>{{ birthday | dateFormat: 'dd. MMMM yyyy' : true }}</span>

        <!-- Comparison -->
        @if (endDate | isBefore: today) {
            <span class="expired">Expired</span>
        }
    `,
    imports:
    [
        DatePipesModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayComponent
{
    public createdAt: string = '2024-03-15T10:30:00Z';
    public updatedAt: Date = new Date();
    public birthday: Date = new Date(1990, 5, 15);
    public endDate: Date = new Date(2024, 0, 1);
    public today: Date = new Date();
}
```
