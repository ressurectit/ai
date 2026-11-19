# Templates: *authorize, *letAuthorized, hasPermission

All three are standalone — add them to the component's `imports`. All of them
read `AuthenticationService.userIdentity`, so the identity must be loaded first
(app initializer).

## Contents

- Choosing between them
- AuthorizeDirective (`*authorize`)
- LetAuthorizedDirective (`*letAuthorized`, `#x="authorized"`)
- HasPermissionPipe (`hasPermission`)
- Sample: navigation menu
- Sample: read-only vs editable field

## Choosing between them

| Situation | Use |
| --- | --- |
| Render the element only with permission | `*authorize` |
| Always render, but disable / swap text / pass a boolean | `*letAuthorized` (or the attribute form) |
| Combine with other conditions in an expression (`@if (a && …)`, `[disabled]`) | `hasPermission` pipe |
| Identity can change while the view is displayed (login/logout without navigation) | the directives — they subscribe to `authenticationChanged`; the pure pipe doesn't |

## AuthorizeDirective (`*authorize`)

Selector `[authorize]`. Structural: creates the template when the condition is
met, clears it otherwise. Renders synchronously in `ngOnInit`, re-evaluates when
any input changes and on every `authenticationChanged`.

| Input | Microsyntax key | Type | Default |
| --- | --- | --- | --- |
| `authorize` (required) | — | `string \| string[]` | — |
| `authorizeAndCondition` | `andCondition` | `boolean` | `false` |
| `authorizeConditionString` | `conditionString` | `boolean` | `false` |
| `authorizeAddCondition` | `addCondition` | `boolean` | `true` |

```html
<div *authorize="'admin'">Admin panel</div>

<!-- OR (default) -->
<div *authorize="['admin', 'manager']">Management</div>

<!-- comma-separated string = OR list -->
<div *authorize="'admin, manager'">Management</div>

<!-- AND -->
<div *authorize="['read', 'write']; andCondition: true">Edit content</div>

<!-- boolean expression -->
<div *authorize="'admin || (editor && reviewer)'; conditionString: true">Review</div>

<!-- extra runtime condition (component boolean / signal value) -->
<button *authorize="'delete'; addCondition: isOwner()" (click)="delete()">Delete</button>
```

There is no `else` template; for an alternative branch use `*letAuthorized` or
the pipe with `@if … @else`. Throws on `null`/`undefined` permission, on
non-boolean `andCondition`/`conditionString`, and when the identity isn't loaded.

## LetAuthorizedDirective (`*letAuthorized`, `#x="authorized"`)

Selector `[letAuthorized]`, `exportAs: 'authorized'`. Evaluates the condition and
exposes the boolean; the content is always rendered.

| Input | Microsyntax key | Type | Default |
| --- | --- | --- | --- |
| `letAuthorized` | — | `string \| string[]` | — (required at runtime) |
| `letAuthorizedAndCondition` | `andCondition` | `boolean` | `false` |
| `letAuthorizedConditionString` | `conditionString` | `boolean` | `false` |
| `letAuthorizedAddContition` (sic) | `addContition` | `boolean` | `true` |

Template context (`LetAuthorizedContext`): `{$implicit: boolean; letAuthorized: boolean}`.
Public `value: boolean` getter for the attribute form.

Structural form — the boolean is the implicit context:

```html
<ng-container *letAuthorized="'orders-edit'; let canEdit">
    <button type="button" [disabled]="!canEdit" (click)="edit()">Edit</button>

    @if(!canEdit)
    {
        <span class="text-muted">You can't edit orders</span>
    }
</ng-container>

<!-- with options -->
<ng-container *letAuthorized="['read', 'write']; andCondition: true; addContition: !locked(); let canWrite">
    <textarea [readonly]="!canWrite"></textarea>
</ng-container>
```

Attribute form — read `value` through the template reference:

```html
<div letAuthorized="orders-delete" #canDelete="authorized">
    <button type="button" [disabled]="!canDelete.value" (click)="delete()">Delete</button>
</div>
```

Re-evaluation happens when `letAuthorized` or `letAuthorizedAddContition`
change and on `authenticationChanged`. Changing only `andCondition` /
`conditionString` at runtime doesn't re-evaluate until one of those happens.
In the structural form the embedded view is recreated on every re-evaluation.

## HasPermissionPipe (`hasPermission`)

`transform(condition: string | string[], andCondition = false, conditionString = false, addCondition = true): boolean`

Pure pipe over `isAuthorized(authService, …)`. Returns `false` when no identity is loaded.

```html
@if('orders-edit' | hasPermission)
{
    <input [value]="order().note">
}
@else
{
    <span>{{order().note}}</span>
}

<button [disabled]="!('orders-save' | hasPermission) || saving()" (click)="save()">Save</button>

<!-- AND -->
<button [disabled]="!(['read', 'write'] | hasPermission: true)">Publish</button>

<!-- expression: 2nd arg false, 3rd true -->
@if('admin || moderator' | hasPermission: false : true)
{
    <section>Management</section>
}
```

Because it's pure, the result is recomputed only when its arguments change, not
when the identity changes. Fine for pages that reload after login/logout; use
the directives in always-visible shells (header, menu).

## Sample: navigation menu

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {AuthorizeDirective} from '@anglr/authentication';

@Component(
{
    selector: 'main-menu',
    imports: [RouterLink, RouterLinkActive, AuthorizeDirective],
    template:
    `
        <nav class="flex-row gap-small">
            <a routerLink="/home" routerLinkActive="active" *authorize="'home-page'">Home</a>
            <a routerLink="/users" routerLinkActive="active" *authorize="'users-page'">Users</a>
            <a routerLink="/reports" routerLinkActive="active" *authorize="['reports-view', 'admin']">Reports</a>
            <a routerLink="/settings" routerLinkActive="active" *authorize="'admin'">Settings</a>
        </nav>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainMenuComponent
{
}
```

Use the same permission names as the target routes' `@Authorize`, so a visible
link never leads to the access-denied page.

## Sample: read-only vs editable field

```typescript
import {Component, ChangeDetectionStrategy, input} from '@angular/core';
import {LetAuthorizedDirective} from '@anglr/authentication';

@Component(
{
    selector: 'customer-note',
    imports: [LetAuthorizedDirective],
    template:
    `
        <ng-container *letAuthorized="'customers-edit'; let canEdit">
            <label>Note</label>
            <textarea [readonly]="!canEdit">{{note()}}</textarea>
        </ng-container>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerNoteComponent
{
    public readonly note = input('');
}
```
