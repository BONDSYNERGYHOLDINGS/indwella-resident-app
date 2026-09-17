# Resident App — Navigation

Two navigators, switched by `RootNavigator.tsx` based on `isAuthenticated`:

```text
AppStack (public — unauthenticated)
├── introslider             IntroSliderScreen — resident-only intro carousel, first screen shown
├── resident_auth           Auth.tsx — combined login/signup screen (mode toggle)
├── awaiting_approval        AwaitingApprovalScreen — reached from resident_auth when signup/login
│                            succeeds but the resident isn't approved yet (see AUTHENTICATION.md)
├── forget_password         ForgotPasswordScreen
├── verify_otp               OtpVerificationScreen
├── reset_password           ResetPasswordScreen
└── legal_document            LegalDocumentScreen — Terms of Service / Privacy Policy

Drawer("ResidentApp") (authenticated)
└── ResidentStack
    ├── resident_home                Home — dashboard, wallet balance, feature grid
    ├── book_visitor                  BookVisitorsScreen — booking form + visitor history tab
    ├── booking_success                BookingSuccessScreen — access code + share sheet
    ├── resident_profile               ResidentProfileScreen
    ├── resident_change_password        ResidentChangePasswordScreen
    ├── visitor_history_list             VisitorHistoryListScreen
    ├── visitor_history_detail            VisitorHistoryDetailScreen — also supports edit/cancel
    ├── select_contact                   SelectContactScreen — device contact picker → book_visitor
    ├── pending                          pendingChargesScreen — unpaid service charges, pay-all
    ├── credit                           CreditWalletScreen — Paystack WebView checkout
    ├── notification                     NotificationScreen
    └── report_issues                    ReportIssuesScreen
```

The drawer (`ResidentDrawer.tsx`) additionally exposes non-screen actions:
Call (`tel:`), Email (`mailto:support@indwella.com`), WhatsApp
(`https://wa.me/...`, hardcoded number), plus direct links into `resident_profile`,
`book_visitor`, `notification`, `report_issues`, and Logout.

## Navigation param types (`src/navigation/types.ts`)

```ts
type ResidentStackParamList = {
  resident_home: { shortAddress: string; firstName?: string };
  pending: undefined;
  credit: undefined;
  notification: undefined;
  select_contact: undefined;
  book_visitor: { name?: string; phone?: string };
  booking_success: { validityText?: string; shareText?: string; visitId: number;
                     accessCode: string; startTime: string; endTime: string; visitDate: string };
  visitor_history_list: undefined;
  visitor_history_detail: { visit_id: number };
  resident_profile: undefined;
  resident_change_password: undefined;
  booking_cancel: undefined;    // declared, no screen registered for it — unused
  report_issues: undefined;
};

type RootStackParamList = {
  introslider: undefined;
  resident_auth: undefined;
  awaiting_approval: { estateName: string };
  forget_password: undefined;
  verify_otp: { email: string };
  reset_password: { email: string; resetToken: string };
  legal_document: { document: 'terms' | 'privacy' };
  ResidentApp: NavigatorScreenParams<ResidentStackParamList>;
};
```

The `AdminStackParamList`/`SecurityStackParamList` types and the
`AdminApp`/`SecurityApp`/`admin_auth`/`security_auth` entries that used to sit
in `RootStackParamList` — leftovers from a pre-split shared codebase — have
since been removed; `RootStackParamList` above is now the actual, current
type.

`awaiting_approval` itself used to live in `ResidentStackParamList` (only
reachable once `isAuthenticated` is `true`) while every `navigate()` call to
it happened from `Auth.tsx`, which runs before `isAuthenticated` ever flips —
`ResidentApp` and its nested `awaiting_approval` screen weren't mounted yet,
so the redirect silently failed at runtime despite type-checking fine (React
Navigation's types only check that a target is *some* valid key of the
param-list, not that it's mounted in the currently-live navigator). Fixed by
moving `awaiting_approval` onto `RootStackParamList`/`AppStack` directly, next
to `resident_auth` — see `AUTHENTICATION.md`.

## Deep-linking / external navigation

None found — no `Linking.addEventListener` for incoming deep links, no
universal-links config reviewed in `Info.plist`/`AndroidManifest.xml` beyond
standard RN boilerplate. Outbound `Linking.openURL` calls exist for
`tel:`/`mailto:`/`https://wa.me/` (drawer) and for opening notification
attachment URLs (`NotificationScreen.tsx`).
