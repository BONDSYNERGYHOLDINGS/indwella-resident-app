import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import { residentApi } from '../../lib/apiClient';
import { RootStackParamList } from '../../navigation/types';
import type { ElectricityPurchaseResponse } from '@indwella/sdk';

type ElectricityHistoryNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FAILURE_STATUSES = ['failed', 'error', 'declined'];
const IN_PROGRESS_STATUSES = ['pending', 'processing', 'initiated'];

const formatCurrency = (value: unknown) => {
  const amount = Number(value);
  return `₦${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;
};

const formatUnits = (value: unknown) => {
  const units = Number(value);
  return Number.isFinite(units) ? units.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusMeta = (item: ElectricityPurchaseResponse) => {
  const status = String(item.delivery_status || item.status || '').toLowerCase();
  if (FAILURE_STATUSES.includes(status)) {
    return { label: 'Failed', color: '#D14343', background: '#FDEDED' };
  }
  if (IN_PROGRESS_STATUSES.includes(status)) {
    return { label: 'Processing', color: '#B7791F', background: '#FFF7E0' };
  }
  return { label: 'Successful', color: '#0DAA73', background: '#E8FBF2' };
};

// The list endpoint's wrapper field isn't independently confirmed against a
// live response, so accept either a bare array or a `{ purchases: [...] }`
// envelope - same defensive pattern used for /resident-PCharges elsewhere.
const extractPurchases = (data: unknown): ElectricityPurchaseResponse[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).purchases)) {
    return (data as any).purchases;
  }
  return [];
};

export default function ElectricityHistoryScreen() {
  const navigation = useNavigation<ElectricityHistoryNavigationProp>();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [purchases, setPurchases] = React.useState<ElectricityPurchaseResponse[]>([]);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const fetchHistory = React.useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await residentApi.listElectricityPurchase();
      setPurchases(extractPurchases(res.data));
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setPurchases([]);
      } else {
        console.error('Error fetching electricity purchase history:', error);
        Alert.alert('Error', 'Failed to load purchase history');
      }
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const copyToken = (token: string) => {
    Clipboard.setString(token);
    Alert.alert('Copied', 'Purchase token copied to clipboard.');
  };

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrowLLine" size={18} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Purchase History</Text>
          <Text style={styles.subtitle}>Your past electricity purchases</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 40 }} />
      ) : purchases.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No electricity purchases yet</Text>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => navigation.navigate('ResidentApp', { screen: 'electricity' })}>
            <Text style={styles.buyButtonText}>Buy Electricity</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={item => String(item.id ?? item.reference)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
          }
          renderItem={({ item }) => {
            const meta = statusMeta(item);
            const isExpanded = expandedId === item.id;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                    <Text style={styles.meterText}>Meter: {item.meter_number}</Text>
                    <Text style={styles.dateText}>{formatDate(item.completed_at || item.requested_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Units</Text>
                      <Text style={styles.detailValue}>{formatUnits(item.units_kwh)} kWh</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reference</Text>
                      <Text style={styles.detailValue}>{item.reference}</Text>
                    </View>
                    {!!item.purchase_token && (
                      <TouchableOpacity
                        style={styles.tokenBox}
                        onPress={() => copyToken(item.purchase_token!)}>
                        <Text style={styles.tokenLabel}>Token (tap to copy)</Text>
                        <Text style={styles.tokenValue}>{item.purchase_token}</Text>
                      </TouchableOpacity>
                    )}
                    {!!item.error_message && (
                      <Text style={styles.errorText}>{item.error_message}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F4FB' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#6B21D8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1D2140' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6F7393' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 20 },
  buyButton: {
    backgroundColor: '#6B21D8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buyButtonText: { color: '#FFFFFF', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#6B21D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  amountText: { fontSize: 17, fontWeight: '800', color: '#1D2140' },
  meterText: { fontSize: 13, color: '#6F7393', marginTop: 4 },
  dateText: { fontSize: 12, color: '#9A9FB5', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  expandedSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: '#6F7393' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1D2140' },
  tokenBox: {
    marginTop: 10,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCCEF9',
    padding: 12,
    alignItems: 'center',
  },
  tokenLabel: { fontSize: 11, color: '#6A6485', marginBottom: 4 },
  tokenValue: { fontSize: 15, fontWeight: '900', color: '#2D1958', letterSpacing: 1 },
  errorText: { fontSize: 12, color: '#D14343', marginTop: 10 },
});