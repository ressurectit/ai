# Permission conditions and utilities

The same evaluation (`evaluatePermissions`) backs `@Authorize`/guards,
`*authorize`, `*letAuthorized`, `hasPermission` and `isAuthorized`.

## Contents

- Condition model
- Expression strings (conditionString)
- evaluatePermissions
- isAuthorized (util)
- Service checks: isAuthorizedSync / isAuthorized
- Sample: permission-dependent logic in a component

## Condition model

| Input | Result is `true` when |
| --- | --- |
| `'perm'` | user has `perm` |
| `['a', 'b']` | user has at least one (OR) |
| `['a', 'b']` + `andCondition: true` | user has all (AND) |
| `'a && (b \|\| c)'` + `conditionString: true` | the expression is true (`andCondition` ignored) |
| any of the above + `addCondition` | …and `addCondition` is `true` |

`addCondition` is only AND-ed in when the permission part passed; it can never
grant access on its own. Permission names are case-sensitive exact matches.

## Expression strings (conditionString)

Supported: permission names, `&&`, `||`, parentheses, and `!` only as the very
first character of the expression.
Each name is replaced by `true`/`false` and the result is evaluated with
`new Function`.

| Expression | Works? |
| --- | --- |
| `admin && (read \|\| write)` | yes |
| `users-list \|\| admin` | yes (dashes are fine) |
| `!guest` | yes (`!` at the very start) |
| `!guest && admin` / `!(guest) && admin` | yes — reorder so the negated name comes first |
| `admin && !guest` | **wrong result** (negation is lost) |
| `admin && !(guest)` | **throws** |
| `!a && !b` | second negation lost — only one `!` possible |
| `admin&&read` | **throws** — put spaces around operators |

Constraints: spaces around `&&`/`||`; names made of letters, digits, `-`,
`_`, `.` (no spaces, no regex special characters other than `.`); the app's
CSP must allow `'unsafe-eval'`. When a strict CSP or complex logic is involved,
prefer arrays with `andCondition`, or compute the boolean in code and pass it
as `addCondition`.

## evaluatePermissions

```typescript
function evaluatePermissions(permissions: string[],
                             condition: string | string[],
                             andCondition?: boolean,      // default false
                             conditionString?: boolean,   // default false
                             addCondition?: boolean): boolean  // default true
```

Pure function, no DI — usable anywhere (services, guards of your own, tests).

```typescript
import {evaluatePermissions} from '@anglr/authentication';

const userPermissions = ['read', 'write', 'admin'];

evaluatePermissions(userPermissions, ['admin', 'superadmin']);                  // true  (OR)
evaluatePermissions(userPermissions, ['admin', 'superadmin'], true);            // false (AND)
evaluatePermissions(userPermissions, 'admin && (read || delete)', false, true); // true
evaluatePermissions(userPermissions, 'admin', false, false, isFeatureOn);       // admin AND isFeatureOn
```

## isAuthorized (util)

```typescript
function isAuthorized(authSvc: AuthenticationService,
                      condition: string | string[],
                      andCondition?: boolean,
                      conditionString?: boolean,
                      addCondition?: boolean): boolean
```

`evaluatePermissions` against `authSvc.userIdentity?.permissions` (empty when no
identity is loaded → `false`). Synchronous; this is what `hasPermission` uses.

```typescript
import {inject} from '@angular/core';
import {AuthenticationService, isAuthorized} from '@anglr/authentication';

const authService = inject(AuthenticationService);

const canManage = isAuthorized(authService, ['admin', 'manager']);
const canPublish = isAuthorized(authService, ['edit', 'publish'], true);
```

## Service checks: isAuthorizedSync / isAuthorized

Single permission name only:

- `authService.isAuthorizedSync('perm'): boolean` — cached identity, `false` when none.
- `authService.isAuthorized('perm'): Promise<boolean>` — waits for the cached
  `getUserIdentity()` (loads it if never loaded); rejects if loading fails.

Use the util `isAuthorized()` for lists, AND or expressions.

## Sample: permission-dependent logic in a component

A `computed` that follows identity changes:

```typescript
import {Component, ChangeDetectionStrategy, computed, inject, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {AuthenticationService, UserIdentity, evaluatePermissions} from '@anglr/authentication';
import {startWith} from 'rxjs';

@Component(
{
    selector: 'order-toolbar',
    template:
    `
        @if(canApprove())
        {
            <button type="button" (click)="approve()">Approve</button>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderToolbarComponent
{
    private readonly _authService: AuthenticationService = inject(AuthenticationService);

    private readonly _identity: Signal<UserIdentity | null> = toSignal(this._authService
                                                                           .authenticationChanged
                                                                           .pipe(startWith(this._authService.userIdentity)),
                                                                       {requireSync: true});

    protected readonly canApprove: Signal<boolean> = computed(() => evaluatePermissions(this._identity()?.permissions ?? [],
                                                                                         ['orders-approve', 'admin']));

    protected approve(): void
    {
        // ...
    }
}
```
