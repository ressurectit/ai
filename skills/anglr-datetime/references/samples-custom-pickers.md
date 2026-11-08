# Samples: custom picker directives, picker options, overlays, modules

Reusable directives that preconfigure the building blocks, picker option
samples and module patterns. Taken from the package readme unless marked.

## Contents

- Rule for custom directives (NG0309)
- Day picker directive with `DataString` value
- Month picker directive (month/year periods)
- Day + time picker directive
- Quarter picker in a custom directive
- Local and global picker options
- Picker inside a CDK dialog
- Feature module patterns

## Rule for custom directives (NG0309)

A custom directive lists `DateTimeDirective` (and the other building blocks)
in `hostDirectives` and configures them in its constructor. The consuming
component imports the custom directive plus
`DateTimeControlValueAccessorDirective` (for `[formControl]`), and **must not**
import `DateTimeModule` / `DateTimeDirective`: `[dateTime]` would be matched
twice → NG0309. Keep the `dateTime` attribute in the template anyway, the
selectors require it. Values set in the constructor are defaults; inputs
forwarded through `hostDirectives.inputs` can override them from the template.

## Day picker directive with `DataString` value

```typescript
import {Directive} from '@angular/core';
import {
    DateTimeDirective,
    DateTimeValueFormat,
    DateTimeInputDirective,
    DateTimePickerDirective,
    SimpleDateTimeInputHandlerDirective,
} from '@anglr/datetime';

@Directive(
{
    selector: 'input[dateTime][dayPicker]',
    hostDirectives:
    [
        DateTimeInputDirective,
        DateTimePickerDirective,
        SimpleDateTimeInputHandlerDirective,
        {
            directive: DateTimeDirective,
            inputs: ['minDateTime', 'maxDateTime', 'valueFormat', 'format', 'customFormat', 'dataFormat'],
        },
    ],
})
export class DayPickerDirective<TDate = unknown>
{
    constructor(dateTime: DateTimeDirective<TDate>)
    {
        dateTime.valueFormat = DateTimeValueFormat.DataString;
        dateTime.dataFormat = 'yyyy-MM-dd';
    }
}
```

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateTimeControlValueAccessorDirective} from '@anglr/datetime';

import {DayPickerDirective} from './dayPicker.directive';

/**
 * Input using `DayPickerDirective`
 */
