# Setup, date adapters and DI tokens

Everything you need to register once per application, and how to swap or extend
the date library behind `@anglr/datetime`.

## Contents

- Required providers (checklist)
- date-fns adapter (`@anglr/datetime/date-fns`)
- Moment.js adapter (`@anglr/datetime/moment`)
- Format provider (`FORMAT_PROVIDER`, `FormatProvider`)
- All DI tokens
- Extending `DateApiObject` with custom methods
- Writing a completely custom adapter

## Required providers (checklist)

| Token / provider | Needed by | Default | What happens if missing |
| --- | --- | --- | --- |
| `DATE_API` | every directive, pipe, service | **none** | `NullInjectorError` as soon as anything is rendered |
| `DATE_API_OBJECT_TYPE` | `DateFnsDateApi` / `MomentDateApi` constructor | **none** | `NullInjectorError` when `DATE_API` is created |
| `DATE_FNS_LOCALE` | `DateFnsDateApi` only | **none** | `NullInjectorError` (date-fns only) |
| `FORMAT_PROVIDER` | `dateTime` directive, `dateFormat` pipe, calendar | root factory with plain date-fns tokens (`date: 'yyyy-MM-dd'`, `dateTime: 'yyyy-MM-dd HH:mm'`, `time: 'HH:mm'`, …) | works, but formats are not locale-aware; with Moment the tokens are wrong — always provide the adapter's format provider |
| `POSITION` (from `@anglr/common`) | picker (`withPicker` and every `*PickerInput` composite) | **none** | `NullInjectorError` when the picker directive is created |
| `LOGGER` (from `@anglr/common`) | `DateTimeFormControl` | root factory (`DefaultLogger`) | nothing to do |

Full date-fns setup (app config):

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
        {
            provide: DATE_API,
            useClass: DateFnsDateApi,
        },
        DATE_FNS_FORMAT_PROVIDER,
        DATE_FNS_DATE_API_OBJECT_TYPE,
        {
            provide: DATE_FNS_LOCALE,
            useValue: <DateFnsLocale>
            {
                locale: enUS,
            },
        },
        providePosition(FloatingUiDomPosition),
    ],
};
```

`FloatingUiDomPosition` needs `npm install @floating-ui/dom` (optional dependency
of `@anglr/common`). Any other `Position` implementation works too.

## date-fns adapter (`@anglr/datetime/date-fns`)

Exports:

| Export | Kind | Purpose |
| --- | --- | --- |
| `DateFnsDateApi` | `@Injectable()` class implementing `DateApi<Date>` | provide as `DATE_API` (`useClass`) |
| `DateFnsDateApiObject` | class implementing `DateApiObject<Date>` | wrapper created by `DateFnsDateApi`; base class for extensions |
| `dateFnsDateApiObjectType` | `DateApiObjectCtor<Date, DateFnsDateApiObject>` | the constructor value (`= DateFnsDateApiObject`) |
| `DATE_FNS_DATE_API_OBJECT_TYPE` | `ValueProvider` | `{provide: DATE_API_OBJECT_TYPE, useValue: dateFnsDateApiObjectType}` |
| `DATE_FNS_FORMAT_PROVIDER` | `FactoryProvider` | locale-aware `FORMAT_PROVIDER` (table below) |
| `DATE_FNS_LOCALE` | `InjectionToken<DateFnsLocale>` | supplies the date-fns `Locale` |
| `DateFnsLocale` | interface | `{readonly locale: Locale}` |

`DATE_FNS_FORMAT_PROVIDER` values:

| Key | Format | Key | Format |
| --- | --- | --- | --- |
| `date` | `'P'` (locale long date) | `minute` | `'mm'` |
| `dateTime` | `'Pp'` | `second` | `'ss'` |
| `time` | `'p'` | `dayName` | `'cccc'` |
| `year` | `'yyyy'` | `dayNameShort` | `'cccccc'` |
| `month` | `'MM'` | `monthName` | `'LLLL'` |
| `week` | `'ww'` | `monthNameShort` | `'LLL'` |
| `day` | `'dd'` | `hour` | `'HH'` |

Behaviour worth knowing:

- `getFormat('P'|'PP'|…|'Pp'|'p')` expands the pseudo tokens via
  `locale.formatLong` into a real pattern (e.g. `'MM/dd/yyyy'` for `enUS`). The
  input displays and parses with that expanded pattern; other strings pass
  through unchanged.
- Strings matching `^\d+-\d+-\d+(T\d+:\d+:\d+)?` are parsed as ISO regardless of
  format. Any other string **requires** a format, otherwise
  `getValue()` throws `date-fns requires format parameter to be set for parsing non ISO string date!`.
- `getValue()` runs `DateTimeRelativeParser` first, so `'+5d'`, `'-2M'`, … work
  everywhere a value is parsed (including user typing into an input).
- Week start, weekday names and formatting follow `DATE_FNS_LOCALE`.
- Use date-fns format tokens (`yyyy`, `dd`, `HH`, `'T'` quoted literals).

Changing the locale at runtime: `DATE_FNS_LOCALE` only needs an object with a
`locale` getter, so provide a service whose `locale` property changes:

```typescript
import {Injectable} from '@angular/core';
import {DateFnsLocale} from '@anglr/datetime/date-fns';
import {enUS} from 'date-fns/locale';
import {Locale} from 'date-fns';

