# Date/time picker

The popup picker attached to an input (`withPicker`), its options, the period
components it switches between, custom period sets and custom period pickers.

## Contents

- How the picker works
- Picker directive options (`DateTimePickerDirectiveOptions`)
- Period configuration (`DateTimePickerOptions`)
- Period components
- Global picker tokens and their limits
- Rendering inside overlays / dialogs
- Inline picker (`<date-time-picker>` without input)
- Writing a custom period picker
- Loop scroll helpers (time roller internals)
- `DateTimePickerModule`

## How the picker works

`DateTimePickerDirective` (`[dateTime][withPicker]`, exportAs `dateTimePicker`)
creates a `DateTimePickerComponent` (`<date-time-picker>`) when the input gains
focus (`showOnFocus`) or on `showPicker()` / Ctrl+Space, and destroys it on
blur (`closeOnBlur`), on a click outside the input and picker, on Escape (with
a keyboard handler) or `hidePicker()`. With `absolute: true` (default) the
element is moved into `body` (or `targetElement` / `renderIntoClosest`); with
`absolute: false` it stays next to the input. It is positioned through
`POSITION` from `@anglr/common` (flip + auto update), so a `Position`
implementation must be provided (`providePosition(FloatingUiDomPosition)`).

Selecting an item writes the value to the input and emits a change; min/max,
formats and value format are taken from the element's `dateTime` directive.
The picker opens on the current value or on today when empty.

## Picker directive options (`DateTimePickerDirectiveOptions`)

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `closeOnValueSelect` | `boolean` | `false` | close after a value was picked |
| `closeOnBlur` | `boolean` | `true` | close when the input loses focus |
| `showOnFocus` | `boolean` | `true` | open when the input gets focus |
| `alwaysVisible` | `boolean` | `false` | open on init and never close (debugging) |
| `disabled` | `boolean` | `false` | picker cannot be opened |
| `absolute` | `boolean` | `true` | render into `body` (or target) with absolute positioning; `false` renders next to the input |
| `targetElement` | `string \| null` | `null` | selector (e.g. `div.body-box`) of the element to render into instead of `body`; only with `absolute: true` |
| `renderIntoClosest` | `string \| null` | `null` | selector resolved with `input.closest()`; wins over `targetElement` when an ancestor matches; only with `absolute: true` |
| `positionOptions` | `PositionPlacement` (from `@anglr/common`) | `PositionPlacement.BottomStart` | placement relative to the input |
| `pickerCssClass` | `string \| null` | `null` | css class added to the `<date-time-picker>` element |

Merge order: built-in defaults → `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` (global,
deep-merged in the constructor) → `[withPickerOptions]` (deep-merged on every
assignment). Options are read when the picker opens or on events, so changes
apply on the next opening.

```typescript
import {ValueProvider} from '@angular/core';
import {DATE_TIME_PICKER_DIRECTIVE_OPTIONS, DateTimePickerDirectiveOptions} from '@anglr/datetime';

/**
 * Global options for date time picker directive, applied to every picker, can be overridden by `withPickerOptions` input
 */
export const pickerOptionsProviders: ValueProvider[] =
[
    {
        provide: DATE_TIME_PICKER_DIRECTIVE_OPTIONS,
        useValue: <Partial<DateTimePickerDirectiveOptions>>
        {
            closeOnValueSelect: true,
            pickerCssClass: 'global-picker',
        },
    },
];
```

Per input: `<input dateTime simpleDatePickerInput [withPickerOptions]="{closeOnValueSelect: true}" …>`.
`withPickerOptions` (and `pickerOptions`) are available on `withPicker` and on all
four `*PickerInput` composites.

## Period configuration (`DateTimePickerOptions`)

