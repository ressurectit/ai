# Animated icons

Two standalone, OnPush components with **CSS class selectors**. Import the
class into the component's `imports` and put the CSS class on an element
(usually an empty `<span>`).

## Contents

- Common traits
- DoubleRightIconSAComponent (`.double-right-icon`)
- UpDownCaretIconComponent (`.up-down-caret-icon`)
- Sample: detail button
- Sample: collapsible section with external toggle

## Common traits

- Host is `display: block; width: 1em; height: 1em; overflow: hidden`. Set
  the size with `font-size` and the colour with `color` (the strokes are
  borders in `currentColor`).
- Because the host is a block, put it into a flex row next to text
  (`<div class="flex-row align-items-center gap-small">`, or
  `display: inline-block` on the icon) to keep it inline.
- Styles are bundled in the component (no theme setup). The animation runs
  only if the component class is listed in `imports`. Without it, the
  `<span>` stays empty and you get no error.

## DoubleRightIconSAComponent (`.double-right-icon`)

`import {DoubleRightIconSAComponent} from '@anglr/animations';`

A double chevron (»). On `mouseup` **on the icon element**, both chevrons
slide out to the right and come back in from the left (CSS keyframes,
1400ms, cubic-bezier). There are no inputs or outputs.

- Clicking again while it runs neither restarts nor queues the animation.
  It ends 1400ms after the first click.
- A pending timeout is cleared on destroy, so it is safe inside `@if` / `@for`.
- It animates only on pointer interaction (`mouseup`), not on keyboard
  activation of a surrounding button.

```typescript
import {Component} from '@angular/core';
import {DoubleRightIconSAComponent} from '@anglr/animations';

@Component(
{
    imports: [DoubleRightIconSAComponent],
    template:
    `
        <span class="double-right-icon"></span>
    `,
})
export class MyComponent {}
```

```css
.double-right-icon
{
    font-size: 24px;
    color: #333;
}
```

## UpDownCaretIconComponent (`.up-down-caret-icon`)

`import {UpDownCaretIconComponent} from '@anglr/animations';`

A caret that points **down when closed** and **up when open**. The change
is a 3D flip (`rotate3d(-1, 0, 0, 180deg)`, 400ms transition).

| Model | Type | Default | Description |
| --- | --- | --- | --- |
| `closed` | `boolean` | `true` | Closed (down) state. Clicking the icon toggles it and emits `closedChange`. |

Binding modes:

- `[(closed)]="flag"`: the icon is the toggle and the parent reacts to it.
  `flag` can be a `WritableSignal<boolean>` or a plain property.
- `[closed]="!expanded()"`: the icon is only an indicator and the parent
  toggles. The icon still flips its internal state when clicked directly.
  See the sample below for how to avoid a double toggle.

```typescript
import {Component} from '@angular/core';
import {UpDownCaretIconComponent} from '@anglr/animations';

@Component(
{
    imports: [UpDownCaretIconComponent],
    template:
    `
        <span class="up-down-caret-icon" [(closed)]="isClosed"></span>
    `,
})
export class MyComponent
{
    protected isClosed = true;
}
```

```css
.up-down-caret-icon
{
    font-size: 16px;
    color: #666;
    cursor: pointer;
}
```

## Sample: detail button

```typescript
import {Component, ChangeDetectionStrategy, output, OutputEmitterRef} from '@angular/core';
import {DoubleRightIconSAComponent} from '@anglr/animations';

@Component(
{
    selector: 'open-detail-button',
    imports: [DoubleRightIconSAComponent],
    template:
    `
        <button type="button" class="btn-primary flex-row align-items-center gap-small" (click)="open.emit()">
            Detail
            <span class="double-right-icon"></span>
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenDetailButtonComponent
{
    public open: OutputEmitterRef<void> = output();
}
```

## Sample: collapsible section with external toggle

Here the whole header is clickable. The caret has `pointer-events: none`, so
a click on it is handled only by the header. Without that, one click would
toggle twice: once in the icon and once in the header.

```typescript
import {Component, ChangeDetectionStrategy, signal, WritableSignal} from '@angular/core';
import {UpDownCaretIconComponent} from '@anglr/animations';

@Component(
{
    selector: 'collapsible-section',
    imports: [UpDownCaretIconComponent],
    template:
    `
        <div class="section-header flex-row align-items-center gap-small" (click)="expanded.set(!expanded())">
            <span class="up-down-caret-icon" [closed]="!expanded()"></span>
            <ng-content select="[sectionTitle]" />
        </div>

        @if(expanded())
        {
            <div animate.enter="slide-in" animate.leave="slide-out">
                <ng-content />
            </div>
        }
    `,
    styles:
    `
        .section-header
        {
            cursor: pointer;
        }

        .up-down-caret-icon
        {
            pointer-events: none;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsibleSectionComponent
{
    protected expanded: WritableSignal<boolean> = signal(false);
}
```
