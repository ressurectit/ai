---
name: anglr-select
description: >-
  Builds Angular selects, dropdowns, multi-selects, type-ahead/autocomplete
  and searchable or remote-loaded pickers with @anglr/select v17.x —
  `<ng-select>` + `<ng-option>`/`<ng-option-group>`, form bridges
  (`[formField]` SelectFormControl, `formControl`/`ngModel`
  SelectControlValueAccessor, `[(value)]` WithDirectAccess), attributes
  `multiple`, `edit`, `absolute`, `placeholder`, `*optionTemplate`, 9
  swappable plugins via `[selectOptions]` or `provide…Type/Options()`
  (FilterLiveSearch, DynamicValueHandler, CodeOptionsGatherer…),
  `@anglr/select/extensions` and SCSS themes / `--select-*` variables.
  Prefer it over native `<select>`, @ng-select/ng-select or mat-select in
  projects using @anglr/*. Trigger for any select box, tag input, option
  groups, "add new option", or styling/extending a select, even when
  @anglr/select is not named.
metadata:
  package: "@anglr/select"
  version: "17.3.0"
  repository: "https://github.com/ressurectit/ng-select"
---

# @anglr/select

## Contents

Overview · When to use what · Installation · Entry points · Quick start · Key concepts · Common decisions & pitfalls · References · Links

## Overview

> Created for **@anglr/select v17.3.0**. APIs of other versions may differ — check the installed
> version (`node_modules/@anglr/select/package.json`) and warn the user if it doesn't match.

Angular component representing an HTML `<select>`: standalone, OnPush and signal-driven.
`<ng-select>` is only a host; all behaviour lives in **9 plugin slots** (Interactions,
KeyboardHandler, LiveSearch, NormalState, OptionsHandler, Popup, Positioner, ReadonlyState,
ValueHandler), each a standalone component that can be swapped or configured. Options come
from `<ng-option>` children or from code (`CodeOptionsGatherer`).

## When to use what

| Need | Use | Details |
| --- | --- | --- |
| Basic select bound to a signal form | `<ng-select [formField]>` + `Select`, `Option`, `FormField`, `SelectFormControl` | `references/components-and-forms.md` |
| Bind to `FormControl` / `formControlName` / `ngModel` | `SelectControlValueAccessor` | `references/components-and-forms.md` |
| Plain two-way binding to a signal | `withDirectAccess` + `[(value)]` (`WithDirectAccess`) | `references/components-and-forms.md` |
| Multi-select (value is an array, tags) | static `multiple` attribute; keep popup open → import `SelectMultipleKeepPopup` | `references/directives-and-templates.md` |
| Type-ahead / editable input | `edit` attribute (`SelectEdit`) | `references/directives-and-templates.md` |
| Filter input inside popup | `FilterLiveSearch` + `popup.options.liveSearchEnabled: true` | `references/plugins.md` |
| Option groups | `<ng-option-group text>` (+ `*optionGroupTemplate`) | `references/components-and-forms.md` |
| Options loaded later (signal / HTTP) | `@for` over `<ng-option>` | `references/samples-dynamic-options.md` |
| Server-side search / options from code | `CodeOptionsGatherer` + `DynamicValueHandler` + `getSearch()` | `references/samples-dynamic-options.md`, `references/plugins.md` |
| Object values, store only a key | `valueExtractor` (+ `valueComparer`) in `SelectOptions` | `references/plugins.md` |
| Let users create options by typing | `optionsHandler.options.newOptionGetter` | `references/plugins.md` |
| Clear (×) button | `normalState.options.cancelValue: true` | `references/plugins.md` |
| Custom option / value rendering | `*optionTemplate`, `*normalStateTemplate`, `*normalStateTagTemplate`, `displayValue` pipe | `references/directives-and-templates.md` |
| Popup clipped by `overflow: hidden` | `absolute` attribute or `PopoverPositioner` | `references/plugins.md` |
| Read/set value, search, readonly from code | `select.execute(setValue(…))`, `executeAndReturn(getValue())` | `references/extensions.md` |
| App-wide / component-wide defaults | `provideSelectOptions()`, `provide<Slot>Type()`, `provide<Slot>Options()` | `references/plugins.md` |
| Write a custom plugin | implement slot interface, inject `SelectBus` / `SelectPluginInstances` | `references/extensibility.md` |
| Theme / restyle | `@anglr/select/styles` (+ `/themes/light`, `/themes/dark`), `--select-*` vars | `references/styling.md` |

## Installation

```bash
npm install @anglr/select --save
```

Required (declared as `dependencies`, keep the app's versions compatible):
`@angular/core|common|forms >=22.0.4`, `@anglr/common >=24.2.0`,
`@jscrpt/common >=7.1.0`, `@css-styles/common >=2.0.1`, `lodash-es >=4.18.1`,
`rxjs >=7.8.2`.

App setup needed once:

1. **Position service** — the default positioner (`CommonPositioner`) injects
   `POSITION` from `@anglr/common`; without it the select fails to create:
   ```typescript
   import {providePosition} from '@anglr/common';
   import {FloatingUiDomPosition} from '@anglr/common/floating-ui';
   // app.config.ts providers:
   providePosition(FloatingUiDomPosition),
   ```
2. **Styles** — include a theme inside a rule (see `references/styling.md`).
   The CSS uses `--size-*` variables from `@css-styles/common`
   (`buildSizes` / `buildFixedSizes`) and the default icon classes are
   Font Awesome (`fas fa-caret-down`, `fas fa-times`, `fas fa-check`).

## Entry points

| Import path | Contains |
| --- | --- |
| `@anglr/select` | components, directives, plugins, pipes, interfaces, tokens, `provide*()`, utils, `SelectModule` |
| `@anglr/select/extensions` | `getValue`, `setValue`, `getSearch`, `getSelectedOption`, `getSelectedOptions`, `setReadonly` |
| `@anglr/select/styles` (Sass) | `defineTheme`, `buildTheme`, `buildThemeVars`, `buildThemeCss` |
| `@anglr/select/styles/themes/light`, `/dark` (Sass) | `defineTheme($fontSize, $theme, $customization)`, `buildTheme()` |

## Quick start

```typescript
import {Component, ChangeDetectionStrategy, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import {Select, Option, SelectFormControl} from '@anglr/select';

@Component(
{
    template: `
        <ng-select [formField]="myField">
            <ng-option value="a" text="Option A"/>
            <ng-option value="b" text="Option B"/>
            <ng-option value="c" text="Option C"/>
        </ng-select>
    `,
    imports:
    [
        Select,
        Option,
        FormField,
        SelectFormControl,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent
{
    protected myField = form(signal<string|null>(null));
}
```

`Select` gathers the `<ng-option>` children, creates the default plugins and
`SelectFormControl` syncs the ValueHandler's value with the form field
(including `disabled()` / `readonly()`).

## Key concepts

- **Options object** — `[selectOptions]` takes `RecursivePartial<SelectOptions>`;
  it is deep-merged (arrays replaced) onto defaults. Merge order:
  defaults → `multiple` attribute → `provideSelectOptions()` →
  `provide<Slot>Type()` → `[selectOptions]` / directives. Per-plugin options
  also merge onto `provide<Slot>Options()` and the plugin's defaults.
- **Plugin slot = `{type, options}`** under `selectOptions.plugins.<slot>`.
  Type changes recreate the plugin; options are merged into it.
- **Value vs option** — options are `SelectOption` objects of signals
  (`value`, `text`, `group`); the public value is
  `valueExtractor(option)` (default `option.value()`), compared with
  `valueComparer` (default `===`).
- **Everything is a signal**: `select.initialized()`, plugin `search()`,
  `selectBus.selectedOptions()`, ValueHandler `value()`. Extension `get*`
  functions are reactive inside `computed()` / `effect()`.
- Each attribute directive must be **imported** to take effect
  (`SelectEdit`, `SelectAbsolute`, `SelectPlaceholder`, …); `multiple` works
  without import (read as a static attribute), but keeping the popup open
  needs `SelectMultipleKeepPopup`.

## Common decisions & pitfalls

- Signal forms (`[formField]`) → `SelectFormControl`; reactive/template forms
  → `SelectControlValueAccessor`; no forms → `WithDirectAccess`. Import
  exactly one bridge matching the binding, otherwise the value is never synced.
- `multiple` is read via `@Attribute` → only a static attribute works;
  `[multiple]="x"` does not. For dynamic switching set `selectOptions.multiple`.
- Multiple value must be an array, not a scalar; initialise multiple fields
  with `[]` — `DynamicValueHandler` throws when `null` is written to a
  multiple select (`StaticValueHandler` treats `null` as clear).
- `FilterLiveSearch` is invisible unless `popup.options.liveSearchEnabled: true`.
- Search text is used as a **RegExp** in the default `textCompare`
  (`new RegExp(search, 'i')`) — override `textCompare` if users may type
  `(`, `[`, `*`, ….
- `noCarret` only affects `EditNormalState` (i.e. with `edit`); the default
  `SimpleNormalState` always renders the caret — override
  `cssClasses.carret`/CSS instead.
- `PopoverPositioner` positions via CSS anchor positioning from the theme;
  with `popoverAuto: true` also set `interactions.options.handleClickOutside: false`.
- Object option values without `valueExtractor`/`valueComparer` compare by
  reference — writing a structurally equal object selects nothing.
- Texts (`placeholder`, `texts.*`) pass through `@anglr/common`'s `localize`
  pipe, so they may be localization keys.
- Names like `NgSelectModule`, `NgSelectComponent`, `NG_SELECT_OPTIONS`,
  `OptionComponent`, `DynamicOptionsGatherer`, `nothingSelected` are **not
  exported** — use `SelectModule`/`Select`, `SELECT_OPTIONS`, `Option`,
  `CodeOptionsGatherer`, `placeholder`.

## References

Read only what the task needs:

- `references/components-and-forms.md` — `Select` (inputs, API, events), `Option`, `OptionGroup`, `SelectModule`, form bridges, option/value interfaces
- `references/directives-and-templates.md` — attribute directives, template directives and their contexts, search highlighting, pipes
- `references/plugins.md` — `SelectOptions` table with defaults, all slots, built-in plugins with option defaults, providers and tokens
- `references/extensions.md` — `@anglr/select/extensions`, `execute`/`executeAndReturn` usage
- `references/extensibility.md` — writing custom plugins, `SelectBus`, `SelectPluginInstances`, `OptionsHandlerBase`, custom options gatherer, utility functions and types
- `references/styling.md` — Sass setup, themes, customization, full `--select-*` variable list, CSS classes
- `references/samples-basics.md` — basic, multiple, edit, live search, highlighting, custom templates
- `references/samples-dynamic-options.md` — lazy / `@for` options, remote data, object values
- `references/samples-popup-and-behavior.md` — absolute, popover, cancel, hide caret, add new option, readonly

## Links

- API reference: https://ressurectit.github.io/#/content/api/ng-select/select
- Extensions API: https://ressurectit.github.io/#/content/api/ng-select-extensions/select-extensions
- Live samples: https://ressurectit.github.io/#/content/select#samples
