# Services, DateApi and pipes

Working with dates in code (`DateApi` / `DateApiObject`), helper services and
the display pipes.

## Contents

- `DateApi<TDate>`
- `DateApiObject<TDate>` (fluent wrapper)
- `DateTimeRelativeParser`
- `DateValueProvider`
- `DatePositionParserService`
- Pipes and `DatePipesModule`
- Types and constants

## `DateApi<TDate>`

Inject with `inject<DateApi<Date>>(DATE_API)` (use `moment.Moment` with the
Moment adapter). Type parameters: `DateApi<TDate, TDateApiObject extends DateApiObject<TDate>>`.

| Method | Returns | Notes |
| --- | --- | --- |
| `getValue(value: DateValue \| TDate, format?: string)` | `DateApiObject` | parse/wrap; non-ISO strings need `format` (date-fns throws without it); relative strings (`+5d`) are resolved |
| `now()` | `DateApiObject` | current date and time |
| `getFormat(pseudoFormat: string)` | `string` | expands locale pseudo formats (`P`, `Pp`, `p` for date-fns; `L`, `LT` for Moment), other strings unchanged |
| `weekStartsOnMonday()` | `boolean` | locale info |
| `weekdays(short?: boolean)` | `string[]` | weekday names in locale order |
| `weekdaysShort()` | `string[]` | deprecated — use `weekdays(true)` |
| `isDate(value: unknown)` | `value is TDate` | type guard |

```typescript
import {inject, Injectable} from '@angular/core';
import {DATE_API, DateApi} from '@anglr/datetime';

@Injectable(
{
    providedIn: 'root',
})
export class MyDateService
{
    private readonly dateApi: DateApi<Date> = inject<DateApi<Date>>(DATE_API);

    public isExpired(dateStr: string): boolean
    {
        const date = this.dateApi.getValue(dateStr, 'yyyy-MM-dd');
        const now = this.dateApi.now();

        return date.isBefore(now.value);
    }

    public getMonthRange(date: Date): {from: string; to: string}
    {
        const obj = this.dateApi.getValue(date);

        return {
            from: obj.clone().startOfMonth().format('yyyy-MM-dd'),
            to: obj.clone().endOfMonth().format('yyyy-MM-dd'),
        };
    }

    public formatForDisplay(date: Date): string
    {
        return this.dateApi.getValue(date).format('d.M.yyyy HH:mm');
    }
}
```

## `DateApiObject<TDate>` (fluent wrapper)

Mutable: manipulation methods change the wrapped value **in place** and return
`this`. Use `clone()` before branching. `originalValue` stays unchanged until
`updateOriginal()`.

| Group | Members |
| --- | --- |
| state | `value: TDate` (readonly), `originalValue: TDate` (readonly), `isValid()`, `isWeekend()` |
| output | `format(format)`, `formatISO()`, `unixTimestamp()` (seconds), `timestamp()` (ms) |
| start/end of | `startOfDecade/endOfDecade`, `startOfYear/endOfYear`, `startOfMonth/endOfMonth`, `startOfWeek/endOfWeek` (locale week start), `startOfDay/endOfDay`, `startOfHour/endOfHour`, `startOfMinute/endOfMinute` |
| add/subtract (count defaults to 1) | `addYears/subtractYears`, `addMonths/subtractMonths`, `addWeeks/subtractWeeks`, `addDays/subtractDays`, `addHours/subtractHours`, `addMinutes/subtractMinutes` |
| get/set (no arg = get number, arg = set and return `this`) | `year()`, `month()` (0-based), `dayOfMonth()` (1-based), `dayOfWeek()` (0-based, Monday first), `hour()`, `minute()` |
| info | `daysInMonth()`, `diffDays(date)` |
| compare (`date: DateObject<TDate>` = `TDate \| DateApiObject`) | `isBefore`, `isAfter`, `isSame`, `isSameDay`, `isSameWeek`, `isSameMonth`, `isSameYear`, `isSameDecade` |
| copy / undo | `clone()` (copy of `value`), `cloneOriginal()` (copy of `originalValue`), `updateOriginal(value?)` (set original to current or given value), `resetOriginal()` (revert value to original) |

```typescript
const result = this.dateApi.getValue('2024-03-15', 'yyyy-MM-dd')
    .startOfMonth()         // → 2024-03-01
    .addMonths(2)           // → 2024-05-01
    .endOfMonth()           // → 2024-05-31
    .format('d.M.yyyy');    // → "31.5.2024"

const obj = this.dateApi.getValue('2024-03-15', 'yyyy-MM-dd');
const year = obj.year();     // get: 2024
obj.year(2025);              // set
obj.month(0);                // January (0-based)
const copy = obj.clone();
obj.resetOriginal();         // back to 2024-03-15
obj.updateOriginal();        // lock current as new original
```

`isBefore`/`isAfter` are strict and compare full timestamps; use `isSameDay`
etc. for calendar comparisons. To add your own methods see
`references/setup-and-adapters.md` (Extending `DateApiObject`).

## `DateTimeRelativeParser`

