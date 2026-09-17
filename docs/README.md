# Resident App

React Native application for estate residents. Handles account signup with
admin approval, profile management, visitor booking, estate charge payment,
wallet funding, issue reporting, and notifications.

- **Path:** `indwella-resident-app/`
- **Stack:** React Native 0.79, React 19, React Navigation 7 (native-stack +
  drawer), TypeScript, `@indwella/sdk`
- **Role served:** `resident` only (see `../USER-ROLES.md`)
- **Android package / iOS bundle scaffold:** `com.indwella_client` — **this
  is identical to the security app's package ID**, a real conflict; see
  `../ENGINEERING-HANDOFF.md`.

## Where to look for what

| Doc | Covers |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Folder structure, entry point, how the pieces connect |
| [`FEATURES.md`](./FEATURES.md) | Every screen/feature, traced UI → SDK → API |
| [`API-USAGE.md`](./API-USAGE.md) | Exact SDK/endpoint call sites, including the raw-axios bypass pattern |
| [`AUTHENTICATION.md`](./AUTHENTICATION.md) | Login/signup/approval/refresh/reset flow specifics |
| [`NAVIGATION.md`](./NAVIGATION.md) | Full route tree |
| [`STATE-MANAGEMENT.md`](./STATE-MANAGEMENT.md) | AuthContext, local state patterns, no global store |
| [`HANDOFF.md`](./HANDOFF.md) | App-specific bugs, limitations, next steps |

## Quick start

```bash
cd indwella-sdk && yarn install && yarn build   # SDK must be built first
cd ../indwella-resident-app
yarn install
cp .env.example .env      # leave API_BASE_URL commented out for simulator work — apiClient.ts
                            # already falls back to the right host per platform; see the file's comments
yarn start                  # Metro bundler
yarn android                 # or: yarn ios
```

`yarn test` runs one Jest smoke test (`App.test.tsx`, renders `<App />` and
confirms no crash) — there is no broader test coverage; see
`../ENGINEERING-HANDOFF.md`.

## What this app can and can't do today

Fully working: signup with estate picker, login gated by admin approval,
profile edit/photo/delete, change password, forgot-password/OTP/reset, book/
edit/cancel visitors with device-contact picker and native share of the
access code, visitor history, view + bulk-pay unpaid service charges, fund
wallet via an in-app Paystack WebView checkout, view wallet transaction
history, report an issue with a photo, notifications inbox, push
notification registration (FCM).

Visible in the UI but explicitly stubbed as "Coming Soon": Dashboard, Panic,
Electricity purchase, Bills & Utilities. Not visible in the UI at all despite
full backend/SDK support: license fee payment, single (non-bulk)
service-charge payment. See [`../FEATURE-MATRIX.md`](../FEATURE-MATRIX.md)
for the full status table.
