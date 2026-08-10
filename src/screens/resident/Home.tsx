import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Navbar from '../../components/Navbar';
import AppSafeAreaView from '../../components/AppSafeAreaView';
import Icon from '../../components/Icon';
import AdCarousel from '../../components/AdCarousel';
import FeatureNav from './FeatureNav';
import { ResidentStackParamList, RootStackParamList } from '../../navigation/types';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

type ResidentHomeRouteProp = RouteProp<ResidentStackParamList, 'resident_home'>;

export default function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ResidentHomeRouteProp>();
  const { getToken } = useAuth();

  const [showAmount, setShowAmount] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [shortAddress, setShortAddress] = React.useState<string>(
    route?.params?.shortAddress ?? '',
  );
  const [fullAddress, setFullAddress] = React.useState<string>('');
  const [firstName, setFirstName] = React.useState<string>(
    route?.params?.firstName ?? '',
  );
  const [walletRefreshKey, setWalletRefreshKey] = React.useState(0);

  const abbreviateAddress = React.useCallback((address: string): string => {
    if (!address) {
      return 'N/A';
    }

    const parts = address.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].toUpperCase();
    }

    const number = parts[0];
    const firstWord = parts[1]?.substring(0, 3).toUpperCase();
    return `${number} ${firstWord}`;
  }, []);

  const formatCurrency = (amount: number | null) => {
    const safeAmount = amount ?? 0;
    return `₦${safeAmount.toLocaleString()}`;
  };

  const getResidentProfile = React.useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get('/resident-profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const residentAddress = res.data?.house_address || '';
      setFirstName(res.data?.first_name || '');

      if (residentAddress) {
        setFullAddress(residentAddress);
        setShortAddress(abbreviateAddress(residentAddress));
      }
    } catch (error: any) {
      console.error('Error fetching resident profile:', error);
    }
  }, [abbreviateAddress, getToken]);

  const getWalletBalance = React.useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get('/wallet/balance', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setWalletBalance(Number(res.data.balance ?? 0));
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  }, [getToken]);

  const fetchResidentHomeData = React.useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        await Promise.all([getWalletBalance(), getResidentProfile()]);
        setWalletRefreshKey(key => key + 1);
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [getResidentProfile, getWalletBalance],
  );

  React.useEffect(() => {
    fetchResidentHomeData(true);
  }, [fetchResidentHomeData]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const refreshOnFocus = async () => {
        setLoading(true);
        try {
          await Promise.all([getWalletBalance(), getResidentProfile()]);
          if (isActive) {
            setWalletRefreshKey(key => key + 1);
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      refreshOnFocus();
      return () => {
        isActive = false;
      };
    }, [getResidentProfile, getWalletBalance]),
  );

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <Navbar
        userRole="resident"
        firstName={firstName}
        shortAddress={shortAddress}
        fullAddress={fullAddress}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>
                {!showAmount
                  ? '******' // Shows masks instantly on screen return, even while loading
                  : loading
                    ? '------' // Only shows dashes if they toggled the eye "on" but data is still fetching
                    : formatCurrency(walletBalance)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAmount(!showAmount)}
                style={styles.visibilityButton}>
                <Icon name={showAmount ? 'eyeC' : 'eyeO'} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceHint}>
              Track payments, top up faster, and stay ahead of estate dues.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigation.navigate('ResidentApp', { screen: 'credit' })}>
              <Icon name="credit" size={18} />
              <Text style={styles.primaryActionText}>Fund Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('ResidentApp', { screen: 'pending' })}>
              <Icon name="pending" size={18} />
              <Text style={styles.secondaryActionText}>View Charges</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.carouselSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            <Text style={styles.sectionSubtitle}>Useful updates and estate promos</Text>
          </View>
          <View style={styles.carouselCard}>
            <AdCarousel />
          </View>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore More</Text>
            <Text style={styles.sectionSubtitle}>
              Payments, services, and extra resident tools
            </Text>
          </View>
          <View style={styles.featuresCard}>
            <FeatureNav refreshKey={walletRefreshKey} />
          </View>
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F7FB',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#6B21D8',
    padding: 20,
    marginTop: 6,
    shadowColor: '#6B21D8',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -28,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#8B5CF6',
    opacity: 0.35,
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -44,
    left: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#C084FC',
    opacity: 0.18,
  },
  visibilityButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  balanceBlock: {
    marginTop: 8,
  },
  balanceLabel: {
    color: '#D7E6FF',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceValue: {
    color: '#F8FFB5',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  balanceHint: {
    marginTop: 10,
    color: '#CFE0FF',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: '88%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  primaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10243E',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#6C7B90',
  },
  carouselSection: {
    marginTop: 24,
  },
  carouselCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  featuresSection: {
    marginTop: 24,
  },
  featuresCard: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
});
