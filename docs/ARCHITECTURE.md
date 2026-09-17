# Resident App — Architecture

## Folder structure

```text
indwella-resident-app/
├── App.tsx                       # Entry component: SafeAreaProvider > AuthProvider > RootNavigator
├── index.js                      # RN registration entry point
├── src/
│   ├── assets/                   # Images, icons
│   ├── components/                # AdCarousel, AppSafeAreaView, FeatureCards, hardReset,
│   │                              #   Icon, Navbar, Recharge, TransactionList
│   ├── constants/icons.ts
│   ├── contexts/AuthContext.tsx   # The only React Context in the app
│   ├── lib/
│   │   ├── apiClient.ts            # Instantiates createResidentSdk(); exports api/residentApi/walletApi/authApi/passwordResetApi/notificationsApi
│   │   └── tokenStorage.ts         # AsyncStorage-backed TokenStorage implementation
│   ├── native/PhoneContactPicker.ts # Thin wrapper around a native module (Android: PhoneContactPickerModule.kt)
│   ├── navigation/
│   │   ├── RootNavigator.tsx       # Auth-gated top-level switch: AppStack vs. Drawer(ResidentStack)
│   │   ├── AppStack.tsx            # Public (unauthenticated) stack
│   │   ├── ResidentStack.tsx       # Authenticated stack
│   │   ├── ResidentDrawer.tsx      # Drawer content (correctly wired — contrast with security app)
│   │   └── types.ts                # RootStackParamList, ResidentStackParamList, + vestigial Admin/SecurityStackParamList
│   ├── screens/
│   │   ├── IntroSliderScreen.tsx    # Resident-only slide deck; first screen shown, no role picker
│   │   ├── auth/ForgotPasswordScreen.tsx, OtpVerificationScreen.tsx, ResetPasswordScreen.tsx
│   │   └── resident/                # Every authenticated + resident-auth screen (see NAVIGATION.md)
│   ├── services/
│   │   ├── imagePicker.ts          # launchImageLibrary wrapper with a document-picker fallback
│   │   └── pushNotifications.ts    # FCM token lifecycle + foreground/background handlers
│   └── types/                      # api.d.ts (openapi-typescript generated), auth.ts, react-native-contacts.d.ts
├── android/, ios/                  # Native projects
└── __tests__/App.test.tsx          # One smoke test
```

## Entry point and provider stack

```tsx
// App.tsx
<GestureHandlerRootView style={{flex: 1}}>
  <SafeAreaProvider>
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

The `GestureHandlerRootView` wrapper exists specifically for the drawer: Android
wires gesture-handler into the root view natively, but on iOS the drawer's
swipe-to-open gesture is dead without this explicit wrapper.

`App.tsx` also subscribes to foreground push messages
(`subscribeToForegroundPushMessages()`) once on mount. `index.js` separately
calls `setBackgroundPushHandler()` at import time (before any screen renders)
— both are guarded against missing Firebase config, see Notifications below.

## Navigation

`RootNavigator` reads `useAuth()` and renders:

- `AppStack` (public routes) when `!isAuthenticated`
- a `Drawer.Navigator` wrapping `ResidentStack` when `isAuthenticated`, with
  `ResidentDrawer` correctly supplied as `drawerContent`

Full route tree in [`NAVIGATION.md`](./NAVIGATION.md).

## SDK integration

`src/lib/apiClient.ts` is the single point where the SDK is instantiated:

```ts
export const residentSdk = createResidentSdk({
  baseURL,
  storage: residentTokenStorage,
  onSessionExpired: () => sessionExpiredHandler?.(),
});

export const api = residentSdk.client.axios;   // raw escape hatch — heavily used, see API-USAGE.md
export const residentApi = residentSdk.resident;
export const walletApi = residentSdk.wallet;
export const authApi = residentSdk.auth;
export const passwordResetApi = residentSdk.passwordReset;
export const notificationsApi = residentSdk.notifications;
```

`baseURL` resolves from `@env`'s `API_BASE_URL` (via `react-native-dotenv`),
falling back to `http://10.0.2.2:8000` (Android emulator) or
`http://localhost:8000` (iOS simulator) if unset — `.env.example` now
recommends leaving `API_BASE_URL` commented out entirely for simulator work,
since setting a single value breaks one of the two platforms; set it only to
target a LAN IP (real device) or a deployed environment.

The SDK client is also given an explicit 60s request timeout
(`REQUEST_TIMEOUT_MS`), well above the SDK's 20s default — the hosted backend
runs on Render, which spins down when idle and can take 30-60s+ to answer the
first request of a session; the default timeout fired before that and
surfaced as a bare "Network Error".

## State management

See [`STATE-MANAGEMENT.md`](./STATE-MANAGEMENT.md) — summary: one
`AuthContext`, everything else is per-screen `useState`/`useEffect` with
`useFocusEffect`-driven refetching. No Redux, no React Query, no global store.

## Storage

- **Tokens:** `AsyncStorage` under keys `resident_token` /
  `resident_refresh_token` (`src/lib/tokenStorage.ts`).
- **Nothing else is persisted locally** — no offline cache, no local DB. Every
  screen re-fetches from the network on focus.
- `src/components/hardReset.tsx` exposes `hardResetAndNavigateToLogin()`,
  which clears **all** of `AsyncStorage` (not just the token keys) and resets
  navigation to `resident_auth` — a debug/support utility, not wired to any
  visible UI button in the screens reviewed.

## Notifications

`src/services/pushNotifications.ts` wraps `@react-native-firebase/messaging`:

- `requestNotificationPermission()` — handles the Android 13+
  `POST_NOTIFICATIONS` runtime permission separately from iOS/older-Android's
  `messaging().requestPermission()`.
- `getFcmToken()` — permission-gated token fetch, called at login and
  periodically on profile fetch to keep the backend's `fcm_token` current
  (`api.patch('/resident-profile', { fcm_token })`).
- `deleteFcmToken()` — called on logout.
- `setBackgroundPushHandler()` / `subscribeToForegroundPushMessages()` —
  both funnel into a native `PushNotification.show(...)` module on Android
  (Kotlin: `PushNotificationModule.kt`) or a plain `Alert.alert` fallback.
- Every exported function now short-circuits behind `isFirebaseConfigured()`
  (`getApps().length > 0`) before touching `messaging()`. Firebase is
  configured from a per-platform credentials file
  (`android/app/google-services.json`,
  `ios/indwella_client/GoogleService-Info.plist`); if that file is missing for
  the current platform, `messaging()` throws `"No Firebase App '[DEFAULT]'
  has been created"`. Because `setBackgroundPushHandler()` runs at import
  time in `index.js`, an unguarded call previously crashed the app before the
  first screen rendered — the guard degrades to a `console.warn` and a no-op
  instead.

## Permissions

- **Contacts** (`READ_CONTACTS` on Android, native permission API on iOS) —
  requested in `SelectContactScreen.tsx` for the visitor-booking contact
  picker.
- **Notifications** (`POST_NOTIFICATIONS` on Android 13+) — requested in
  `pushNotifications.ts`.
- **Photo library** — via `react-native-image-picker` /
  `react-native-document-picker` (the latter as a fallback when the native
  photo picker intent is unavailable, per `imagePicker.ts`'s
  `isPhotoPickerUnavailable` check).

## Configuration

Single env var: `API_BASE_URL` (`.env`, loaded via `react-native-dotenv`'s
`@env` module alias, declared in `env.d.ts`). No other runtime configuration
exists — Firebase config comes from `google-services.json`
(Android)/`GoogleService-Info.plist`-equivalent (iOS, via the Firebase RN SDK
convention), not from `.env`.
