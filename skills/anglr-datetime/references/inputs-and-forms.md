# Date inputs, value formats, forms and validation

How the attribute directives compose into a date/time input, what value ends up
in the form, keyboard behaviour, min/max restrictions and validators.

## Contents

- Composition model
- Directive catalog (composite, behaviour, core)
- `dateTime` inputs (`DateTimeDirective`)
- Value formats (`DateTimeValueFormat`)
- Forms integration (reactive / template / signal forms)
- Keyboard handlers
- Min / max restrictions
- Validators (directives, functions, model decorator)
- Relative input (`+5d`)
- Utility functions, base class and types
- Ranges

## Composition model

Every element needs the **`dateTime` attribute** (`DateTimeDirective`): it holds
the shared state (formats, value format, min/max) and every other directive
injects it. On top of it you add:

1. an input part — `dateTimeInput` (`DateTimeInputDirective`, only on `<input>`), it
   provides `DATE_TIME_INPUT`;
2. optionally a picker — `withPicker` (`DateTimePickerDirective`);
3. optionally a keyboard handler — `withHandler` (advanced) or `withSimpleHandler`;
4. optionally behaviours — `withTime`, `withToday`, `withNow`;
5. a value bridge — `DateTimeControlValueAccessorDirective` (matches
   `formControl` / `formControlName` / `ngModel`) or `DateTimeFormControl`
   (`[formField]`); validators via the `validate` attribute.

Composite directives bundle 1–3 as `hostDirectives`, so
`<input dateTime simpleDatePickerInput [formControl]="c">` is the usual form.
Because the selectors require `[dateTime]`, the `dateTime` attribute must always be
written in the template, even with composites.

Imports: `DateTimeModule` (= `DateTimeDirective`, `DateTimeInputDirective`,
`DateTimeControlValueAccessorDirective`, three validator directives) + the
composite/behaviour directives you use. `withPicker` itself comes from
`DateTimePickerModule` (or import `DateTimePickerDirective`). All directives are
standalone, the modules are only bundles.

## Directive catalog

### Composite (ready-to-use)

| Directive | Selector | Contains | Extra inputs |
| --- | --- | --- | --- |
| `SimpleDatePickerInputDirective` | `input[dateTime][simpleDatePickerInput]` | `DateTimePickerDirective` + `DateTimeInputDirective` + `SimpleDateTimeInputHandlerDirective` | `withPickerOptions`, `pickerOptions` |
| `SimpleDateTimePickerInputDirective` | `input[dateTime][simpleDateTimePickerInput]` | `SimpleDatePickerInputDirective` + `WithTimeDirective` | `withPickerOptions`, `pickerOptions` (via the nested composite) |
| `DatePickerInputDirective` | `input[dateTime][datePickerInput]` | `DateTimePickerDirective` + `DateTimeInputDirective` + `DateTimeInputHandlerDirective` | `withPickerOptions`, `pickerOptions` |
| `DateTimePickerInputDirective` | `input[dateTime][dateTimePickerInput]` | `DatePickerInputDirective` + `WithTimeDirective` | `withPickerOptions`, `pickerOptions` (via the nested composite) |

On the `*DateTimePickerInput` composites a `[pickerOptions]` binding replaces
the time periods set by `WithTimeDirective` — include `time:
RollerTimePickerComponent` yourself. The `dateTime` inputs
(`valueFormat`, `customFormat`, `minDateTime`, …) are always available because
`DateTimeDirective` is matched by the `dateTime` attribute itself.

### Behaviour

| Directive | Selector | Effect |
| --- | --- | --- |
| `WithTodayDirective` | `[dateTime][withToday]` | on focus of an empty input sets start of today and emits a change (needs `DateTimeInputDirective` on the element) |
| `WithNowDirective` | `[dateTime][withNow]` | on focus of an empty input sets the current date+time and emits a change |
| `WithTimeDirective` | `[dateTime][withPicker][withTime]` | in its constructor sets picker periods to `time → day → month → year` (`RollerTimePickerComponent`, `DayPickerComponent`, `MonthPickerComponent`, `YearPickerComponent`) and `format = 'dateTime'` |

`WithTimeDirective` assigns values *before* template inputs are applied, so a
`customFormat="…"` or `[pickerOptions]` written on the same element replaces what it set.
When you supply your own `pickerOptions`, include the `time` period yourself.

### Core

