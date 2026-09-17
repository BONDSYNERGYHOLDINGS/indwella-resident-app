// navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

// Passed straight from TransactionList.tsx's already-normalized item, rather
// than re-fetched by id, since /wallet/transactions is a list endpoint with
// no confirmed single-transaction GET route to refetch from. `raw*` fields
// carry full-precision/untruncated data the list view intentionally
// abbreviates (short reference, compact date, formatted amount string).
export type TransactionDetailParams = {
  id: string;
  name: string;
  amount: string;
  rawAmount: number;
  direction: 'credit' | 'debit';
  status: 'successful' | 'pending' | 'failed' | null;
  reference: string;
  rawCreatedAt: string | null;
  method: string | null;
};

export type ResidentStackParamList = {
  resident_home: { shortAddress: string; firstName?: string };
  pending: undefined;
  credit: undefined;
  notification: undefined;
  select_contact: undefined;
  book_visitor: { name?: string; phone?: string };
  booking_success: {
    validityText?: string;
    shareText?: string;
    visitId: number;
    accessCode: string;
    startTime: string;
    endTime: string;
    visitDate: string;
  };
  visitor_history_list: undefined;
  visitor_history_detail: { visit_id: number };
  transaction_detail: TransactionDetailParams;
  resident_profile: undefined;
  resident_change_password: undefined;
  booking_cancel: undefined;
  report_issues: undefined;
};

export type RootStackParamList = {
  // Intro/Auth. This app is resident-only, so there is no role to pick and no
  // admin/security auth route - security ships as its own app and facility
  // managers use the web admin.
  introslider: undefined;
  resident_auth: undefined;
  // Reachable only from resident_auth, before login() is ever called (an
  // unapproved resident never becomes isAuthenticated) - so this must live
  // on the unauthenticated stack, not inside ResidentApp's Drawer/Stack.
  awaiting_approval: { estateName: string };
  forget_password: undefined;
  verify_otp: { email: string };
  reset_password: { email: string; resetToken: string };
  legal_document: { document: 'terms' | 'privacy' };

  ResidentApp: NavigatorScreenParams<ResidentStackParamList>;
};
