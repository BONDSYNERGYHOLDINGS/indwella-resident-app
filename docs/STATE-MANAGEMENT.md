# Resident App — State Management

## Global state: one Context

`src/contexts/AuthContext.tsx` is the only shared state in the app:

```ts
type AuthContextType = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
};
```

- On mount, it reads `residentTokenStorage.getAccessToken()` to decide the
  initial `isAuthenticated` value, and — if a token exists — proactively
  refreshes the backend's FCM token (`PATCH /resident-profile`).
- `login(token, refreshToken)` persists tokens via `TokenStorage.setTokens`
  and flips `isAuthenticated`; it does **not** take a `role` parameter,
  unlike (per source comments) the pre-split shared app's version, since this
  entire app *is* the resident role.
- `logout()` calls the backend logout route, deletes the local FCM token,
  clears token storage, and flips `isAuthenticated` back to `false`.
- It also registers itself with the SDK's `setSessionExpiredHandler`, so a
  failed token refresh anywhere in the app (via the axios interceptor)
  flows back into this same `isAuthenticated` flip — see
  `AUTHENTICATION.md`.

`RootNavigator` is the sole consumer that branches UI based on this state.
Screens consume `useAuth()` mainly for `getToken()` (to manually attach a
Bearer header — redundant, see `API-USAGE.md`) and `logout()`.

## No global data store

There is no Redux, Zustand, MobX, React Query, SWR, or Apollo anywhere in this
app (confirmed via `package.json` — none are dependencies here, unlike
admin-web which lists `zustand` unused). Every screen owns its own server
data as local `useState`, fetched in a `useEffect` or `useFocusEffect`
callback.

## Re-fetch-on-focus pattern

The dominant data-freshness strategy across the app is
`useFocusEffect(useCallback(() => { fetchX(); }, [deps]))` — screens refetch
their data every time they regain focus (e.g. returning from booking a
visitor re-fetches visitor history), rather than using cache invalidation or
optimistic updates. `Home.tsx` is the most elaborate example: it fetches both
wallet balance and profile in parallel on both mount and focus, and bumps a
local `walletRefreshKey` counter to force its child `FeatureNav` →
`TransactionList` to refetch too, since there's no shared cache to invalidate
across that component boundary.

## Cross-component communication: a native event emitter, not context

Notification unread-count updates use React Native's `DeviceEventEmitter`
rather than Context or a callback prop:

```ts
// Navbar.tsx subscribes:
DeviceEventEmitter.addListener('notificationCountChanged', (payload) => { ... });

// NotificationScreen.tsx emits, after dismissing a notification:
DeviceEventEmitter.emit('notificationCountChanged', { unreadDelta: -1 });
```

This is the one place in the app where two unrelated components communicate
without a prop chain or shared Context — a pragmatic but easy-to-miss pattern
for a new engineer grepping for "how does the badge count update."

## Form state

Every form (signup, login, visitor booking, profile edit, report issue) uses
plain `React.useState` per field — no formik/react-hook-form/zod or any form
library is used anywhere in this app.
