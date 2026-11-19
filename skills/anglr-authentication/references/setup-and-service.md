# Setup and AuthenticationService

How to connect @anglr/authentication to an app: the options class you
implement, providers, startup, the identity types and the service API.

## Contents

- AuthenticationServiceOptions (you implement it)
- Providers and startup
- UserIdentity and AccessToken
- AuthenticationService API
- Sample: login page
- Sample: user menu with logout
- Typed additional user info
- Testing components that use the library

## AuthenticationServiceOptions (you implement it)

Abstract class `AuthenticationServiceOptions<TUserInfo = unknown>`. It is the only
place where the app's backend and routes are known. All members are abstract:

| Member | Signature | Called by | Must do |
| --- | --- | --- | --- |
| `login` | `(accessToken: AccessToken) => Observable<void>` | `AuthenticationService.login()` | authenticate (cookie/token), **emit once** on success, error on failure |
| `logout` | `() => Observable<void>` | `AuthenticationService.logout()` | sign out, **emit once** |
| `getUserIdentity` | `() => Observable<UserIdentity<TUserInfo>>` | `AuthenticationService.getUserIdentity()` | **emit** the identity of the current user; for anonymous users emit `isAuthenticated: false` (don't error) |
| `isAuthPage` | `(path?: string) => boolean` | guard, interceptor | is `path` (or the current location when omitted) the login page? |
| `showAuthPage` | `() => Promise<boolean>` | guard, interceptor | navigate to login (usually with a return URL) |
| `showAccessDenied` | `() => Promise<boolean>` | guard, interceptor | navigate to the access-denied page |

The service only reacts to `next` notifications, so an Observable that
completes without a value (`EMPTY`) leaves `login()`/`logout()` and
`getUserIdentity()` pending forever.

```typescript
import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Location} from '@angular/common';
import {Router} from '@angular/router';
import {AccessToken, AuthenticationServiceOptions, UserIdentity} from '@anglr/authentication';
import {Observable, map} from 'rxjs';

@Injectable()
export class AppAuthOptions extends AuthenticationServiceOptions
{
    private readonly _http: HttpClient = inject(HttpClient);
    private readonly _router: Router = inject(Router);
    private readonly _location: Location = inject(Location);

    public login(accessToken: AccessToken): Observable<void>
    {
        return this._http
            .post('api/account/login', accessToken)
            .pipe(map(() => undefined));
    }

    public logout(): Observable<void>
    {
        return this._http
            .post('api/account/logout', null)
            .pipe(map(() => undefined));
    }

    public getUserIdentity(): Observable<UserIdentity>
    {
        // backend returns {isAuthenticated, userName, firstName, surname, permissions, additionalInfo}
        return this._http.get<UserIdentity>('api/account/identity');
    }

    public isAuthPage(path?: string): boolean
    {
        return (path ?? this._location.path()).startsWith('/login');
    }

    public showAuthPage(): Promise<boolean>
    {
        return this._router.navigate(['/login'], {queryParams: {returnUrl: this._location.path()}});
    }

    public showAccessDenied(): Promise<boolean>
    {
        return this._router.navigate(['/accessDenied']);
    }
}
```

`getUserIdentity()` runs through `HttpClient`, so `authInterceptor` sees it too.
If the identity endpoint answers 401 for anonymous users, the interceptor
redirects to the login page and swallows the error, and the observable completes
without a value, so the identity Promise never settles. Make the endpoint return
an anonymous identity (`isAuthenticated: false, permissions: []`) instead of
401/403, or send this request with `IGNORED_INTERCEPTORS` (see
`http-interceptors.md`) and map the error to an anonymous identity.

## Providers and startup

```typescript
import {ApplicationConfig, inject, provideAppInitializer} from '@angular/core';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {AuthenticationService, AuthenticationServiceOptions, authInterceptor} from '@anglr/authentication';

import {AppAuthOptions} from './services/appAuth.options';
import {routes} from './app.routes';

export const appConfig: ApplicationConfig =
{
    providers:
    [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor])),
        {provide: AuthenticationServiceOptions, useClass: AppAuthOptions},
        provideAppInitializer(async () =>
        {
            const authService = inject(AuthenticationService);

            try
            {
                await authService.getUserIdentity();
            }
            catch(e)
            {
                console.error('Authentication initialization failed', e);

                throw e;
            }
        }),
    ],
};
```

Why the initializer: `authGuard` and `*authorize` read the cached
`userIdentity` synchronously and throw if it is `null`. A failed
`getUserIdentity()` rejects, `userIdentity` stays `null`, and rethrowing
stops the bootstrap, so the app never renders in a broken state.

`AuthenticationService` is `providedIn: 'root'`; don't provide it yourself.

## UserIdentity and AccessToken

```typescript
class UserIdentity<TUserInfo = unknown>
{
    isAuthenticated: boolean = false;
    userName: string = '';
    firstName: string = '';
    surname: string = '';
    permissions: string[] = [];
    additionalInfo: TUserInfo | null = null;
}

class AccessToken
{
    constructor(public userName: string, public password: string, public rememberMe: boolean) {}
}
```

`AccessToken` is only a DTO passed through `AuthenticationService.login()` to
your `login()`; send it to the backend or map it as you need.

## AuthenticationService API

`AuthenticationService<TUserInfo = unknown>`, `providedIn: 'root'`.

| Member | Type | Behaviour |
| --- | --- | --- |
| `userIdentity` | `UserIdentity<TUserInfo> \| null` | last loaded identity (sync); `null` before the first load or after a failed load |
| `authenticationChanged` | `Observable<UserIdentity<TUserInfo>>` | emits on every successful (re)load; plain Subject — **no replay** of the current value |
| `isInitialized` | `Promise<boolean>` | resolves `true` after the first load finishes (also when it failed) |
| `getUserIdentity(refresh?)` | `Promise<UserIdentity<TUserInfo>>` | returns the cached Promise; `refresh === true` reloads from options |
| `login(accessToken)` | `Observable<UserIdentity>` | `options.login()` → reload identity → emits it and completes; errors if `options.login` errors |
| `logout()` | `Observable<void>` | `options.logout()` → reload identity → emits and completes |
| `isAuthorizedSync(permission)` | `boolean` | single permission name against the cached identity |
| `isAuthorized(permission)` | `Promise<boolean>` | same, waits for (cached) `getUserIdentity()` |
| `showAuthPage()` / `showAccessDenied()` | `Promise<boolean>` | delegate to options |
| `isAuthPage(path?)` | `boolean` | delegates to options |

`login()` and `logout()` are cold: nothing happens until you subscribe.

For combinations of permissions (OR/AND/expressions) use `isAuthorized()` from
utils, see `permissions.md`.

## Sample: login page

```typescript
import {Component, ChangeDetectionStrategy, inject, input, signal, WritableSignal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {AccessToken, AuthenticationService} from '@anglr/authentication';

@Component(
{
    selector: 'login-view',
    imports: [ReactiveFormsModule],
    template:
    `
        <form [formGroup]="form" (ngSubmit)="submit()">
            <input formControlName="userName" placeholder="User name">
            <input formControlName="password" type="password" placeholder="Password">
            <label><input formControlName="rememberMe" type="checkbox"> Remember me</label>

            @if(error())
            {
                <div class="alert alert-danger">Invalid user name or password</div>
            }

            <button type="submit" [disabled]="form.invalid">Log in</button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent
{
    private readonly _authService: AuthenticationService = inject(AuthenticationService);
    private readonly _router: Router = inject(Router);

    /** Bound from query param ?returnUrl= (withComponentInputBinding) */
    public readonly returnUrl = input<string | undefined>();

    protected readonly error: WritableSignal<boolean> = signal(false);

    protected readonly form = new FormGroup(
    {
        userName: new FormControl('', {nonNullable: true, validators: Validators.required}),
        password: new FormControl('', {nonNullable: true, validators: Validators.required}),
        rememberMe: new FormControl(false, {nonNullable: true}),
    });

    protected submit(): void
    {
        const {userName, password, rememberMe} = this.form.getRawValue();

        this._authService
            .login(new AccessToken(userName, password, rememberMe))
            .subscribe(
            {
                next: identity =>
                {
                    if(identity.isAuthenticated)
                    {
                        this._router.navigateByUrl(this.returnUrl() || '/');
                    }
                    else
                    {
                        this.error.set(true);
                    }
                },
                error: () => this.error.set(true),
            });
    }
}
```

Route: `{path: 'login', component: LoginComponent}` — no guard, and
`isAuthPage()` must return `true` for it so that the interceptor ignores
401/403 coming from the login page itself.

## Sample: user menu with logout

`authenticationChanged` doesn't replay, so seed with the current value:

```typescript
import {Component, ChangeDetectionStrategy, inject, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {AuthenticationService, UserIdentity} from '@anglr/authentication';
import {startWith} from 'rxjs';

@Component(
{
    selector: 'user-menu',
    template:
    `
        @if(identity()?.isAuthenticated)
        {
            <span>{{identity()?.firstName}} {{identity()?.surname}}</span>
            <button type="button" (click)="logout()">Log out</button>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent
{
    private readonly _authService: AuthenticationService = inject(AuthenticationService);
    private readonly _router: Router = inject(Router);

    protected readonly identity: Signal<UserIdentity | null> = toSignal(this._authService
                                                                            .authenticationChanged
                                                                            .pipe(startWith(this._authService.userIdentity)),
                                                                        {requireSync: true});

    protected logout(): void
    {
        this._authService
            .logout()
            .subscribe(() => this._router.navigate(['/login']));
    }
}
```

## Typed additional user info

```typescript
interface AppUserInfo
{
    department: string;
    tenantId: number;
}

// options
@Injectable()
export class AppAuthOptions extends AuthenticationServiceOptions<AppUserInfo>
{
    public getUserIdentity(): Observable<UserIdentity<AppUserInfo>> { /* ... */ }
    // other members as above
}

// consumer
const authService: AuthenticationService<AppUserInfo> = inject(AuthenticationService<AppUserInfo>);
const department = authService.userIdentity?.additionalInfo?.department;
```

The generic is type-only; DI still uses the same root `AuthenticationService`.
`login()` returns `Observable<UserIdentity>` (untyped `additionalInfo`); read
`authService.userIdentity` for the typed value.

## Testing components that use the library

The package has no public testing entry point. Provide a fake options class and
load the identity before creating the component (the directives throw on a
`null` identity):

```typescript
import {TestBed} from '@angular/core/testing';
import {AuthenticationService, AuthenticationServiceOptions, UserIdentity} from '@anglr/authentication';
import {Observable, of} from 'rxjs';

class FakeAuthOptions extends AuthenticationServiceOptions
{
    public static permissions: string[] = ['users-page', 'users-create'];

    public login(): Observable<void> { return of(undefined); }
    public logout(): Observable<void> { return of(undefined); }
    public getUserIdentity(): Observable<UserIdentity>
    {
        return of({...new UserIdentity(), isAuthenticated: true, userName: 'tester', permissions: FakeAuthOptions.permissions});
    }
    public isAuthPage(): boolean { return false; }
    public showAuthPage(): Promise<boolean> { return Promise.resolve(true); }
    public showAccessDenied(): Promise<boolean> { return Promise.resolve(true); }
}

beforeEach(async () =>
{
    TestBed.configureTestingModule(
    {
        imports: [UsersComponent],
        providers: [{provide: AuthenticationServiceOptions, useClass: FakeAuthOptions}],
    });

    await TestBed.inject(AuthenticationService).getUserIdentity();
});
```

To test another permission set, change `FakeAuthOptions.permissions` and call
`getUserIdentity(true)`; `*authorize` and `*letAuthorized` update.