`@Injectable({providedIn: 'root'})`, generic `<TDate>`.
`parse(value: TDate | DateValue): TDate | DateValue` — when `value` is a string
matching `([+-])\s*(\d+)\s*([hHmdwMy])` returns a `TDate` relative to now,
otherwise returns `value` unchanged.

| Suffix | Unit | `+` result | `-` result |
| --- | --- | --- | --- |
| `m` | minutes | end of that minute | start of that minute |
| `h`, `H` | hours | end of that hour | start of that hour |
| `d` | days | end of that day | start of that day |
| `w` | weeks | end of that day | start of that day |
| `M` | months | end of that day | start of that day |
| `y` | years | end of that day | start of that day |

The built-in adapters call it inside `getValue()`, so relative text works in
inputs, min/max and pipes automatically.

## `DateValueProvider`

`@Injectable({providedIn: 'root'})`, generic `<TDate>`.
`getValue(value: TDate, format: string): DateTimeValue<TDate>` returns the
period around `value` at the smallest unit found in the (expanded) format:
minute (`m`) → hour (`H`/`h`) → day (`d`) → week (`w`) → month (`M`) → year
(`y`/`Y`). Inputs and the picker use `.from` to round values to the display
precision.

```typescript
const range = this.valueProvider.getValue(date, 'yyyy-MM-dd');
// range.from → 2024-03-15 00:00:00, range.to → 2024-03-15 23:59:59.999
```

## `DatePositionParserService`

`@Injectable({providedIn: 'root'})`. `createParser(format: string): DatePositionParser`
returns a `DefaultDatePositionParser` for the format; used by the advanced
keyboard handler.

`DatePositionParser`:

| Method | Returns |
| --- | --- |
| `parse(date: string, cursorPosition: number)` | `DatePositionParserResult` of the segment under the cursor |
| `next(date, cursorPosition)` | next segment or `null` after the last |
| `previous(date, cursorPosition)` | previous segment or `null` before the first |

`DatePositionParserResult`: `positionFrom`, `positionTo` (character indexes),
`part` (first letter of the format segment: `'d'`, `'M'`, `'y'`, `'H'`, `'m'`, …).
Formats with separators are parsed by numeric runs; formats without separators
(`yyyyMMdd`) by fixed positions.

```typescript
const parser = this.positionParser.createParser('dd.MM.yyyy');
parser.parse('15.03.2024', 4);  // {positionFrom: 3, positionTo: 5, part: 'M'}
parser.next('15.03.2024', 1);   // {positionFrom: 3, positionTo: 5, part: 'M'}
```

## Pipes and `DatePipesModule`

All standalone; `DatePipesModule` bundles them.

| Pipe (class) | Usage | Result |
| --- | --- | --- |
| `dateFormat` (`DateFormatPipe`) | `value \| dateFormat` | formatted with `FormatProvider.date` |
| | `value \| dateFormat: 'dateTime'` | any `FormatProvider` key (`'time'`, `'monthName'`, …) |
| | `value \| dateFormat: 'date' : 'yyyyMMdd'` | key + parse format for non-ISO string input |
| | `value \| dateFormat: 'dd. MMMM yyyy' : true` | custom pattern (`true` = custom format flag) |
| | `value \| dateFormat: 'dd.MM.yyyy' : 'yyyyMMdd' : true` | custom pattern + parse format |
| `dateConvert` (`DateConvertPipe`) | `value \| dateConvert` / `value \| dateConvert: 'yyyy-MM-dd'` | `DateApiObject` or `null` for empty/invalid |
| `isAfter` (`IsAfterPipe`) | `date1 \| isAfter: date2` | `boolean`, `false` when either is empty |
| `isBefore` (`IsBeforePipe`) | `date1 \| isBefore: date2` | `boolean`, `false` when either is empty |

Input values: `TDate`, `Date`, ms timestamp, ISO string, or a string with a
parse format. `dateFormat` returns `''` for `null`/`undefined`/invalid. A key
of `FormatProvider` is always resolved through the provider, even with the
`true` flag. In practice a pattern that is not a key also works without
`true`, but pass `true` for clarity and correct typing.

```html
<span>{{ createdAt | dateFormat }}</span>
<span>{{ updatedAt | dateFormat: 'dateTime' }}</span>
<span>{{ birthday | dateFormat: 'dd. MMMM yyyy' : true }}</span>
@if (endDate | isBefore: today) {
    <span class="expired">Expired</span>
}
```

## Types and constants

| Export | Definition |
| --- | --- |
| `DateValue` | `Date \| string \| number` |
| `DateObject<TDate>` | `TDate \| DateApiObject<TDate>` |
| `DateApiObjectCtor<TDate, TObject>` | `new (value: TDate \| DateValue, format?: string, ...additionalParams: any[]) => TObject` — type of `DATE_API_OBJECT_TYPE` |
| `MINUTE`, `HOUR`, `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`, `DECADE` | string constants `'minute'`, `'hour'`, `'day'`, `'week'`, `'month'`, `'quarter'`, `'year'`, `'decade'` (handy as period keys in `periodsDefinition`; not used by the library itself) |