@Injectable({providedIn: 'root'})
export class AppDateLocale implements DateFnsLocale
{
    public locale: Locale = enUS;
}

// providers: [{provide: DATE_FNS_LOCALE, useExisting: AppDateLocale}]
```

Formatting and week start read `locale` on every call, but an already created
`dateTime` element keeps the `customFormat` pattern resolved at its creation
(re-create the element or set `customFormat` to pick up a new locale pattern).

## Moment.js adapter (`@anglr/datetime/moment`)

```typescript
import {DATE_API} from '@anglr/datetime';
import {MomentDateApi, MOMENT_FORMAT_PROVIDER, MOMENT_DATE_API_OBJECT_TYPE} from '@anglr/datetime/moment';

export const appProviders =
[
    {
        provide: DATE_API,
        useClass: MomentDateApi,
    },
    MOMENT_FORMAT_PROVIDER,
    MOMENT_DATE_API_OBJECT_TYPE,
];
```

| Export | Purpose |
| --- | --- |
| `MomentDateApi` | `DateApi<moment.Moment>`, provide as `DATE_API` |
| `MomentDateApiObject` | wrapper, base class for extensions |
| `momentDateApiObjectType` | constructor value |
| `MOMENT_DATE_API_OBJECT_TYPE` | `ValueProvider` for `DATE_API_OBJECT_TYPE` |
| `MOMENT_FORMAT_PROVIDER` | `FORMAT_PROVIDER` with `date: 'L'`, `dateTime: 'L LT'`, `time: 'LT'`, `year: 'YYYY'`, `month: 'MM'`, `week: 'ww'`, `day: 'DD'`, `hour: 'HH'`, `minute: 'mm'`, `second: 'ss'`, `dayName: 'dddd'`, `dayNameShort: 'dd'`, `monthName: 'MMMM'`, `monthNameShort: 'MMM'` |

- `TDate` is `moment.Moment`; values from the input are Moment instances when
  `valueFormat` is `DateInstance`.
- Locale is moment's global locale (`moment.locale('de')`); there is no locale token.
- `getFormat()` expands `L`, `LT`, `LTS`, `LL…` via `moment.localeData()`.
- `format()` replaces `y`→`Y` and `d`→`D` before formatting, so date-fns-like
  patterns (`'yyyy-MM-dd'`) format correctly; parsing uses moment syntax as-is.

## Format provider (`FORMAT_PROVIDER`, `FormatProvider`)

`FormatProvider` keys (all `readonly string`): `date`, `dateTime`, `time`,
`year`, `month`, `week`, `day`, `hour`, `minute`, `second`, `dayName`,
`dayNameShort`, `monthName`, `monthNameShort`.

They are used by the `format` input of `dateTime` (`format="dateTime"`), by the
`dateFormat` pipe (`| dateFormat: 'time'`) and by the pickers/calendar
(month names, week numbers). Override for fixed app-wide formats; tokens must
match the active adapter's syntax:

```typescript
import {FactoryProvider} from '@angular/core';
import {FORMAT_PROVIDER, FormatProvider} from '@anglr/datetime';

