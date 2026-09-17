import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import { ResidentStackParamList } from '../../navigation/types';

type TransactionDetailRouteProp = RouteProp<ResidentStackParamList, 'transaction_detail'>;
type NavigationProp = NativeStackNavigationProp<ResidentStackParamList, 'transaction_detail'>;

function formatDetailedDate(value: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }
  return date.toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  successful: 'Successful',
  pending: 'Pending',
  failed: 'Failed',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  successful: { bg: '#ECFDF3', text: '#027A48' },
  pending: { bg: '#FFFAEB', text: '#B54708' },
  failed: { bg: '#FEF3F2', text: '#B42318' },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { params } = useRoute<TransactionDetailRouteProp>();
  const { name, amount, direction, status, reference, rawCreatedAt, method } = params;

  const isCredit = direction === 'credit';
  const statusKey = status ?? undefined;

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}>
          <Icon name="arrowLLine" size={18} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={[styles.iconCircle, isCredit ? styles.creditCircle : styles.debitCircle]}>
          <Text style={[styles.iconText, isCredit ? styles.creditIconText : styles.debitIconText]}>
            {isCredit ? '+' : '-'}
          </Text>
        </View>
        <Text style={[styles.amount, isCredit ? styles.creditAmount : styles.debitAmount]}>
          {amount}
        </Text>
        <Text style={styles.name}>{name}</Text>
        {statusKey && STATUS_LABELS[statusKey] ? (
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[statusKey].bg }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[statusKey].text }]}>
              {STATUS_LABELS[statusKey]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailsCard}>
        <DetailRow label="Type" value={isCredit ? 'Money in' : 'Money out'} />
        <View style={styles.divider} />
        <DetailRow label="Reference" value={reference || 'Reference unavailable'} />
        <View style={styles.divider} />
        <DetailRow label="Date & time" value={formatDetailedDate(rawCreatedAt)} />
        {method ? (
          <>
            <View style={styles.divider} />
            <DetailRow label="Method" value={method} />
          </>
        ) : null}
      </View>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7ECF3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2939',
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  creditCircle: {
    backgroundColor: '#E8F8EF',
  },
  debitCircle: {
    backgroundColor: '#FFECEC',
  },
  iconText: {
    fontSize: 26,
    fontWeight: '800',
  },
  creditIconText: {
    color: '#18794E',
  },
  debitIconText: {
    color: '#D92D20',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  creditAmount: {
    color: '#18794E',
  },
  debitAmount: {
    color: '#B42318',
  },
  name: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#475467',
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 6,
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#667085',
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#1D2939',
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF1F5',
  },
});
