import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../lib/apiClient';
import { RootStackParamList } from '../navigation/types';

type TransactionDirection = 'credit' | 'debit';
type TransactionStatus = 'successful' | 'pending' | 'failed' | null;
type TransactionGroup = 'Wallet top-ups' | 'Estate payments' | 'Other transactions';

interface Transaction {
  id: string;
  name: string;
  amount: string;
  timestamp: string;
  shortTransactionId: string;
  type: TransactionDirection;
  status: TransactionStatus;
  group: TransactionGroup;
  // Full-precision fields the compact list view above intentionally
  // abbreviates - carried through so TransactionDetailScreen doesn't need a
  // second fetch (there's no confirmed single-transaction GET route).
  rawAmount: number;
  rawReference: string;
  rawCreatedAt: string | null;
  rawMethod: string | null;
}

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const groupOrder: TransactionGroup[] = [
  'Wallet top-ups',
  'Estate payments',
  'Other transactions',
];

// Bill/service-charge payments were showing as "+₦X Wallet top-up" (credit)
// instead of "-₦X Estate payment" (debit) whenever `method` wasn't the exact
// string `wallet_to_estate` - which, like several other backend-shape guesses
// found this session (residents-count, resident-approval, notification body),
// was never independently confirmed against a live response either. Rather
// than hardcode one more single unverified string, this matches by substring
// against every wallet-debiting activity DATA-MODEL.md documents (service
// charges, license fees, electricity purchases), so a differently-spelled
// backend value (e.g. `pay_all_service_charges`, `wallet_to_estate_charge`)
// still classifies as a debit instead of silently falling through to the
// top-up default. See docs/ENGINEERING-HANDOFF.md.
const DEBIT_METHOD_HINTS = ['estate', 'charge', 'bill', 'license_fee', 'electricity'];

function normalizeMethod(method?: string | null) {
  const normalizedMethod = String(method || '').trim().toLowerCase();

  if (DEBIT_METHOD_HINTS.some((hint) => normalizedMethod.includes(hint))) {
    return {
      label: 'Estate payment',
      direction: 'debit' as const,
      group: 'Estate payments' as const,
    };
  }

  switch (normalizedMethod) {
    case 'card':
      return {
        label: 'Wallet top-up via card',
        direction: 'credit' as const,
        group: 'Wallet top-ups' as const,
      };
    case 'bank_transfer':
      return {
        label: 'Wallet top-up via bank transfer',
        direction: 'credit' as const,
        group: 'Wallet top-ups' as const,
      };
    case 'ussd':
      return {
        label: 'Wallet top-up via USSD',
        direction: 'credit' as const,
        group: 'Wallet top-ups' as const,
      };
    case 'paystack':
    case 'paystack_verify':
    case 'paystack_transfer':
      return {
        label: 'Wallet top-up',
        direction: 'credit' as const,
        group: 'Wallet top-ups' as const,
      };
    default:
      // Truly unrecognized method - previously this returned "Wallet top-up"
      // (credit), which is how a mismatched estate-payment method silently
      // became a mislabeled top-up. "Other transactions" exists in
      // TransactionGroup specifically for this case but was dead code until
      // now - nothing ever produced it.
      return {
        label: 'Other transaction',
        direction: 'credit' as const,
        group: 'Other transactions' as const,
      };
  }
}

// Bill/charge payments have no confirmed name field on the wallet
// transaction response (WalletTransactionResponse only documents id, amount,
// currency, reference, method, status, created_at - see docs/DATA-MODEL.md,
// itself an unconfirmed guess like several other types this session). This
// defensively checks several plausible field names/shapes so that if the
// backend does send a specific charge name (e.g. "Water Bill"), it surfaces
// here instead of never being read at all - falls back to normalizeMethod()'s
// generic "Estate payment" label (set by the caller) when none are present.
function getChargeName(transaction: any): string | null {
  const directName =
    transaction?.description ||
    transaction?.narration ||
    transaction?.charge_name ||
    transaction?.service_charge_name ||
    transaction?.label;
  if (typeof directName === 'string' && directName.trim()) {
    return directName.trim();
  }

  // A single pay-all-service-charges transaction can cover multiple bills at
  // once - if the backend nests the paid charges as a list, join their names
  // rather than showing just the first one silently.
  const chargeList = transaction?.service_charges || transaction?.charges || transaction?.items;
  if (Array.isArray(chargeList) && chargeList.length > 0) {
    const names: string[] = chargeList
      .map((charge: any) => (typeof charge?.name === 'string' ? charge.name.trim() : ''))
      .filter(Boolean);
    if (names.length === 1) {
      return names[0];
    }
    if (names.length > 1) {
      return `${names[0]} + ${names.length - 1} more`;
    }
  }

  return null;
}

function formatCurrency(amount: number, direction: TransactionDirection) {
  const sign = direction === 'debit' ? '-' : '+';
  return `${sign}\u20A6${currencyFormatter.format(Math.abs(amount))}`;
}

function formatStatus(status?: string | null): TransactionStatus {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'failed' || normalized === 'successful') {
    return normalized;
  }
  return null;
}

