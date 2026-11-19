# Routes: @Authorize, guards, @ComponentRouteAuthorized

## Contents

- @Authorize decorator
- AuthorizeOptions
- authGuard and its decision flow
- authGuardDefinition (lazy routes, explicit permissions)
- @ComponentRouteAuthorized
- Route-specific permissions
- Sample: routes with login and access-denied pages
- AuthorizationDecoratedComponent (metadata shape)

## @Authorize decorator

```typescript
function Authorize(permission: string | string[] | AuthorizeOptions, route?: string): ClassDecorator
```

Stores permission metadata as static properties on the component class. It does
nothing on its own; a guard (`authGuard`, `authGuardDefinition`) reads it.

```typescript
import {Authorize} from '@anglr/authentication';

@Component({...})
@Authorize('dashboard-page')                    // single permission
export class DashboardComponent {}

@Component({...})
@Authorize(['admin', 'manager'])                // OR: at least one
export class ReportsComponent {}

@Component({...})
@Authorize({permission: ['edit', 'publish'], andCondition: true})   // AND: all
export class PublishComponent {}

@Component({...})
@Authorize({permission: 'admin && (editor || reviewer)', conditionString: true})  // expression
export class ContentComponent {}

@Component({...})
@Authorize(
{
    permission: 'download',
    addCondition: injector => injector.get(AppConfig).downloadEnabled,   // may return Promise<boolean>
})
export class DownloadComponent {}
```

Without a `route` argument it sets the component-wide permission (a second
`@Authorize` without route overwrites the first). With `route` it adds a
route-specific entry (see below).

## AuthorizeOptions

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `permission` | `string \| string[]` | required | permission name, list, or expression string |
| `andCondition` | `boolean` | `false` | list must match completely (AND) instead of any (OR) |
| `conditionString` | `boolean` | `false` | `permission` is a boolean expression (`andCondition` ignored) |
| `addCondition` | `(injector: Injector) => PromiseOr<boolean>` | — | extra runtime condition AND-ed with the result; awaited by the guard |

Expression syntax and its limits: `permissions.md`.

## authGuard and its decision flow

```typescript
const authGuard: CanActivateFn;    // = authGuardDefinition()
```

```typescript
import {Routes} from '@angular/router';
import {authGuard} from '@anglr/authentication';

export const routes: Routes =
[
    {path: 'dashboard', component: DashboardComponent, canActivate: [authGuard]},
    {path: 'reports', component: ReportsComponent, canActivate: [authGuard]},
];
```

For each activation the guard:

1. picks the options: route-specific entry for `route.routeConfig.path` →
   otherwise component-wide `@Authorize` → otherwise **allows** (no metadata = public);
2. awaits `addCondition(injector)` if present;
3. evaluates against `AuthenticationService.userIdentity` (throws if the
   identity was never loaded — load it in an app initializer);
4. not authorized + authenticated → `showAccessDenied()`, returns `false`;
5. not authorized + anonymous + target is not the auth page → `showAuthPage()`, returns `false`;
6. otherwise returns `true`.

It returns `boolean`, never a `UrlTree`; the redirect is done by your
`AuthenticationServiceOptions`. Use it in `canActivate` (it reads
`route.component`); it isn't meant for `canMatch`.

## authGuardDefinition (lazy routes, explicit permissions)

```typescript
function authGuardDefinition(permission?: string | string[] | AuthorizeOptions | null): CanActivateFn
```

Creates a guard with a fixed permission that takes precedence over the
component's metadata. Use it when the component isn't known at guard time:
Angular loads `loadComponent` components only **after** the guards ran, so
`authGuard` sees no `@Authorize` metadata on the first navigation and lets the
user in.

```typescript
import {Routes} from '@angular/router';
import {authGuardDefinition} from '@anglr/authentication';

export const routes: Routes =
[
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [authGuardDefinition('admin-page')],
    },
    {
        path: 'editor',
        loadComponent: () => import('./pages/editor/editor.component').then(m => m.EditorComponent),
        canActivate: [authGuardDefinition(['read', 'write'])],
    },
    {
        path: 'beta',
        loadComponent: () => import('./pages/beta/beta.component').then(m => m.BetaComponent),
        canActivate:
        [
            authGuardDefinition(
            {
                permission: ['admin', 'tester'],
                addCondition: injector => injector.get(FeatureFlags).isEnabled('beta'),
            }),
        ],
    },
];
```

The explicit permission is applied only when the route's `path` is non-empty.
On a `path: ''` route the guard falls back to the component's `@Authorize`
metadata (or allows access when there is none).

The same rules apply to `loadChildren`: put a guard with an explicit permission
on the parent route, or `authGuard` on the child routes whose components are
eagerly referenced.

## @ComponentRouteAuthorized

```typescript
function ComponentRouteAuthorized(route: ComponentRouteDefinition): ClassDecorator
```

`@ComponentRoute` from `@anglr/common/router` plus `authGuard` appended to
`canActivate` (once). Routes are collected with `extractRoutes([...])` or
`@ModuleRoutes(...)` from `@anglr/common/router`.

```typescript
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Authorize, ComponentRouteAuthorized} from '@anglr/authentication';

@Component(
{
    selector: 'overview-view',
    templateUrl: 'overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
@ComponentRouteAuthorized({path: 'overview'})
@Authorize('users-list-page')
export class OverviewComponent {}
```

```typescript
// equivalent
@ComponentRoute({path: 'overview', canActivate: [authGuard]})
@Authorize('users-list-page')
export class OverviewComponent {}
```

```typescript
// routes file
import {Routes} from '@angular/router';
import {extractRoutes} from '@anglr/common/router';

export const routes: Routes = extractRoutes([OverviewComponent, DetailComponent]);
```

## Route-specific permissions

One component used by several routes with different requirements. The key is
the route's `path` string exactly as configured.

```typescript
@Component({...})
@ComponentRouteAuthorized({path: 'resource/:id'})
@ComponentRouteAuthorized({path: 'resource/edit/:id'})
@Authorize('resource-view')                                  // used for 'resource/:id'
@Authorize({permission: 'resource-edit'}, 'resource/edit/:id')
export class ResourceComponent {}
```

## Sample: routes with login and access-denied pages

```typescript
import {Routes} from '@angular/router';
import {authGuard} from '@anglr/authentication';

export const routes: Routes =
[
    {path: '', redirectTo: 'home', pathMatch: 'full'},
    {path: 'login', component: LoginComponent},                  // public, isAuthPage() === true
    {path: 'accessDenied', component: AccessDeniedComponent},    // public
    {path: 'home', component: HomeComponent, canActivate: [authGuard]},          // @Authorize('home-page')
    {path: 'users', component: UsersComponent, canActivate: [authGuard]},        // @Authorize('users-page')
    {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [authGuardDefinition('settings-page')],
    },
];
```

A page that must only be reachable when logged in, without a specific permission:
give every authenticated user a common permission (e.g. `'authenticated'`) and
use `@Authorize('authenticated')`.

## AuthorizationDecoratedComponent (metadata shape)

What `@Authorize` writes onto the class, useful for custom guards or tooling:

```typescript
interface AuthorizationDecoratedComponent
{
    permissions?: AuthorizeOptions;                              // component-wide
    routeSpecificPermissions?: Dictionary<AuthorizeOptions>;     // key = route path
}

const meta = SomeComponent as unknown as AuthorizationDecoratedComponent;
```
