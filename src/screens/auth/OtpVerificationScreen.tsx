import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../lib/apiClient';
import Icon from '../../components/Icon';
import { RootStackParamList } from '../../navigation/types';

type OtpRouteProp = RouteProp<RootStackParamList, 'verify_otp'>;
type OtpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'verify_otp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpVerificationScreen() {
  const navigation = useNavigation<OtpNavigationProp>();
  const route = useRoute<OtpRouteProp>();
  const { email } = route.params;
  const [otp, setOtp] = React.useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(RESEND_SECONDS);
  const inputsRef = React.useRef<Array<TextInput | null>>([]);

  React.useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const getErrorMessage = (err: any) =>
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.message ||
    'Something went wrong, please try again';

  const otpValue = otp.join('');

  const updateOtpAt = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleContinue = async () => {
    if (otpValue.length !== OTP_LENGTH) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      // The role is a path segment on the backend. This app only ever serves
      // residents, so it is fixed rather than threaded through navigation.
      const res = await api.post('/verify-otp/resident', {
        email,
        otp: otpValue,
      });
      const resetToken = res.data?.reset_token;
      if (!resetToken) {
        throw new Error('Reset token was not returned by the server.');
      }
      navigation.navigate('reset_password', {
        email,
        resetToken,
      });
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || resending) {
      return;
    }

    setResending(true);
    try {
      await api.post('/forgot-password', { email });
      setOtp(Array(OTP_LENGTH).fill(''));
      setResendIn(RESEND_SECONDS);
      inputsRef.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new OTP code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrowLLine" size={22} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP code that we sent to{' '}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(input) => {
                  inputsRef.current[index] = input;
                }}
                value={digit}
                onChangeText={(value) => updateOtpAt(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't get OTP? </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleResendOtp}
              disabled={resendIn > 0 || resending}
            >
              <Text style={[styles.resendLink, (resendIn > 0 || resending) && styles.resendDisabled]}>
                {resending ? 'Sending...' : resendIn > 0 ? `Resend OTP (${resendIn}s)` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  subtitle: {
    alignSelf: 'center',
    color: '#5F5F64',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 310,
    textAlign: 'center',
  },
  emailText: {
    color: '#8506FF',
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  otpBox: {
    backgroundColor: '#F5F5F6',
    borderColor: '#F5F5F6',
    borderRadius: 22,
    borderWidth: 1,
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
    height: 48,
    marginHorizontal: 5,
    padding: 0,
    textAlign: 'center',
    width: 48,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#8506FF',
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 56,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
  },
  resendText: {
    color: '#6E6E72',
    fontSize: 13,
    fontWeight: '500',
  },
  resendLink: {
    color: '#8506FF',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    color: '#9A7AB6',
    textDecorationLine: 'none',
  },
});
