# Enter/leave animations with `animate.enter` / `animate.leave`

This is the default way to animate elements that appear or disappear in a
template. The syntax is Angular-native (`@angular/core` ≥ 20.2, no import
needed), and the classes come from `@css-styles/themes`.

## Contents

- Syntax forms
- Built-in animation classes (`@css-styles/themes`)
- Custom animation classes
- Sample: list items
- Sample: validation / error message
- Sample: animated host directive (route transitions)
- Function form (JS-driven leave)

## Syntax forms

| Form | Example | Use when |
| --- | --- | --- |
| static class | `<div animate.enter="fade-in">` | fixed animation |
| bound expression | `<div [animate.enter]="enterClass()">` | class decided at runtime; value is `string \| string[]` |
| several classes | `<div [animate.leave]="['fade-out', 'my-shadow']">` | combine an animation with extra styling |
| host binding | `host: {'[animate.enter]': 'enterClass()'}` | a directive/component animates its own host |
| function | `<div (animate.leave)="onLeave($event)">` | JS-driven animation (see the last section) |

Behaviour:

- **enter**: the classes are added when the element is inserted and removed
  after the CSS animation or transition finishes.
- **leave**: the classes are added when Angular removes the element, and the
  element stays in the DOM until its longest animation or transition finishes
  (with a fallback timer of that duration + 50 ms). If the class defines no
  animation or transition, the element is removed immediately.
- Both forms work on plain elements and on component hosts
  (`<item-row animate.enter="slide-in">`).

## Built-in animation classes (`@css-styles/themes`)

They exist only if the global theme SCSS includes them:

```scss
@use '@css-styles/themes';

@include themes.provideAllAnimations;
```

Single mixins are also available: `slideInAnimation` (provides `slide-in`
and `slide-in-animation`), `slideOutAnimation`, `flyInAnimation`,
`flyOutAnimation`, `fadeInAnimation` and `fadeOutAnimation`.

| Class | Use on | Effect | CSS variables (default) |
| --- | --- | --- | --- |
| `fade-in` | enter | opacity 0 → 1 (keyframes) | `--fade-in-duration` (400ms), `--fade-in-from-opacity` (0), `--fade-in-to-opacity` (1) |
| `fade-out` | leave | opacity 1 → 0 | `--fade-out-duration` (400ms), `--fade-out-from-opacity` (1), `--fade-out-to-opacity` (0) |
| `slide-in` | enter | expands from height 0 (transition + `@starting-style`), with opacity | `--slide-in-duration` (400ms), `--slide-in-to-max-height` (1000px) |
| `slide-in-animation` | enter | keyframes variant of `slide-in`: animates real height (0 → `auto`), margins, paddings and borders | `--slide-in-animation-duration` (400ms), `--slide-in-animation-to-height` (auto), `--slide-in-animation-to-max-height` (1000px), `--slide-in-animation-to-opacity` (1), `--slide-in-animation-to-{margin-top,margin-bottom,padding-top,padding-bottom,border-top,border-bottom}` (0) |
| `slide-out` | leave | collapses height, margin, padding and border to 0 with opacity | `--slide-out-duration` (400ms) |
| `fly-in` | enter | slides in horizontally with fade | `--fly-in-duration` (400ms), `--fly-in-from-opacity` (0), `--fly-in-to-opacity` (1), `--fly-in-from-transform` (`translateX(25%)`) |
| `fly-out` | leave | slides out horizontally with fade | `--fly-out-duration` (400ms), `--fly-out-from-opacity` (1), `--fly-out-to-opacity` (0), `--fly-out-to-x` (-25%) |

Notes:

- `slide-in` and `slide-in-animation` clip their content (`overflow: hidden`)
  to `--slide-in-to-max-height` / `--slide-in-animation-to-max-height` while
  they run. Raise the limit for tall content, otherwise the content looks
  cut off until the class is removed.
