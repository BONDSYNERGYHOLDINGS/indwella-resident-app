import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import WebView from 'react-native-webview';

import { api } from '../../lib/apiClient';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import {ResidentStackParamList} from '../../navigation/types';

type CreditWalletNavigationProp = NativeStackNavigationProp<
  ResidentStackParamList,
  'credit'
>;

type CheckoutSession = {
  authorizationUrl: string;
  callbackUrl: string;
  cancelActionUrl: string;
  reference: string;
};

type PaymentChannel = 'bank_transfer' | 'card' | 'ussd';

const PAYMENT_OPTIONS: Array<{
  channel: PaymentChannel;
  title: string;
  subtitle: string;
}> = [
  {
    channel: 'bank_transfer',
    title: 'Bank Transfer',
    subtitle: 'Fund with transfer',
  },
  {
    channel: 'card',
    title: 'Debit / Credit Card',
    subtitle: 'Pay with your card',
  },
  {
    channel: 'ussd',
    title: 'USSD Payment',
    subtitle: 'Authorize via USSD',
  },
];

const PAYSTACK_CLOSE_URL = 'https://standard.paystack.co/close';
const EXTERNAL_PAYMENT_SCHEMES = ['tel:', 'ussd:'];

const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

const sanitizeAmountInput = (value: string) =>
  value.replace(/[^\d]/g, '').slice(0, 12);