Passed as `[pickerOptions]` (`Partial<DateTimePickerOptions<TDate>>`) on the
picker directive and forwarded to the component's `options` input.

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `periodsDefinition` | `Dictionary<Type<DateTimePicker<TDate>>>` | `{day: DayPickerComponent, month: MonthPickerComponent, year: YearPickerComponent}` | available periods; **key order = zoom order**, first is the most detailed |
| `defaultPeriod` | `string` | `'day'` | key shown when the picker opens; must exist in `periodsDefinition` (otherwise `DateTime: Corrupted configuration for DateTimePicker!`) |

`periodsDefinition` replaces the default dictionary completely (it is not
merged). `withTime` sets `{time, day, month, year}`; if you pass your own
`pickerOptions` on a `withTime` element, include `time: RollerTimePickerComponent`.

Month/year only picker (value as `yyyy-MM` string):

```html
<input dateTime dateTimeInput withPicker
       [pickerOptions]="{defaultPeriod: 'month', periodsDefinition: {month: MonthPickerComponent, year: YearPickerComponent}}"
       valueFormat="FormattedString"
       customFormat="yyyy-MM"
       [formControl]="monthControl">
```

(`MonthPickerComponent` / `YearPickerComponent` must be exposed as component
fields for template use, or build the object in the class — see
`references/samples-custom-pickers.md`.)

## Period components

All are standalone, OnPush, host class `date-time-period`, created dynamically
by `DateTimePickerComponent`; you only reference their classes in
`periodsDefinition`.

| Component | Selector | Shows | Interaction |
| --- | --- | --- | --- |
| `DayPickerComponent` | `day-picker` | weekday header (locale order, short names) and day grid of a month, `‹ month year ›` | click day selects it; header zooms out; with a more detailed period below (time) a bottom button shows the time and zooms in |
| `MonthPickerComponent` | `month-picker` | 12 months, `‹ year ›` | click month zooms in when a more detailed period exists, otherwise selects |
| `YearPickerComponent` | `year-picker` | 10 years of a decade, `‹ 2020 - 2030 ›` | click year zooms in, or selects when it is the most detailed period |
| `RollerTimePickerComponent` | `roller-time-picker` | date header + hour and minute rollers (00–23, 00–59) | click roller to open, pick hour/minute; header zooms out |

Item states (CSS classes): `active` (selected), `disabled` (outside min/max),
`today`, `weekend`, `other-month`. The arrows use Font Awesome classes
(`fas fa-angle-left`, `fas fa-angle-right`) — load Font Awesome or style those
classes yourself.

## Global picker tokens and their limits

- `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` — works as described above.
- `DATE_TIME_PICKER_OPTIONS` (`Partial<DateTimePickerOptions>`) — injected only
  by `DateTimePickerComponent`'s constructor. `DateTimePickerDirective` always
  assigns its `pickerOptions` (possibly `undefined`) to the component's `options`
  input, which resets to the built-in defaults, so this token has **no effect**
  for pickers opened from inputs. Configure periods per element
  (`[pickerOptions]`) or once in a custom directive
  (`references/samples-custom-pickers.md`). The token only matters for a
  directly used `<date-time-picker>` without `[options]`.

## Rendering inside overlays / dialogs

A picker rendered into `body` is outside a CDK overlay / dialog, so clicking
it counts as an outside click and closes the overlay. Render it into the
overlay pane instead:

```typescript
protected readonly pickerOptions: Partial<DateTimePickerDirectiveOptions> =
{
    absolute: true,
    renderIntoClosest: '.cdk-overlay-pane',
};
```

```html
<input dateTime simpleDatePickerInput [withPickerOptions]="pickerOptions" [formControl]="dateControl">
```

Full sample in `references/samples-custom-pickers.md`. For containers with
`overflow: hidden`, prefer `absolute: true` (default) or a `targetElement`
outside the clipping box.

## Inline picker (`<date-time-picker>` without input)

`DateTimePickerComponent` extends `DateTimeDirective`, so it can be used on its
own as an always-visible calendar (no popup, no form bridge):

```html
<date-time-picker #inline
                  [value]="selected"
                  [minDateTime]="minDate"
                  (valueChange)="onSelected(inline.value)"/>
```