| Directive | Selector | exportAs | Role |
| --- | --- | --- | --- |
| `DateTimeDirective` | `[dateTime]` | — | shared data holder (inputs below) |
| `DateTimeInputDirective` | `input[dateTime][dateTimeInput]` | `dateTime` | text input: parses typing, renders value with `customFormat`, provides `DATE_TIME_INPUT` |
| `DateTimePickerDirective` | `[dateTime][withPicker]` | `dateTimePicker` | opens/positions the picker — `references/picker.md` |
| `DateTimeInputHandlerDirective` | `[dateTime][withHandler]` | — | advanced keyboard handler (input elements only) |
| `SimpleDateTimeInputHandlerDirective` | `[dateTime][withSimpleHandler]` | — | simple keyboard handler |
| `DateTimeControlValueAccessorDirective` | `[dateTime][formControlName]`, `[dateTime][formControl]`, `[dateTime][ngModel]` | — | `ControlValueAccessor` |
| `DateTimeFormControl` | `[dateTime][formField]` | — | Signal Forms `FormValueControl` |
| `DateTimeValidatorDirective` | `[dateTime][validate]` | — | `datetime` error for unparsable values |
| `DateTimeMinValidatorDirective` | `[dateTime][minDateTime][validate]` | — | `datetimemin` error |
| `DateTimeMaxValidatorDirective` | `[dateTime][maxDateTime][validate]` | — | `datetimemax` error |

`DateTimeInputDirective` public API (via `#dt="dateTime"` or `viewChild`):
`value` (get/set, setting re-renders the text), `rawValue` (text), `disabled`,
`element`, and `EventEmitter`s `valueChange` (user change), `valueSet` (any set,
also from code), `focus`, `blur`. These emitters are plain properties, not
template outputs — `(valueChange)` cannot be bound in a template; use a form
bridge or subscribe in code.

`DateTimePickerDirective` public API (`#p="dateTimePicker"`): `showPicker()`,
`hidePicker()`, inputs `withPickerOptions`, `pickerOptions`.

There is no exported directive for `<button>` / `<a>` hosts — date inputs
are `<input>` elements.

## `dateTime` inputs (`DateTimeDirective`)

| Input | Type | Default | Meaning |
| --- | --- | --- | --- |
| `valueFormat` | `DateTimeValueFormat` or its member name as string (`valueFormat="Timestamp"`) | `DateInstance` | type of the value written to the form |
| `format` | `keyof FormatProvider` | `'date'` | picks a pattern from `FORMAT_PROVIDER`; also sets `customFormat` to the expanded pattern |
| `customFormat` | `string` | `dateApi.getFormat(formatProvider.date)` | display/typing pattern of the input (adapter syntax) |
| `dataFormat` | `string \| null` | — | pattern of the value when `valueFormat` is `DataString`; also preferred when parsing string values and min/max |
| `minDateTime` | `DateValue \| TDate \| DateTimeBase` | — | lower bound (see Min / max) |
| `maxDateTime` | `DateValue \| TDate \| DateTimeBase` | — | upper bound |

Read-only observables: `minDateTimeChanges`, `maxDateTimeChanges`,
`customFormatChanges`.

Write either `format` **or** `customFormat`: setting `format` overwrites
`customFormat`.

## Value formats (`DateTimeValueFormat`)

| Member | Form value | Requires | Notes |
| --- | --- | --- | --- |
| `DateInstance` (0, default) | `TDate` (`Date` for date-fns, `moment.Moment` for Moment) | — | |
| `UnixTimestamp` (1) | number, **seconds** | — | conversion happens only in the form bridges; the CVA **throws** in `writeValue` for a non-number (`null` included), so give the control a numeric initial value and don't `reset()` it to `null` |
| `Timestamp` (2) | number, milliseconds | — | |
| `FormattedString` (3) | string formatted with `customFormat` (same text as displayed) | `customFormat` | |
| `DataString` (4) | string formatted with `dataFormat` | `dataFormat` | display still uses `customFormat`; missing `dataFormat` throws |
| `RangeOfDateInstances` (5) | `DateTimeValue` `{from, to}` | — | not implemented in inputs/pickers, see Ranges |

Incoming values may be any of `Date`/`TDate`, number (ms), ISO string, or a
string in `dataFormat ?? customFormat`. Values are **rounded** to the precision
of the display format (via `DateValueProvider`): a date-only format yields
start of day, a format with minutes yields start of minute. The rounded value
is what the form receives after a user change.

## Forms integration

