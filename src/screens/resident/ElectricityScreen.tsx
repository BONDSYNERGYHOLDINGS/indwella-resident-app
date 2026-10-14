import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import { residentApi, walletApi } from '../../lib/apiClient';
import { RootStackParamList } from '../../navigation/types';
import { generateIdempotencyKey } from '@indwella/sdk';
import type { ElectricityPurchaseResponse } from '@indwella/sdk';

type ElectricityNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Statuses the backend may report while the vendor is still processing the
// token/units delivery - keep polling in this state, same pattern the wallet
// funding screen uses for its `/wallet/fund/verify` poll.
const IN_PROGRESS_STATUSES = ['pending', 'processing', 'initiated'];
const FAILURE_STATUSES = ['failed', 'error', 'declined'];
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

const sanitizeDigits = (value: string) => value.replace(/[^\d]/g, '');
const formatCurrency = (value: unknown) => {
  const amount = Number(value);
  return `₦${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;
};
const formatUnits = (value: unknown) => {
  const units = Number(value);
  return Number.isFinite(units) ? units.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ElectricityScreen() {
  const navigation = useNavigation<ElectricityNavigationProp>();

  const [meterNumber, setMeterNumber] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [polling, setPolling] = React.useState(false);
  const [result, setResult] = React.useState<ElectricityPurchaseResponse | null>(null);
  const [insufficientBalance, setInsufficientBalance] = React.useState(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const fetchBalance = React.useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await walletApi.getBalance();
      setWalletBalance(Number(res.data?.balance ?? 0));
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchBalance();
    }, [fetchBalance]),
  );

  const resetForm = () => {
    setMeterNumber('');
    setAmount('');
    setResult(null);
    setInsufficientBalance(false);
    idempotencyKeyRef.current = null;
  };

  const pollPurchaseStatus = async (reference: string) => {
    setPolling(true);
    try {
      for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
        await wait(POLL_INTERVAL_MS);
        const res = await residentApi.getElectricityPurchase(reference);
        const purchase = res.data;
        const status = String(purchase.delivery_status || purchase.status || '').toLowerCase();

        if (!IN_PROGRESS_STATUSES.includes(status)) {
          setResult(purchase);
          if (!FAILURE_STATUSES.includes(status)) {
            fetchBalance();
          }
          return;
        }
      }
      // Gave up polling - the purchase may still complete server-side. Leave
      // the resident on the "processing" result screen with guidance rather
      // than pretending it failed.
      Alert.alert(
        'Still processing',
        'Your purchase is taking longer than usual. Check "Purchase history" shortly for the token.',
      );
    } catch (error: any) {
      console.error('Error polling electricity purchase status:', error);
      Alert.alert(
        'Unable to confirm purchase',
        'We could not confirm your purchase status yet. Please check "Purchase history" in a moment.',
      );
    } finally {
      setPolling(false);
    }
  };

  const handlePurchase = async () => {
    const numericAmount = Number(amount);
    const trimmedMeter = meterNumber.trim();

    if (!trimmedMeter) {
      Alert.alert('Meter number required', 'Please enter the meter number to purchase for.');
      return;
    }
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount to purchase.');
      return;
    }
    if (walletBalance !== null && numericAmount > walletBalance) {
      setInsufficientBalance(true);
      return;
    }

    setInsufficientBalance(false);
    setSubmitting(true);
    try {
      const requestKey = idempotencyKeyRef.current || generateIdempotencyKey('electricity');
      idempotencyKeyRef.current = requestKey;

      const res = await residentApi.purchaseElectricity(
        { amount: numericAmount, meter_number: trimmedMeter },
        { headers: { 'Idempotency-Key': requestKey } },
      );

      const purchase = res.data;
      const status = String(purchase.delivery_status || purchase.status || '').toLowerCase();

      setResult(purchase);
      idempotencyKeyRef.current = null;

      if (IN_PROGRESS_STATUSES.includes(status)) {
        await pollPurchaseStatus(purchase.reference);
      } else if (!FAILURE_STATUSES.includes(status)) {
        fetchBalance();
      }
    } catch (error: any) {
      const errorCode = error?.response?.data?.error;
      const backendMessage =
        error?.response?.data?.detail || error?.message || 'Something went wrong.';

      if (errorCode === 'INSUFFICIENT_BALANCE' || error?.response?.status === 402) {
        idempotencyKeyRef.current = null;
        setInsufficientBalance(true);
      } else {
        idempotencyKeyRef.current = null;
        Alert.alert('Purchase failed', backendMessage);
        // const bError = error?.response
        // console.log("Error from backend", bError.status)
        // console.log("Error from backend", bError.config)
        // console.log("Error from backend", bError.request)
        // console.log("Error from backend", bError.response)
        // console.log("Error from backend", bError.header)
        // console.log("Error from backend", bError.data)
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyToken = (token: string) => {
    Clipboard.setString(token);
    Alert.alert('Copied', 'Purchase token copied to clipboard.');
  };

  if (result) {
    const status = String(result.delivery_status || result.status || '').toLowerCase();
    const isFailed = FAILURE_STATUSES.includes(status);
    const isPending = polling || IN_PROGRESS_STATUSES.includes(status);

    return (
      <AppSafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            {isPending ? (
              <>
                <ActivityIndicator size="large" color="#6B21D8" style={{ marginBottom: 16 }} />
                <Text style={styles.resultTitle}>Processing your purchase</Text>
                <Text style={styles.resultSubtitle}>
                  We're delivering your token. This can take a moment.
                </Text>
              </>
            ) : isFailed ? (
              <>
                <Text style={[styles.resultTitle, { color: '#D14343' }]}>Purchase failed</Text>
                <Text style={styles.resultSubtitle}>
                  {result.error_message || result.message || 'Your electricity purchase could not be completed.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultTitle}>Purchase successful</Text>
                <Text style={styles.resultSubtitle}>{result.message || 'Your token is ready.'}</Text>

                {!!result.purchase_token && (
                  <TouchableOpacity
                    style={styles.tokenBox}
                    onPress={() => copyToken(result.purchase_token!)}>
                    <Text style={styles.tokenLabel}>Token (tap to copy)</Text>
                    <Text style={styles.tokenValue}>{result.purchase_token}</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Units</Text>
                  <Text style={styles.detailValue}>{formatUnits(result.units_kwh)} kWh</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>{formatCurrency(result.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Meter number</Text>
                  <Text style={styles.detailValue}>{result.meter_number}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference</Text>
                  <Text style={styles.detailValue}>{result.reference}</Text>
                </View>
              </>
            )}

            {!isPending && (
              <>
                <TouchableOpacity style={styles.proceedButton} onPress={resetForm}>
                  <Text style={styles.proceedText}>
                    {isFailed ? 'Try again' : 'Buy more electricity'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('ResidentApp', { screen: 'electricity_history' })}>
                  <Text style={styles.secondaryText}>View purchase history</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.linkText}>Back to home</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </AppSafeAreaView>
    );
  }

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrowLLine" size={18} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Buy Electricity</Text>
          <Text style={styles.subtitle}>Purchase tokens for your meter</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Icon name="wallet" size={26} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.balanceLabel}>Wallet balance</Text>
            <Text style={styles.balanceValue}>
              {loadingBalance ? 'Loading…' : formatCurrency(walletBalance)}
            </Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Meter number</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={meterNumber}
          onChangeText={value => setMeterNumber(sanitizeDigits(value))}
          placeholder="Enter meter number"
          placeholderTextColor="#A38DBF"
          maxLength={20}
        />

        <Text style={styles.fieldLabel}>Amount</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.amountCurrency}>₦</Text>
          <TextInput
            style={styles.amountInput}
            keyboardType="number-pad"
            value={amount}
            onChangeText={value => setAmount(sanitizeDigits(value))}
            placeholder="0"
            placeholderTextColor="#A38DBF"
          />
        </View>

        {insufficientBalance && (
          <View style={styles.insufficientBox}>
            <Text style={styles.insufficientText}>⚠️ Insufficient wallet balance</Text>
            <TouchableOpacity
              style={styles.fundButton}
              onPress={() => navigation.navigate('ResidentApp', { screen: 'credit' })}>
              <Text style={styles.fundButtonText}>Fund Wallet</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.proceedButton, submitting && styles.proceedButtonDisabled]}
          onPress={handlePurchase}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.proceedText}>Buy Electricity</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('ResidentApp', { screen: 'electricity_history' })}>
          <Text style={styles.linkText}>View purchase history</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#FFD358',
    padding: 16,
    marginBottom: 24,
  },
  balanceLabel: { fontSize: 12, color: '#6A6485' },
  balanceValue: { fontSize: 18, fontWeight: '800', color: '#2D1958', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#616887', marginBottom: 8 },
  input: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DEFA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D1958',
    marginBottom: 20,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DEFA',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 12,
  },
  amountCurrency: { fontSize: 20, fontWeight: '900', color: '#2D1958', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '800', color: '#2D1958', paddingVertical: 10 },
  insufficientBox: { marginTop: 8, marginBottom: 12, alignItems: 'center' },
  insufficientText: { color: '#D14343', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  fundButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fundButtonText: { color: '#FFFFFF', fontWeight: '700' },
  proceedButton: {
    marginTop: 16,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#6B21D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B21D8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 3,
  },
  proceedButtonDisabled: { opacity: 0.72 },
  proceedText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6B21D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#6B21D8', fontSize: 15, fontWeight: '700' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#6B21D8', fontSize: 14, fontWeight: '700' },
  resultCard: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#1D2140', marginBottom: 6, textAlign: 'center' },
  resultSubtitle: { fontSize: 13, color: '#6F7393', textAlign: 'center', marginBottom: 20 },
  tokenBox: {
    width: '100%',
    backgroundColor: '#F3EEFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCCEF9',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  tokenLabel: { fontSize: 12, color: '#6A6485', marginBottom: 6 },
  tokenValue: { fontSize: 18, fontWeight: '900', color: '#2D1958', letterSpacing: 1 },
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  detailLabel: { fontSize: 13, color: '#6F7393' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1D2140' },
});