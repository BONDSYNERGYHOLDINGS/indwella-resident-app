// navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type AdminStackParamList = {
  admin_home: undefined;
  create_security: undefined;
  security_code: { code: string };
  service_charge_card:undefined;
  notification: undefined;
};

export type ResidentStackParamList = {
  resident_home: { shortAddress: string; firstName?: string };
  awaiting_approval: { estateName: string };
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
  resident_profile: undefined;
  resident_change_password: undefined;
  booking_cancel: undefined;
  report_issues: undefined;
};

export type SecurityStackParamList ={
  security_home: undefined;
  visit_details: {
    code: string;
    visitor: {
      id: number;
      visitor_name: string;
      visitor_phone: string;
      house_address: string;
      start_time: string;
      end_time: string;
      time_left: string;
      status: string;
      approval_status: string;
      comment?: string | null;
      departure_confirmed?: boolean;
    };
  }
}

export type RootStackParamList = {
  // Onboarding/Auth
  OnboardingScreen: undefined;
  introslider: { role: 'resident' | 'admin' | 'security' };
  resident_auth: undefined;
  admin_auth: undefined;
  security_auth: undefined;
  forget_password: { role: 'resident' | 'admin' };
  verify_otp: { role: 'resident' | 'admin'; email: string };
  reset_password: { role: 'resident' | 'admin'; email: string; resetToken: string };
  legal_document: { document: 'terms' | 'privacy' };

  // Role-based navigators
  AdminApp: NavigatorScreenParams<AdminStackParamList>;
  ResidentApp: NavigatorScreenParams<ResidentStackParamList>;
  SecurityApp: NavigatorScreenParams<SecurityStackParamList>;
};
