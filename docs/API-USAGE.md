# Resident App — API/SDK Usage

## Exception to the rule: Electricity uses the typed SDK properly

`ElectricityScreen.tsx` and `ElectricityHistoryScreen.tsx` are the one
feature pair in this app written against the typed `residentApi`/`walletApi`
methods from the start (`purchaseElectricity`, `getElectricityPurchase`,
`listElectricityPurchase`, `getBalance`) instead of raw `api.get/post`
calls — and `ElectricityScreen.tsx` uses the SDK's own
`generateIdempotencyKey()` (imported directly from `@indwella/sdk`) rather
than reimplementing it locally, unlike `CreditWalletScreen.tsx`. If you're
looking for a reference implementation to model a raw-axios screen's
migration on, start here rather than anywhere else in this app.

## The dominant pattern (everywhere else): raw axios, not typed SDK methods

`src/lib/apiClient.ts` exports both the typed SDK facades (`residentApi`,
`walletApi`, `authApi`, `passwordResetApi`, `notificationsApi`) **and** the
raw underlying axios instance (`export const api = residentSdk.client.axios`).
Nearly every screen in this app imports `api` and calls
`api.get('/some/hand-written/path', ...)` directly rather than the typed
equivalent, even where one exists. This is the single most consistent pattern
across the whole app — worth internalizing before making any change here.

**Why it (mostly) still works:** the request/response interceptors
(auth header attachment, 401→refresh) live on the shared axios *instance*
(`sdk.client.axios`), not on the typed wrapper functions — so raw calls still
get automatic Bearer-token attachment and refresh handling. What's lost is
compile-time type safety on the request/response shape and a single point of
truth for the URL string.

**Every screen also frequently re-attaches `Authorization: Bearer <token>`
manually** via `getToken()` from `useAuth()`, even though the interceptor
already does this — harmless duplication, not a bug, but worth knowing so you
don't assume it's load-bearing when refactoring.

## Call-site map (screen → literal route called)

| Screen | Route(s) called | Via |
|---|---|---|
| `Auth.tsx` | `GET /resident/available-estates`, `POST /resident-login`, `POST /resident/signup` | raw `api` |
| `Home.tsx` | `GET /resident-profile`, `GET /wallet/balance` | raw `api` (manual Bearer header) |
| `BookVisitorsScreen.tsx` | `GET /resident/visitor-history`, `POST /resident/book-visitor`, `GET /resident/visitor-access/{id}` | raw `api` (manual Bearer header) |
| `VisitorHistoryListScreen.tsx` | `GET /resident/visitor-history` | raw `api` |
| `VisitorHistoryDetailScreen.tsx` | `GET /resident/visit-details/{id}`, `PATCH /resident/edit-visit/{id}`, `DELETE /resident/cancel-visit/{id}` | raw `api` |
| `pendingChargesScreen.tsx` | `GET /resident-PCharges`, `POST /wallet/pay-all-service-charges` | raw `api` (manual Bearer header) |
| `CreditWalletScreen.tsx` | `POST /wallet/fund/initiate`, `GET /wallet/fund/verify/{reference}` | raw `api` |
| `TransactionList.tsx` | `GET /wallet/transactions` | raw `api` |
| `ReportIssuesScreen.tsx` | `GET /resident-profile`, `POST /resident/report-issue` | raw `api` (manual Bearer header) |
| `ResidentProfileScreen.tsx` | `GET /resident-profile`, `PATCH /resident-profile`, `POST /resident/upload-photo`, `DELETE /resident/delete-account` | raw `api` (manual Bearer header) |
| `ResidentChangePasswordScreen.tsx` | `PUT /resident/change-password` | raw `api` (manual Bearer header) |
| `ForgotPasswordScreen.tsx` | `POST /forgot-password` | raw `api` |
| `OtpVerificationScreen.tsx` | `POST /verify-otp/{role}`, `POST /forgot-password` (resend) | raw `api` |
| `ResetPasswordScreen.tsx` | `POST /reset-password` (with `Authorization: Bearer <resetToken>`) | raw `api` |
| `NotificationScreen.tsx` | `GET /notifications/resident?limit=100`, `POST /notifications/resident/mark-read` | raw `api` |
| `Navbar.tsx` | `GET /notifications/resident/unread-count` (or admin's, by `userRole` prop) | raw `api` (manual Bearer header) |
| `AuthContext.tsx` | `authApi.logout()`, `PATCH /resident-profile` (FCM refresh, raw `api`) | mixed — one of two places `authApi.*`/typed methods are actually used |
| `ElectricityScreen.tsx` | `GET /wallet/balance`, `POST /resident/electricity/purchase`, `GET /resident/electricity/purchase/{reference}` | **typed** `walletApi`/`residentApi` |
| `ElectricityHistoryScreen.tsx` | `GET /resident/electricity/purchases` | **typed** `residentApi` |
| `TransactionDetailScreen.tsx` | none | pure display, driven by navigation params |

## What is never called

From the full `resident` SDK module (see the SDK's own `docs/API-REFERENCE.md`):
`getLicenseFeeOutstanding`, `payLicenseFee`, `payServiceCharge` (single-charge
— only `payAllServiceCharges` is used). No screen references any of these
three methods or their routes. (`purchaseElectricity`, `getElectricityPurchase`,
and `listElectricityPurchase` **are** now called, by the Electricity screens
above — this list previously included all five as unused, which is now
stale.)

## Request/response shapes actually relied on

Because most calls bypass the SDK's typed methods, the *effective* contract
this app depends on is whatever each screen's own inline type/interface
declares (e.g. `BookVisitorScreen.tsx`'s local `VisitorHistoryItem`
interface), which may or may not exactly match the SDK's own type of the same
name (`ResidentVisitHistoryItem`). They were consistent everywhere checked
during this review, but there is no structural guarantee they stay that way,
since nothing imports the SDK type to enforce it at these call sites.

## Error handling pattern (repeated per screen, not centralized)

```ts
catch (err: any) {
  const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Fallback text';
  Alert.alert('Error', message);
}
```

Some screens add response-message substring matching for specific UX (see
`AUTHENTICATION.md`'s post-login routing logic for the most elaborate
example, in `Auth.tsx`).

## File uploads

Two upload call sites (`ResidentProfileScreen.tsx`'s photo upload,
`ReportIssuesScreen.tsx`'s issue photo) both hand-construct `FormData` and set
`headers: { 'Content-Type': 'multipart/form-data' }` explicitly, rather than
using the SDK's `residentApi.reportIssue(formData)` /
`authApi.uploadPhoto(formData)`, which do the same thing internally.
