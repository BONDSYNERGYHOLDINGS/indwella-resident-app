// navigation/ResidentStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/resident/Home';
import BookVisitorScreen from '../screens/resident/BookVisitorsScreen';
import ResidentProfileScreen from '../screens/resident/ResidentProfileScreen';
import ResidentChangePasswordScreen from '../screens/resident/ResidentChangePasswordScreen';
import VisitorHistoryDetailScreen from '../screens/resident/VisitorHistoryDetailScreen';
import VisitorHistoryListScreen from '../screens/resident/VisitorHistoryListScreen';
import BookingSuccessScreen from '../screens/resident/BookingSuccessScreen';
import SelectContactScreen from '../screens/resident/SelectContactScreen';
import PendingChargesScreen from '../screens/resident/pendingChargesScreen';
import CreditWalletScreen from '../screens/resident/CreditWalletScreen';
import NotificationScreen from '../screens/resident/NotificationScreen';
import ReportIssuesScreen from '../screens/resident/ReportIssuesScreen';
import TransactionDetailScreen from '../screens/resident/TransactionDetailScreen';

const Stack = createNativeStackNavigator();

const ResidentStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="resident_home"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="resident_home" component={Home} />
      <Stack.Screen name="book_visitor" component={BookVisitorScreen} />
      <Stack.Screen name="booking_success" component={BookingSuccessScreen} />
      <Stack.Screen name="resident_profile" component={ResidentProfileScreen} />
      <Stack.Screen
        name="resident_change_password"
        component={ResidentChangePasswordScreen}
      />
      <Stack.Screen name="visitor_history_list" component={VisitorHistoryListScreen} />
      <Stack.Screen name="visitor_history_detail" component={VisitorHistoryDetailScreen} />
      <Stack.Screen name="select_contact" component={SelectContactScreen} />
      <Stack.Screen name="pending" component={PendingChargesScreen} />
      <Stack.Screen name="credit" component={CreditWalletScreen} />
      <Stack.Screen name="notification" component={NotificationScreen} />
      <Stack.Screen name="report_issues" component={ReportIssuesScreen} />
      <Stack.Screen name="transaction_detail" component={TransactionDetailScreen} />
    </Stack.Navigator>
  );
};

export default ResidentStack;