- `slide-in-animation` animates margins, paddings and vertical borders *to*
  the values in its variables (all 0 by default). If the element has its own
  padding or margin, set the matching `--slide-in-animation-to-*` variables to
  those values, otherwise the element jumps when the class is removed.
- Tune the classes per scope by setting the variables on a parent or on the
  element itself:

```scss
.compact-list
{
    --slide-in-duration: 200ms;
    --slide-out-duration: 200ms;
}
```

## Custom animation classes

You can use any CSS class that runs an animation or transition. Put it in
global styles: the class is applied to the animated element, so with
component styles it only works on elements of that component's own template
(emulated encapsulation).

```scss
.zoom-in
{
    animation: zoom-in-animation 250ms ease-out;
}

.zoom-out
{
    animation: zoom-in-animation 250ms ease-in reverse;
}

@keyframes zoom-in-animation
{
    from
    {
        opacity: 0;
        transform: scale(0.9);
    }

    to
    {
        opacity: 1;
        transform: scale(1);
    }
}
```

```html
<div class="dialog-body" animate.enter="zoom-in" animate.leave="zoom-out">…</div>
```

## Sample: list items

```typescript
import {Component, ChangeDetectionStrategy, input, InputSignal, output, OutputEmitterRef} from '@angular/core';

export interface TaskItem
{
    id: number;
    title: string;
}

@Component(
{
    selector: 'task-list',
    template:
    `
        @for(task of tasks(); track task.id)
        {
            <div class="flex-row align-items-center gap-small"
                 animate.enter="slide-in"
                 animate.leave="slide-out">
                <span>{{task.title}}</span>
                <button type="button" class="btn-secondary" (click)="remove.emit(task)">Remove</button>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent
{
    public tasks: InputSignal<TaskItem[]> = input.required();

    public remove: OutputEmitterRef<TaskItem> = output();
}
```

## Sample: validation / error message

```html
@if(loginFailed())
{
    <div class="alert-danger margin-bottom-small" animate.enter="slide-in" animate.leave="slide-out">
        Login failed, please check your credentials.
    </div>
}
```

## Sample: animated host directive (route transitions)

A directive whose host animates on enter and leave, with the animation
classes chosen at runtime. Put it on the routed content wrapper (for example,
the element that holds `<router-outlet>` content, or each page component's
host) with `animateHost`.

```typescript
import {Directive, signal, WritableSignal} from '@angular/core';

@Directive(
{
    selector: '[animateHost]',
    host:
    {
        '[animate.enter]': 'enterAnimation()',
        '[animate.leave]': 'leaveAnimation()',
    },
})
export class AnimateHostDirective
{
    /**
     * Animation class used when host enters
     */
    public enterAnimation: WritableSignal<string> = signal('fade-in');

    /**
     * Animation class used when host leaves
     */
    public leaveAnimation: WritableSignal<string> = signal('fade-out');
}
```

Change `enterAnimation` and `leaveAnimation` before navigation (for example
from `Router.events` on `NavigationStart`) to switch to `fly-in`/`fly-out`
for particular routes. For components created in code, use
`AnimateDirective` instead (`references/animate-directive.md`).

## Function form (JS-driven leave)

When a CSS class isn't enough (for example, Web Animations API or a
third-party animation), bind a function. For leave you **must** call
`animationComplete()`, otherwise the element is only removed once
`MAX_ANIMATION_TIMEOUT` (a token from `@angular/core`, configurable via providers) expires.

```typescript
import {AnimationCallbackEvent} from '@angular/core';

// template: <div (animate.leave)="onLeave($event)">…</div>
protected onLeave(event: AnimationCallbackEvent): void
{
    const animation = event.target.animate([{opacity: 1}, {opacity: 0}], {duration: 300});

    animation.finished.then(() => event.animationComplete());
}
```

Prefer CSS classes when possible, because they stay declarative and can be
tuned through CSS variables.
