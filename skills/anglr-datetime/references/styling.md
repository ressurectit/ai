# Styling and theming

Sass themes for the picker and the month calendar, CSS custom properties and
what the styles expect from the page.

## Contents

- Setup
- Customizing a theme (`defineTheme`)
- CSS custom properties
- Overriding per component
- CSS classes and required external styles
- Sass API

## Setup

Include a theme once in global styles; `buildTheme()` emits the CSS variables
**and** the component CSS (selectors `date-time-picker`, `day-picker`,
`month-picker`, `year-picker`, `roller-time-picker`, `month-calendar`, plus
`date-time-*` helper classes):

```scss
@use '@anglr/datetime/styles/themes/light' as dateTimeLight;

:root
{
    @include dateTimeLight.buildTheme();
}
```

Dark theme on any selector:

```scss
@use '@anglr/datetime/styles/themes/dark' as dateTimeDark;

.dark
{
    @include dateTimeDark.buildTheme();
}
```

Available themes: `light`, `dark` (dark overrides picker background
`#111111`, border `#EAEAEA`, foreground `#FAFAFA`, disabled background `#5B5B5B`).

Without a theme the picker has no background, border or layout grid.

## Customizing a theme (`defineTheme`)

`defineTheme($colors: (), $font: 'Inter')` of a theme module deep-merges
`$colors` over that theme's defaults; pass the result to `buildTheme($theme)`
from `@anglr/datetime/styles`:

```scss
@use '@anglr/datetime/styles' as datetime;
@use '@anglr/datetime/styles/themes/light' as light;

:root
{
    @include datetime.buildTheme(light.defineTheme((dateTimePicker: (active: (background: #ff6600)))));
}
```

Theme map keys (light defaults):

| Key path | Default | CSS variable |
| --- | --- | --- |
| `dateTimePicker.background` | `#FFFFFF` | `--datetime-date-time-picker-background` |
| `dateTimePicker.border` | `#333333` | `--datetime-date-time-picker-border` |
| `dateTimePicker.foreground` | `#111111` | `--datetime-date-time-picker-foreground` |
| `dateTimePicker.periodDatum.border` | `transparent` | `--datetime-date-time-picker-period-datum-border` |
| `dateTimePicker.active.border` | `transparent` | `--datetime-date-time-picker-active-border` |
| `dateTimePicker.active.background` | `#00c3ff` | `--datetime-date-time-picker-active-background` |
| `dateTimePicker.clickable.hover.background` | `#00e7ff` | `--datetime-date-time-picker-clickable-hover-background` |
| `dateTimePicker.clickable.hover.border` | `transparent` | `--datetime-date-time-picker-clickable-hover-border` |
| `dateTimePicker.disabled.background` | `#CFCFCF` | `--datetime-date-time-picker-disabled-background` |
| `dateTimePicker.today.border` | `#0077ff` | `--datetime-date-time-picker-today-border` |
| `dayPicker.weekend.foreground` | `#850000` | `--datetime-day-picker-weekend-foreground` |
| `monthCalendar.weekend.foreground` | `#ff0000` | `--datetime-month-calendar-weekend-foreground` |
| `monthCalendar.otherMonth.background` | `#00000033` | `--datetime-month-calendar-other-month-background` |

`$font` is stored in the theme map but no CSS uses it — fonts come from the page.

## CSS custom properties

The 13 variables in the table above are the complete list. Set them anywhere
in the cascade to restyle without Sass; the component CSS from `buildTheme()`
must still be included once.

## Overriding per component

```scss
:host
{
    --datetime-date-time-picker-active-background: #ff6600;
    --datetime-date-time-picker-today-border: #ff6600;
}
```

With the default `absolute: true` the picker is rendered into `body`, outside
the component host, so `:host` variables do not reach it. Either render it
next to the input or define the variables globally / on a class:

```html
<input dateTime simpleDatePickerInput
       [withPickerOptions]="{absolute: false}"
       [formControl]="dateControl">
```

or keep `absolute` and add `pickerCssClass: 'my-picker'` with a global
`.my-picker { --datetime-…: …; }` rule.

## CSS classes and required external styles

- Arrows use **Font Awesome** classes `fas fa-angle-left` / `fas fa-angle-right`;
  without Font Awesome they render empty — load it or style those classes.
- `<date-time-picker>`: `display: inline-block`, `z-index: 123`, border radius
  6px, period grid `width: 280px`.
- Period items: `.period-datum`, states `.active`, `.disabled`, `.today`,
  `.weekend`, `.other-month`, `.clickable`; header `.period`, `.period-value`.
- Time roller: `.time-area`, `.value-container`, `.roller-scroll(.open)`,
  `.roller-item(.selected)`, `.minute-second-separator`.
- Calendar: `.day-wrapper`, `.day-content`, `.default-calendar-day`
  (`.is-weekend`, `.is-other-month`), `.week-day-name`, `.week-number`.
- Helper classes emitted by the theme: `.date-time-hidden`, `.date-time-bold`,
  `.date-time-semi-bold`, `.date-time-flex-row`, `.date-time-flex-column`,
  `.date-time-flex-end`, `.date-time-flex-1`, `.date-time-align-self-center`,
  `.date-time-align-items-center`, `.date-time-text-uppercase`,
  `.date-time-text-spread`, `.date-time-text-small-caps`,
  `.date-time-small-text`, and `.date-time-margin[-left|-right|-top|-bottom|-horizontal|-vertical]-{none|extra-small|small|medium|big}`
  (0 / 4 / 10 / 15 / 20px).

## Sass API

| Module | Members |
| --- | --- |
| `@anglr/datetime/styles` | `defineTheme($colors, $font)` (merge over base defaults), `buildTheme($theme)`, `buildThemeColors($theme)` (variables only), `buildThemeCss` (CSS only) |
| `@anglr/datetime/styles/themes/light`, `…/dark` | `defineTheme($colors: (), $font: 'Inter')`, `buildTheme()` (no arguments) |

Use `buildThemeColors` on extra selectors (e.g. `.dark`) when the component
CSS is already emitted once at `:root`, to avoid duplicating the CSS.