@Component(
{
    selector: 'custom-picker-directive-sample',
    template: `
        <input dateTime dayPicker class="form-control" [formControl]="myControl">

        <div>Value: {{myControl.value | json}}</div>
    `,
    imports:
    [
        JsonPipe,
        DayPickerDirective,
        ReactiveFormsModule,
        DateTimeControlValueAccessorDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomPickerDirectiveComponent
{
    protected readonly myControl: FormControl<string|null> = new FormControl<string|null>(null);
}
```

The directive name `DayPickerDirective` is the consumer's own class — the
package's period component is `DayPickerComponent`.

## Month picker directive (month/year periods)

```typescript
import {Directive} from '@angular/core';
import {
    DateTimeDirective,
    DateTimeValueFormat,
    MonthPickerComponent,
    YearPickerComponent,
    DateTimeInputDirective,
    DateTimePickerDirective,
    DateTimeInputHandlerDirective,
} from '@anglr/datetime';

@Directive(
{
    selector: 'input[dateTime][monthPicker]',
    hostDirectives:
    [
        DateTimeInputDirective,
        DateTimePickerDirective,
        DateTimeInputHandlerDirective,
        {
            directive: DateTimeDirective,
            inputs: ['minDateTime', 'maxDateTime'],
        },
    ],
})
export class MonthPickerDirective<TDate = unknown>
{
    constructor(picker: DateTimePickerDirective<TDate>,
                dateTime: DateTimeDirective<TDate>)
    {
        picker.pickerOptions =
        {
            defaultPeriod: 'month',
            periodsDefinition:
            {
                'month': MonthPickerComponent,
                'year': YearPickerComponent,
            },
        };
        dateTime.customFormat = 'yyyy-MM';
        dateTime.valueFormat = DateTimeValueFormat.FormattedString;
    }
}
```

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateTimeControlValueAccessorDirective} from '@anglr/datetime';

import {MonthPickerDirective} from './monthPicker.directive';

/**
 * Input using `MonthPickerDirective`
 */
@Component(
{
    selector: 'month-picker-directive-sample',
    template: `
        <input dateTime monthPicker
               class="form-control"
               [minDateTime]="minDate"
               [maxDateTime]="maxDate"
               [formControl]="monthControl">

        <div>Value: {{monthControl.value | json}}</div>
    `,
    imports:
    [
        JsonPipe,
        MonthPickerDirective,
        ReactiveFormsModule,
        DateTimeControlValueAccessorDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthPickerDirectiveComponent
{
    protected readonly monthControl: FormControl<string|null> = new FormControl<string|null>(null);
    protected readonly minDate: string = '2024-01-01';
    protected readonly maxDate: string = '2026-12-31';
}
```

## Day + time picker directive

```typescript
import {Directive} from '@angular/core';
import {
    DateTimeDirective,
    DateTimeValueFormat,
    WithTimeDirective,
    DateTimeInputDirective,
    DateTimePickerDirective,
    SimpleDateTimeInputHandlerDirective,
} from '@anglr/datetime';

@Directive(
{
    selector: 'input[dateTime][dayTimePicker]',
    hostDirectives:
    [
        WithTimeDirective,
        DateTimeInputDirective,
        DateTimePickerDirective,
        SimpleDateTimeInputHandlerDirective,
        {
            directive: DateTimeDirective,
            inputs: ['minDateTime', 'maxDateTime', 'valueFormat', 'format', 'customFormat', 'dataFormat'],
        },
    ],
})
export class DayTimePickerDirective<TDate = unknown>
{
    constructor(dateTime: DateTimeDirective<TDate>)
    {
        dateTime.valueFormat = DateTimeValueFormat.DataString;
        dateTime.dataFormat = "yyyy-MM-dd'T'HH:mm:ss";
    }
}
```

Usage: `<input dateTime dayTimePicker class="form-control" [formControl]="dateTimeControl">`
with `DayTimePickerDirective`, `ReactiveFormsModule` and
`DateTimeControlValueAccessorDirective` imported; the value is a string like
`"2024-03-15T14:30:00"`.

## Quarter picker in a custom directive

Uses the skeleton from `assets/custom-period-picker.component.ts`
(`QuarterPickerComponent`); written for this skill, not in the readme.

```typescript
import {Directive} from '@angular/core';
import {DateTimeDirective, DateTimeInputDirective, DateTimePickerDirective, DateTimeValueFormat, YearPickerComponent} from '@anglr/datetime';

import {QuarterPickerComponent} from './quarterPicker.component';

@Directive(
{
    selector: 'input[dateTime][quarterPicker]',
    hostDirectives:
    [
        DateTimeInputDirective,
        DateTimePickerDirective,
        {
            directive: DateTimeDirective,
            inputs: ['minDateTime', 'maxDateTime'],
        },
    ],
})
export class QuarterPickerDirective<TDate = unknown>
{
    constructor(picker: DateTimePickerDirective<TDate>,
                dateTime: DateTimeDirective<TDate>)
    {
        picker.pickerOptions =
        {
            defaultPeriod: 'quarter',
            periodsDefinition:
            {
                'quarter': QuarterPickerComponent,
                'year': YearPickerComponent,
            },
        };
        dateTime.customFormat = 'yyyy-MM';
        dateTime.valueFormat = DateTimeValueFormat.FormattedString;
    }
}
```

The value is the first month of the quarter (`"2024-04"` for Q2). Values are
rounded to the display precision (`yyyy-MM` → start of month).

## Local and global picker options

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DateTimeModule, DateTimePickerDirectiveOptions, SimpleDatePickerInputDirective} from '@anglr/datetime';

@Component(
{
    selector: 'picker-options-sample',
    template: `
        <!-- uses local picker options (merged over global options) -->
        <input dateTime simpleDatePickerInput [withPickerOptions]="pickerOptions" [formControl]="dateControl">

        <!-- uses only global picker options -->
        <input dateTime simpleDatePickerInput [formControl]="globalDateControl">
    `,
    imports:
    [
        DateTimeModule,
        ReactiveFormsModule,
        SimpleDatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerOptionsComponent
{
    protected readonly dateControl: FormControl<Date|null> = new FormControl<Date|null>(null);
    protected readonly globalDateControl: FormControl<Date|null> = new FormControl<Date|null>(null);

    protected readonly pickerOptions: Partial<DateTimePickerDirectiveOptions> =
    {
        closeOnValueSelect: true,
        closeOnBlur: true,
        showOnFocus: true,
        disabled: false,
        absolute: true,
        pickerCssClass: 'my-custom-picker',
    };
}
```

Global options: provide `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` (see
`references/picker.md`), e.g. in the app config or in a component's
`providers`.

## Picker inside a CDK dialog

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {JsonPipe} from '@angular/common';
import {DateTimeModule, DatePipesModule, DateTimePickerDirectiveOptions, SimpleDatePickerInputDirective} from '@anglr/datetime';

/**
 * Content of the dialog, date picker is rendered into the closest overlay pane, so selecting a value is not treated as outside click
 */
@Component(
{
    selector: 'dialog-content',
    template: `
        <h4>Select date</h4>

        <input dateTime simpleDatePickerInput
               class="form-control"
               [withPickerOptions]="pickerOptions"
               [formControl]="dateControl">

        <div>Value: {{dateControl.value | dateFormat}} ({{dateControl.value | json}})</div>
    `,
    styles: `
        :host
        {
            display: block;
            background: #fff;
            color: #000;
            padding: 20px;
            border-radius: 6px;
            min-width: 320px;
            min-height: 160px;
        }
    `,
    imports:
    [
        JsonPipe,
        DateTimeModule,
        DatePipesModule,
        ReactiveFormsModule,
        SimpleDatePickerInputDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogContentComponent
{
    protected readonly dateControl: FormControl<Date|null> = new FormControl<Date|null>(null);

    protected readonly pickerOptions: Partial<DateTimePickerDirectiveOptions> =
    {
        absolute: true,
        renderIntoClosest: '.cdk-overlay-pane',
    };
}
```

```typescript
import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Dialog} from '@angular/cdk/dialog';

import {DialogContentComponent} from './dialogContent.component';

/**
 * Opens dialog containing date picker input
 */
@Component(
{
    selector: 'render-into-closest-sample',
    template: `
        <button type="button" class="btn btn-primary" (click)="openDialog()">Open dialog</button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenderIntoClosestComponent
{
    private readonly dialog: Dialog = inject(Dialog);

    protected openDialog(): void
    {
        this.dialog.open(DialogContentComponent);
    }
}
```

`@angular/cdk` is only needed by this sample, not by the library.

## Feature module patterns

```typescript
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {
    DateTimeModule,
    WithNowDirective,
    WithTimeDirective,
    WithTodayDirective,
    DateTimePickerModule,
    DatePickerInputDirective,
    DateTimePickerInputDirective,
    DateTimeInputHandlerDirective,
    SimpleDatePickerInputDirective,
    SimpleDateTimePickerInputDirective,
    SimpleDateTimeInputHandlerDirective,
} from '@anglr/datetime';

@NgModule(
{
    imports:
    [
        WithNowDirective,
        WithTimeDirective,
        WithTodayDirective,
        DatePickerInputDirective,
        DateTimePickerInputDirective,
        DateTimeInputHandlerDirective,
        SimpleDatePickerInputDirective,
        SimpleDateTimePickerInputDirective,
        SimpleDateTimeInputHandlerDirective,
    ],
    exports:
    [
        DateTimeModule,
        WithNowDirective,
        WithTimeDirective,
        WithTodayDirective,
        ReactiveFormsModule,
        DateTimePickerModule,
        DatePickerInputDirective,
        DateTimePickerInputDirective,
        DateTimeInputHandlerDirective,
        SimpleDatePickerInputDirective,
        SimpleDateTimePickerInputDirective,
        SimpleDateTimeInputHandlerDirective,
    ],
})
export class FormsFeatureModule
{
}
```

Display-only module: `@NgModule({exports: [CommonModule, DatePipesModule]}) export class DisplayingFeatureModule {}`.
