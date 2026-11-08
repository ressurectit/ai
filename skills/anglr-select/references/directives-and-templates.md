# Directives, templates, highlighting and pipes

## Contents

- Overview
- Attribute directives on `<ng-select>`
- Template directives (structural, put inside `<ng-select>`)
- Search highlighting (CSS Custom Highlight API)
- Pipes

## Overview

Every directive/pipe is standalone and must be listed in the component's
`imports` to take effect.

## Attribute directives on `<ng-select>`

| Directive | Selector | Effect |
| --- | --- | --- |
| `SelectFormControl` | `ng-select[formField]` | signal-forms bridge (see `components-and-forms.md`) |
| `SelectControlValueAccessor` | `ng-select[formControl]`, `[formControlName]`, `[ngModel]` | reactive / template forms bridge |
| `WithDirectAccess` | `ng-select[withDirectAccess]` | `[(value)]` model without forms |
| `SelectEdit` | `ng-select[edit]` | provides `EditNormalState` + `EditLiveSearch` (an `<input>` replaces the button and filters options while typing) and sets keyboard options `alphanumericSearch: false`, `liveSearchEvents: true` (Backspace in empty input removes last value), `openPopupOnSpace: false` (Space is typed) |
| `SelectMultipleKeepPopup` | `ng-select[multiple]` | sets `closeOnSelect = false` so the popup stays open while picking |
| `SelectAbsolute` | `ng-select[absolute]` | `absolute: true` → popup element is moved to `document.body` (into `containerElement`, default `div.select-component`) |
| `SelectPlaceholder` | `ng-select[placeholder]` | required input `placeholder: string`, reactive → `selectOptions.placeholder` (default `'please select value'`) |
| `SelectNoCarret` | `ng-select[noCarret]` | sets `normalState.options.carret = false` — honoured only by `EditNormalState` (i.e. together with `edit`) |

Note: `multiple` itself needs no directive (static attribute read by
`Select`). Without importing `SelectMultipleKeepPopup` the popup closes after
each pick.

```html
<ng-select multiple [formField]="tags" edit placeholder="pick tags">…</ng-select>
```

## Template directives (structural, put inside `<ng-select>`)

| Directive | Usage | Context |
| --- | --- | --- |
| `NormalStateTemplate` | `<span *normalStateTemplate="let normalState">` | `NormalStateContext`: `$implicit: NormalState` plugin (use `normalState.selectBus.selectedOptions()`) |
| `NormalStateTagTemplate` | `<span *normalStateTagTemplate="let option; let ns = normalState">` | `NormalStateTagContext`: `$implicit: SelectOptionState`, `normalState` — one tag per selected option; used by `EditNormalState` with `multiple` |
| `OptionTemplate` | `<span *optionTemplate="let option; let popup = popup">` | `PopupContext`: `$implicit: SelectOptionState`, `popup: Popup` |
| `OptionGroupTemplate` | `<span *optionGroupTemplate="let text">` inside `<ng-option-group>` | `{$implicit: string}` group text |

Which plugin uses which template:

- `SimpleNormalState` (default): `normalStateTemplate` inside its button; no
  tag template — multiple values are shown joined by `, ` via `displayValue`.
- `EditNormalState` (`edit`): `normalStateTemplate` for single,
  `normalStateTagTemplate` for each tag in multiple (default tag has an `x`
  remove button).
- `SimplePopup`: `optionTemplate` for every option, group's template for headers.

Templates are typed via `ngTemplateContextGuard`. The `displayValue` pipe
works inside them (it injects the select's `SelectBus`) but must be imported:

```html
<ng-select [formField]="selectField">
    <ng-option value="first" text="First value text"/>
    <span *normalStateTemplate="let normalState">
        =&gt; {{ normalState.selectBus.selectedOptions() | displayValue }} &lt;=
    </span>
    <span *optionTemplate="let option">
        {{ option.value() }} - {{ option.text() }}
    </span>
</ng-select>
```

## Search highlighting (CSS Custom Highlight API)

`SimplePopup` highlights the live-search text in option texts when
`popup.options.searchHighlighting` is `true` (default) and the browser supports
`CSS.highlights`. Styling: `::highlight(search-query)` via
`--select-popup-option-searchHighlight-*` vars.

| Directive | Selector | Role |
| --- | --- | --- |
| `HighlightInstance` | `[highlightInstance]` | host directive of `SimplePopup`; owns the `Highlight` registered as `search-query`; `searchQuery` and `enabled` signals, `registerHighlightRanges()` / `unregisterHighlightRanges()` |
| `HighlightSearch` | `[highlightSearch]`, exportAs `highlightSearch` | on each option text element in the popup; builds `Range`s for every occurrence (case-sensitive `indexOf`) of the query in direct text nodes; `addNodes()` / `removeNodes()`, `injector` |
| `HighlightText` | `[highlightText]` | use inside a custom `*optionTemplate` to mark the element whose text is highlighted (without it only bare text nodes rendered directly into the option text element are highlighted, so text inside a custom template's elements is not); throws if used outside the popup option |

Only `HighlightText` is used by consumers (import it):

```html
<span *optionTemplate="let option">
    <strong>{{ option.value() }}</strong>
    <span highlightText> - {{ option.text() }}</span>
</span>
```

`HighlightInstance` / `HighlightSearch` matter only when writing a custom
popup that wants the same highlighting (apply `HighlightInstance` as host
directive, `highlightSearch` on option elements, render the option template
with `injector: highlightSearch.injector`).

## Pipes

| Pipe (class) | Name | Pure | Purpose |
| --- | --- | --- | --- |
| `DisplayValue` | `displayValue` | no | `SelectOption \| SelectOption[] \| null` → text via `displaySelectedValue` (arrays joined `, `); empty → `placeholder` or the optional argument `displayValue: 'override'` |
| `DisplayOptionValue` | `displayOptionValue` | no | option text in popup via `displayOptionValue` ?? `displaySelectedValue` |
| `HasValue` | `hasValue` | yes | `true` for a non-null option or non-empty array (same as `hasValue()` util) |
| `GetPlugin` | `getPlugin` | yes | `plugin \| getPlugin: 'Popup'` → sibling plugin instance (from a plugin template) |
| `AddNewOption` | `addNewOption` | yes | prefix text (`popup.options.texts.addNewOption`) for a synthetic created option, otherwise `''` |
| `GroupedListOptions` | `groupedListOptions` | yes | flat list → `[[options[], group \| null][], totalCount]`, assigns `index` for aria |
| `OptionCssClasses` | `optionCssClasses` | no | `option \| optionCssClasses: cssClasses: group` → `[option, selected?, active?, inGroup?]` classes |

All pipes except `displayValue`/`hasValue` are building blocks for custom
plugins (they inject `SelectBus` / `SelectPluginInstances`, so they only work
inside a select).
