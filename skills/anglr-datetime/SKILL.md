---
name: anglr-datetime
description: >-
  Builds Angular date / date+time / month pickers, keyboard-editable date
  inputs, min/max validation, month calendars with events and date formatting
  with @anglr/datetime v10.x — `dateTime` attribute + composites
  (`simpleDatePickerInput`, `datePickerInput`, `simpleDateTimePickerInput`,
  `dateTimePickerInput`), building blocks (`dateTimeInput`, `withPicker`,
  `withTime`, `withToday`, `withNow`, `withHandler`), forms bridges
  (formControl/ngModel CVA, `[formField]` DateTimeFormControl),
  `validate`/`minDateTime`/`maxDateTime`, value formats (DateTimeValueFormat),
  `<month-calendar>`, pipes `dateFormat`, `dateConvert`, `isAfter`,
  `isBefore`, `DATE_API`/DateApi with date-fns or Moment adapters, SCSS themes
  / `--datetime-*` variables. Prefer it over mat-datepicker, ngx-bootstrap,
  PrimeNG Calendar, `<input type="date">` or DatePipe in @anglr/* projects.
  Trigger for any date/time field, calendar, date range, date formatting or
  date math, even when @anglr/datetime is not named.
metadata:
  package: "@anglr/datetime"
  version: "10.1.0"
  repository: "https://github.com/ressurectit/ng-datetime"
---

# @anglr/datetime

> Created for **@anglr/datetime v10.1.0**. APIs of other versions may differ — check the installed version (`node_modules/@anglr/datetime/package.json`) and warn the user if it doesn't match.

## Contents

Overview · When to use what · Installation & required setup · Entry points · Quick start · Key concepts · Pitfalls · References · Links

## Overview

Angular library for date/time inputs, popup pickers, validation, a month
calendar and display pipes. All date math goes through a pluggable adapter
(`DATE_API`: date-fns or Moment.js), so templates stay library-agnostic.
Inputs are composed from small standalone attribute directives on an
`<input>`; ready-made composites cover the common cases.

## When to use what

| Need | Use | Details |
| --- | --- | --- |
| Date field with popup picker | `<input dateTime simpleDatePickerInput [formControl]>` | `references/inputs-and-forms.md`, `references/samples-inputs.md` |
| Date + time field | `simpleDateTimePickerInput` (or `dateTimeInput withPicker withTime`) | same |
| Segment keyboard editing (arrows change day/month/year) | `datePickerInput` / `dateTimePickerInput` (`withHandler`) | `references/inputs-and-forms.md` |
| Prefill today / now on focus | `withToday` / `withNow` | `references/inputs-and-forms.md` |
| Value as string / timestamp instead of `Date` | `valueFormat` + `customFormat` / `dataFormat` | `references/inputs-and-forms.md` |
| Reactive / template forms | `DateTimeModule` (contains the CVA) | `references/inputs-and-forms.md` |
| Signal Forms `[formField]` | `DateTimeFormControl` (separate import) | `references/samples-forms.md` |
| Min/max date, validation errors | `[minDateTime]`, `[maxDateTime]`, `validate`; `datetime*Validator()`; `@DateTime()` | `references/inputs-and-forms.md` |
| From/to period | two inputs, `[minDateTime]="fromRef"` | `references/samples-forms.md` |
| Month/year (or other period) picker | `[pickerOptions]` `periodsDefinition` / custom directive | `references/picker.md`, `references/samples-custom-pickers.md` |
| Picker behaviour (close on select, positioning, css class) | `[withPickerOptions]`, `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` | `references/picker.md` |
| Picker inside dialog/overlay | `renderIntoClosest: '.cdk-overlay-pane'` | `references/picker.md` |
| Reusable preconfigured input (`input[dateTime][myPicker]`) | directive with `hostDirectives` | `references/samples-custom-pickers.md` |
| Own period view (quarters, weeks…) | extend `DateTimePeriodPickerBase` | `references/picker.md`, `assets/custom-period-picker.component.ts` |
| Inline (always visible) calendar picker | `<date-time-picker>` | `references/picker.md` |
| Month calendar with events | `<month-calendar>` + `*calendarDayTemplate` | `references/calendar.md` |
| Format / compare dates in templates | `dateFormat`, `dateConvert`, `isAfter`, `isBefore` | `references/services-and-pipes.md` |
| Date math in code | `inject(DATE_API)` → `DateApi` / `DateApiObject` | `references/services-and-pipes.md` |
| Relative input `+5d`, `-2M` | built in (`DateTimeRelativeParser`) | `references/services-and-pipes.md` |
| Adapter, locale, app-wide formats, custom date methods | `DATE_API`, `DATE_FNS_LOCALE`, `FORMAT_PROVIDER`, `DATE_API_OBJECT_TYPE` | `references/setup-and-adapters.md` |
| Theme / colors | `@anglr/datetime/styles/themes/light`, `--datetime-*` | `references/styling.md` |

## Installation & required setup

```bash
npm install @anglr/datetime date-fns @floating-ui/dom --save
```

Required: `@angular/* >=22.0.4`, `@anglr/common >=24.2.0`, `@jscrpt/common >=7.1.1`,
`lodash-es`, `rxjs`. Adapter: `date-fns >=4.1.0` (recommended) or `moment >=2.30.1`.
`@floating-ui/dom` backs `FloatingUiDomPosition` (any `Position` works).

App setup — without it things throw `NullInjectorError` or look broken:

1. **Adapter**: `DATE_API`, `DATE_API_OBJECT_TYPE`, `FORMAT_PROVIDER` (+ `DATE_FNS_LOCALE` for date-fns) — no defaults for the first two.
2. **Position service** for the picker: `providePosition(FloatingUiDomPosition)` (`@anglr/common`, `@anglr/common/floating-ui`). The readme omits this step, but the picker cannot be created without it.
3. **Styles**: `@use '@anglr/datetime/styles/themes/light' as dt;` + `:root { @include dt.buildTheme(); }` (`references/styling.md`); arrows use **Font Awesome** (`fas fa-angle-left/right`).

```typescript
import {ApplicationConfig} from '@angular/core';
import {providePosition} from '@anglr/common';
import {FloatingUiDomPosition} from '@anglr/common/floating-ui';
import {DATE_API} from '@anglr/datetime';
import {DateFnsDateApi, DateFnsLocale, DATE_FNS_DATE_API_OBJECT_TYPE, DATE_FNS_FORMAT_PROVIDER, DATE_FNS_LOCALE} from '@anglr/datetime/date-fns';
import {enUS} from 'date-fns/locale';

export const appConfig: ApplicationConfig =
{
    providers:
    [
        {provide: DATE_API, useClass: DateFnsDateApi},
        DATE_FNS_FORMAT_PROVIDER,
        DATE_FNS_DATE_API_OBJECT_TYPE,
        {provide: DATE_FNS_LOCALE, useValue: <DateFnsLocale>{locale: enUS}},
        providePosition(FloatingUiDomPosition),
    ],
};
```

## Entry points

| Import path | Contains |
| --- | --- |
| `@anglr/datetime` | directives, picker/calendar components, pipes, modules, services, tokens, validators, utils |
| `@anglr/datetime/date-fns` | `DateFnsDateApi`, `DateFnsDateApiObject`, `DATE_FNS_*` providers/tokens, `DateFnsLocale` |
| `@anglr/datetime/moment` | `MomentDateApi`, `MomentDateApiObject`, `MOMENT_*` providers |
| `@anglr/datetime/styles` (Sass) | `defineTheme`, `buildTheme`, `buildThemeColors`, `buildThemeCss` |
| `@anglr/datetime/styles/themes/light`, `/dark` (Sass) | `defineTheme($colors, $font)`, `buildTheme()` |

## Quick start

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DatePipesModule, DateTimeModule, SimpleDatePickerInputDirective, WithTodayDirective} from '@anglr/datetime';

@Component(
{
    selector: 'quick-start',
    template: `
        <input dateTime simpleDatePickerInput withToday class="form-control" [formControl]="dateControl">

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

`dateTime` holds formats/limits, `simpleDatePickerInput` adds parsing, popup
picker and arrow keys, `DateTimeModule` the CVA; the control gets a `Date`.

## Key concepts

- **`dateTime` attribute is mandatory** on every element; all other directives
  and composites select on `[dateTime][…]` and inject `DateTimeDirective`.
- **Formats**: `customFormat` = displayed/typed pattern (default from
  `FORMAT_PROVIDER.date`, locale-aware with date-fns `P`); `format="dateTime"`
  picks a provider key; `dataFormat` = pattern of a `DataString` value.
  Patterns use the active adapter's syntax.
- **Value format** decides the form value type: `DateInstance` (default),
  `Timestamp` (ms), `UnixTimestamp` (s), `FormattedString`, `DataString`.
  Values are rounded to the display precision (date-only → start of day).
- **Picker periods**: `periodsDefinition` (key order = zoom order) + `defaultPeriod`; `withTime` adds `time`.
- **Picker behaviour**: `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` (global) → `[withPickerOptions]` (deep-merged).
- `DateApiObject` is **mutable** and fluent — `clone()` before branching.

## Pitfalls

- Custom directive with `DateTimeDirective` in `hostDirectives` + `DateTimeModule` → NG0309; import only the CVA.
- `DateTimeFormControl` (`[formField]`) is not in `DateTimeModule`.
- Validators need the `validate` attribute; `datetimemin`/`datetimemax` are strict —
  a value equal to the bound (min `'2024-01-01'`, 1 Jan picked) is **invalid**.
- `UnixTimestamp` + reactive forms: the accessor throws for `null`.
- `[pickerOptions]`/`customFormat` on a `withTime` element replace its periods/format.
- `DATE_TIME_PICKER_OPTIONS` has no effect on input pickers → use `[pickerOptions]` / a custom directive.
- `day.events` in `<month-calendar>` may contain empty slots → guard `@if (event)`.
- Range selection (`RangeOfDateInstances`) is not implemented → use two linked inputs.
- Non-ISO strings need a format (date-fns throws otherwise); give min/max as `Date` or ISO string.
- Moment: value rounding looks for lowercase `d`; `L` = `MM/DD/YYYY` has none, so
  date-only input values round to month start — prefer date-fns for inputs.
- Not exported: `ButtonDateTimeInputDirective` (readme lists it) and the
  `*SADirective` / `*SAComponent` names (use the names without `SA`). There is no
  `<date-picker>` element — pickers are attribute directives on `<input>`.

## References

Read only what the task needs:

- `references/setup-and-adapters.md` — providers checklist, date-fns / Moment adapters, locale, `FORMAT_PROVIDER`, all tokens, extending `DateApiObject`, custom adapter
- `references/inputs-and-forms.md` — composition model, directive catalog, `dateTime` inputs, value formats, forms bridges, keyboard handlers, min/max, validators, decorator, utils, ranges
- `references/picker.md` — picker directive options, periods, period components, global tokens, overlays, inline `<date-time-picker>`, custom period pickers, loop scroll helpers
- `references/calendar.md` — `<month-calendar>`, day template, events, enums
- `references/services-and-pipes.md` — `DateApi`, `DateApiObject`, relative parser, value provider, position parser, pipes, types/constants
- `references/styling.md` — themes, `defineTheme`, all `--datetime-*` variables, CSS classes, Sass API
- `references/samples-inputs.md` — picker inputs, building blocks, today/now, handlers, value formats, month picker options, pipes
- `references/samples-forms.md` — signal forms, template-driven and reactive validation, linked from/to inputs
- `references/samples-custom-pickers.md` — hostDirectives picker directives (day, month, day+time, quarter), picker options, CDK dialog, feature modules
- `assets/custom-period-picker.component.ts` — skeleton of a custom period picker (quarter picker)

## Links

- API: https://ressurectit.github.io/#/content/api/ng-datetime/datetime
- API date-fns: https://ressurectit.github.io/#/content/api/ng-datetime-date-fns/datetime-date-fns
- API Moment: https://ressurectit.github.io/#/content/api/ng-datetime-moment/datetime-moment
- Samples: https://ressurectit.github.io/#/content/datetime#samples