| Binding | Import | Notes |
| --- | --- | --- |
| `[formControl]` / `formControlName` | `DateTimeModule` (contains the CVA) + `ReactiveFormsModule` | marks touched on **focus**; `disable()` disables the input |
| `[(ngModel)]` | `DateTimeModule` + `FormsModule` | same CVA |
| `[formField]` (`@angular/forms/signals`) | `DateTimeFormControl` + `FormField` (not in `DateTimeModule`) | writes `null` instead of `undefined`, marks touched on focus, `disabled()` or `readonly()` disables the input |

The CVA needs `DATE_TIME_INPUT` on the same element, so it works only together
with `dateTimeInput` or a composite. A custom directive that contains
`DateTimeDirective` as host directive must not be combined with
`DateTimeModule` on the same element (`[dateTime]` would match twice, NG0309);
import only `DateTimeControlValueAccessorDirective` then.

## Keyboard handlers

`withSimpleHandler` (`SimpleDateTimeInputHandlerDirective`, used by the `simple*`
composites) — active only when the input holds a valid value:

| Key | Action |
| --- | --- |
| ArrowLeft / ArrowRight | −1 / +1 day |
| ArrowUp / ArrowDown | −1 / +1 week |
| Escape | hide picker |
| Ctrl+Space | show picker |

`withHandler` (`DateTimeInputHandlerDirective`, used by `datePickerInput` /
`dateTimePickerInput`) — segment editing, input elements only; like the simple
handler it reacts only while the input holds a valid value (so Ctrl+Space does
not open the picker on an empty input — focus does):

| Key / event | Action |
| --- | --- |
| click, select-all | selects the date segment under the cursor |
| ArrowLeft / ArrowRight, Tab / Shift+Tab | move selection to previous / next segment (Tab leaves the input at the last segment) |
| ArrowUp / ArrowDown | ±1 of the selected segment (year, month, week, day, hour, minute) |
| typing | blocked when the resulting value breaks min/max |
| Backspace | clears the whole value |
| Ctrl+A | blocked |
| Escape / Ctrl+Space | hide / show picker |

Both handlers revert any arrow-key change that would cross `minDateTime` /
`maxDateTime`. Segment detection uses `DatePositionParserService`.

## Min / max restrictions

```html
<input dateTime simpleDatePickerInput
       [minDateTime]="minDate"
       [maxDateTime]="maxDate"
       [formControl]="dateControl">
```

- Accepted values: `Date`/`TDate`, ms timestamp, ISO string, or a string in
  `dataFormat ?? customFormat`. Prefer `Date` objects or ISO strings — string
  bounds are parsed with whatever format is set at that moment.
- Pass another input's `DateTimeInputDirective` (exported as `dateTime`) to
  link two inputs; the bound follows that input's value live:

  ```html
  <input dateTime dateTimeInput withPicker #from="dateTime" [formControl]="fromControl">
  <input dateTime dateTimeInput withPicker [minDateTime]="from" [formControl]="toControl">
  ```

- Effect: pickers disable out-of-range days/months/years, keyboard handlers
  refuse to cross the bounds. Free typing is not blocked by the simple
  handler — add validators (`validate`) to report out-of-range values.

## Validators

### Directives (template-driven and reactive)

Add the `validate` attribute; `minDateTime` / `maxDateTime` then also validate.

```html
<input dateTime simpleDatePickerInput validate
       [minDateTime]="minDate"
       [maxDateTime]="maxDate"
       [(ngModel)]="value"
       #model="ngModel">
```

Error keys:

| Key | Value | When |
| --- | --- | --- |
| `datetime` | the string format | value cannot be parsed into a valid date |
| `datetimemin` | parsed min (`TDate`) | value is **not after** min |
| `datetimemax` | parsed max (`TDate`) | value is **not before** max |

The comparisons are strict: a value exactly equal to the bound is an error.
With a date-only display format the value is start of day, so `min = '2024-01-01'`
rejects 1 Jan 2024 00:00. Shift the bounds when the boundary day must be valid
(e.g. min `'2023-12-31T23:59:59'`, max `'2024-12-31T23:59:59'`).
Formats (`valueFormat`, `customFormat`, `dataFormat`) are captured in `ngOnInit`;
min/max changes rebuild the validator.

### Functions (reactive forms)

```typescript
datetimeValidator(dateApi, valueFormat, stringFormat, dataFormat): ValidatorFn
datetimeMinValidator(dateApi, minValue, valueFormat, stringFormat, dataFormat): ValidatorFn
datetimeMaxValidator(dateApi, maxValue, valueFormat, stringFormat, dataFormat): ValidatorFn
```

