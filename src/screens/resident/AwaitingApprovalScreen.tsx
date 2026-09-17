import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { ArrowLeft, Clock, ShieldCheck, Mail } from 'lucide-react-native';
import AppSafeAreaView from '../../components/AppSafeAreaView';

const PRIMARY = '#3B0066';
const ACCENT = '#8506FF';

type Props = {
  route: any; // optionally extract estate name from route.params
};

const AwaitingApprovalScreen = ({ route }: Props) => {
  const navigation = useNavigation();
  const estateName = route?.params?.estateName || 'your estate';

  const pulse = useSharedValue(0.85);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.85, { duration: 1400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      true,
    );
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 500 }));
    contentTranslateY.value = withDelay(
      150,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }),
    );
  }, [contentOpacity, contentTranslateY, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35 + (1.15 - pulse.value) * 0.6,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <AppSafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}>
          <ArrowLeft size={22} color={PRIMARY} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.halo, haloStyle]} />
          <View style={styles.haloStatic} />
          <View style={styles.iconCircle}>
            <Clock size={40} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>

        <Animated.View style={contentStyle}>
          <Text style={styles.title}>Awaiting Approval</Text>
          <Text style={styles.subtitle}>Your request has been sent</Text>

          <Text style={styles.message}>
            Your account is pending approval from{' '}
            <Text style={styles.estate}>{estateName} admin</Text>. You'll be
            notified as soon as it's reviewed.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <ShieldCheck size={18} color={ACCENT} strokeWidth={2.2} />
              </View>
              <Text style={styles.infoText}>
                This usually only takes a short while
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Mail size={18} color={ACCENT} strokeWidth={2.2} />
              </View>
              <Text style={styles.infoText}>
                We'll send a notification once you're approved
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default AwaitingApprovalScreen;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EEFF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  halo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EADCFF',
  },
  haloStatic: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#E1CBFF',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A4A4A',
    textAlign: 'center',
    marginTop: 20,
  },
  estate: {
    fontWeight: '700',
    color: ACCENT,
  },
  infoCard: {
    width: '100%',
    marginTop: 28,
    backgroundColor: '#FAF6FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems:'center',
    borderWidth: 1,
    borderColor: '#F0E4FF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5C5C5C',
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0E4FF',
    marginVertical: 12,
  },
});