const buildIdempotencyKey = () =>
  `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

export default function CreditWalletScreen() {
  const navigation = useNavigation<CreditWalletNavigationProp>();

  const [amount, setAmount] = React.useState('0');
  const [selectedChannel, setSelectedChannel] =
    React.useState<PaymentChannel>('bank_transfer');
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [checkoutSession, setCheckoutSession] =
    React.useState<CheckoutSession | null>(null);
  const initiationKeyRef = React.useRef<string | null>(null);

  const numericAmount = Number(amount || 0);

  const closeCheckout = React.useCallback(() => {
    setCheckoutSession(null);
    setVerifying(false);
    initiationKeyRef.current = null;
  }, []);

  const verifyWalletFunding = React.useCallback(
    async (reference: string) => {
      setVerifying(true);
      try {
        let response;
        let lastError: any;

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            response = await api.get(`/wallet/fund/verify/${reference}`, {
              timeout: 60000,
            });
            break;
          } catch (error: any) {
            const timedOut =
              error?.code === 'ECONNABORTED' ||
              String(error?.message || '').toLowerCase().includes('timeout');
            lastError = error;
            if (!timedOut || attempt === 3) {
              throw error;
            }
            await wait(2000);
          }
        }

        if (!response) {
          throw lastError || new Error('Payment verification failed');
        }

        const status = response.data?.status;

        if (status === 'successful') {
          closeCheckout();
          setAmount('0');
          Alert.alert(
            'Wallet funded',
            'Your wallet has been credited successfully.',
          );
          navigation.goBack();
          return;
        }

        if (status === 'failed') {
          closeCheckout();
          Alert.alert(
            'Payment not completed',
            response.data?.message || 'Please try again.',
          );
          return;
        }

        Alert.alert(
          'Still confirming',
          response.data?.message ||
            'Your payment is still being confirmed. Please wait a moment.',
        );
      } catch (error: any) {
        const timedOut =
          error?.code === 'ECONNABORTED' ||
          String(error?.message || '').toLowerCase().includes('timeout');
        Alert.alert(
          timedOut ? 'Still confirming payment' : 'Unable to confirm payment',
          timedOut
            ? 'Your payment may still be processing. Please check your wallet balance in a moment.'
            : error?.response?.data?.detail ||
                'We could not verify the payment yet.',
        );
      } finally {
        setVerifying(false);
      }
    },
    [closeCheckout, navigation],
  );

  const handleProceedToPayment = React.useCallback(async () => {
    if (!numericAmount || Number.isNaN(numericAmount)) {
      Alert.alert(
        'Invalid amount',
        'Please enter a valid wallet funding amount.',
      );
      return;
    }

    setLoading(true);
    try {
      const requestKey = initiationKeyRef.current || buildIdempotencyKey();
      initiationKeyRef.current = requestKey;

      const response = await api.post(
        '/wallet/fund/initiate',
        {
          amount: numericAmount,
          method: 'paystack',
          channels: [selectedChannel],
        },
        {
          headers: {
            'Idempotency-Key': requestKey,
          },
        },
      );

      if (
        response.data?.authorization_url &&
        response.data?.reference &&
        response.data?.callback_url &&
        response.data?.cancel_action_url
      ) {
        setCheckoutSession({
          authorizationUrl: response.data.authorization_url,
          callbackUrl: response.data.callback_url,
          cancelActionUrl: response.data.cancel_action_url,
          reference: response.data.reference,
        });
        return;
      }

      initiationKeyRef.current = null;
      Alert.alert(
        'Unable to start payment',
        'Payment session could not be created.',
      );
    } catch (error: any) {
      if (error?.response) {
        initiationKeyRef.current = null;
      }
      Alert.alert(
        'Payment error',
        error?.response?.data?.detail ||
          'Something went wrong while starting the payment.',
      );
    } finally {
      setLoading(false);
    }
  }, [numericAmount, selectedChannel]);

  const handleWebViewRequest = React.useCallback(
    (request: {url?: string}) => {
      const url = request.url || '';

      if (!checkoutSession) {
        return true;
      }

      if (EXTERNAL_PAYMENT_SCHEMES.some(scheme => url.startsWith(scheme))) {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            'Unable to open dialer',
            'Please copy the USSD code from Paystack and dial it manually.',
          );
        });
        return false;
      }

      if (url.startsWith(checkoutSession.callbackUrl)) {
        verifyWalletFunding(checkoutSession.reference);
        return false;
      }

      if (
        url.startsWith(checkoutSession.cancelActionUrl) ||
        url.startsWith(PAYSTACK_CLOSE_URL)
      ) {
        closeCheckout();
        return false;
      }

      return true;
    },
    [checkoutSession, closeCheckout, verifyWalletFunding],
  );

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrowLLine" size={18} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Fund Wallet</Text>
            <Text style={styles.subtitle}>Top up your account</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.amountCard}>
            <View style={styles.amountLabelColumn}>
              <Text style={styles.amountLabel}>Enter</Text>
              <Text style={styles.amountLabel}>amount</Text>
            </View>

            <View style={styles.amountDivider} />

            <View style={styles.amountValueColumn}>
              <View style={styles.amountValueRow}>
                <Text style={styles.amountCurrency}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={value => setAmount(sanitizeAmountInput(value))}
                  placeholder="0"
                  placeholderTextColor="#A38DBF"
                  selectionColor="#6B21D8"
                />
              </View>
            </View>
          </View>

          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              + {formatCurrency(numericAmount || 0)} will be funded to your
              account
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
          </View>

          <View style={styles.methodGrid}>
            {PAYMENT_OPTIONS.map(option => {
              const selected = selectedChannel === option.channel;
              return (
                <TouchableOpacity
                  key={option.channel}
                  style={[
                    styles.methodCard,
                    selected && styles.methodCardSelected,
                  ]}
                  onPress={() => setSelectedChannel(option.channel)}>
                  <View
                    style={[
                      styles.methodBadge,
                      selected && styles.methodBadgeSelected,
                    ]}>
                    <Text
                      style={[
                        styles.methodBadgeText,
                        selected && styles.methodBadgeTextSelected,
                      ]}>
                      {option.title === 'Bank Transfer'
                        ? 'BT'
                        : option.channel === 'card'
                        ? 'DC'
                        : 'US'}
                    </Text>
                  </View>
                  <Text style={styles.methodTitle}>{option.title}</Text>
                  <Text style={styles.methodSubtitle}>{option.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.proceedButton,
              (loading || verifying) && styles.proceedButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
            disabled={loading || verifying}>
            {loading || verifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.proceedText}>Proceed to Payment</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.securedText}>Secured by Paystack</Text>
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={!!checkoutSession}
        onRequestClose={closeCheckout}>
        <AppSafeAreaView style={styles.webViewSafeArea}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Complete payment</Text>
            <TouchableOpacity
              onPress={closeCheckout}
              style={styles.webViewCloseButton}>
              <Text style={styles.webViewCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          {checkoutSession ? (
            <WebView
              source={{uri: checkoutSession.authorizationUrl}}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              javaScriptCanOpenWindowsAutomatically
              setSupportMultipleWindows={false}
              mixedContentMode="always"
              startInLoadingState
              onShouldStartLoadWithRequest={handleWebViewRequest}
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator color="#6B21D8" size="large" />
                </View>
              )}
            />
          ) : null}
        </AppSafeAreaView>
      </Modal>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F4FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F6F4FB',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
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
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D2140',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6F7393',
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: '#F3EEFF',
    borderWidth: 1,
    borderColor: '#DCCEF9',
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  amountLabelColumn: {
    width: 64,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6A6485',
    lineHeight: 20,
  },
  amountDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#D8C9F6',
    marginHorizontal: 14,
  },
  amountValueColumn: {
    flex: 1,
  },
  amountValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountCurrency: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2D1958',
    marginRight: 2,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 28,
    fontWeight: '900',
    color: '#2D1958',
    letterSpacing: 0.2,
  },
  banner: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#0DAA73',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#616887',
  },
  methodGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  methodCard: {
    flex: 1,
    minHeight: 136,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DEFA',
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6B21D8',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  methodCardSelected: {
    borderColor: '#6B21D8',
    backgroundColor: '#F6F0FF',
  },
  methodBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEE5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  methodBadgeSelected: {
    backgroundColor: '#DFF8EC',
  },
  methodBadgeText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6B21D8',
  },
  methodBadgeTextSelected: {
    color: '#0DAA73',
  },
  methodTitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#241F3D',
  },
  methodSubtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#7A7F98',
  },
  proceedButton: {
    marginTop: 28,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#6B21D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B21D8',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 3,
  },
  proceedButtonDisabled: {
    opacity: 0.72,
  },
  proceedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  securedText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    color: '#8A8FA7',
  },
  webViewSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EBF2',
  },
  webViewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2748',
  },
  webViewCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F0FF',
  },
  webViewCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21D8',
  },
  webViewLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
