# Month calendar

`<month-calendar>` renders a full month grid (optionally with week numbers) and
places your events into the days. Display only — it has no selection or
navigation of its own.

## Contents

- Usage
- Inputs
- Day template and context
- Events (`EventData`, `CalendarEventDayMetadata`)
- Enums
- Exports of the calendar area

## Usage

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CalendarDayAspectRatio, EventData, MonthCalendarDayFormat, MonthCalendarModule} from '@anglr/datetime';

/**
 * Data of event displayed in calendar
 */
export interface MyEvent
{
    title: string;
}

@Component(
{
    template: `
        <month-calendar [display]="currentMonth"
                        [events]="events"
                        [showWeekNumber]="true"
                        [dayAspectRatio]="CalendarDayAspectRatio.FourToThree"
                        [weekDayName]="MonthCalendarDayFormat.Short">
            <ng-template calendarDayTemplate let-day>
                <div class="day-number">{{ day.day }}</div>
                @for (event of day.events; track $index) {
                    @if (event) {
                        <div class="event" [class.all-day]="event.allDay">
                            {{ $any(event.data).title }}
                        </div>
                    }
                }
            </ng-template>
        </month-calendar>
    `,
    imports:
    [
        MonthCalendarModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPageComponent
{
    protected readonly CalendarDayAspectRatio: typeof CalendarDayAspectRatio = CalendarDayAspectRatio;
    protected readonly MonthCalendarDayFormat: typeof MonthCalendarDayFormat = MonthCalendarDayFormat;

    public currentMonth: Date = new Date(2024, 2, 1);
    public events: EventData<Date, MyEvent>[] =
    [
        {data: {title: 'Meeting'}, dateFrom: new Date(2024, 2, 15), dateTo: new Date(2024, 2, 15)},
        {data: {title: 'Conference'}, dateFrom: new Date(2024, 2, 20), dateTo: new Date(2024, 2, 22)},
    ];
}
```

(adapted from readme: added the `@if (event)` guard, see below.)

Navigation (previous/next month) is up to you: change `display`, e.g. with
`dateApi.getValue(current).addMonths(1).value`.

## Inputs

All signal inputs.

| Input | Type | Default | Meaning |
| --- | --- | --- | --- |
| `display` | `TDate` | `dateApi.now().value` | any date in the month to show |
| `events` | `EventData<TDate, TEvent>[]` | `[]` | events to place into days |
| `showWeekNumber` | `boolean` | `false` | show week numbers (format `FormatProvider.week`) in the first column |
| `weekDayName` | `MonthCalendarDayFormat \| 'None' \| 'Short' \| 'Full'` | `Short` | header with weekday names (locale order) |
| `dayAspectRatio` | `CalendarDayAspectRatio \| keyof typeof CalendarDayAspectRatio \| number` | `ThreeToTwo` | height of a day cell as % of its width (`padding-bottom`) |

The grid starts at the first week day (locale) of the week containing the 1st
and ends with the week containing the last day.

## Day template and context

Without a template each day renders `<div class="default-calendar-day">` with
classes `is-weekend` / `is-other-month`. Provide your own with
`<ng-template calendarDayTemplate let-day>` (`CalendarDayTemplateDirective`,
typed context `CalendarDayTemplateContext` = `{$implicit: CalendarDayData}`).

`CalendarDayData<TDate, TEvent>`:

| Field | Type | Meaning |
| --- | --- | --- |
| `date` | `TDate` | date of the cell (start of day) |
| `day` | `number` | day of month |
| `week` | `number` | week number |
| `isWeekend` | `boolean` | weekend day |
| `isCurrentMonth` | `boolean` | belongs to the displayed month |
| `events` | `CalendarEventDayMetadata<TDate, TEvent>[]` | events on this day |

`events` keeps a multi-day event at the **same index** on every day it spans
(so rows line up). The array can therefore contain empty slots — always guard
with `@if (event)` and track by `$index`.

## Events (`EventData`, `CalendarEventDayMetadata`)

`EventData<TDate, TEvent>` (input): `data: TEvent`, `dateFrom: TDate`,
`dateTo: TDate | null | undefined` (no `dateTo` = single day). Events are sorted
by `dateFrom`.

`CalendarEventDayMetadata<TDate, TEvent>` (per day, extends `EventData` and
`WithDateApiFromTo`): additionally `dateApiFrom`, `dateApiTo`
(`DateApiObject`s), `allDay` (the event covers this whole day), `onGoingFrom`
(it started before this day), `onGoingTo` (it continues after this day).

`$any(event.data)` is needed in templates because the context is not generic
over `TEvent`; alternatively map to a typed helper in the component.

## Enums

`CalendarDayAspectRatio`: `OneToOne` = 100, `ThreeToTwo` = 66.66,
`FourToThree` = 75, `SixteenToTen` = 62.5, `SixteenToNine` = 56.25 (any number
is accepted as a percentage).

`MonthCalendarDayFormat` (string enum): `None` (empty header cells), `Short`
(`dateApi.weekdays(true)`), `Full` (`dateApi.weekdays()`).

## Exports of the calendar area

| Export | Kind |
| --- | --- |
| `MonthCalendarModule` | NgModule bundling `MonthCalendarComponent` + `CalendarDayTemplateDirective` |
| `MonthCalendarComponent<TDate, TEvent>` | component `month-calendar` |
| `CalendarDayTemplateDirective` | structural template directive `[calendarDayTemplate]` |
| `CalendarDayTemplateContext`, `CalendarDayData`, `CalendarEventDayMetadata`, `EventData`, `WithDateApiFromTo` | interfaces |
| `EventParser<TDate, TEvent>` | service provided by the component; `getEventsPerDay(events): [TDate, CalendarEventDayMetadata[]][]` — reuse it to group events per day elsewhere (provide it yourself, it is not `providedIn: 'root'`) |
| `CalendarDayAspectRatio`, `MonthCalendarDayFormat` | enums |

Theme variables for the calendar: `--datetime-month-calendar-weekend-foreground`,
`--datetime-month-calendar-other-month-background` (`references/styling.md`).
