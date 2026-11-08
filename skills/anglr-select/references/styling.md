# Styling and theming

## Contents

- Prerequisites
- Setup and themes (from readme)
- Sass API
- All CSS custom properties
- CSS classes / icon classes

## Prerequisites

- The select CSS uses size variables from `@css-styles/common`
  (`--size-1px`, `--size-2px`, `--size-4px`, `--size-xs`, `--size-sm`,
  `--size-none`, `--size-*-fixed`, …). Emit them once in the app, e.g.:
  ```scss
  @use '@css-styles/common' as mixins;

  :root
  {
      @include mixins.buildSizes(14px, mixins.$sizes);
      @include mixins.buildFixedSizes(14px);
  }
  ```
  (skip if the app already builds them, e.g. via other RessurectIT themes).
- Default icon classes are Font Awesome (`fas fa-caret-down`, `fas fa-times`,
  `fas fa-check`). Load Font Awesome, or override `cssClasses.carretIcon` /
  `carret` / `cancelIcon` / `optionChecked` of the normal-state and popup plugins.
- The normal state uses `TooltipDirective` from `@anglr/common`; include
  `@anglr/common` styles if tooltips should look right.

### Setup

The library ships SCSS that uses CSS custom properties for theming. Import a theme in your global stylesheet and include it **inside a style rule** (the mixins output custom-property declarations and nested rules, so they can't be used at the stylesheet root):

```scss
// Import the light theme (includes core CSS + variables)
@use '@anglr/select/styles/themes/light' as selectLight;

// Apply the theme
:root
{
    @include selectLight.buildTheme();
}
```

Or for the dark theme:

```scss
@use '@anglr/select/styles/themes/dark' as selectDark;

:root
{
    @include selectDark.buildTheme();
}
```

### Themes

Two pre-built themes are included:

| Theme | Import Path | Description |
|---|---|---|
| **Light** | `@anglr/select/styles/themes/light` | Light grays, blue focus, black text |
| **Dark** | `@anglr/select/styles/themes/dark` | Dark grays, blue focus, white text |

Each theme exposes:
- `defineTheme($fontSize, $theme, $customization)` — returns a theme map
- `buildTheme()` — outputs the theme variables and the select CSS

The `@anglr/select/styles` entry point exposes the building blocks:
- `defineTheme($fontSize, $theme)` — builds a theme map from the default theme
- `buildTheme($theme)` — outputs the theme variables and the select CSS
- `buildThemeVars($theme)` / `buildThemeCss` — output only the variables or only the CSS, useful when switching between several themes (variables per theme class, CSS once)

### CSS Custom Properties

All visual aspects are driven by CSS custom properties. Here are the key ones:

**Normal State**

| Property | Default (Light) | Description |
|---|---|---|
| `--select-normalState-borderColor` | `#666` | Border color |
| `--select-normalState-background` | `#eee` | Background color |
| `--select-normalState-foreground` | `#000` | Text color |
| `--select-normalState-borderRadius` | `4px` | Corner rounding |
| `--select-normalState-padding` | `1px 2px` | Inner padding |
| `--select-normalState-focus-borderColor` | `#0066ff` | Focus border |
| `--select-normalState-focus-outlineColor` | `#0066ff` | Focus outline |
| `--select-normalState-tag-background` | `#ccc` | Multi-select tag background |
| `--select-normalState-tag-foreground` | `#000` | Multi-select tag text |
| `--select-normalState-disabled-background` | *(derived)* | Disabled background |

**Popup**

| Property | Default (Light) | Description |
|---|---|---|
| `--select-popup-container-background` | `#F0F0F0` | Popup background |
| `--select-popup-container-foreground` | `#000` | Popup text color |
| `--select-popup-container-borderColor` | `#acacac` | Popup border |
| `--select-popup-option-active-background` | *(derived from container)* | Hovered option |
| `--select-popup-option-selected-background` | *(derived from container)* | Selected option |
| `--select-popup-option-searchHighlight-textDecoration` | `underline` | Decoration applied to `::highlight(search-query)` matches inside the popup |
| `--select-popup-option-searchHighlight-textShadow` | `0 0 2px hsl(from currentColor h s 45%)` | Shadow applied to `::highlight(search-query)` matches inside the popup |

**Live Search**

| Property | Default (Light) | Description |
|---|---|---|
| `--select-liveSearch-placeholder-foreground` | `#000` | Placeholder color |

### Customizing a Theme

Override specific values when calling `defineTheme` of a theme:

```scss
@use '@anglr/select/styles' as select;
@use '@anglr/select/styles/themes/light' as selectLight;

$myTheme: selectLight.defineTheme(
    $fontSize: 16px,
    $customization: (
        select: (
            normalState: (
                borderColor: #999,
                background: #fff,
                foreground: #333,
                borderRadius: 8px,
                focus: (
                    borderColor: #ff6600,
                    outlineColor: #ff6600,
                ),
                tag: (
                    background: #e0e0e0,
                    borderRadius: 12px,
                ),
            ),
            popup: (
                container: (
                    background: #fff,
                    borderColor: #ddd,
                    borderRadius: 8px,
                ),
            ),
        ),
    ),
);

:root
{
    @include select.buildTheme($myTheme);
}
```

### Building a Custom Theme

Create a theme from scratch using `defineTheme` from `@anglr/select/styles`, which starts from the default theme values:

```scss
@use '@anglr/select/styles' as select;

$customTheme: select.defineTheme(
    $fontSize: 14px,
    $theme: (
        select: (
            normalState: (
                borderColor: #3498db,
                background: #ecf0f1,
                foreground: #2c3e50,
                focus: (
                    borderColor: #2980b9,
                    outlineColor: #2980b9,
                ),
            ),
            popup: (
                container: (
                    background: #ecf0f1,
                    foreground: #2c3e50,
                    borderColor: #bdc3c7,
                ),
            ),
        ),
    ),
);

:root
{
    @include select.buildTheme($customTheme);
}
```

### Overriding Styles in Components

For component-scoped overrides, wrap the select in a container and override CSS custom properties in the component's styles. Only selects inside the container change:

```html
<!-- stylingOverride.component.html -->
<div class="select-override">
    <ng-select [formField]="field">
        <ng-option value="first" text="First value text"/>
        <ng-option value="second" text="Second value text"/>
    </ng-select>
</div>
```

```scss
// stylingOverride.component.scss
.select-override {
    --select-normalState-borderColor: tomato;
    --select-normalState-background: lightyellow;
    --select-normalState-foreground: #333;
    --select-normalState-focus-borderColor: red;
    --select-normalState-focus-outlineColor: red;
    --select-popup-container-background: lightyellow;
    --select-popup-container-borderColor: tomato;
}
```

---
## Sass API

`@anglr/select/styles`:

| Member | Description |
| --- | --- |
| `defineTheme($fontSize: 14px, $theme: ())` | function → theme map from the neutral default theme (`unset` colors) |
| `buildThemeVars($theme)` | mixin → `--select-*` custom properties |
| `buildThemeCss` | mixin → component CSS (`ng-select`, `.select-component` …) |
| `buildTheme($theme)` | mixin → vars + CSS |

`@anglr/select/styles/themes/light` and `/dark`:

| Member | Description |
| --- | --- |
| `defineTheme($fontSize: 14px, $theme: (), $customization: ())` | function → light/dark map deep-merged with `$theme` then `$customization` |
| `buildTheme()` | mixin → vars + CSS of the theme (no arguments; for customizations use `select.buildTheme(selectLight.defineTheme(…))`) |

Switching themes by class: put `buildThemeVars(lightMap)` in `.light`,
`buildThemeVars(darkMap)` in `.dark`, and `buildThemeCss` once in a common rule.

The map shape is `(select: (normalState: (…), popup: (container: (…), option: (…), optionGroup: (…)), liveSearch: (placeholder: (…))))`;
each leaf becomes `--select-<path-joined-by-dash>`.

## All CSS custom properties

| Group | Properties (light default where set) |
| --- | --- |
| normal state | `--select-normalState-borderColor` (#666), `-borderStyle` (solid), `-borderWidth`, `-background` (#eee), `-foreground` (#000), `-boxShadow`, `-padding`, `-borderRadius`, `-fontFamily`, `-fontSize`, `-letterSpacing`, `-gap` |
| focus | `--select-normalState-focus-borderColor` (#0066ff), `-focus-outlineColor` (#0066ff), `-focus-outlineWidth` |
| tags (multiple, edit) | `--select-normalState-tag-background` (#ccc), `-tag-foreground`, `-tag-gap`, `-tag-padding`, `-tag-borderRadius`, `-tag-fontSize` |
| disabled/readonly | `--select-normalState-disabled-background`, `-disabled-foreground`, `-disabled-borderColor` (light: derived via `hsl(from …)`) |
| popup container | `--select-popup-container-background` (#F0F0F0), `-foreground`, `-padding`, `-borderRadius`, `-borderColor` (#acacac), `-borderWidth`, `-borderStyle`, `-boxShadow` |
| popup options | `--select-popup-option-padding`, `-borderRadius`, `-selected-background`, `-selected-backgroundImage`, `-active-background`, `-active-backgroundImage`, `-inGroup-margin`, `-searchHighlight-textDecoration` (underline), `-searchHighlight-textShadow` |
| option groups | `--select-popup-optionGroup-fontStyle` (italic), `-letterSpacing`, `-fontWeight` (500) |
| live search | `--select-liveSearch-placeholder-foreground`, `-placeholder-opacity`, `-placeholder-letterSpacing` |

Dark theme: normal state `#4a4a4a` background / `#f0f0f0` foreground / `#bbb`
border, tag `#666`, popup `#3A3A3A` / `#4e4e4e` border.

## CSS classes (defaults, override via plugin `cssClasses`)

- host: `ng-select.select-component`, inner `div.visual-container` (anchor for popover)
- normal state: `.normal-state-component`, `.normal-state-element` (button), `.normal-state-carret`, `.normal-state-cancel`; edit: `.normal-state-value`, `.select-tag`
- live search: `.live-search-component`, `.live-search-input`
- popup: `.popup-component`, `.popup-container`, `.option`, `.option.active`, `.option.selected`, `.option.in-group`, `.option-group`, `.option-text`; popover adds `.popover-popup`
- readonly/disabled: `.disabled` on the normal-state component
