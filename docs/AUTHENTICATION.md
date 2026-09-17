# Resident App — Authentication

See `../AUTHENTICATION.md` for the platform-wide model. This document covers
resident-app-specific behavior.

## Login / signup

`src/screens/resident/Auth.tsx` is a single combined screen with a
`mode: 'login' | 'signup'` toggle — not two separate screens.

- **Signup mode** fetches available estates on mount
  (`GET /resident/available-estates`) into a `Picker`, and posts to
  `/resident/signup` with `{ email, password, first_name, last_name,
  phone_number, estate_id, house_address, agree_to_terms, country_code,
  fcm_token }`. `first_name`/`last_name` are parsed by splitting a single
  "Full name" input on whitespace.
- **Login mode** posts to `/resident-login` with `{ email, password,
  fcm_token }`.
- **Both calls go through the raw `api` axios export, not
  `authApi.login`/`authApi.signup`** — see `API-USAGE.md`.
- The FCM token is fetched (`getFcmToken()`) before either call and included
  in the payload so push notifications work from the very first login.

## Post-login routing logic

The response for both login and signup is inspected to decide where to send
the user next:

```ts
const isApproved = data?.resident?.is_approved ?? false;
const estateName = data?.resident?.estate_name || selectedEstate || 'your estate';
```

- **Signup succeeds, backend signals "awaiting approval"** (via
  `awaiting_admin_confirmation`, or a message containing "awaiting"/
  "admin"/"verification") → navigate to `awaiting_approval` with the estate
  name, regardless of whether a token was returned.
- **Signup succeeds and a token *is* returned but `is_approved` isn't
  present/true in the heuristics above** → still routes to
  `awaiting_approval` (signup always assumes pending review).
- **Login succeeds and `is_approved: true`** → `login(token, refreshToken)` —
  proceeds into the app.
- **Login succeeds but `is_approved: false`** → routes to
  `awaiting_approval`, does **not** call `login()` (so `AuthContext` stays
  logged out even though a valid token was technically issued).
- **Login/signup fails with a 403, or an error message matching "not
  approved"/"awaiting confirmation"** → same `awaiting_approval` redirect.
- Various other error-message substring checks (`"house already occupied"`,
  `"email is already"`, `"phone number is already"`, generic "already"+
  "exist") drive specific, human-friendly `Alert.alert` copy during signup.

This is all string-matching against backend error/message text, not typed
error codes — a backend copy change could silently break this routing logic.
See `../ENGINEERING-HANDOFF.md` for the broader pattern of fragile,
un-typed error-path coupling.

## Token refresh

Handled entirely by the SDK's shared interceptor (see `../AUTHENTICATION.md`).
No resident-app-specific refresh code exists beyond registering
`setSessionExpiredHandler` in `AuthContext`.

## Password reset

Fully working, three-screen flow:

```text
ForgotPasswordScreen  --POST /forgot-password { email }-->
  OtpVerificationScreen  --POST /verify-otp/resident { email, otp }-->
    (extracts res.data.reset_token)
  ResetPasswordScreen  --POST /reset-password { new_password, confirm_password }
                          with Authorization: Bearer <resetToken>-->
    navigates back to resident_auth via CommonActions.reset
```

This is the **working** reference implementation that admin-web's equivalent
flow should match but currently doesn't — see `../ENGINEERING-HANDOFF.md`.

## Logout

`AuthContext.logout()`: calls `authApi.logout()` (the one auth call in this
app that *does* go through the typed SDK method), attempts to delete the
local FCM token, clears token storage, flips `isAuthenticated`.

## Approval gating vs. authentication

Worth being explicit about: **approval status is not the same thing as
authentication** in this app's model. A resident can hold a valid, working
access token (proven by a successful login response) while
`AuthContext.isAuthenticated` stays `false`, because `login()` is
deliberately never called for an unapproved resident. Instead, `Auth.tsx`
redirects to the `awaiting_approval` screen with:

```ts
navigation.navigate('awaiting_approval', { estateName });
```

five separate times (signup-pending, login-not-approved, and three error-path
branches).

**Fixed (previously broken):** `awaiting_approval` used to be registered only
inside `ResidentStack`, which is only mounted inside the Drawer that
`RootNavigator` renders once `isAuthenticated` is `true` — a target that
didn't exist yet on the unauthenticated `resident_auth` screen's navigator,
so the redirect silently failed (dev warning, no screen change), leaving the
user stuck on the login/signup screen. `awaiting_approval` has been moved to
`RootStackParamList` and registered directly in `AppStack` (see
`NAVIGATION.md`), alongside `resident_auth`, so the five `navigate()` calls
above now resolve correctly pre-login. `AwaitingApprovalScreen`'s own back
button (`navigation.goBack()`) still works as before, returning to
`resident_auth` within the same stack.
