---
name: anglr-authentication
description: >-
  Provides Angular authentication and permission-based authorization with
  @anglr/authentication v13.x — `AuthenticationService` (identity,
  login/logout, `authenticationChanged`), app-implemented
  `AuthenticationServiceOptions`, `@Authorize` + `authGuard` /
  `authGuardDefinition()` / `@ComponentRouteAuthorized` for route protection,
  `*authorize` (AuthorizeDirective), `*letAuthorized` (LetAuthorizedDirective)
  and the `hasPermission` pipe for templates, `evaluatePermissions` /
  `isAuthorized` for code, and the `authInterceptor` / `suppressAuthInterceptor`
  HTTP interceptors for 401/403. Prefer it over hand-written CanActivate
  guards, custom permission services/directives, NgxPermissions or other auth
  libraries in @anglr/* projects. Trigger when the user mentions login,
  logout, current user, user identity, permissions, roles, access control,
  protected/guarded routes, access denied, hiding menu items or buttons by
  permission, or 401/403 handling, even without naming @anglr/authentication.
metadata:
  package: "@anglr/authentication"
  version: "13.0.1"
  repository: "https://github.com/ressurectit/ng-authentication"
---

# @anglr/authentication

> Created for **@anglr/authentication v13.0.1**. APIs of other versions may differ —
> check the installed version (`node_modules/@anglr/authentication/package.json`)
> and warn the user if it doesn't match.

## Contents

When to use what · Installation & required setup · Entry points · Quick start · Key concepts · Pitfalls · References · Links

Permission-based authentication/authorization for Angular. The app supplies one
class, `AuthenticationServiceOptions`, that knows how to log in/out, load the
current `UserIdentity` (with a flat `permissions: string[]`) and navigate to
the login / access-denied pages. Everything else (route guard, template
directives, pipe, HTTP 401/403 handling) checks permission names against
that cached identity.

## When to use what

| Need | Use | Details |
| --- | --- | --- |
| Wire the library to your backend (login, logout, "who am I", redirects) | subclass `AuthenticationServiceOptions` + provider + app initializer | `references/setup-and-service.md` |
| Read current user, log in / out, react to changes | `AuthenticationService` (`userIdentity`, `getUserIdentity()`, `login()`, `logout()`, `authenticationChanged`) | `references/setup-and-service.md` |
| Typed extra user data (department, tenant…) | `UserIdentity<TUserInfo>.additionalInfo`, `AuthenticationService<TUserInfo>` | `references/setup-and-service.md` |
| Protect a route by permission | `@Authorize('perm')` on the component + `canActivate: [authGuard]` | `references/routes.md` |
| Same, with `@ComponentRoute` from `@anglr/common/router` | `@ComponentRouteAuthorized({path})` (adds `authGuard`) | `references/routes.md` |
| Lazy `loadComponent` route, or permission set on the route itself | `canActivate: [authGuardDefinition('perm' \| [...] \| options)]` | `references/routes.md` |
| One component, different permission per route path | `@Authorize(options, 'edit/:id')` | `references/routes.md` |
| Show/hide a block, menu item, button | `*authorize="'perm'"` (`AuthorizeDirective`) | `references/templates.md` |
| Keep element but use the boolean (disable, alternate text) | `*letAuthorized="'perm'; let ok"` or `#x="authorized"` (`LetAuthorizedDirective`) | `references/templates.md` |
| Boolean inside an expression (`@if`, `[disabled]`) | `'perm' \| hasPermission` (`HasPermissionPipe`) | `references/templates.md` |
| Permission check in TypeScript | `isAuthorized(authSvc, …)`, `evaluatePermissions(perms, …)`, `authSvc.isAuthorizedSync('perm')` | `references/permissions.md` |
| OR / AND / boolean expression of permissions | `string[]`, `andCondition`, `conditionString` (`'a && (b \|\| c)'`) | `references/permissions.md` |
| Redirect to login / access denied on HTTP 401/403 | `provideHttpClient(withInterceptors([authInterceptor]))` | `references/http-interceptors.md` |
| Swallow 401/403 so callers never see them | `suppressAuthInterceptor` | `references/http-interceptors.md` |
| Skip the interceptor for one request | `HttpContext` with `IGNORED_INTERCEPTORS` (`@anglr/common`) | `references/http-interceptors.md` |
| Unit tests of components using the directives/pipe | provide a fake `AuthenticationServiceOptions` | `references/setup-and-service.md` |

## Installation & required setup

```bash
npm install @anglr/authentication --save
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/router` ≥ 20.3.2,
`@anglr/common` ≥ 23.0.0, `@jscrpt/common` ≥ 7.0.0, `rxjs` ≥ 7.5.7, `tslib` ^2.8.1.

Required app setup — without it things throw or hang:

1. A provider `{provide: AuthenticationServiceOptions, useClass: YourOptions}`
   (`AuthenticationService` is `providedIn: 'root'` but injects this abstract class).
2. Load the identity **before** the first render/navigation with
   `provideAppInitializer(() => inject(AuthenticationService).getUserIdentity())`;
   otherwise `authGuard` and `*authorize` throw `AuthenticationService must be initialized…`.
3. Every Observable returned by your options (`login`, `logout`, `getUserIdentity`)
   must **emit** a value. `EMPTY` makes the service wait forever (see Pitfalls).

## Entry points

| Import path | Contains |
| --- | --- |
| `@anglr/authentication` | everything (service, options, types, decorators, guards, directives, pipe, interceptors, utils) |

## Quick start

```typescript
// app.config.ts
import {ApplicationConfig, inject, provideAppInitializer} from '@angular/core';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideRouter} from '@angular/router';
import {AuthenticationService, AuthenticationServiceOptions, authInterceptor} from '@anglr/authentication';

import {AppAuthOptions} from './services/appAuth.options'; // your subclass, see references/setup-and-service.md
import {routes} from './app.routes';

export const appConfig: ApplicationConfig =
{
    providers:
    [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        {provide: AuthenticationServiceOptions, useClass: AppAuthOptions},
        provideAppInitializer(() => inject(AuthenticationService).getUserIdentity()),
    ],
};
```

```typescript
// users.component.ts
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Authorize, AuthorizeDirective, HasPermissionPipe} from '@anglr/authentication';

@Component(
{
    selector: 'users-view',
    imports: [AuthorizeDirective, HasPermissionPipe],
    template:
    `
        <h1>Users</h1>

        <button *authorize="'users-create'">New user</button>
        <button [disabled]="!('users-delete' | hasPermission)">Delete</button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
@Authorize('users-page')
export class UsersComponent
{
}

// app.routes.ts: {path: 'users', component: UsersComponent, canActivate: [authGuard]}
```

Navigating to `/users` without `users-page`: an authenticated user is sent to
`showAccessDenied()`, an anonymous one to `showAuthPage()`.

## Key concepts

- **Permissions are plain strings** in `UserIdentity.permissions`. Roles are just
  permissions as far as the library is concerned.
- **One cached identity.** `getUserIdentity()` caches a Promise; `login()`,
  `logout()` and the interceptor refresh it with `getUserIdentity(true)`, which
  emits `authenticationChanged`. `*authorize` / `*letAuthorized` react to it;
  the pure `hasPermission` pipe does not.
- **Same condition model everywhere**: `permission` (string | string[]),
  `andCondition` (default OR), `conditionString` (boolean expression), plus an
  extra `addCondition` that is AND-ed in (a boolean in templates/utils, an
  `(injector) => PromiseOr<boolean>` in `@Authorize`/guards).
- **Guard metadata lives on the component class** (`@Authorize` writes static
  `permissions` / `routeSpecificPermissions`), so `authGuard` needs
  `route.component`. Lazy `loadComponent` routes need `authGuardDefinition(...)`.

## Pitfalls

- Returning `EMPTY` from `login()`/`logout()` → `AuthenticationService.login()`/`logout()`
  never emit or complete and the identity isn't refreshed. Return `of(undefined)`
  or the HTTP call mapped to `void`. Same for `getUserIdentity()`: it must emit.
- `conditionString` needs spaces around `&&` / `||` (`'a&&b'` throws); `!` works only as the
  very first character (`'!b && a'` ok, `'a && !b'` wrong, `'a && !(b)'` throws). It uses
  `new Function` (CSP needs `'unsafe-eval'`). Otherwise use arrays or `addCondition`.
- `hasPermission` is a **pure** pipe: it keeps the old result after login/logout in the same
  view. Use `*authorize` / `*letAuthorized` where the identity can change while displayed.
- `*authorize="'a,b'"` is split on commas into an OR list.
- `LetAuthorizedDirective`'s extra condition input is spelled `letAuthorizedAddContition`
  (microsyntax key `addContition`); `addCondition:` does not bind.
- `authGuardDefinition(permission)` ignores the permission on routes with `path: ''`.
- After `authInterceptor` redirects on 401/403, the request observable completes with **no
  value and no error**. Reset loading flags in `finalize()`.
- Interceptor order: `withInterceptors([suppressAuthInterceptor, authInterceptor])`; reversed,
  the suppressor swallows 401/403 before `authInterceptor` can redirect.
- There is no `AuthorizationModule`, `AuthService`, `PermissionGuard` or
  `@anglr/authentication/testing`. Import the standalone directives/pipe; use `authGuard`.
- Deprecated, don't use: `AuthGuard` (→ `authGuard`), `AuthInterceptor` / `AUTH_INTERCEPTOR_PROVIDER`
  (→ `authInterceptor`), `SuppressAuthInterceptor` / `SUPPRESS_AUTH_INTERCEPTOR_PROVIDER`.

## References

Read only what the task needs (each file starts with its own Contents list):

- `references/setup-and-service.md` — implementing `AuthenticationServiceOptions`,
  providers, app initializer, `UserIdentity` / `AccessToken`, full
  `AuthenticationService` API, login page, user menu, logout, testing setup.
- `references/routes.md` — `@Authorize`, `AuthorizeOptions`, route-specific
  permissions, `authGuard` decision flow, `authGuardDefinition`,
  `@ComponentRouteAuthorized`, lazy routes, login/access-denied routes.
- `references/templates.md` — `*authorize`, `*letAuthorized` (structural and
  attribute form), `hasPermission` pipe, choosing between them, menu sample.
- `references/permissions.md` — condition semantics (OR/AND/expression/addCondition),
  `evaluatePermissions`, `isAuthorized`, `isAuthorizedSync`/`isAuthorized` on the service.
- `references/http-interceptors.md` — `authInterceptor` behaviour,
  `AuthInterceptorOptions`, `suppressAuthInterceptor`, `IGNORED_INTERCEPTORS`,
  `AuthInterceptorData`, deprecated class interceptors.

## Links

- Repository and readme: https://github.com/ressurectit/ng-authentication
- npm: https://www.npmjs.com/package/@anglr/authentication
