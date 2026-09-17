# Resident App — Handoff Notes

App-specific bugs, limitations, and next steps. Platform-wide items are in
`../ENGINEERING-HANDOFF.md`; this file only covers what's specific to this
app.

## Bugs specific to this app

1. **Notification mark-read payload mismatch** against the SDK's typed
   method — see `../ENGINEERING-HANDOFF.md`.
2. **Shares the Android `applicationId` `com.indwella_client`** with the
   security app — see `../ENGINEERING-HANDOFF.md`. This is a release
   blocker, not a resident-app-only concern, but it lives in this app's
   `android/app/build.gradle`. Still confirmed identical to
   `indwella-security-app/android/app/build.gradle` as of this review.

**Fixed since the last pass of this doc, no longer tracked here:**
- The onboarding role-picker screen (`OnboardingScreen.tsx`) and its
  "Facility Manager"/"Security Agent" dead-end have been deleted outright —
  `AppStack` now opens directly on `introslider`, which is a resident-only
  slide deck with no role branching. The vestigial `AdminStackParamList` /
  `SecurityStackParamList` types and `AdminApp`/`SecurityApp`/`admin_auth`/
  `security_auth` entries in `RootStackParamList` are also gone. See
  `ARCHITECTURE.md` and `NAVIGATION.md`.
- The "Awaiting Approval" redirect (the app's most user-facing bug: new
  signups and pending logins appeared to silently do nothing) is fixed —
  `awaiting_approval` moved from `ResidentStackParamList`/`ResidentStack`
  onto `RootStackParamList`/`AppStack`, where `Auth.tsx`'s five `navigate()`
  calls to it can actually resolve pre-login. See `AUTHENTICATION.md` and
  `NAVIGATION.md`.
- `src/components/AdCarousel.tsx` line 46 had a stray `jo` token —
  `ref={flatListRef}jo` — which was invalid JSX and failed `tsc`. Removed;
  the file now type-checks.

## Limitations worth knowing before extending this app

- **No offline support.** Every screen re-fetches on focus; there's no local
  cache or persistence beyond the auth token pair. Losing connectivity mid-
  session degrades gracefully per-screen (error banners) but there's no
  retry queue or offline-first data layer.
- **No shared list/detail component pattern.** Unlike admin-web's
  `DataTable`/`Badge`/`PageHeader`, each list screen here
  (`VisitorHistoryListScreen`, the inline history in `BookVisitorsScreen`,
  `TransactionList`) reimplements its own list rendering, loading state, and
  empty state independently. A shared component would reduce duplication if
  more list screens are added.
- **No form library.** All forms use per-field `useState`. Adding
  react-hook-form or similar would reduce boilerplate but is a larger
  refactor than a quick fix.
- **`hardResetAndNavigateToLogin()` exists but isn't wired to any visible
  button** — a useful support/debug tool (clears all AsyncStorage) that a
  future settings screen could expose, or that should be removed if it's
  truly unused.
- **Phone number normalization is hand-rolled** (`cleanPhoneNumber` appears
  duplicated between `BookVisitorsScreen.tsx` and `SelectContactScreen.tsx`)
  rather than using a phone-number library — works for the Nigerian-number
  case it was clearly built for (`+234`, strip leading `0`), may not
  generalize if the platform expands to other countries' numbering.

## Suggested next steps, app-specific

1. Decide whether to build the Electricity and License Fee screens (backend/
   SDK-ready) — see `FEATURES.md` and `../DATA-MODEL.md` for the full
   contract each would need to implement against.
2. Add single-charge payment UI alongside the existing pay-all button on the
   Pending Charges screen, using the already-typed
   `residentApi.payServiceCharge(chargeId)`.
3. Consider migrating screens to the typed `residentApi`/`walletApi`
   methods incrementally, starting with the money-moving ones (wallet
   funding, service charge payment) where a silent shape mismatch has the
   highest cost.
4. Deduplicate `cleanPhoneNumber` into a shared util if a third call site
   ever needs it.