export const formatProvider: FactoryProvider =
{
    provide: FORMAT_PROVIDER,
    useFactory: () =>
    {
        return <FormatProvider>{
            date: 'd.M.y',
            dateTime: 'd.M.y HH:mm',
            time: 'HH:mm',
            year: 'yyyy',
            month: 'MM',
            week: 'ww',
            day: 'dd',
            hour: 'HH',
            minute: 'mm',
            second: 'ss',
            dayName: 'cccc',
            dayNameShort: 'cccccc',
            monthName: 'LLLL',
            monthNameShort: 'LLL',
        };
    },
};
```

Register it after (instead of) the adapter's format provider.

## All DI tokens

| Token | Type | Entry point | Notes |
| --- | --- | --- | --- |
| `DATE_API` | `InjectionToken<DateApi>` | `@anglr/datetime` | required |
| `DATE_API_OBJECT_TYPE` | `InjectionToken<DateApiObjectCtor>` | `@anglr/datetime` | required by built-in adapters; override to extend the wrapper |
| `FORMAT_PROVIDER` | `InjectionToken<FormatProvider>` | `@anglr/datetime` | root default exists |
| `DATE_TIME_INPUT` | `InjectionToken<DateTimeInput>` | `@anglr/datetime` | provided by `DateTimeInputDirective` (`input[dateTime][dateTimeInput]`); injected by CVA, form control, handlers, picker |
| `DATE_TIME_PICKER_DIRECTIVE_OPTIONS` | `InjectionToken<Partial<DateTimePickerDirectiveOptions>>` | `@anglr/datetime` | global picker directive options, see `references/picker.md` |
| `DATE_TIME_PICKER_OPTIONS` | `InjectionToken<Partial<DateTimePickerOptions>>` | `@anglr/datetime` | read only by a directly used `<date-time-picker>`, see `references/picker.md` |
| `DATE_FNS_LOCALE` | `InjectionToken<DateFnsLocale>` | `@anglr/datetime/date-fns` | required for date-fns |

## Extending `DateApiObject` with custom methods

Subclass the adapter's object type and register it as `DATE_API_OBJECT_TYPE`.
Override `clone()` / `cloneOriginal()` so clones keep the subclass.

```typescript
import {DateApiObject} from '@anglr/datetime';
import {DateFnsDateApiObject} from '@anglr/datetime/date-fns';
import {differenceInMonths, differenceInYears, differenceInSeconds} from 'date-fns';

export class DateApiExtension extends DateFnsDateApiObject
{
    public override clone(): DateApiObject<Date>
    {
        return new DateApiExtension(new Date(this._value), null, this._localeSvc);
    }

    public override cloneOriginal(): DateApiObject<Date>
    {
        return new DateApiExtension(new Date(this._originalValue), null, this._localeSvc);
    }

    public diffMonths(date: Date): number
    {
        return differenceInMonths(this._value, date);
    }

    public diffYears(date: Date): number
    {
        return differenceInYears(this._value, date);
    }

    public diffSeconds(date: Date): number
    {
        return differenceInSeconds(this._value, date);
    }
}
```

```typescript
import {DATE_API, DATE_API_OBJECT_TYPE} from '@anglr/datetime';
import {DateFnsDateApi} from '@anglr/datetime/date-fns';

import {DateApiExtension} from './dateApiExtension';

/**
 * Registers `DateApi` together with extended `DateApiObject` type, both must be provided in the same injector
 */
export const appProviders =
[
    {
        provide: DATE_API,
        useClass: DateFnsDateApi,
    },
    {
        provide: DATE_API_OBJECT_TYPE,
        useValue: DateApiExtension,
    },
];
```

(adapted from readme: the separate `dateApiExtensionProvider` constant is inlined;
keep `DATE_FNS_FORMAT_PROVIDER` and `DATE_FNS_LOCALE` as in the checklist.)
`DATE_API` must live in the same injector as `DATE_API_OBJECT_TYPE` because the
type is injected when `DateApi` is created. Usage: cast the result,
`this.dateApi.getValue('2024-03-15', 'yyyy-MM-dd') as DateApiExtension`.
Protected members available to subclasses: `_value`, `_originalValue`,
`_localeSvc` (date-fns) / `_value`, `_originalValue` (moment).

## Writing a completely custom adapter

Implement `DateApi<TDate>` (`getValue`, `now`, `getFormat`,
`weekStartsOnMonday`, `weekdays`, `weekdaysShort` (deprecated, delegate to
`weekdays(true)`), `isDate`) and a `DateApiObject<TDate>` with the full fluent
API listed in `references/services-and-pipes.md`. Provide it as `DATE_API`, its
object type as `DATE_API_OBJECT_TYPE` (if your `DateApi` uses it), and a
matching `FORMAT_PROVIDER`. Let `getValue()` call
`DateTimeRelativeParser.parse()` first if relative input (`+5d`) should work.
