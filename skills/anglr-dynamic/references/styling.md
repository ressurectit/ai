# Styling

## Contents

1. SCSS entry points
2. Setup
3. Themes
4. CSS custom properties
5. Utility classes

## 1. SCSS entry points

| Import | Members |
| --- | --- |
| `@anglr/dynamic/styles` | `defineTheme($colors, $font)` (function), `buildThemeColors($theme)` (emits `--dynamic-*` variables), `buildThemeCss` (editor/component CSS, `.btn` variants, utilities, thin scrollbar), `buildTheme($theme)` (both) |
| `@anglr/dynamic/styles/themes/dark`, `…/light` | `defineTheme($colors: (), $font: 'Inter')` merged with the theme defaults, `buildTheme()` (variables + CSS for that theme) |

## 2. Setup

Simplest (single theme) — `buildThemeColors` emits bare custom-property declarations, so it must be
included inside a selector:

```scss
@use '@anglr/dynamic/styles' as dynamic;
@use '@anglr/dynamic/styles/themes/dark' as dynamicDark;

@include dynamic.buildThemeCss;

:root
{
    @include dynamic.buildThemeColors(dynamicDark.defineTheme());
}
```

(The themes' own `buildTheme()` mixin emits both parts at once, so include it inside a selector as well.)

Theme switching: colors inside the app's theme selector, CSS once:

```scss
@use '@anglr/dynamic/styles' as dynamic;
@use '@anglr/dynamic/styles/themes/dark' as dynamicDark;
@use '@anglr/dynamic/styles/themes/light' as dynamicLight;

@include dynamic.buildThemeCss;

.theme-dark
{
    @include dynamic.buildThemeColors(dynamicDark.defineTheme());
}

.theme-light
{
    @include dynamic.buildThemeColors(dynamicLight.defineTheme((btnPrimary: (background: #1565c0, foreground: #fff, border: #1565c0))));
}
```

Rendering layouts without editors still benefits from the CSS (`.btn` classes used by built-in buttons,
grid panel, data table). Icons in editors use Font Awesome classes (`fas fa-…`), include Font Awesome in the app.

## 3. Themes

Keys of the color map passed to `defineTheme` (partial maps are deep-merged): `btnPrimary`, `btnInfo`,
`btnSuccess`, `btnDanger`, `btnIcon`, `formControl`, `scrollbar`, `dragPlaceholder`, `dropzoneOverlay`,
`layoutDesigner`, `propertiesEditor`, `relationsCanvas`, `componentsPalette`, `componentsTree`,
`componentsTreeItem`, `layoutEditorDragPreview`, `nodesPalette`, `relationNodeEndpoint`, `packageManager`,
`notFoundNode`, `placeholder`, `contentOptions`, `relationsDebuggerVisualizer`, `relationsDebuggerTooltip`,
`dataTableDesigner`. Button maps use `background`, `foreground`, `border`.

## 4. CSS custom properties

| Variable | Description |
| --- | --- |
| `--dynamic-font-family` | editors font |
| `--dynamic-btn-primary-background`, `-foreground`, `-border` (also `info`, `success`, `danger`) | buttons |
| `--dynamic-btn-icon-foreground` | icon buttons |
| `--dynamic-form-control-foreground`, `-background`, `-border` | form controls |
| `--dynamic-thin-scrollbar` | scrollbar |
| `--dynamic-drag-placeholder` | drop placeholder |
| `--dynamic-layoutDesigner-overlay-border`, `--dynamic-layoutDesigner-title-background`, `-foreground` | selected component in layout editor |
| `--dynamic-properties-editor-properties-main-background`, `-border` | properties editor |
| `--dynamic-components-palette-editor-component-background`, `-border` | layout palette items |
| `--dynamic-components-tree-background`, `-border` | component tree |
| `--dynamic-relations-canvas-background` | relations canvas |
| `--dynamic-relations-canvas-relations-node-header-background`, `-foreground`, `--dynamic-relations-canvas-relations-node-content-background` | relations nodes |
| `--dynamic-relation-node-endpoint-background` | node endpoints |
| `--dynamic-nodes-palette-editor-component-background`, `-border` | relations palette items |
| `--dynamic-placeholder-foreground`, `-background` | placeholders |

Full list: output of `buildThemeColors` (`node_modules/@anglr/dynamic/styles/core/_mixins.scss`).

## 5. Utility classes

`buildThemeCss` emits prefixed utilities used by the editors: `.dynamic-gap-{extra-small|small|medium|big}`,
`.dynamic-row-gap-*`, `.dynamic-column-gap-*`, `.dynamic-margin-*` / `.dynamic-padding-*` (also `-top-`,
`-right-`, `-bottom-`, `-left-`; sizes `none` 0, `extra-small` 4px, `small` 10px, `medium` 15px, `big` 20px),
`.dynamic-hidden`, `.dynamic-bold`, `.dynamic-semi-bold`, `.dynamic-flex-row`, … and `.btn`, `.btn-primary`,
`.btn-info`, `.btn-success`, `.btn-danger`, `.btn-icon`. Class names in metadata (`cssClass`,
`buttonCssClass`) can use them or the application's own CSS.
