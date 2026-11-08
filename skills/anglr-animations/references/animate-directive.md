# AnimateDirective

`AnimateDirective` brings `animate.enter` / `animate.leave` to components
you create in code that have no animation logic of their own. In templates
you don't need it, because the native `animate.enter="…"` syntax does the
same thing (`references/enter-leave.md`).

## Contents

- API
- How it works
- Sample: dynamically created component (from readme)
- Notes

## API

`import {AnimateDirective} from '@anglr/animations';`. It is a standalone
directive with selector `[animate]` and no `exportAs`.

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `enterAnimation` | `string \| string[]` | `[]` | CSS class name(s) applied while the element enters |
| `leaveAnimation` | `string \| string[]` | `[]` | CSS class name(s) applied while the element leaves; removal waits for the animation |

Both inputs are signal inputs (`input()`), so they work with
`inputBinding()` and with template bindings. An empty array means no
animation.

## How it works

The directive is only a pair of host bindings:

```typescript
host:
{
    '[animate.enter]': 'enterAnimation()',
    '[animate.leave]': 'leaveAnimation()',
}
```

The semantics are Angular's: classes are added on insert and removed once
the animation ends, while leave classes delay the DOM removal until the
animation ends. The class names must exist in global CSS, for example the
`@css-styles/themes` classes `fade-in`, `fade-out`, `slide-in`, `slide-out`,
`fly-in` and `fly-out`.

## Sample: dynamically created component (from readme)

A component without any animation:

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';

@Component(
{
    selector: 'simple-dynamic',
    template: `<div>I am a dynamically created component with no animation logic!</div>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleDynamicComponent
{
}
```

Create it with `AnimateDirective` attached via the `directives` option of
`createComponent`:

```typescript
import {Component, ChangeDetectionStrategy, ViewContainerRef, ComponentRef, viewChild, inputBinding} from '@angular/core';
import {AnimateDirective} from '@anglr/animations';

import {SimpleDynamicComponent} from './simpleDynamic.component';

@Component(
{
    selector: 'dynamic-sample-view',
    template:
    `
        <button type="button" (click)="create()">Create</button>
        <button type="button" (click)="destroy()">Destroy</button>
        <ng-container #container />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicSampleComponent
{
    private _componentRef: ComponentRef<SimpleDynamicComponent> | null = null;

    protected container = viewChild.required('container', {read: ViewContainerRef});

    public create(): void
    {
        if(this._componentRef)
        {
            return;
        }

        this._componentRef = this.container().createComponent(SimpleDynamicComponent,
        {
            directives:
            [
                {
                    type: AnimateDirective,
                    bindings:
                    [
                        inputBinding('enterAnimation', () => 'fade-in'),
                        inputBinding('leaveAnimation', () => 'fade-out'),
                    ],
                },
            ],
        });
    }

    public destroy(): void
    {
        if(!this._componentRef)
        {
            return;
        }

        this._componentRef.destroy();
        this._componentRef = null;
    }
}
```

## Notes

- `inputBinding()` takes a getter, so pass a signal to change the animation
  later: `inputBinding('leaveAnimation', this.leaveClass)`.
- Several classes: `inputBinding('enterAnimation', () => ['fade-in', 'highlight'])`.
- Use it in a template only when you need to forward the animation names as
  inputs (for example, a wrapper that receives them from its parent).
  Otherwise prefer `animate.enter` / `animate.leave`, and never combine both
  on one element.
- The class names are kebab-case CSS classes (`fade-in`). A name like
  `'fadeIn'` works only if you define such a class yourself.