function formatShortReference(reference?: string | null) {
  const value = String(reference || '').trim();
  if (!value) {
    return 'Reference unavailable';
  }
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatTransactionDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      compact: 'Date unavailable',
      detailed: 'Date unavailable',
    };
  }

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const timeLabel = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  let compact = date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    compact = `Today, ${timeLabel}`;
  } else if (isYesterday) {
    compact = `Yesterday, ${timeLabel}`;
  }

  const detailed = date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return { compact, detailed };
}

function groupTransactions(transactions: Transaction[]) {
  const grouped = groupOrder.map((title) => ({
    title,
    items: transactions.filter((transaction) => transaction.group === title),
  }));

  return grouped.filter((section) => section.items.length > 0);
}

function TransactionArrow({ type }: { type: TransactionDirection }) {
  return (
    <View
      style={[
        styles.arrowContainer,
        type === 'credit' ? styles.creditArrowContainer : styles.debitArrowContainer,
      ]}>
      <Text style={[styles.arrowIcon, type === 'credit' ? styles.creditArrowIcon : styles.debitArrowIcon]}>
        {type === 'credit' ? '+' : '-'}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Exclude<TransactionStatus, null> }) {
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View
      style={[
        styles.statusBadge,
        status === 'successful'
          ? styles.statusSuccess
          : status === 'pending'
            ? styles.statusPending
            : styles.statusFailed,
      ]}>
      <Text
        style={[
          styles.statusText,
          status === 'successful'
            ? styles.statusSuccessText
            : status === 'pending'
              ? styles.statusPendingText
              : styles.statusFailedText,
        ]}>
        {statusText}
      </Text>
    </View>
  );
}

function TransactionItem({
  item,
  onPress,
}: {
  item: Transaction;
  onPress: (item: Transaction) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.transactionCard}
      activeOpacity={0.7}
      onPress={() => onPress(item)}>
      <View style={styles.transactionContent}>
        <View style={styles.leftSection}>
          <TransactionArrow type={item.type} />
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionName}>{item.name}</Text>
            <Text style={styles.transactionId}>Ref {item.shortTransactionId}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text style={[styles.amount, item.type === 'credit' ? styles.creditAmount : styles.debitAmount]}>
            {item.amount}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
          {item.status ? <StatusBadge status={item.status} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface TransactionListProps {
  refreshKey?: number;
}

function TransactionList({ refreshKey = 0 }: TransactionListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/wallet/transactions');
        const transactionArray = Array.isArray(response.data.transactions)
          ? response.data.transactions
          : [];

        const mapped: Transaction[] = transactionArray.map((transaction: any) => {
          const amount = Number(transaction.amount ?? 0);
          const normalizedMethod = normalizeMethod(transaction.method);
          const direction =
            normalizedMethod.direction === 'debit' || amount < 0
              ? 'debit'
              : 'credit';
          const formattedDate = formatTransactionDate(transaction.created_at);
          const chargeName = getChargeName(transaction);

          return {
            id: String(transaction.id),
            name: chargeName || normalizedMethod.label,
            amount: formatCurrency(amount, direction),
            timestamp: formattedDate.compact,
            shortTransactionId: formatShortReference(transaction.reference),
            type: direction,
            status: formatStatus(transaction.status),
            group: normalizedMethod.group,
            rawAmount: amount,
            rawReference: String(transaction.reference || ''),
            rawCreatedAt: transaction.created_at ?? null,
            rawMethod: transaction.method ?? null,
          };
        });

        setTransactions(mapped);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [refreshKey]);

  const sections = groupTransactions(transactions);

  const openTransaction = (item: Transaction) => {
    navigation.navigate('ResidentApp', {
      screen: 'transaction_detail',
      params: {
        id: item.id,
        name: item.name,
        amount: item.amount,
        rawAmount: item.rawAmount,
        direction: item.type,
        status: item.status,
        reference: item.rawReference,
        rawCreatedAt: item.rawCreatedAt,
        method: item.rawMethod,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6B21D8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      {transactions.length === 0 ? (
        <View style={[styles.listContainer, styles.emptyState]}>
          <Text style={styles.noPaymentText}>No transactions yet</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {sections.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>

              {section.items.map((item, index) => (
                <View key={item.id}>
                  <TransactionItem item={item} onPress={openTransaction} />
                  {index < section.items.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  centered: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  emptyState: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475467',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7ECF3',
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  arrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creditArrowContainer: {
    backgroundColor: '#E8F8EF',
  },
  debitArrowContainer: {
    backgroundColor: '#FFECEC',
  },
  arrowIcon: {
    fontSize: 15,
    fontWeight: '800',
  },
  creditArrowIcon: {
    color: '#18794E',
  },
  debitArrowIcon: {
    color: '#D92D20',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2939',
    marginBottom: 5,
  },
  transactionId: {
    fontSize: 12,
    color: '#667085',
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  creditAmount: {
    color: '#18794E',
  },
  debitAmount: {
    color: '#B42318',
  },
  timestamp: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF3',
  },
  statusPending: {
    backgroundColor: '#FFFAEB',
  },
  statusFailed: {
    backgroundColor: '#FEF3F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusSuccessText: {
    color: '#027A48',
  },
  statusPendingText: {
    color: '#B54708',
  },
  statusFailedText: {
    color: '#B42318',
  },
  separator: {
    height: 10,
  },
  noPaymentText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9E9E9E',
    textAlign: 'center',
  },
});

export default TransactionList;
