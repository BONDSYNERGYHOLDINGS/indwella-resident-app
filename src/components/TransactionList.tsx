import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../lib/apiClient';

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

function normalizeMethod(method?: string | null) {
  const normalizedMethod = String(method || '').trim().toLowerCase();

  switch (normalizedMethod) {
    case 'wallet_to_estate':
      return {
        label: 'Estate payment',
        direction: 'debit' as const,
        group: 'Estate payments' as const,
      };
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
      return {
        label: 'Wallet top-up',
        direction: 'credit' as const,
        group: 'Wallet top-ups' as const,
      };
  }
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
}: {
  item: Transaction;
}) {
  return (
    <View style={styles.transactionCard}>
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
    </View>
  );
}

interface TransactionListProps {
  refreshKey?: number;
}

function TransactionList({ refreshKey = 0 }: TransactionListProps) {
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

          return {
            id: String(transaction.id),
            name: normalizedMethod.label,
            amount: formatCurrency(amount, direction),
            timestamp: formattedDate.compact,
            shortTransactionId: formatShortReference(transaction.reference),
            type: direction,
            status: formatStatus(transaction.status),
            group: normalizedMethod.group,
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
                  <TransactionItem item={item} />
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