Inputs: `value`, `options` (`Partial<DateTimePickerOptions>`), plus the
`dateTime` inputs `valueFormat`, `format`, `customFormat`, `dataFormat`,
`minDateTime`, `maxDateTime`. Outputs: `valueChange` and `valueSet` (both
`EventEmitter<void>` — read `value` from the template reference). It still
injects `POSITION` and `DATE_API`. Import `DateTimePickerComponent` (or
`DateTimePickerModule`). This usage comes from the source, the readme does not
show it.

## Writing a custom period picker

A period picker is a component implementing `DateTimePicker<TDate>`; extend
`DateTimePeriodPickerBase<TPeriod extends PeriodData<TDate>, TDate>` to get
most of it. Skeleton: `assets/custom-period-picker.component.ts` (quarter
picker).

Contract (`DateTimePicker<TDate>`, extends `Invalidatable`):

| Member | Set by | Meaning |
| --- | --- | --- |
| `value: DateTimeObjectValue<TDate>` | parent | current value (`DateApiObject`) |
| `display: TDate` | parent | date whose period should be shown |
| `minDate`, `maxDate: TDate` | parent | bounds |
| `canScaleUp`, `canScaleDown: boolean` | parent | whether a less / more detailed period exists |
| `ranged: boolean` | parent | `true` for `RangeOfDateInstances` |
| `valueChange: Observable<void>` | picker | emit after changing `value` |
| `scaleUp`, `scaleDown: Observable<TDate>` | picker | ask parent to switch to the next less / more detailed period showing that date |
| `invalidateVisuals()` | parent calls | re-render |

`DateTimePeriodPickerBase` provides: `periodData: TPeriod[]`,
`valueChangeSubject`, `scaleUpSubject`, `scaleDownSubject`, `displayDate`
(`DateApiObject` of `display`), `displayedDate`, `minDateObj`, `maxDateObj`,
`singleValue` / `rangeValue` accessors, injected `dateApi` and
`changeDetector`, `invalidateVisuals()` (calls `onRender()` +
`detectChanges()`), `setActive()` (marks `active` items via `isSamePeriod`) and
`updateMinMax()` (marks `disabled` items). You implement:

- `protected onRender(): void` — rebuild `periodData` around `displayDate`, then
  call `setActive()` and `updateMinMax()`;
- `protected isSamePeriod(val: DateApiObject<TDate>, target: TDate): boolean`.

Period item interfaces: `PeriodData` (`active`, `disabled`, `date`,
`dateObj`), `DayData` (+ `otherMonth`, `today`, `weekend`, `day`), `MonthData`
(+ `name`), `YearData` (+ `value`).

Register it in `periodsDefinition` at the right position, e.g.
`{month: MonthPickerComponent, quarter: QuarterPickerComponent, year: YearPickerComponent}`
— note that `MonthPickerComponent` zooms in when a more detailed period exists,
so put your component where its zoom neighbours make sense. Add host class
`date-time-period` to inherit the theme CSS; grid layout of `.period-data` is
defined per built-in selector, so style your own grid.

## Loop scroll helpers (time roller internals)

Exported because `RollerTimePickerComponent` uses them; rarely needed directly.

| Export | Kind | Purpose |
| --- | --- | --- |
| `LoopScrollDirective` | directive `[loopScroll]` | infinite vertical roller; input `loopScroll` (selected value), `open: boolean`; output `loopScrollChange` |
| `LoopScrollDataDirective` | directive `[loopScrollData]` | marks an item; inputs `loopScrollData` (item data), `clone: boolean` (duplicated item used for looping) |
| `LoopScrollData<TData>` | interface | `{displayText?: string; data?: TData}` |
| `hours`, `minutes` | `LoopScrollData[]` constants | `00`–`23`, `00`–`59` |

## `DateTimePickerModule`

Bundles `DateTimePickerDirective` and `DateTimePickerComponent`. Needed when
you write `withPicker` yourself; the composites already include the directive.