`dateApi` is `inject(DATE_API)`; `valueFormat` must match the control value
type; `stringFormat` is required for `FormattedString`; `dataFormat` for
`DataString` (pass `null` otherwise). `min/maxValue` accept the same values as
the `minDateTime` input (including a `DateTimeBase` instance) and are captured
when the validator is created. Same error keys and strictness as above.

### Model decorator (`@anglr/common/forms` model-driven forms)

```typescript
import {DateTime, DateTimeValueFormat} from '@anglr/datetime';

export class MyModel
{
    @DateTime()
    public dateField: Date|null = null;

    @DateTime(DateTimeValueFormat.DataString, 'yyyy-MM-dd', 'yyyy-MM-dd')
    public startDate: string|null = null;
}
```

Overloads: `DateTime()`, `DateTime(valueFormat)`, `DateTime(stringFormat)`,
`DateTime(valueFormat, stringFormat)`,
`DateTime(valueFormat, stringFormat, dataFormat)`. It registers
`ModelPropertyMetadata` with `dateTimeModelValidatorFactory(args)`
(`ValidatorFnFactory<DateTimeValidationArgs>`), which resolves `DATE_API` from
the form builder's injector (throws `DateTime: missing DateApi!` without it)
and applies `datetimeValidator` only. `DateTimeValidationArgs` fields:
`valueFormat`, `stringFormat`, `dataFormat`, `minValue`, `maxValue`
(`minValue`/`maxValue` are not used by the factory).

## Relative input (`+5d`)

The built-in adapters run every parsed value through `DateTimeRelativeParser`,
so users can type `+5d`, `-2M`, `+1y`, `-3w`, `+2h`, `-30m` into any date input
(syntax `[+-]\d+[yMwdhHm]`): `+` gives the end of the period, `-` the start.
Details in `references/services-and-pipes.md`.

## Utility functions, base class and types

| Export | Signature / shape | Use |
| --- | --- | --- |
| `parseDateTime` | `(value, dateApi, dateTimeFormat, stringFormat, dataFormat) => DateTimeObjectValue \| null \| undefined` | parse any input/output value into `DateApiObject` (or tuple for ranges); throws when a string needs a format that is missing |
| `formatDateTime` | `(value: DateTimeObjectValue, dateTimeFormat, stringFormat, dataFormat) => DateTimeInputOutputValue` | inverse: produce the form value for a value format; invalid date → `undefined` |
| `isDateTimeValue` | `(value) => value is DateTimeValue` | object with `from` and `to` |
| `getSingleDateTimeValue` | `(value) => DateValue \| TDate \| null \| undefined` | throws for ranges |
| `getInternalValue` | `(value, dateApi, dateTimeData: DateTimeDirective, valueProvider, dateTimeFormat?)` | parse + round to display precision (used by inputs/picker) |
| `parseRawInput` | `(rawValue: string, dateApi, dateTimeData, valueProvider) => [internal, value]` | parse typed text the same way the input does |
| `DateTimeBase<TDate>` | `@Directive()` base class: `value`, `valueChange`, `valueSet`, injected `dateTimeData`, hooks `onMinDateTimeChange()` / `onMaxDateTimeChange()` | base for inputs/validators/picker; extend it to build your own `DateTimeInput` provider (provide `DATE_TIME_INPUT`) |
| `DateTimeInputValue<TDate>` | `{value; valueChange; valueSet}` | value contract |
| `DateTimeInput<TDate>` | `DateTimeInputValue` + `rawValue`, `disabled`, `focus`, `blur`, `element` | contract of `DATE_TIME_INPUT` |
| `DateTimeInputOutputValue<TDate>` | `DateValue \| DateTimeValue<TDate> \| TDate` | what a form value may be |
| `DateTimeObjectValue<TDate>` | `DateApiObject<TDate> \| [DateApiObject \| null, DateApiObject \| null]` | parsed value |
| `DateTimeValue<TDate>` | `{from: TDate \| null \| undefined; to: …}` | period/range value |

## Ranges

`DateTimeValueFormat.RangeOfDateInstances` and `DateTimeValue` exist, but range
selection is not implemented in `DateTimeInputDirective`, the handlers or the
pickers (range branches are empty). Build a period as two inputs linked via
`[minDateTime]` / `[maxDateTime]` (see Min / max) and combine the values into a
`DateTimeValue` yourself; `DateValueProvider.getValue()` turns one date into a
`{from, to}` period.
