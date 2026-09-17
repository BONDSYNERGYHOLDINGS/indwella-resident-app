# Resident App — Features

Every implemented feature, traced UI → SDK/API. Status labels match
`../FEATURE-MATRIX.md`.

## Signup & Login — `screens/resident/Auth.tsx` — Complete

- **What it does:** combined login/signup screen with a mode toggle. Signup
  collects name/email/phone/estate/address/password/terms-agreement; login
  collects email/password. The estate field shows a loading spinner while
  fetching, and a tappable "Couldn't load estates — Retry" row on failure
  (rather than spinning forever on error). On iOS, the estate `Picker` opens
  in a bottom-sheet `Modal` instead of rendering inline, since iOS renders
  `Picker` as a full-height wheel that doesn't fit a compact field shell;
  Android keeps the inline dropdown.
- **State:** local `useState` per field; `useAuth()` for `login()`.
- **SDK/API:** `GET /resident/available-estates` (signup mode only, via raw
  `api.get`), `POST /resident-login` / `POST /resident/signup` (via raw
  `api.post` — bypasses `authApi.login`/`authApi.signup`; see `API-USAGE.md`).
- **Auth requirement:** none (public).

## Awaiting Approval — `screens/resident/AwaitingApprovalScreen.tsx` — Complete

- **What it does:** pending-approval state screen — pulsing icon halo
  (`react-native-reanimated`), estate-name message, and an info card with two
  reassurance lines ("usually only takes a short while" / "we'll notify you
  once approved"). Icons (`ArrowLeft`, `Clock`, `ShieldCheck`, `Mail`) come
  from `lucide-react-native`, added specifically for this screen — the rest
  of the app uses the local `Icon`/`iconMap` image-based component
  (`src/components/Icon.tsx`), not lucide.
  Reached from `Auth.tsx` on post-signup/unapproved-login (five call sites) —
  previously a broken redirect (target screen wasn't mounted yet
  pre-authentication), fixed by registering `awaiting_approval` directly in
  `AppStack` instead of inside the authenticated `ResidentStack`; see
  `AUTHENTICATION.md`.
- **SDK/API:** none — pure display, driven by a route param.

## Home / Dashboard — `screens/resident/Home.tsx` — Complete

- **What it does:** greeting + wallet balance (maskable), Fund Wallet /
  View Charges quick actions, an ad carousel, and a tabbed "Explore More"
  section (Features / Payments / Recharge — see `FeatureNav.tsx`).
- **State:** local; refetches wallet balance + profile on mount and on every
  focus (`useFocusEffect`); bumps a `walletRefreshKey` to force child
  components to refetch too (no shared cache).
- **SDK/API:** `GET /resident-profile`, `GET /wallet/balance` — both via raw
  `api.get` with a manually re-attached `Authorization` header (redundant;
  the interceptor already attaches it).
- **Auth requirement:** authenticated resident.

## Book Visitor — `screens/resident/BookVisitorsScreen.tsx` (+ `SelectContactScreen.tsx`) — Complete

- **What it does:** form to invite a visitor (name, phone with country-code
  picker or device-contact picker, visitor count, date/start/end time
  pickers, comment); also shows the resident's own visitor history in a
  collapsed state on the same screen.
- **Components:** `CountryPicker`, `DateTimePicker` ×3, native
  `PhoneContactPicker` module (falls back to an alert if the native module
  isn't loaded — i.e. app wasn't rebuilt after adding it).
- **SDK/API:** `POST /resident/book-visitor` → then
  `GET /resident/visitor-access/{visitor_id}` to fetch the access code →
  navigates to `booking_success`. `GET /resident/visitor-history` for the
  inline history list. All via raw `api` calls.
- **Auth requirement:** authenticated resident.
- **Known limitation:** none functional; phone numbers are locally
  normalized (`cleanPhoneNumber`) to strip a leading country code or `0`
  before prefixing the picked calling code — fragile against edge-case
  formats but not observed to be broken.

## Booking Success — `screens/resident/BookingSuccessScreen.tsx` — Complete

- **What it does:** shows the generated access code and offers SMS/WhatsApp/
  Email share via the native `Share` API (all three currently funnel through
  the same generic `Share.share({ message })`, not method-specific URL
  schemes, despite per-method `url` construction being present in source but
  unused).
- **SDK/API:** none — pure display of navigation params.

## Visitor History (list + detail) — `VisitorHistoryListScreen.tsx`, `VisitorHistoryDetailScreen.tsx` — Complete

- **What it does:** list of past/active visits; tapping one opens a detail
  view that allows editing (name/phone/date/times) or cancelling **only**
  while the visit is still `Active` and security hasn't already
  approved/disapproved it (`isEditable` computed from `status` +
  `approval_status`).
- **SDK/API:** `GET /resident/visitor-history`, `GET
  /resident/visit-details/{visit_id}`, `PATCH /resident/edit-visit/{visit_id}`,
  `DELETE /resident/cancel-visit/{visit_id}` — all via raw `api` calls.
- **Auth requirement:** authenticated resident.

## Pending / Unpaid Charges — `screens/resident/pendingChargesScreen.tsx` — Complete (pay-all only)

- **What it does:** lists unpaid service charges with a running total, and a
  single "Clear Pending Charges" button that pays **all** of them at once.
- **SDK/API:** `GET /resident-PCharges`, `POST
  /wallet/pay-all-service-charges` — raw `api` calls. On an
  `INSUFFICIENT_BALANCE` response, shows a "Fund Wallet" shortcut into
  `credit`.
- **Known limitation:** no per-charge payment UI exists, even though the SDK
  has `payServiceCharge(chargeId)` for exactly that — see
  `../FEATURE-MATRIX.md`.

## Fund Wallet — `screens/resident/CreditWalletScreen.tsx` — Complete

- **What it does:** amount entry + payment-channel selection
  (bank_transfer/card/ussd), then opens Paystack's hosted checkout in an
  in-app `WebView`. Intercepts WebView navigation to detect the
  callback/cancel URLs and to hand off `tel:`/`ussd:` schemes (USSD
  authorization) to the native dialer via `Linking.openURL`.
- **SDK/API:** `POST /wallet/fund/initiate` (with a locally generated
  `Idempotency-Key` — see limitation below) → WebView loads
  `authorization_url` → on detecting the callback URL, polls
  `GET /wallet/fund/verify/{reference}` (up to 3 retries on timeout, 2s
  backoff) → on `status: 'successful'`, alerts and navigates back.
- **Known limitation:** the idempotency key is generated by a **local
  reimplementation** (`buildIdempotencyKey()`) instead of the SDK's
  `generateIdempotencyKey()` — duplicate logic, not a bug per se. Per
  `API.md`, wallet funding is fundamentally **webhook-first** — a successful
  client-side `verify` call does not by itself guarantee the wallet was
  credited if the webhook hasn't landed yet; this screen's messaging
  ("Still confirming") correctly reflects that uncertainty rather than
  over-promising.

## Wallet Transaction History — `components/TransactionList.tsx` — Complete

- **What it does:** groups transactions into "Wallet top-ups" / "Estate
  payments" / "Other" based on a normalized `method` field, with relative
  date formatting ("Today, 3:45 PM").
- **SDK/API:** `GET /wallet/transactions` via raw `api.get`.
- **Rendered inside:** `Home.tsx` → `FeatureNav.tsx`'s "Payments" tab.

## Report Issue — `screens/resident/ReportIssuesScreen.tsx` — Complete

- **What it does:** title + description + optional photo attachment, submits
  as multipart form data.
- **SDK/API:** `GET /resident-profile` (to prefill `house_address`),
  `POST /resident/report-issue` with `Content-Type: multipart/form-data` —
  both via raw `api` calls.
- **Auth requirement:** authenticated resident.

## Profile — `screens/resident/ResidentProfileScreen.tsx` — Complete

- **What it does:** view/edit email + phone (name is explicitly
  non-editable, "Name changes are not allowed"), upload/change profile
  photo, navigate to change-password, delete account.
- **SDK/API:** `GET /resident-profile`, `PATCH /resident-profile` (only
  changed fields + a refreshed `fcm_token`), `POST /resident/upload-photo`
  (multipart), `DELETE /resident/delete-account` — all via raw `api` calls.
- **Auth requirement:** authenticated resident.

## Change Password — `screens/resident/ResidentChangePasswordScreen.tsx` — Complete

- **SDK/API:** `PUT /resident/change-password` via raw `api.put`, manual
  Bearer header attached (redundant).
- **Validation:** new password ≥ 8 chars, confirm-match, client-side only.

## Forgot Password / OTP / Reset — Complete (working reference flow)

See `AUTHENTICATION.md` for the full three-screen trace. This is the
correctly-implemented version of a flow that admin-web's equivalent is
missing a step from.

## Notifications — `screens/resident/NotificationScreen.tsx` — Complete, with a payload mismatch

- **What it does:** lists unread, non-admin-originated notifications
  (filters out `is_read` and anything with an `admin_id`), formats currency
  amounts embedded in message text, supports expand/collapse for long
  broadcast messages, opens attachment URLs, and dismisses (marks read)
  individually.
- **SDK/API:** `GET /notifications/resident?limit=100`,
  `POST /notifications/resident/mark-read` — via raw `api` calls, with a
  body shape (`{ notification_id, is_read }`) that **diverges** from the
  SDK's typed `notificationsApi.markRead()` (`{ ids: [...] }`). See
  `../FEATURE-MATRIX.md` and `../ENGINEERING-HANDOFF.md`.
- **Cross-component effect:** emits `DeviceEventEmitter` event
  `notificationCountChanged` so `Navbar`'s unread badge updates without a
  shared store.

## Legal Documents — `screens/resident/LegalDocumentScreen.tsx` — Complete, placeholder content

- **What it does:** renders static Terms of Service / Privacy Policy text.
- **Known limitation:** the screen's own copy admits the content is a
  placeholder ("can be replaced with your estate's final legal wording when
  ready").

## Push Notifications (FCM) — `services/pushNotifications.ts` — Complete (infrastructure)

- **What it does:** requests notification permission, fetches/deletes the
  FCM token, shows foreground messages via a native module or `Alert`
  fallback, registers a background message handler.
- **Integration point:** the token is sent to the backend via
  `PATCH /resident-profile { fcm_token }`, both at login and opportunistically
  on app start / profile update — there's no dedicated
  "register device" endpoint call; it's piggybacked on the profile-update
  route.
- **Degrades instead of crashing when Firebase isn't configured:** every
  exported function checks `getApps().length > 0` first. Firebase config
  comes from a per-platform file (`google-services.json` /
  `GoogleService-Info.plist`); if it's missing for the current platform, a
  bare `messaging()` call throws. Since `setBackgroundPushHandler()` runs at
  import time in `index.js` (before any screen renders), this used to crash
  the app on launch on a platform without Firebase configured — it now logs
  a `console.warn` and returns a safe fallback (`null`/no-op) instead.

## Not implemented (stubbed "Coming Soon")

Dashboard, Panic, Electricity, Bills & Utilities — all four are cards in
`components/FeatureCards.tsx` whose `onPress` is
`Alert.alert('Coming Soon', 'This feature is under development')`. Electricity
in particular has full backend/SDK support and no UI at all; see
`../FEATURE-MATRIX.md` and `../DATA-MODEL.md`.
