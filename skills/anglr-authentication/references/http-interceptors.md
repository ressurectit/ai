# HTTP interceptors: 401 / 403 handling

## Contents

- authInterceptor
- What the caller sees
- AuthInterceptorOptions
- suppressAuthInterceptor and interceptor order
- Skipping the interceptors for one request (IGNORED_INTERCEPTORS)
- AuthInterceptorData
- Deprecated class-based interceptors

## authInterceptor

Functional interceptor (`HttpInterceptorFn`):

```typescript
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {authInterceptor} from '@anglr/authentication';

provideHttpClient(withInterceptors([authInterceptor]));
```

On an error response it does:

1. client-side/network error (`err.error instanceof Error`) or request opts out via
   `IGNORED_INTERCEPTORS` → rethrow unchanged;
2. status other than 401/403 → rethrow unchanged (other error handling stays in charge);
3. another 401/403 is already being handled (see `AuthInterceptorData`) → rethrow;
4. current page is the auth page (`isAuthPage()`) → rethrow (the login form handles it);
5. otherwise reload the identity (`getUserIdentity(true)`, which also notifies
   `authenticationChanged`), then:

| Status | User after reload | Default | `treatUnauthorizedAsForbidden: true` |
| --- | --- | --- | --- |
| 403 | authenticated | `showAccessDenied()` | `showAccessDenied()` |
| 401 | authenticated | `showAuthPage()` | `showAccessDenied()` |
| 401 / 403 | anonymous | `showAuthPage()` | `showAuthPage()` |

## What the caller sees

In case 5 the request's observable **completes without a value and without an
error**: `next` and `error` callbacks aren't called, only `complete`. Code
waiting for a value (e.g. `firstValueFrom`, `lastValueFrom`, a spinner turned off
in `next`/`error`) has to handle this. Turn indicators off in `finalize()`, or
pass a `defaultValue` to `firstValueFrom`.

```typescript
this._http.get<Order[]>('api/orders')
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe(orders => this.orders.set(orders));
```

## AuthInterceptorOptions

Optional class provider read by `authInterceptor` (a default instance is used
when none is provided).

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `treatUnauthorizedAsForbidden` | `boolean` | `false` | a 401 for an authenticated user shows access denied instead of the login page |

Constructor: `new AuthInterceptorOptions(treatForbiddenAndUnauthorizedAsSame?: boolean)`.

```typescript
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {AuthInterceptorOptions, authInterceptor} from '@anglr/authentication';

export const providers =
[
    {provide: AuthInterceptorOptions, useValue: new AuthInterceptorOptions(true)},
    provideHttpClient(withInterceptors([authInterceptor])),
];
```

## suppressAuthInterceptor and interceptor order

`suppressAuthInterceptor` turns every 401/403 response into silent completion
(no value, no error). Other errors pass through. Use it when callers should
never see auth errors (e.g. to keep global error notifications quiet).

Responses travel through `withInterceptors([...])` **from the last to the first**
interceptor, so list the suppressor first:

```typescript
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {authInterceptor, suppressAuthInterceptor} from '@anglr/authentication';

provideHttpClient(withInterceptors([suppressAuthInterceptor, authInterceptor]));
```

`authInterceptor` redirects first; the 401/403 errors it passes on (concurrent
requests, errors on the login page) are then swallowed by
`suppressAuthInterceptor`. In the reverse order the suppressor runs first and
`authInterceptor` never sees a 401/403, so no redirect happens. Remember the
consequence for the login page: a failed login (401) then completes silently
instead of erroring. Let the login request opt out of the suppressor (next
section) if the form needs the error.

## Skipping the interceptors for one request (IGNORED_INTERCEPTORS)

Both interceptors check the `IGNORED_INTERCEPTORS` HttpContext token from
`@anglr/common` (`HttpContextToken<Array<Type<unknown> | HttpInterceptorFn>>`).

```typescript
import {HttpClient, HttpContext} from '@angular/common/http';
import {IGNORED_INTERCEPTORS} from '@anglr/common';
import {authInterceptor, suppressAuthInterceptor} from '@anglr/authentication';

this._http.post('api/account/login', accessToken,
{
    context: new HttpContext().set(IGNORED_INTERCEPTORS, [authInterceptor, suppressAuthInterceptor]),
});
```

Typical use: the identity endpoint, if it answers 401 for anonymous users. Opt
out there and map the error to an anonymous `UserIdentity` in
`AuthenticationServiceOptions.getUserIdentity()`. Otherwise the startup
identity load never settles.

```typescript
public getUserIdentity(): Observable<UserIdentity>
{
    return this._http
        .get<UserIdentity>('api/account/identity',
        {
            context: new HttpContext().set(IGNORED_INTERCEPTORS, [authInterceptor]),
        })
        .pipe(catchError((err: HttpErrorResponse) => err.status == 401 ? of(new UserIdentity()) : throwError(() => err)));
}
```

## AuthInterceptorData

Root service holding the interceptor's state. Internal; you normally don't touch it.

| Member | Meaning |
| --- | --- |
| `requestsInProgress` (get/set) | counter of requests passing `authInterceptor`; when it drops below 1, `blocked` resets |
| `blocked` (get) | a 401/403 is being handled, further ones are passed through as errors |
| `setBlocked()` | sets `blocked` to `true` |

## Deprecated class-based interceptors

Don't use these in new code; they only wrap the functions:

- `AuthInterceptor` + `AUTH_INTERCEPTOR_PROVIDER` → `authInterceptor`
- `SuppressAuthInterceptor` + `SUPPRESS_AUTH_INTERCEPTOR_PROVIDER` → `suppressAuthInterceptor`

They need `provideHttpClient(withInterceptorsFromDi())`. When an existing app
still uses them, replace the provider with the function in `withInterceptors([...])`.
